import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/patient-history?phone=...
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const phone = req.nextUrl.searchParams.get('phone');
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const [appointments, calls] = await Promise.all([
      db.appointment.findMany({
        where: { clinicId, patientPhone: phone },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        take: 50,
      }),
      db.call.findMany({
        where: { clinicId, callerPhone: phone },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }),
    ]);

    return NextResponse.json({ appointments, calls });
  } catch (err) {
    console.error('Patient history error:', err);
    return NextResponse.json({ error: 'Failed to fetch patient history' }, { status: 500 });
  }
}
