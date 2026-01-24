import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership - only the farmer who created it can delete
        const crop = await prisma.crop.findUnique({
            where: { id },
            select: { farmerId: true }
        });

        if (!crop) {
            return NextResponse.json({ error: 'Crop not found' }, { status: 404 });
        }

        if (crop.farmerId !== session.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete the crop
        await prisma.crop.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Crop deleted successfully' });
    } catch (error) {
        console.error('Delete crop error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, quantityKg, basePrice } = body;

        // Verify ownership
        const crop = await prisma.crop.findUnique({
            where: { id },
            select: { farmerId: true }
        });

        if (!crop) {
            return NextResponse.json({ error: 'Crop not found' }, { status: 404 });
        }

        if (crop.farmerId !== session.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update the crop - only update fields that are provided
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (quantityKg !== undefined) updateData.quantityKg = parseFloat(quantityKg);
        if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice);

        await prisma.crop.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, message: 'Crop updated successfully' });
    } catch (error) {
        console.error('Update crop error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
