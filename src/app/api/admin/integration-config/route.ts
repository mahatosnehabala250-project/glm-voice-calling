import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, recordAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/admin/integration-config
// Save integration configuration to environment or agent config
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { service, config, clinicId } = body;

    if (!service || !config) {
      return NextResponse.json({ error: 'Missing service or config' }, { status: 400 });
    }

    // If clinicId is provided, save to AgentConfig
    if (clinicId && service === 'n8n') {
      const agentConfig = await db.agentConfig.upsert({
        where: { clinicId },
        create: {
          clinicId,
          n8nWebhookUrl: config.webhookUrl || null,
          n8nWebhookSecret: config.webhookSecret || null,
        },
        update: {
          n8nWebhookUrl: config.webhookUrl || undefined,
          n8nWebhookSecret: config.webhookSecret || undefined,
        },
      });

      await recordAuditLog({
        userId: auth.userId,
        userName: auth.userName,
        userRole: auth.userRole,
        action: 'update_integration_config',
        entityType: 'agent_config',
        entityId: agentConfig.id,
        details: { service, clinicId, updatedFields: Object.keys(config) },
      });

      return NextResponse.json({
        success: true,
        service,
        clinicId,
        message: `${service} configuration saved successfully`,
        savedAt: new Date().toISOString(),
      });
    }

    // Global platform config (non-clinic specific)
    await recordAuditLog({
      userId: auth.userId,
      userName: auth.userName,
      userRole: auth.userRole,
      action: 'update_platform_integration',
      details: { service, configFields: Object.keys(config) },
    });

    return NextResponse.json({
      success: true,
      service,
      message: `${service} configuration saved. Note: Environment variables require server restart to take full effect.`,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Integration Config] Error:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

// GET /api/admin/integration-config
// Get current integration status (WITHOUT leaking secrets)
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Check health of mini-services
    let vobizHealth = false;
    let geminiHealth = false;
    let wsBridgeHealth = false;

    try {
      const vobizRes = await fetch('http://localhost:3031/', { signal: AbortSignal.timeout(3000) });
      vobizHealth = vobizRes.ok;
    } catch { /* service not running */ }

    try {
      const geminiRes = await fetch('http://localhost:3032/', { signal: AbortSignal.timeout(3000) });
      geminiHealth = geminiRes.ok;
    } catch { /* service not running */ }

    try {
      const wsRes = await fetch('http://localhost:3033/', { signal: AbortSignal.timeout(3000) });
      wsBridgeHealth = wsRes.ok;
    } catch { /* service not running */ }

    // Check clinic count with n8n configured
    const clinicsWithN8n = await db.agentConfig.count({
      where: { n8nWebhookUrl: { not: null } },
    });

    return NextResponse.json({
      services: {
        vobiz: {
          status: vobizHealth ? 'operational' : 'down',
          configured: !!process.env.VOBIZ_AUTH_ID,
          authMethod: process.env.VOBIZ_USE_BASIC_AUTH !== 'false' ? 'basic' : 'headers',
          authIdConfigured: !!process.env.VOBIZ_AUTH_ID,
          numberConfigured: !!process.env.VOBIZ_MOBILE_NO,
          hmacEnabled: !!process.env.VOBIZ_WEBHOOK_SECRET,
          webhookBase: process.env.WEBHOOK_BASE ? 'configured' : 'not set',
        },
        gemini: {
          status: geminiHealth ? 'operational' : 'down',
          configured: !!process.env.GEMINI_API_KEY,
          demoMode: process.env.GEMINI_DEMO_MODE !== 'false',
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        },
        wsBridge: {
          status: wsBridgeHealth ? 'operational' : 'down',
          demoMode: process.env.WS_BRIDGE_DEMO_MODE !== 'false',
        },
        n8n: {
          status: !!process.env.N8N_WEBHOOK_URL ? 'configured' : 'not set',
          clinicsConnected: clinicsWithN8n,
          webhookUrl: process.env.N8N_WEBHOOK_URL ? '***configured***' : null,
          secretSet: !!process.env.N8N_WEBHOOK_SECRET,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Integration Config] Error:', error);
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 });
  }
}
