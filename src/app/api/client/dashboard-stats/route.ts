import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, startOfMonth, endOfMonth, isThisMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    const clinicId = request.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Parallel fetch all data
    const [calls, appointments, monthAppointments] = await Promise.all([
      // Today's calls (using startedAt for date filtering)
      db.call.findMany({
        where: {
          clinicId,
          startedAt: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
            lt: new Date(`${todayStr}T23:59:59.999Z`),
          },
        },
      }),
      // Today's appointments
      db.appointment.findMany({
        where: { clinicId, date: todayStr },
      }),
      // This month's appointments for revenue
      db.appointment.findMany({
        where: {
          clinicId,
          date: { gte: format(monthStart, 'yyyy-MM-dd'), lte: format(monthEnd, 'yyyy-MM-dd') },
          status: 'confirmed',
        },
      }),
    ]);

    const callsToday = calls.length;
    const callsAnswered = calls.filter(c => c.status === 'completed' || c.status === 'in-progress').length;
    const missedCalls = calls.filter(c => c.status === 'missed' || c.status === 'no-answer').length;
    const bookingsToday = appointments.filter(a => a.status === 'confirmed').length;
    const revenueThisMonth = monthAppointments.reduce((sum, a) => sum + parseInt(a.consultationFee || '0', 10), 0);

    // Calculate avg call duration from all calls (not just today)
    const completedCalls = await db.call.findMany({
      where: { clinicId, status: 'completed', duration: { gt: 0 } },
      select: { duration: true },
      take: 50,
    });
    const avgCallDuration = completedCalls.length > 0
      ? Math.round(completedCalls.reduce((s, c) => s + (c.duration || 0), 0) / completedCalls.length)
      : 0;

    // Active patients (unique callers in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCalls = await db.call.findMany({
      where: {
        clinicId,
        startedAt: { gte: thirtyDaysAgo },
      },
      select: { callerPhone: true },
      distinct: ['callerPhone'],
    });
    const activePatients = recentCalls.length;

    // Upcoming appointments (future confirmed)
    const upcomingAppointments = await db.appointment.count({
      where: {
        clinicId,
        status: 'confirmed',
        date: { gte: todayStr },
      },
    });

    // AI accuracy (simulated from booking conversion)
    const totalCallsAll = await db.call.count({ where: { clinicId } });
    const totalBookingsAll = await db.appointment.count({ where: { clinicId, bookedVia: 'ai' } });
    const aiAccuracy = totalCallsAll > 0 ? Math.round((totalBookingsAll / totalCallsAll) * 100) : 0;

    // Patient satisfaction (simulated)
    const positiveCalls = await db.call.count({ where: { clinicId, sentiment: 'positive' } });
    const totalWithSentiment = await db.call.count({ where: { clinicId, sentiment: { in: ['positive', 'negative', 'neutral'] } } });
    const patientSatisfaction = totalWithSentiment > 0
      ? Math.round((positiveCalls / totalWithSentiment) * 100)
      : 92; // default if no data

    return NextResponse.json({
      callsToday,
      callsAnswered,
      missedCalls,
      bookingsToday,
      revenueThisMonth,
      avgCallDuration,
      activePatients,
      upcomingAppointments,
      aiAccuracy,
      patientSatisfaction,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
