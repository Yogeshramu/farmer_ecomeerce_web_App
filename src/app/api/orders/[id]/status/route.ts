import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'FARMER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const { id } = params;
        const body = await request.json();
        const { status } = body;

        // Verify ownership
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order || order.farmerId !== session.id) {
            return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (error) {
        console.error('Update status error:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
