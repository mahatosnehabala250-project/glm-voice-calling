import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/logs?level=error&source=agent&limit=100
export async function GET(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  const level = req.nextUrl.searchParams.get('level');
  const source = req.nextUrl.searchParams.get('source');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');

  try {
    // Use notifications as log entries since we don't have a dedicated logs table
    const logs = await db.notification.findMany({
      where: {
        clinicId,
        ...(level ? { type: level } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({
      logs: logs.map((l: Record<string, unknown>) => ({
        id: l.id,
        level: l.type === 'escalation' ? 'error' : l.type === 'system' ? 'info' : 'info',
        source: 'system',
        message: l.title,
        detail: l.message,
        timestamp: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
