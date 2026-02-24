import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Skip middleware for API routes, static files, and auth pages
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/static/') ||
        pathname === '/farmer/login' ||
        pathname === '/consumer/login' ||
        pathname === '/consumer/register' ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }
    
    const session = await getSession();
    
    // Redirect to login if not authenticated
    if (!session) {
        if (pathname.startsWith('/farmer/')) {
            return NextResponse.redirect(new URL('/farmer/login', request.url));
        }
        if (pathname.startsWith('/consumer/')) {
            return NextResponse.redirect(new URL('/consumer/login', request.url));
        }
    }
    
    // Role-based access control
    if (session) {
        if (pathname.startsWith('/farmer/') && session.role !== 'FARMER') {
            return NextResponse.redirect(new URL('/consumer/dashboard', request.url));
        }
        if (pathname.startsWith('/consumer/') && session.role !== 'CONSUMER') {
            return NextResponse.redirect(new URL('/farmer/dashboard', request.url));
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/farmer/:path*', '/consumer/:path*']
};