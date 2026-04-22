import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/overview - Clinic overview stats
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const [
      callsAnsweredToday,
      appointmentsToday,
      missedCallsToday,
      totalCalls,
      totalAppointments,
      recentCalls,
      upcomingAppointments,
    ] = await Promise.all([
      db.call.count({
        where: {
          clinicId,
          status: { in: ['answered', 'completed', 'transferred'] },
          startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.appointment.count({
        where: { clinicId, date: today, status: { in: ['confirmed', 'pending'] } },
      }),
      db.call.count({
        where: {
          clinicId,
          status: 'missed',
          startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.call.count({ where: { clinicId } }),
      db.appointment.count({ where: { clinicId } }),
      db.call.findMany({
        where: { clinicId },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
      db.appointment.findMany({
        where: {
          clinicId,
          date: { gte: today },
          status: { in: ['pending', 'confirmed'] },
        },
        orderBy: { date: 'asc' },
        take: 5,
      }),
    ]);

    // Revenue from confirmed/completed appointments
    const revenueAppointments = await db.appointment.findMany({
      where: {
        clinicId,
        status: { in: ['confirmed', 'completed'] },
      },
      select: { consultationFee: true },
    });
    const totalRevenue = revenueAppointments.reduce((sum, a) => sum + (parseInt(a.consultationFee || '0') || 0), 0);

    // Weekly call analytics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weeklyAnalytics = await db.analyticsSnapshot.findMany({
      where: {
        clinicId,
        metricDate: { gte: sevenDaysAgo.toISOString().split('T')[0] },
      },
      orderBy: { metricDate: 'asc' },
    });

    return NextResponse.json({
      callsAnsweredToday,
      appointmentsToday,
      missedCallsToday,
      totalCalls,
      totalAppointments,
      totalRevenue,
      recentCalls,
      upcomingAppointments,
      weeklyAnalytics,
    });
  } catch (err) {
    console.error('Client overview error:', err);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}
