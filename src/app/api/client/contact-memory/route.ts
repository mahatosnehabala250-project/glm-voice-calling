import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/contact-memory?phone=+919876543210 - Get all memories for a contact
export async function GET(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  const phone = req.nextUrl.searchParams.get('phone');

  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  try {
    const memories = await db.contactMemory.findMany({
      where: {
        clinicId,
        ...(phone ? { phoneNumber: phone } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ memories });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

// POST /api/client/contact-memory - Add a new memory (manual or AI-extracted)
export async function POST(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  try {
    const body = await req.json();
    const { phoneNumber, insight, category, confidence, sourceCallId, extractedBy } = body;

    if (!phoneNumber || !insight) {
      return NextResponse.json({ error: 'Phone number and insight required' }, { status: 400 });
    }

    const memory = await db.contactMemory.upsert({
      where: {
        clinicId_phoneNumber_insight: { clinicId, phoneNumber, insight: insight.substring(0, 1000) },
      },
      create: {
        clinicId,
        phoneNumber,
        insight: insight.substring(0, 1000),
        category: category || 'general',
        confidence: confidence || 0.9,
        sourceCallId,
        extractedBy: extractedBy || 'manual',
      },
      update: {
        confidence,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    console.error('Memory create error:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

// DELETE /api/client/contact-memory?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  try {
    await db.contactMemory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
