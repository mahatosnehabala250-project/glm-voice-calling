import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'voiceai-platform-secret-key-2025';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'client';
  clinicId?: string;
  clinicName?: string;
}

// Verify JWT token from request
export function verifyAuth(req: NextRequest): AuthPayload | null {
  try {
    // Check Authorization header first
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback: check x-auth-token header
    if (!token) {
      token = req.headers.get('x-auth-token');
    }

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
}

// Middleware: Require authentication
export function requireAuth(req: NextRequest): AuthPayload | NextResponse {
  const user = verifyAuth(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required. Please login again.' },
      { status: 401 }
    );
  }
  return user;
}

// Middleware: Require admin role
export function requireAdmin(req: NextRequest): AuthPayload | NextResponse {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required.' },
      { status: 403 }
    );
  }
  return authResult;
}

// Middleware: Require client role + verify clinic ownership
export function requireClient(req: NextRequest): AuthPayload | NextResponse {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.role !== 'client') {
    return NextResponse.json(
      { error: 'Client access required.' },
      { status: 403 }
    );
  }

  // Verify clinicId from token matches x-clinic-id header (if provided)
  const headerClinicId = req.headers.get('x-clinic-id');
  if (headerClinicId && authResult.clinicId && headerClinicId !== authResult.clinicId) {
    return NextResponse.json(
      { error: 'Access denied. You can only access your own clinic data.' },
      { status: 403 }
    );
  }

  return authResult;
}

// Sign a JWT token
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // 7 days
  });
}

// Get clinicId from auth (for client routes, uses x-clinic-id header as fallback)
export function getClinicId(req: NextRequest, auth: AuthPayload): string | null {
  // First try x-clinic-id header (for backward compat during transition)
  const headerClinicId = req.headers.get('x-clinic-id');
  if (headerClinicId) return headerClinicId;

  // Then try token's clinicId
  return auth.clinicId || null;
}

// Record audit log (async, fire-and-forget)
export async function recordAuditLog(params: {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    const { db } = await import('@/lib/db');
    await db.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
    // Don't throw — audit logging should not break the main flow
  }
}

// Send webhook to n8n (async, fire-and-forget with retry)
export async function sendN8nWebhook(params: {
  clinicId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  targetUrl?: string;
  webhookSecret?: string;
}): Promise<void> {
  try {
    const { db } = await import('@/lib/db');

    // Find the webhook URL — check agentConfig first, then fallback to env
    let targetUrl = params.targetUrl || process.env.N8N_WEBHOOK_URL;
    let secret = params.webhookSecret || process.env.N8N_WEBHOOK_SECRET;

    if (params.clinicId && !targetUrl) {
      const agentConfig = await db.agentConfig.findUnique({
        where: { clinicId: params.clinicId },
        select: { n8nWebhookUrl: true, n8nWebhookSecret: true },
      });
      if (agentConfig?.n8nWebhookUrl) {
        targetUrl = agentConfig.n8nWebhookUrl;
        secret = agentConfig.n8nWebhookSecret || secret;
      }
    }

    if (!targetUrl) {
      console.log(`[n8n] No webhook URL configured for ${params.eventType}`);
      return;
    }

    const payload = {
      event: params.eventType,
      timestamp: new Date().toISOString(),
      clinicId: params.clinicId,
      data: params.payload,
    };

    // Create webhook event record
    const webhookEvent = await db.webhookEvent.create({
      data: {
        clinicId: params.clinicId || null,
        eventType: params.eventType,
        payload: JSON.stringify(payload),
        targetUrl,
      },
    });

    // Send the webhook
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['x-webhook-secret'] = secret;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        statusCode: response.status,
        responseBody: await response.text().catch(() => null),
        success: response.ok,
        lastAttemptAt: new Date(),
        completedAt: response.ok ? new Date() : undefined,
      },
    });

    if (!response.ok) {
      console.error(`[n8n] Webhook failed: ${response.status} for ${params.eventType}`);
    }
  } catch (err) {
    console.error(`[n8n] Webhook error for ${params.eventType}:`, err);
  }
}
