import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'CONSUMER') {
            return NextResponse.json({ error: 'Unauthorized: Consumer login required' }, { status: 401 });
        }

        const body = await request.json();
        const { cropId, orderId, rating, comment } = body;
        const oId = typeof orderId === 'string' ? orderId : undefined;

        if (!cropId || !rating) {
            return NextResponse.json({ error: 'Missing cropId or rating' }, { status: 400 });
        }

        const ratingInt = parseInt(rating);
        if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }

        // Verify the user has a delivered order for this crop if orderId is provided
        const hasOrder = await prisma.order.findFirst({
            where: {
                id: oId,
                consumerId: session.id as string,
                status: 'DELIVERED',
                items: {
                    some: {
                        cropId: cropId
                    }
                }
            }
        });

        if (!hasOrder) {
            return NextResponse.json({ error: 'You can only review items from delivered orders you have placed.' }, { status: 403 });
        }

        // Check if already reviewed for this order
        if (oId) {
            const existing = await (prisma as any).review.findUnique({
                where: { orderId: oId }
            });
            if (existing) {
                return NextResponse.json({ error: 'You have already reviewed this order.' }, { status: 400 });
            }
        }

        const review = await (prisma as any).review.create({
            data: {
                rating: ratingInt,
                comment,
                cropId,
                consumerId: (session.id as string) || "",
                orderId: oId || null
            }
        });

        return NextResponse.json({ success: true, review });
    } catch (error) {
        console.error('Create review error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getSession();
        const { searchParams } = new URL(request.url);
        const cropId = searchParams.get('cropId');

        let whereClause: any = {};
        if (cropId) {
            whereClause = { cropId };
        } else if (session && session.role === 'FARMER') {
            whereClause = {
                crop: {
                    farmerId: session.id
                }
            };
        } else {
            return NextResponse.json({ error: 'Filter required' }, { status: 400 });
        }

        const reviews = await (prisma as any).review.findMany({
            where: whereClause,
            include: {
                consumer: {
                    select: { name: true }
                },
                crop: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ reviews });
    } catch (error) {
        console.error('Fetch reviews error:', error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}
