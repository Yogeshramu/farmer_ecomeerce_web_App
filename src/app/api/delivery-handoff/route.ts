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

async function getPincodeCoords(pincode: string) {
    return prisma.pincodeLocation.findUnique({ where: { pincode } });
}

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

    // Notify all nearby farmers (they'll re-fetch handoffs and see the new request)
    // We push to all connected farmers — they filter by distance on their end
    const nearbyFarmers = await prisma.user.findMany({
        where: { role: 'FARMER', id: { not: session.id as string } },
        select: { id: true }
    });
    nearbyFarmers.forEach(f => sendRefreshToUser(f.id, 'handoffs'));

    return NextResponse.json({ handoff });
}

// GET: Fetch all handoffs relevant to the logged-in farmer
export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'FARMER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const farmerId = session.id as string;

    // Single parallel fetch: current farmer + all handoffs + all farmers + all pincode coords
    const [currentFarmer, myRequests, allIncoming, allOtherFarmers, allPincodes] = await Promise.all([
        prisma.user.findUnique({ where: { id: farmerId }, select: { pincode: true } }),
        prisma.deliveryHandoff.findMany({
            where: { requestingFarmerId: farmerId, goodsSentByB: false },
            include: { acceptingFarmer: { select: { id: true, name: true, pincode: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.deliveryHandoff.findMany({
            where: {
                requestingFarmerId: { not: farmerId },
                OR: [
                    { status: 'PENDING' },
                    { status: 'LOCKED', acceptingFarmerId: farmerId, goodsSentByB: false }
                ]
            },
            include: { requestingFarmer: { select: { id: true, name: true, pincode: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.findMany({ where: { role: 'FARMER', id: { not: farmerId } }, select: { pincode: true } }),
        prisma.pincodeLocation.findMany() // all coords in one query, use as in-memory map
    ]);

    // Build pincode → coords map (no more per-pincode DB calls)
    const coordsMap = new Map(allPincodes.map(p => [p.pincode, p]));
    const myCoords = currentFarmer?.pincode ? coordsMap.get(currentFarmer.pincode) : null;

    // Filter incoming by distance — pure in-memory now
    const incomingRequests = allIncoming.filter(req => {
        if (req.status === 'LOCKED' && req.acceptingFarmerId === farmerId) return true;
        const theirPincode = req.requestingFarmer?.pincode;
        if (!theirPincode || !myCoords) return false;
        const theirCoords = coordsMap.get(theirPincode);
        if (!theirCoords) return false;
        return haversine(myCoords.latitude, myCoords.longitude, theirCoords.latitude, theirCoords.longitude) <= MAX_HANDOFF_DISTANCE_KM;
    });

    // Check nearby farmer — pure in-memory
    const hasNearbyFarmer = myCoords ? allOtherFarmers.some(f => {
        if (!f.pincode) return false;
        const coords = coordsMap.get(f.pincode);
        if (!coords) return false;
        return haversine(myCoords.latitude, myCoords.longitude, coords.latitude, coords.longitude) <= MAX_HANDOFF_DISTANCE_KM;
    }) : false;

    return NextResponse.json({ myRequests, incomingRequests, hasNearbyFarmer });
}
