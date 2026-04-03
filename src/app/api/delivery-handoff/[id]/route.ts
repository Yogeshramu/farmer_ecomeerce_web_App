import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendRefreshToUser } from '@/lib/websocket-broadcast';

const MAX_HANDOFF_DISTANCE_KM = 10;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'FARMER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const { action } = await request.json();

    const handoff = await prisma.deliveryHandoff.findUnique({ where: { id } });
    if (!handoff) return NextResponse.json({ error: 'Handoff not found' }, { status: 404 });

    const farmerId = session.id as string;
    const isRequester = handoff.requestingFarmerId === farmerId;
    const isAcceptor = handoff.acceptingFarmerId === farmerId;

    // ── ACCEPT (Farmer B) ──────────────────────────────────────────────────────
    if (action === 'ACCEPT') {
        if (handoff.status !== 'PENDING') {
            return NextResponse.json({ error: 'Handoff already locked or closed' }, { status: 409 });
        }
        if (isRequester) {
            return NextResponse.json({ error: 'Cannot accept your own request' }, { status: 403 });
        }

        // Distance check: Farmer B must be within 10km of Farmer A
        const [farmerA, farmerB] = await Promise.all([
            prisma.user.findUnique({ where: { id: handoff.requestingFarmerId }, select: { pincode: true } }),
            prisma.user.findUnique({ where: { id: farmerId }, select: { pincode: true } })
        ]);
        if (farmerA?.pincode && farmerB?.pincode) {
            const [coordsA, coordsB] = await Promise.all([
                prisma.pincodeLocation.findUnique({ where: { pincode: farmerA.pincode } }),
                prisma.pincodeLocation.findUnique({ where: { pincode: farmerB.pincode } })
            ]);
            if (coordsA && coordsB) {
                const dist = haversine(coordsA.latitude, coordsA.longitude, coordsB.latitude, coordsB.longitude);
                if (dist > MAX_HANDOFF_DISTANCE_KM) {
                    return NextResponse.json(
                        { error: `Too far to handoff — you are ${Math.round(dist)}km away (max 10km)` },
                        { status: 400 }
                    );
                }
            }
        }

        const updated = await prisma.deliveryHandoff.update({
            where: { id },
            data: { status: 'LOCKED', acceptingFarmerId: farmerId }
        });
        // Notify Farmer A that their request was accepted
        sendRefreshToUser(handoff.requestingFarmerId, 'handoffs');
        return NextResponse.json({ handoff: updated });
    }

    // ── REJECT (Farmer B) ──────────────────────────────────────────────────────
    if (action === 'REJECT') {
        if (handoff.status !== 'PENDING') {
            return NextResponse.json({ error: 'Handoff already locked or closed' }, { status: 409 });
        }
        if (isRequester) {
            return NextResponse.json({ error: 'Cannot reject your own request' }, { status: 403 });
        }
        const updated = await prisma.deliveryHandoff.update({
            where: { id },
            data: { status: 'REJECTED', acceptingFarmerId: farmerId }
        });
        sendRefreshToUser(handoff.requestingFarmerId, 'handoffs');
        return NextResponse.json({ handoff: updated });
    }

    // ── GOODS_SENT_BY_A (Farmer A confirms goods handed to Farmer B → mark orders OUT_FOR_DELIVERY) ───
    if (action === 'GOODS_SENT_BY_A') {
        if (!isRequester) {
            return NextResponse.json({ error: 'Only Farmer A can confirm goods sent' }, { status: 403 });
        }
        if (handoff.status !== 'LOCKED') {
            return NextResponse.json({ error: 'Handoff must be locked first' }, { status: 409 });
        }
        if (handoff.goodsSentByA) {
            return NextResponse.json({ error: 'Already confirmed' }, { status: 409 });
        }
        const updated = await prisma.deliveryHandoff.update({
            where: { id },
            data: { goodsSentByA: true }
        });

        // Mark Farmer A's cluster orders as OUT_FOR_DELIVERY so his dashboard reflects handoff in progress
        await prisma.order.updateMany({
            where: {
                deliveryPincode: handoff.clusterPincode,
                farmerId: handoff.requestingFarmerId,
                status: 'ACCEPTED'
            },
            data: { status: 'OUT_FOR_DELIVERY' }
        });

        // Notify Farmer B that goods are coming
        sendRefreshToUser(handoff.acceptingFarmerId!, 'handoffs');
        return NextResponse.json({ handoff: updated });
    }

    // ── GOODS_SENT_BY_B (Farmer B received + dispatched to consumer → DELIVERED on both dashboards) ─
    if (action === 'GOODS_SENT_BY_B') {
        if (!isAcceptor) {
            return NextResponse.json({ error: 'Only Farmer B can confirm dispatch to consumer' }, { status: 403 });
        }
        if (!handoff.goodsSentByA) {
            return NextResponse.json({ error: 'Farmer A must confirm goods sent first' }, { status: 409 });
        }
        if (handoff.goodsSentByB) {
            return NextResponse.json({ error: 'Already dispatched' }, { status: 409 });
        }

        const updated = await prisma.deliveryHandoff.update({
            where: { id },
            data: { goodsSentByB: true }
        });

        // Mark all cluster orders DELIVERED with Farmer B as handler
        // Covers ACCEPTED + OUT_FOR_DELIVERY (set by GOODS_SENT_BY_A step)
        await prisma.order.updateMany({
            where: {
                deliveryPincode: handoff.clusterPincode,
                farmerId: handoff.requestingFarmerId,
                status: { in: ['ACCEPTED', 'OUT_FOR_DELIVERY'] }
            },
            data: {
                deliveryHandlerId: farmerId,
                status: 'DELIVERED'
            }
        });

        // Notify Farmer A that delivery is complete
        sendRefreshToUser(handoff.requestingFarmerId, 'all');
        return NextResponse.json({ handoff: updated });
    }
}
