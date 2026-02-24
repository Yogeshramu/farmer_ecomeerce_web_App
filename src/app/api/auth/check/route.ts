import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        
        if (!session) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }
        
        return NextResponse.json({ 
            authenticated: true, 
            user: session 
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
    }
}