import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/agent-config/[id] - Get single agent config
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await db.agentConfig.findUnique({
      where: { id },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            doctorName: true,
            city: true,
            status: true,
            phone: true,
            email: true,
            language: true,
            services: true,
            consultationFee: true,
          },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Agent config not found' }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (err) {
    console.error('Get agent config error:', err);
    return NextResponse.json({ error: 'Failed to fetch agent config' }, { status: 500 });
  }
}

// PUT /api/admin/agent-config/[id] - Update agent config
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const existing = await db.agentConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Agent config not found' }, { status: 404 });
    }

    const config = await db.agentConfig.update({
      where: { id },
      data,
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

    return NextResponse.json({ config });
  } catch (err) {
    console.error('Update agent config error:', err);
    return NextResponse.json({ error: 'Failed to update agent config' }, { status: 500 });
  }
}

// DELETE /api/admin/agent-config/[id] - Delete agent config
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.agentConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Agent config not found' }, { status: 404 });
    }

    await db.agentConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete agent config error:', err);
    return NextResponse.json({ error: 'Failed to delete agent config' }, { status: 500 });
  }
}
