import { NextResponse } from 'next/server';
// Forced build refresh: 2026-03-08T20:17:00Z
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        console.log("Inquiry POST - Session User:", session?.id);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized - No Session' }, { status: 401 });
        }

        if (session.role !== 'CONSUMER') {
            return NextResponse.json({ error: 'Unauthorized - Consumer Role Required' }, { status: 401 });
        }

        const body = await request.json();
        const { farmerId, cropId, message, quantity, proposedPrice, deliveryAddress, contactNumber } = body;

        if (!farmerId || !message || !quantity) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const parsedQuantity = parseFloat(quantity);
        if (isNaN(parsedQuantity)) {
            return NextResponse.json({ error: 'Quantity must be a valid number' }, { status: 400 });
        }

        const parsedPrice = proposedPrice ? parseFloat(proposedPrice) : null;

        const inquiry = await (prisma as any).contactInquiry.create({
            data: {
                consumerId: session.id as string,
                farmerId,
                cropId: cropId || null,
                message,
                quantity: parsedQuantity,
                proposedPrice: (parsedPrice !== null && !isNaN(parsedPrice)) ? parsedPrice : null,
                deliveryAddress: deliveryAddress || null,
                contactNumber: contactNumber || null
            }
        });

        return NextResponse.json({ success: true, inquiry });
    } catch (error: any) {
        console.error('Inquiry submission error:', error);
        return NextResponse.json({
            error: 'Failed to submit inquiry',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let inquiries;
        if (session.role === 'FARMER') {
            inquiries = await (prisma as any).contactInquiry.findMany({
                where: { farmerId: session.id as string },
                include: {
                    consumer: { select: { name: true, mobile: true, email: true } },
                    crop: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            inquiries = await (prisma as any).contactInquiry.findMany({
                where: { consumerId: session.id as string },
                include: {
                    farmer: { select: { name: true, mobile: true } },
                    crop: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json({ inquiries });
    } catch (error) {
        console.error('Fetch inquiries error:', error);
        return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
    }
}
