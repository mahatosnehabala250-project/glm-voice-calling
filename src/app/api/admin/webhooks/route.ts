import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, sendN8nWebhook } from '@/lib/auth';

// GET /api/admin/webhooks?action=events|stats
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    // ── List webhook events with pagination ──
    if (action === 'events') {
      const clinicId = searchParams.get('clinicId') || undefined;
      const eventType = searchParams.get('eventType') || undefined;
      const successFilter = searchParams.get('success');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      const where: Record<string, unknown> = {};
      if (clinicId) where.clinicId = clinicId;
      if (eventType) where.eventType = eventType;
      if (successFilter !== null) {
        where.success = successFilter === 'true';
      }

      const [events, total, successful, failed] = await Promise.all([
        db.webhookEvent.findMany({
          where,
          include: {
            clinic: { select: { id: true, name: true } },
          },
          orderBy: { sentAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.webhookEvent.count({ where }),
        db.webhookEvent.count({ where: { ...where, success: true } }),
        db.webhookEvent.count({ where: { ...where, success: false } }),
      ]);

      // Count events still pending (no completedAt and not succeeded)
      const pendingWhere: Record<string, unknown> = {
        ...where,
        success: false,
        completedAt: null,
      };
      if (successFilter === null || successFilter !== 'true') {
        // Only compute pending if we're not filtering by success=true
      }
      const pending = await db.webhookEvent.count({ where: pendingWhere });

      return NextResponse.json({
        events,
        total,
        page,
        limit,
        stats: {
          total,
          successful,
          failed,
          pending,
        },
      });
    }

    // ── Webhook statistics ──
    if (action === 'stats') {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalSent,
        totalSuccessful,
        totalFailed,
        last7Sent,
        last7Successful,
        eventsByType,
        recentFailures,
      ] = await Promise.all([
        db.webhookEvent.count(),
        db.webhookEvent.count({ where: { success: true } }),
        db.webhookEvent.count({ where: { success: false } }),
        db.webhookEvent.count({ where: { sentAt: { gte: last7Days } } }),
        db.webhookEvent.count({ where: { success: true, sentAt: { gte: last7Days } } }),
        db.webhookEvent.groupBy({
          by: ['eventType'],
          _count: { id: true },
        }),
        db.webhookEvent.findMany({
          where: { success: false },
          include: {
            clinic: { select: { id: true, name: true } },
          },
          orderBy: { sentAt: 'desc' },
          take: 10,
        }),
      ]);

      const successRate = totalSent > 0
        ? Math.round((totalSuccessful / totalSent) * 100)
        : 0;

      const last7SuccessRate = last7Sent > 0
        ? Math.round((last7Successful / last7Sent) * 100)
        : 0;

      return NextResponse.json({
        totalSent,
        totalSuccessful,
        totalFailed,
        successRate,
        last7Days: {
          sent: last7Sent,
          successful: last7Successful,
          successRate: last7SuccessRate,
        },
        byEventType: eventsByType.map((et) => ({
          eventType: et.eventType,
          count: (et._count as Record<string, number> | undefined)?.id ?? 0,
        })),
        recentFailures: recentFailures.map((f) => ({
          id: f.id,
          eventType: f.eventType,
          statusCode: f.statusCode,
          errorMessage: f.errorMessage,
          retryCount: f.retryCount,
          sentAt: f.sentAt,
          clinic: f.clinic ? { id: f.clinic.id, name: f.clinic.name } : null,
        })),
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=events or ?action=stats' }, { status: 400 });
  } catch (err) {
    console.error('Admin webhooks GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch webhook data' }, { status: 500 });
  }
}

// POST /api/admin/webhooks?action=test|retry
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    // ── Send a test webhook ──
    if (action === 'test') {
      const clinicId = searchParams.get('clinicId');
      if (!clinicId) {
        return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });
      }

      // Find the clinic and its n8n config
      const clinic = await db.clinic.findUnique({
        where: { id: clinicId },
        select: { id: true, name: true, agentConfig: { select: { n8nWebhookUrl: true, n8nWebhookSecret: true } } },
      });

      if (!clinic) {
        return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
      }

      if (!clinic.agentConfig?.n8nWebhookUrl) {
        return NextResponse.json({ error: 'No n8n webhook URL configured for this clinic' }, { status: 400 });
      }

      // Send the test webhook
      const payload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        clinicId: clinic.id,
        clinicName: clinic.name,
        data: {
          message: 'This is a test webhook from VoiceAI platform',
          triggeredBy: auth.email,
          triggeredAt: new Date().toISOString(),
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (clinic.agentConfig.n8nWebhookSecret) {
        headers['x-webhook-secret'] = clinic.agentConfig.n8nWebhookSecret;
      }

      const response = await fetch(clinic.agentConfig.n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.text().catch(() => null);

      // Record the test event
      await db.webhookEvent.create({
        data: {
          clinicId: clinic.id,
          eventType: 'test',
          payload: JSON.stringify(payload),
          targetUrl: clinic.agentConfig.n8nWebhookUrl,
          statusCode: response.status,
          responseBody,
          success: response.ok,
          lastAttemptAt: new Date(),
          completedAt: response.ok ? new Date() : undefined,
        },
      });

      return NextResponse.json({
        success: response.ok,
        statusCode: response.status,
        responseBody,
        message: response.ok
          ? `Test webhook sent successfully to ${clinic.name}`
          : `Test webhook failed with status ${response.status}`,
      });
    }

    // ── Retry a failed webhook event ──
    if (action === 'retry') {
      const eventId = searchParams.get('eventId');
      if (!eventId) {
        return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
      }

      const event = await db.webhookEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
      }

      if (event.success) {
        return NextResponse.json({ error: 'This webhook event already succeeded. No need to retry.' }, { status: 400 });
      }

      if (event.retryCount >= event.maxRetries) {
        return NextResponse.json({ error: `Max retries (${event.maxRetries}) already exceeded. Cannot retry.` }, { status: 400 });
      }

      // Parse original payload
      const payload = JSON.parse(event.payload);

      // Find the secret for this clinic
      let secret = process.env.N8N_WEBHOOK_SECRET;
      if (event.clinicId) {
        const agentConfig = await db.agentConfig.findUnique({
          where: { clinicId: event.clinicId },
          select: { n8nWebhookSecret: true },
        });
        if (agentConfig?.n8nWebhookSecret) {
          secret = agentConfig.n8nWebhookSecret;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (secret) {
        headers['x-webhook-secret'] = secret;
      }

      const response = await fetch(event.targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.text().catch(() => null);

      // Update the event
      const updatedEvent = await db.webhookEvent.update({
        where: { id: eventId },
        data: {
          statusCode: response.status,
          responseBody,
          success: response.ok,
          retryCount: { increment: 1 },
          lastAttemptAt: new Date(),
          completedAt: response.ok ? new Date() : undefined,
          errorMessage: response.ok ? null : `HTTP ${response.status}`,
        },
      });

      return NextResponse.json({
        success: response.ok,
        event: updatedEvent,
        message: response.ok
          ? 'Webhook retry succeeded'
          : `Webhook retry failed with status ${response.status}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=test or ?action=retry' }, { status: 400 });
  } catch (err) {
    console.error('Admin webhooks POST error:', err);
    return NextResponse.json({ error: 'Failed to process webhook action' }, { status: 500 });
  }
}

// DELETE /api/admin/webhooks?action=clear&beforeDate=YYYY-MM-DD
export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'clear') {
      const beforeDate = searchParams.get('beforeDate');
      if (!beforeDate) {
        return NextResponse.json({ error: 'beforeDate is required (YYYY-MM-DD)' }, { status: 400 });
      }

      const date = new Date(beforeDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }

      const result = await db.webhookEvent.deleteMany({
        where: {
          sentAt: { lt: date },
        },
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `Cleared ${result.count} webhook events before ${beforeDate}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=clear&beforeDate=YYYY-MM-DD' }, { status: 400 });
  } catch (err) {
    console.error('Admin webhooks DELETE error:', err);
    return NextResponse.json({ error: 'Failed to clear webhook events' }, { status: 500 });
  }
}
