import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calculateDeliveryCharge } from '@/lib/deliveryCalculator';

interface GroupedItem {
    cropId: string;
    quantity: number;
    crop: {
        id: string;
        farmerId: string;
        basePrice: number;
        farmer: {
            pincode: string | null;
        };
    };
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'CONSUMER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { items, deliveryPincode, deliveryAddress, deliveryTime } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // 1. Group items by farmer
        const itemsByFarmer: Record<string, GroupedItem[]> = {};

        for (const item of items) {
            const crop = await prisma.crop.findUnique({
                where: { id: item.cropId },
                include: { farmer: true }
            });
            if (!crop) continue;

            if (!itemsByFarmer[crop.farmerId]) {
                itemsByFarmer[crop.farmerId] = [];
            }
            itemsByFarmer[crop.farmerId].push({ ...item, crop });
        }

        const createdOrders = [];

        // 2. Create Order per Farmer
        for (const farmerId in itemsByFarmer) {
            const farmerItems = itemsByFarmer[farmerId];
            const farmer = farmerItems[0].crop.farmer;

            // Calculate delivery charge based on pincodes (₹10/km)
            const farmerPincode = farmer.pincode || '600001'; // Default if not set
            const { charge: deliveryCharge } = await calculateDeliveryCharge(farmerPincode, deliveryPincode);

            const itemsTotal = farmerItems.reduce((sum, i) => sum + (i.quantity * i.crop.basePrice), 0);

            // Create Order
            const order = await prisma.order.create({
                data: {
                    consumerId: session.id as string,
                    farmerId: farmerId,
                    status: 'PLACED',
                    totalAmount: itemsTotal,
                    deliveryCharge,
                    deliveryAddress,
                    deliveryPincode,
                    deliveryTime,
                    items: {
                        create: farmerItems.map(i => ({
                            cropId: i.cropId,
                            quantity: parseFloat(i.quantity.toString()),
                            price: i.crop.basePrice
                        }))
                    }
                },
                include: { items: true }
            });

            createdOrders.push(order);
        }

        return NextResponse.json({ success: true, orders: createdOrders });

    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let whereClause = {};
        if (session.role === 'FARMER') {
            whereClause = { farmerId: session.id };
        } else {
            whereClause = { consumerId: session.id };
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                items: { include: { crop: true } },
                consumer: { select: { name: true, mobile: true, email: true, address: true } },
                farmer: { select: { name: true, mobile: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Fetch orders error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
