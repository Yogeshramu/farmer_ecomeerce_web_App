import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mine = searchParams.get('mine') === 'true';
        
        const session = await getSession();
        
        const crops = await prisma.crop.findMany({
            where: mine && session 
                ? { farmerId: session.id as string } 
                : { quantityKg: { gt: 0 } },
            include: {
                farmer: {
                    select: { id: true, name: true, pincode: true, latitude: true, longitude: true }
                },
                reviews: {
                    select: { rating: true }
                },
                _count: {
                    select: { reviews: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ crops });
    } catch (error) {
        console.error('Fetch crops error:', error);
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
