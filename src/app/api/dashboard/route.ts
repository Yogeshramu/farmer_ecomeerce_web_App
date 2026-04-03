import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Single endpoint that returns all farmer dashboard data in one round trip
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'FARMER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const farmerId = session.id as string;

        const [orders, crops, inquiries, reviews] = await Promise.all([
            prisma.order.findMany({
                where: { farmerId },
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    deliveryCharge: true,
                    deliveryAddress: true,
                    deliveryPincode: true,
                    deliveryTime: true,
                    contactNumber: true,
                    createdAt: true,
                    consumer: { select: { name: true, mobile: true, email: true } },
                    items: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            crop: { select: { name: true } }
                        }
                    },
                    review: { select: { rating: true, comment: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.crop.findMany({
                where: { farmerId },
                select: {
                    id: true,
                    name: true,
                    quantityKg: true,
                    basePrice: true,
                    farmerId: true,
                    createdAt: true,
                    farmer: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.contactInquiry.findMany({
                where: { farmerId },
                select: {
                    id: true,
                    message: true,
                    quantity: true,
                    proposedPrice: true,
                    deliveryAddress: true,
                    contactNumber: true,
                    createdAt: true,
                    crop: { select: { name: true } },
                    consumer: { select: { name: true, mobile: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.review.findMany({
                where: { crop: { farmerId } },
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    crop: { select: { name: true } },
                    consumer: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return NextResponse.json({ orders, crops, inquiries, reviews });
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
