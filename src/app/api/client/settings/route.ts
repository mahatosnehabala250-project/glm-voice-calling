import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/settings - Get clinic settings
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true, name: true, doctorName: true, phone: true, email: true,
        address: true, city: true, state: true, pincode: true,
        sipNumber: true, escalationNumber: true,
        businessHours: true, businessDays: true, services: true,
        consultationFee: true, whatsappNumber: true, language: true,
        greetingMessage: true,
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Parse services from JSON string
    const parsedClinic = {
      ...clinic,
      services: JSON.parse(clinic.services || '[]'),
    };

    return NextResponse.json({ clinic: parsedClinic });
  } catch (err) {
    console.error('Get settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/client/settings - Update clinic settings
export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const data = await req.json();
    const updateData: Record<string, unknown> = { ...data };

    if (data.services) {
      updateData.services = JSON.stringify(data.services);
    }

    delete updateData.id;

    const clinic = await db.clinic.update({
      where: { id: clinicId },
      data: updateData,
    });

    return NextResponse.json({ clinic });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
