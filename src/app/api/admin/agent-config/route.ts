import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/agent-config - List all agent configs with clinic info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clinicId = searchParams.get('clinicId');

    const where: Record<string, unknown> = {};
    if (status) where.agentStatus = status;
    if (clinicId) where.clinicId = clinicId;

    const configs = await db.agentConfig.findMany({
      where,
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            doctorName: true,
            city: true,
            status: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ configs });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('List agent configs error:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch agent configs', details: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/agent-config - Create agent config for a clinic
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { clinicId, ...configData } = data;

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });
    }

    const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const existing = await db.agentConfig.findUnique({ where: { clinicId } });
    if (existing) {
      return NextResponse.json({ error: 'Agent config already exists for this clinic. Use PUT to update.' }, { status: 409 });
    }

    const config = await db.agentConfig.create({
      data: {
        clinicId,
        ...configData,
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            doctorName: true,
            city: true,
          },
        },
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Create agent config error:', errorMessage);
    return NextResponse.json({ error: 'Failed to create agent config', details: errorMessage }, { status: 500 });
  }
}
