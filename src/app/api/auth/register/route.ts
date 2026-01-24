import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password, role, mobile, pincode, address, latitude, longitude } = body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check existing
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                mobile,
                pincode,
                address,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            },
        });

        // Auto login updates the cookie
        await login({ id: user.id, role: user.role, name: user.name });

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
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
