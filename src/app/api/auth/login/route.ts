import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { clinic: { select: { id: true, name: true, status: true, isActive: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const isValid = await compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role === 'client') {
      if (!user.clinic || !user.clinic.isActive) {
        return NextResponse.json({ error: 'Your clinic account is inactive. Please contact support.' }, { status: 403 });
      }
    }

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      user: {
        id: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role,
        clinicId: safeUser.clinicId,
        clinicName: safeUser.clinic?.name,
        phone: safeUser.phone,
        avatar: safeUser.avatar,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
