import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/calls
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const id = searchParams.get('id');

    if (id) {
      // Get single call with full transcript
      const call = await db.call.findFirst({ where: { id, clinicId } });
      if (!call) {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }
      return NextResponse.json({ call });
    }

    const where: Record<string, unknown> = { clinicId };
    if (status) where.status = status;

    const [calls, total] = await Promise.all([
      db.call.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.call.count({ where }),
    ]);

    return NextResponse.json({ calls, total, page, limit });
  } catch (err) {
    console.error('Calls error:', err);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
