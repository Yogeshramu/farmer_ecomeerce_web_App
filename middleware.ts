import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key');

async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secretKey);
        return payload;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const publicPaths = new Set([
        '/',
        '/farmer/login',
        '/farmer/register',
        '/consumer/login',
        '/consumer/register'
    ]);
    
    // Skip middleware for API routes, static files, and auth pages
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/static/') ||
        publicPaths.has(pathname)
    ) {
        return NextResponse.next();
    }
    
    const token = request.cookies.get('accessToken')?.value;
    const session = token ? await verifyAccessToken(token) : null;
    
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
        const role = session.role;
        if (pathname.startsWith('/farmer/') && role !== 'FARMER') {
            return NextResponse.redirect(new URL('/consumer/dashboard', request.url));
        }
        if (pathname.startsWith('/consumer/') && role !== 'CONSUMER') {
            return NextResponse.redirect(new URL('/farmer/dashboard', request.url));
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/farmer/:path*', '/consumer/:path*']
};