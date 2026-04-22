import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/webhook-events?clinicId=xxx&eventType=xxx&success=true|false&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=20
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const clinicId = searchParams.get('clinicId') || undefined;
    const eventType = searchParams.get('eventType') || undefined;
    const success = searchParams.get('success');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const where: Record<string, unknown> = {};
    if (clinicId) where.clinicId = clinicId;
    if (eventType) where.eventType = eventType;
    if (success !== null && success !== undefined) where.success = success === 'true';

    // Date range filter
    if (startDate || endDate) {
      const sentAt: Record<string, Date> = {};
      if (startDate) sentAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        sentAt.lte = end;
      }
      where.sentAt = sentAt;
    }

    const [events, total] = await Promise.all([
      db.webhookEvent.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          clinic: { select: { id: true, name: true } },
        },
      }),
      db.webhookEvent.count({ where }),
    ]);

    // Also get success/failure counts for summary
    const [successCount, failedCount] = await Promise.all([
      db.webhookEvent.count({ where: { ...where, success: true } }),
      db.webhookEvent.count({ where: { ...where, success: false } }),
    ]);

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        clinicId: e.clinicId,
        clinicName: e.clinic?.name || 'Platform',
        eventType: e.eventType,
        payload: JSON.parse(e.payload),
        targetUrl: e.targetUrl,
        statusCode: e.statusCode,
        responseBody: e.responseBody,
        success: e.success,
        errorMessage: e.errorMessage,
        retryCount: e.retryCount,
        sentAt: e.sentAt.toISOString(),
        completedAt: e.completedAt?.toISOString() || null,
      })),
      summary: { total, successCount, failedCount },
      pagination: { page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Webhook events error:', err);
    return NextResponse.json({ error: 'Failed to fetch webhook events' }, { status: 500 });
  }
}

// POST /api/admin/webhook-events?action=retry&eventId=xxx
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'retry') {
      const eventId = searchParams.get('eventId');
      if (!eventId) {
        return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
      }

      const event = await db.webhookEvent.findUnique({ where: { id: eventId } });
      if (!event) {
        return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
      }

      if (event.success) {
        return NextResponse.json({ error: 'This webhook event already succeeded' }, { status: 400 });
      }

      if (event.retryCount >= event.maxRetries) {
        return NextResponse.json({ error: `Max retries (${event.maxRetries}) exceeded` }, { status: 400 });
      }

      const payload = JSON.parse(event.payload);

      let secret: string | undefined;
      if (event.clinicId) {
        const agentConfig = await db.agentConfig.findUnique({
          where: { clinicId: event.clinicId },
          select: { n8nWebhookSecret: true },
        });
        secret = agentConfig?.n8nWebhookSecret || undefined;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (secret) headers['x-webhook-secret'] = secret;

      const response = await fetch(event.targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.text().catch(() => null);

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
        message: response.ok ? 'Webhook retry succeeded' : `Retry failed with status ${response.status}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=retry' }, { status: 400 });
  } catch (err) {
    console.error('Webhook events POST error:', err);
    return NextResponse.json({ error: 'Failed to process webhook action' }, { status: 500 });
  }
}
