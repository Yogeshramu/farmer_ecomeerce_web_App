import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const userCount = await prisma.user.count();
        
        return NextResponse.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            userCount
        });
    } catch (error) {
        return NextResponse.json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
