import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const questions = await prisma.question.findMany({
        orderBy: { order: 'asc' }
    });

    return NextResponse.json({ questions });
}
