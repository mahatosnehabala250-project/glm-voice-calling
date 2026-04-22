import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Allowed fields for client PUT (safe fields only - no Vobiz credentials)
const CLIENT_ALLOWED_FIELDS = [
  'agentName',
  'agentPersona',
  'greetingMessage',
  'farewellMessage',
  'language',
  'voiceProvider',
  'voiceId',
  'voiceName',
  'voiceGender',
  'voiceSpeed',
  'speakingRate',
  'maxCallDuration',
  'transferOnFail',
  'transferNumber',
  'escalationPrompt',
  'autoBookSlot',
  'bookingSlotDuration',
  'bookingLeadDays',
  'bufferMinutes',
  'maxBookingsPerDay',
  'autoConfirm',
  'requireConfirmation',
  'faqJson',
  'servicesJson',
  'clinicDescription',
  'specializations',
  'specialNotes',
  'escalationEnabled',
  'escalationAfter',
  'escalationKeywords',
  'escalationNumber',
  'sentimentThreshold',
  'askForFeedback',
  'collectPatientInfo',
  'testNotes',
];

// GET /api/client/agent-config - Get current clinic's agent config
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'x-clinic-id header required' }, { status: 400 });
    }

    let config = await db.agentConfig.findUnique({
      where: { clinicId },
    });

    if (!config) {
      config = await db.agentConfig.create({
        data: { clinicId },
      });
    }

    return NextResponse.json({ config });
  } catch (err) {
    console.error('Get client agent config error:', err);
    return NextResponse.json({ error: 'Failed to fetch agent config' }, { status: 500 });
  }
}

// PUT /api/client/agent-config - Update own clinic's agent config (restricted fields)
export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'x-clinic-id header required' }, { status: 400 });
    }

    const data = await req.json();

    const filteredData: Record<string, unknown> = {};
    for (const key of CLIENT_ALLOWED_FIELDS) {
      if (data[key] !== undefined) {
        filteredData[key] = data[key];
      }
    }

    // Auto-mark isConfigured=true when essential fields are filled
    const essentials = ['agentName', 'greetingMessage', 'voiceGender', 'language'];
    const hasEssentials = essentials.some((f) => filteredData[f] !== undefined && filteredData[f] !== '');
    if (hasEssentials) {
      filteredData.isConfigured = true;
    }

    const config = await db.agentConfig.upsert({
      where: { clinicId },
      create: {
        clinicId,
        ...filteredData,
      },
      update: filteredData,
    });

    return NextResponse.json({ config });
  } catch (err) {
    console.error('Update client agent config error:', err);
    return NextResponse.json({ error: 'Failed to update agent config' }, { status: 500 });
  }
}
