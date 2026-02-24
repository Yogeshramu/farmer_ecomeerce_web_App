import { NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';

export async function POST() {
    try {
        const session = await refreshAccessToken();
        
        if (!session) {
            return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        }
        
        return NextResponse.json({ success: true, user: session });
    } catch (error) {
        console.error('Refresh token error:', error);
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
    }
}