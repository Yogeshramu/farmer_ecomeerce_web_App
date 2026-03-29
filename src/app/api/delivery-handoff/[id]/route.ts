import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
        const updated = await prisma.deliveryHandoff.update({
            where: { id },
            data: { status: 'LOCKED', acceptingFarmerId: farmerId }
        });
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
        return NextResponse.json({ handoff: updated });
    }

    // ── GOODS_SENT_BY_A (Farmer A → notifies Farmer B goods are on the way) ───
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
        return NextResponse.json({ handoff: updated });
    }

    // ── GOODS_SENT_BY_B (Farmer B received + dispatched to consumer → DELIVERED) ─
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

        // Assign Farmer B as handler and mark all cluster orders DELIVERED
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

        return NextResponse.json({ handoff: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
