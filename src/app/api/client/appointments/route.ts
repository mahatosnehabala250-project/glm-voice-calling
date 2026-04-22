import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/appointments
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { clinicId };
    if (status) where.status = status;
    if (dateFrom) where.date = { ...(where.date as Record<string, unknown> || {}), gte: dateFrom };
    if (dateTo) where.date = { ...(where.date as Record<string, unknown> || {}), lte: dateTo };
    if (dateFrom && dateTo) where.date = { gte: dateFrom, lte: dateTo };

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.appointment.count({ where }),
    ]);

    return NextResponse.json({ appointments, total, page, limit });
  } catch (err) {
    console.error('Appointments error:', err);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

// POST /api/client/appointments - Create new appointment
export async function POST(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const { patientName, patientPhone, date, time, reason } = await req.json();

    if (!patientName || !patientPhone || !date || !time) {
      return NextResponse.json({ error: 'Patient name, phone, date, and time are required' }, { status: 400 });
    }

    const appointment = await db.appointment.create({
      data: {
        clinicId,
        patientName,
        patientPhone,
        date,
        time,
        reason: reason || null,
        status: 'confirmed',
        bookedVia: 'manual',
        whatsappSent: true,
        whatsappSentAt: new Date(),
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error('Create appointment error:', err);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}

// PUT /api/client/appointments - Update appointment status
export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Appointment ID and status required' }, { status: 400 });
    }

    // Verify the appointment belongs to this clinic
    const existing = await db.appointment.findFirst({ where: { id, clinicId } });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'confirmed') {
      updateData.whatsappSent = true;
      updateData.whatsappSentAt = new Date();
    }

    const appointment = await db.appointment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ appointment });
  } catch (err) {
    console.error('Update appointment error:', err);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
