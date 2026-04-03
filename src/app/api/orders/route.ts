import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calculateDeliveryCharge } from '@/lib/deliveryCalculator';
import { broadcastOrderUpdate, notifyFarmerOfNewOrder, sendRefreshToUser } from '@/lib/websocket-broadcast';

interface GroupedItem {
    cropId: string;
    quantity: number;
    decodedQty?: number;
    crop: {
        id: string;
        farmerId: string;
        basePrice: number;
        quantityKg: number;
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
        const { items, deliveryPincode, deliveryAddress, deliveryTime, contactNumber } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // 1. Batch fetch all crops at once
        const cropIds = items.map((i: { cropId: string }) => i.cropId);
        const allCrops = await prisma.crop.findMany({
            where: { id: { in: cropIds } },
            include: { farmer: true }
        });
        const cropMap = new Map(allCrops.map(c => [c.id, c]));

        // 1. Group items by farmer
        const itemsByFarmer: Record<string, GroupedItem[]> = {};

        for (const item of items) {
            const crop = cropMap.get(item.cropId);
            if (!crop) continue;

            const orderQty = parseFloat(item.quantity.toString());
            if (crop.quantityKg < orderQty) {
                return NextResponse.json({ error: `Not enough stock for ${crop.name}. Only ${crop.quantityKg}kg available.` }, { status: 400 });
            }

            if (!itemsByFarmer[crop.farmerId]) {
                itemsByFarmer[crop.farmerId] = [];
            }
            itemsByFarmer[crop.farmerId].push({ ...item, crop, decodedQty: orderQty });
        }

        const createdOrders = [];

        // 2. Create Order per Farmer
        for (const farmerId in itemsByFarmer) {
            const farmerItems = itemsByFarmer[farmerId];
            const farmer = farmerItems[0].crop.farmer;

            // Calculate delivery charge based on pincodes (₹10/km)
            const farmerPincode = farmer.pincode || '600001'; // Default if not set
            const { charge } = await calculateDeliveryCharge(farmerPincode, deliveryPincode);
            
            // Check for free delivery condition (buying at least 25% of a crop's stock)
            const qualifiesForFreeDelivery = farmerItems.some(i => {
                const orderQty = i.decodedQty || parseFloat(i.quantity.toString());
                const availableStock = i.crop.quantityKg;
                return orderQty >= (availableStock * 0.25);
            });
            
            const deliveryCharge = qualifiesForFreeDelivery ? 0 : charge;

            const itemsTotal = farmerItems.reduce((sum, i) => sum + (i.quantity * i.crop.basePrice), 0);

            // Create Order
            const order = await (prisma as any).order.create({
                data: {
                    consumerId: session.id as string,
                    farmerId: farmerId,
                    status: 'PLACED',
                    totalAmount: itemsTotal,
                    deliveryCharge,
                    deliveryAddress,
                    deliveryPincode,
                    deliveryTime,
                    contactNumber,
                    items: {
                        create: farmerItems.map(i => ({
                            cropId: i.cropId,
                            quantity: i.decodedQty || parseFloat(i.quantity.toString()),
                            price: i.crop.basePrice
                        }))
                    }
                },
                include: { items: true }
            });

            // Decrement crop quantities in parallel
            await Promise.all(farmerItems.map(i => {
                const qtyToDeduct = i.decodedQty || parseFloat(i.quantity.toString());
                return prisma.crop.update({
                    where: { id: i.cropId },
                    data: { quantityKg: { decrement: qtyToDeduct } }
                });
            }));

            createdOrders.push(order);

            // Fire-and-forget: notify farmer via WS (push REFRESH so dashboard re-fetches)
            prisma.user.findUnique({ where: { id: session.id as string } }).then(consumer => {
                if (consumer) notifyFarmerOfNewOrder(farmerId, order.id, consumer.name);
            });
            sendRefreshToUser(farmerId, 'orders');

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
                farmer: { select: { name: true, mobile: true } },
                review: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Fetch orders error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
