import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClient, getClinicId, sendN8nWebhook } from '@/lib/auth';

// GET /api/n8n?action=config
// Get the clinic's n8n webhook configuration and test reachability
export async function GET(req: NextRequest) {
  const auth = requireClient(req);
  if (auth instanceof NextResponse) return auth;

  const clinicId = getClinicId(req, auth);
  if (!clinicId) {
    return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'config') {
      const agentConfig = await db.agentConfig.findUnique({
        where: { clinicId },
        select: {
          n8nWebhookUrl: true,
          n8nWebhookSecret: true,
          lastTestedAt: true,
          lastTestResult: true,
        },
      });

      const config = {
        n8nWebhookUrl: agentConfig?.n8nWebhookUrl || null,
        n8nWebhookSecret: agentConfig?.n8nWebhookSecret
          ? '••••••••' // Mask the secret in the response
          : null,
        hasSecret: !!agentConfig?.n8nWebhookSecret,
        lastTestedAt: agentConfig?.lastTestedAt || null,
        lastTestResult: agentConfig?.lastTestResult || null,
      };

      // Test the webhook URL reachability (HEAD request)
      let reachable = false;
      let reachabilityError: string | null = null;

      if (agentConfig?.n8nWebhookUrl) {
        try {
          const response = await fetch(agentConfig.n8nWebhookUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          // A 4xx or 5xx still means the URL is reachable — we just care it responds
          reachable = true;
        } catch (fetchErr) {
          reachable = false;
          reachabilityError = fetchErr instanceof Error ? fetchErr.message : 'Connection failed';
        }
      }

      return NextResponse.json({
        config,
        reachability: {
          reachable,
          error: reachabilityError,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=config' }, { status: 400 });
  } catch (err) {
    console.error('n8n config GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch n8n configuration' }, { status: 500 });
  }
}

// POST /api/n8n?action=save|test
export async function POST(req: NextRequest) {
  const auth = requireClient(req);
  if (auth instanceof NextResponse) return auth;

  const clinicId = getClinicId(req, auth);
  if (!clinicId) {
    return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    // ── Save n8n webhook configuration ──
    if (action === 'save') {
      const body = await req.json();
      const { n8nWebhookUrl, n8nWebhookSecret } = body;

      if (!n8nWebhookUrl || typeof n8nWebhookUrl !== 'string') {
        return NextResponse.json({ error: 'n8nWebhookUrl is required' }, { status: 400 });
      }

      // Validate URL format
      try {
        new URL(n8nWebhookUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format for n8nWebhookUrl' }, { status: 400 });
      }

      // Upsert the agent config
      const agentConfig = await db.agentConfig.upsert({
        where: { clinicId },
        update: {
          n8nWebhookUrl,
          ...(n8nWebhookSecret !== undefined ? { n8nWebhookSecret } : {}),
        },
        create: {
          clinicId,
          n8nWebhookUrl,
          ...(n8nWebhookSecret ? { n8nWebhookSecret } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        n8nWebhookUrl: agentConfig.n8nWebhookUrl,
        hasSecret: !!agentConfig.n8nWebhookSecret,
        message: 'n8n webhook configuration saved successfully',
      });
    }

    // ── Send test event to configured n8n webhook ──
    if (action === 'test') {
      // Get the config to find the URL
      const agentConfig = await db.agentConfig.findUnique({
        where: { clinicId },
        select: {
          n8nWebhookUrl: true,
          n8nWebhookSecret: true,
        },
      });

      if (!agentConfig?.n8nWebhookUrl) {
        return NextResponse.json(
          { error: 'No n8n webhook URL configured. Please save a webhook URL first.' },
          { status: 400 }
        );
      }

      // Send test using the sendN8nWebhook utility
      await sendN8nWebhook({
        clinicId,
        eventType: 'test',
        payload: {
          message: 'Test webhook from VoiceAI platform',
          triggeredBy: auth.email,
          clinicId,
        },
        targetUrl: agentConfig.n8nWebhookUrl,
        webhookSecret: agentConfig.n8nWebhookSecret || undefined,
      });

      // Fetch the most recent test event to return its result
      // Note: sendN8nWebhook is fire-and-forget with slight delay, so we wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const latestEvent = await db.webhookEvent.findFirst({
        where: {
          clinicId,
          eventType: 'test',
        },
        orderBy: { sentAt: 'desc' },
      });

      // Update the agent config test info
      await db.agentConfig.update({
        where: { clinicId },
        data: {
          lastTestedAt: new Date(),
          lastTestResult: latestEvent?.success ? 'success' : 'failed',
        },
      });

      return NextResponse.json({
        success: latestEvent?.success || false,
        statusCode: latestEvent?.statusCode || null,
        responseBody: latestEvent?.responseBody || null,
        message: latestEvent?.success
          ? 'Test webhook sent successfully!'
          : `Test webhook failed${latestEvent?.statusCode ? ` (HTTP ${latestEvent.statusCode})` : ''}. Check your n8n workflow URL and try again.`,
        event: latestEvent
          ? {
              id: latestEvent.id,
              statusCode: latestEvent.statusCode,
              success: latestEvent.success,
            }
          : null,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=save or ?action=test' }, { status: 400 });
  } catch (err) {
    console.error('n8n POST error:', err);
    return NextResponse.json({ error: 'Failed to process n8n action' }, { status: 500 });
  }
}
