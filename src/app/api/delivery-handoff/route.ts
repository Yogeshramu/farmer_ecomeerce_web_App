import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST: Requesting farmer creates a handoff request for a cluster
export async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'FARMER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clusterPincode } = await request.json();
    if (!clusterPincode) {
        return NextResponse.json({ error: 'clusterPincode required' }, { status: 400 });
    }

    // Block if ANY active handoff already exists for this cluster pincode (any farmer)
    const existing = await prisma.deliveryHandoff.findFirst({
        where: {
            clusterPincode,
            status: { in: ['PENDING', 'LOCKED'] }
        }
    });
    if (existing) {
        const isMine = existing.requestingFarmerId === (session.id as string);
        return NextResponse.json({
            error: isMine
                ? 'You already raised a handoff for this cluster'
                : 'Another farmer has already raised a handoff for this cluster'
        }, { status: 409 });
    }

    const handoff = await prisma.deliveryHandoff.create({
        data: {
            clusterPincode,
            requestingFarmerId: session.id as string,
            status: 'PENDING'
        }
    });

    return NextResponse.json({ handoff });
}

// GET: Fetch all handoffs relevant to the logged-in farmer
// - As requester: see status of your requests
// - As potential acceptor: see PENDING requests from others (not your own)
export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'FARMER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [myRequests, incomingRequests] = await Promise.all([
        prisma.deliveryHandoff.findMany({
            where: { requestingFarmerId: session.id as string, goodsSentByB: false },
            include: {
                acceptingFarmer: { select: { id: true, name: true, pincode: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        // PENDING (any farmer can see & accept) + LOCKED where I am the acceptor (not yet completed)
        prisma.deliveryHandoff.findMany({
            where: {
                requestingFarmerId: { not: session.id as string },
                OR: [
                    { status: 'PENDING' },
                    { status: 'LOCKED', acceptingFarmerId: session.id as string, goodsSentByB: false }
                ]
            },
            include: {
                requestingFarmer: { select: { id: true, name: true, pincode: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    return NextResponse.json({ myRequests, incomingRequests });
}
