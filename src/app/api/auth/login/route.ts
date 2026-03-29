import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, requiredRole } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // ✅ RBAC: Enforce role-based portal access
        if (requiredRole && user.role !== requiredRole) {
            const portalName = requiredRole === 'FARMER' ? 'Farmer' : 'Consumer';
            const correctPortal = user.role === 'FARMER' ? '/farmer/login' : '/consumer/login';
            return NextResponse.json({
                error: `Access denied. This is the ${portalName} portal. Please use the ${user.role === 'FARMER' ? 'Farmer' : 'Consumer'} portal to login.`,
                correctPortal,
                userRole: user.role
            }, { status: 403 });
        }

        // Login
        await login({ id: user.id, role: user.role, name: user.name, pincode: user.pincode });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
