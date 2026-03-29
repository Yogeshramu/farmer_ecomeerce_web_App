import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key');

export async function signToken(payload: Record<string, unknown>, expiresIn = '15m') {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secretKey);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secretKey);
        return payload;
    } catch {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        const payload = await verifyToken(token);
        if (payload) {
            console.log("getSession - Valid accessToken for:", payload.id);
            return payload;
        }
    }

    // Try to refresh if no valid access token but refresh token exists
    const refreshToken = cookieStore.get('refreshToken')?.value;
    if (refreshToken) {
        console.log("getSession - Access token invalid, attempting refresh with refreshToken...");
        return await refreshAccessToken();
    }

    console.log("getSession - No valid tokens found.");
    return null;
}

export async function login(payload: Record<string, unknown>) {
    const accessToken = await signToken(payload, '15m');
    const refreshToken = await signToken({ id: payload.id }, '7d');

    const cookieStore = await cookies();
    cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60, // 15 minutes
        path: '/'
    });
    cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    });

    return { accessToken, refreshToken };
}

export async function refreshAccessToken() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
        console.log("refreshAccessToken - No refresh token cookie.");
        return null;
    }

    const payload = await verifyToken(refreshToken);
    if (!payload) {
        console.log("refreshAccessToken - Invalid refresh token.");
        return null;
    }

    console.log("refreshAccessToken - Refreshing for userID:", payload.id);
    // Get user data
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({ where: { id: payload.id as string } });
    if (!user) return null;

    // Generate new access token
    const newAccessToken = await signToken({ id: user.id, role: user.role, name: user.name, pincode: user.pincode }, '15m');

    cookieStore.set('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60,
        path: '/'
    });

    return { id: user.id, role: user.role, name: user.name, pincode: user.pincode };
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
}
