import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/activity-feed - Real activity feed from database
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const limit = 20;

    // Fetch recent calls (last 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const recentCalls = await db.call.findMany({
      where: {
        startedAt: { gte: oneDayAgo },
      },
      include: {
        clinic: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    // Fetch recent appointments (last 24h)
    const today = new Date().toISOString().split('T')[0];
    const recentAppointments = await db.appointment.findMany({
      where: {
        date: { gte: today },
      },
      include: {
        clinic: { select: { name: true, doctorName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch recent notifications (last 24h)
    const recentNotifications = await db.notification.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch recent webhook events (last 24h)
    const recentWebhookEvents = await db.webhookEvent.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Build unified activity feed
    type ActivityItem = {
      id: string;
      type: 'call' | 'booking' | 'whatsapp' | 'system' | 'call_end' | 'escalation';
      description: string;
      timestamp: string;
      metadata?: Record<string, unknown>;
    };

    const activities: ActivityItem[] = [];

    // Map calls to activities
    for (const call of recentCalls) {
      const clinicName = call.clinic?.name || 'Unknown Clinic';
      const callerName = call.callerName || call.callerPhone || 'Unknown Caller';
      const time = call.startedAt ? new Date(call.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

      if (call.status === 'completed' || call.status === 'in-progress') {
        const duration = call.duration
          ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
          : '';
        activities.push({
          id: `call-${call.id}`,
          type: 'call',
          description: `Call from ${callerName} at ${clinicName}${duration ? ` (${duration})` : ''}`,
          timestamp: call.startedAt?.toISOString() || '',
          metadata: { clinicName, callerName, status: call.status, duration: call.duration },
        });
      } else if (call.status === 'missed') {
        activities.push({
          id: `call-${call.id}`,
          type: 'escalation',
          description: `Missed call from ${callerName} at ${clinicName}`,
          timestamp: call.startedAt?.toISOString() || '',
          metadata: { clinicName, callerName, status: call.status },
        });
      } else if (call.status === 'transferred') {
        activities.push({
          id: `call-${call.id}`,
          type: 'escalation',
          description: `Call transferred: ${callerName} → ${clinicName} escalation`,
          timestamp: call.startedAt?.toISOString() || '',
          metadata: { clinicName, callerName, status: call.status },
        });
      }
    }

    // Map appointments to activities
    for (const appt of recentAppointments) {
      const clinicName = appt.clinic?.name || 'Unknown Clinic';
      const doctorName = appt.clinic?.doctorName || '';
      const patientName = appt.patientName || appt.patientPhone || 'Unknown';

      if (appt.status === 'confirmed') {
        activities.push({
          id: `booking-${appt.id}`,
          type: 'booking',
          description: `Appointment booked: ${patientName} → ${doctorName || clinicName}`,
          timestamp: appt.createdAt?.toISOString() || '',
          metadata: { clinicName, patientName, doctorName, date: appt.date, time: appt.time },
        });

        if (appt.whatsappSent) {
          activities.push({
            id: `wa-${appt.id}`,
            type: 'whatsapp',
            description: `WhatsApp confirmation sent to ${appt.patientPhone || patientName}`,
            timestamp: (appt.whatsappSentAt || appt.createdAt)?.toISOString() || '',
            metadata: { clinicName, patientPhone: appt.patientPhone },
          });
        }
      } else if (appt.status === 'cancelled') {
        activities.push({
          id: `cancel-${appt.id}`,
          type: 'call_end',
          description: `Appointment cancelled: ${patientName} at ${clinicName}`,
          timestamp: appt.createdAt?.toISOString() || '',
          metadata: { clinicName, patientName },
        });
      }
    }

    // Map webhook events
    for (const event of recentWebhookEvents) {
      activities.push({
        id: `webhook-${event.id}`,
        type: 'system',
        description: `n8n webhook: ${event.eventType || 'event'} ${event.responseStatus === 'success' ? '✓' : '⚠'}`,
        timestamp: event.createdAt?.toISOString() || '',
        metadata: { eventType: event.eventType, status: event.responseStatus, clinicId: event.clinicId },
      });
    }

    // Map notifications
    for (const notif of recentNotifications) {
      const typeMap: Record<string, ActivityItem['type']> = {
        booking: 'booking',
        escalation: 'escalation',
        missed_call: 'escalation',
        system: 'system',
      };
      activities.push({
        id: `notif-${notif.id}`,
        type: typeMap[notif.type] || 'system',
        description: notif.message || notif.title || 'System event',
        timestamp: notif.createdAt?.toISOString() || '',
      });
    }

    // Sort by timestamp descending and take top 20
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ activities: activities.slice(0, limit), total: activities.length });
  } catch (err) {
    console.error('Activity feed error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}
