import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/clinics - List all clinics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { doctorName: { contains: search } },
        { city: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [clinics, total] = await Promise.all([
      db.clinic.findMany({
        where,
        include: {
          _count: { select: { calls: true, appointments: true, users: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.clinic.count({ where }),
    ]);

    return NextResponse.json({ clinics, total, page, limit });
  } catch (err) {
    console.error('List clinics error:', err);
    return NextResponse.json({ error: 'Failed to fetch clinics' }, { status: 500 });
  }
}

// POST /api/admin/clinics - Create new clinic
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      name, doctorName, phone, email, address, city, state, pincode,
      businessHours, businessDays, services, consultationFee, planType,
      whatsappNumber, language, escalationNumber,
    } = data;

    if (!name || !doctorName || !phone || !email) {
      return NextResponse.json({ error: 'Name, doctor, phone, and email are required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existing = await db.clinic.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'A clinic with a similar name already exists' }, { status: 409 });
    }

    const clinic = await db.clinic.create({
      data: {
        name, doctorName, slug, phone, email, address, city, state, pincode,
        businessHours: businessHours || '09:00-18:00',
        businessDays: businessDays || 'Mon-Fri',
        services: JSON.stringify(services || []),
        consultationFee: consultationFee || '',
        planType: planType || 'starter',
        status: planType === 'enterprise' ? 'active' : 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        whatsappNumber: whatsappNumber || '',
        language: language || 'hinglish',
        escalationNumber: escalationNumber || '',
      },
      include: {
        _count: { select: { calls: true, appointments: true, users: true } },
      },
    });

    return NextResponse.json({ clinic }, { status: 201 });
  } catch (err) {
    console.error('Create clinic error:', err);
    return NextResponse.json({ error: 'Failed to create clinic' }, { status: 500 });
  }
}

// PUT /api/admin/clinics - Update clinic
export async function PUT(req: NextRequest) {
  try {
    const { id, ...data } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.services) {
      updateData.services = JSON.stringify(data.services);
    }

    const clinic = await db.clinic.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { calls: true, appointments: true, users: true } },
      },
    });

    return NextResponse.json({ clinic });
  } catch (err) {
    console.error('Update clinic error:', err);
    return NextResponse.json({ error: 'Failed to update clinic' }, { status: 500 });
  }
}

// DELETE /api/admin/clinics - Delete clinic (soft delete via isActive)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    await db.clinic.update({
      where: { id },
      data: { isActive: false, status: 'suspended' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete clinic error:', err);
    return NextResponse.json({ error: 'Failed to delete clinic' }, { status: 500 });
  }
}
