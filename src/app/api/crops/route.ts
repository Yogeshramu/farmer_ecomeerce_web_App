import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const crops = await prisma.crop.findMany({
            include: {
                farmer: {
                    select: { name: true, pincode: true, latitude: true, longitude: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ crops });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch crops' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'FARMER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, quantityKg, basePrice, farmerPincode } = body;

        const crop = await prisma.crop.create({
            data: {
                name,
                quantityKg: parseFloat(quantityKg),
                basePrice: parseFloat(basePrice),
                farmerPincode,
                farmerId: session.id as string
            }
        });

        return NextResponse.json({ success: true, crop });
    } catch (error) {
        console.error('Crop creation error:', error);
        return NextResponse.json({ error: 'Failed to create crop' }, { status: 500 });
    }
}
