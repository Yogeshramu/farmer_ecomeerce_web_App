import { NextResponse } from 'next/server';
import { calculateDeliveryCharge } from '@/lib/deliveryCalculator';

export async function POST(request: Request) {
    try {
        const { farmerPincode, consumerPincode } = await request.json();

        if (!farmerPincode || !consumerPincode) {
            return NextResponse.json({ error: 'Both pincodes required' }, { status: 400 });
        }

        const { charge, distance } = await calculateDeliveryCharge(farmerPincode, consumerPincode);

        return NextResponse.json({
            farmerPincode,
            consumerPincode,
            distanceKm: Math.round(distance),
            deliveryCharge: charge,
            formula: 'Distance (km) × ₹10'
        });
    } catch (error) {
        console.error('Distance calculation error:', error);
        return NextResponse.json({ error: 'Failed to calculate distance' }, { status: 500 });
    }
}
