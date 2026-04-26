import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/campaigns - List all campaigns for a clinic
export async function GET(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  try {
    const campaigns = await db.campaign.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/client/campaigns - Create a new campaign
export async function POST(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  try {
    const body = await req.json();
    const { name, contactsJson, scheduleType, scheduleTime, scheduleDays, callDelaySeconds, maxRetries, systemPrompt, agentProfileId } = body;

    if (!name) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 });

    const contacts = typeof contactsJson === 'string' ? JSON.parse(contactsJson) : (contactsJson || []);
    const totalContacts = Array.isArray(contacts) ? contacts.length : 0;

    const campaign = await db.campaign.create({
      data: {
        clinicId,
        name,
        contactsJson: JSON.stringify(contacts),
        totalContacts,
        scheduleType: scheduleType || 'once',
        scheduleTime: scheduleTime || '09:00',
        scheduleDays: scheduleDays ? JSON.stringify(scheduleDays) : null,
        callDelaySeconds: callDelaySeconds || 3,
        maxRetries: maxRetries || 2,
        systemPrompt,
        agentProfileId,
        status: totalContacts > 0 ? 'active' : 'draft',
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Campaign create error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
