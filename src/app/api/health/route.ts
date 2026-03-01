import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded' : 'Missing');
    
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
        console.error('Health check error:', error);
        return NextResponse.json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        }, { status: 500 });
    }
}
