import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/vobiz-config — Get the clinic's Vobiz SIP configuration
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'x-clinic-id header required' }, { status: 400 });
    }

    // Fetch clinic info (sipNumber, escalationNumber)
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        doctorName: true,
        phone: true,
        sipNumber: true,
        sipId: true,
        escalationNumber: true,
        city: true,
        status: true,
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Fetch agent config with all Vobiz fields
    const agentConfig = await db.agentConfig.findUnique({
      where: { clinicId },
      select: {
        agentName: true,
        agentStatus: true,
        isActive: true,
        isConfigured: true,
        vobizPhoneNumber: true,
        vobizTrunkId: true,
        vobizTrunkDomain: true,
        vobizCredentialId: true,
        vobizCredentialUser: true,
        vobizAppId: true,
        vobizAppUrl: true,
        webhookUrl: true,
        answerUrl: true,
        hangupUrl: true,
        fallbackUrl: true,
        lastTestResult: true,
        totalAgentCalls: true,
        totalAgentBookings: true,
      },
    });

    // Build response
    const hasNumber = Boolean(clinic.sipNumber);
    const isFullyConfigured = Boolean(
      agentConfig &&
      clinic.sipNumber &&
      agentConfig.vobizTrunkId &&
      agentConfig.agentStatus === 'active'
    );

    return NextResponse.json({
      clinic: {
        name: clinic.name,
        doctorName: clinic.doctorName,
        city: clinic.city,
        phone: clinic.phone,
        sipNumber: clinic.sipNumber || null,
        sipId: clinic.sipId || null,
        escalationNumber: clinic.escalationNumber || null,
        status: clinic.status,
      },
      agentConfig: agentConfig
        ? {
            agentName: agentConfig.agentName,
            agentStatus: agentConfig.agentStatus,
            isActive: agentConfig.isActive,
            isConfigured: agentConfig.isConfigured,
            vobizPhoneNumber: agentConfig.vobizPhoneNumber,
            vobizTrunkId: agentConfig.vobizTrunkId,
            vobizTrunkDomain: agentConfig.vobizTrunkDomain,
            vobizCredentialId: agentConfig.vobizCredentialId,
            vobizCredentialUser: agentConfig.vobizCredentialUser,
            vobizAppId: agentConfig.vobizAppId,
            vobizAppUrl: agentConfig.vobizAppUrl,
            webhookUrl: agentConfig.webhookUrl,
            answerUrl: agentConfig.answerUrl,
            hangupUrl: agentConfig.hangupUrl,
            fallbackUrl: agentConfig.fallbackUrl,
            lastTestResult: agentConfig.lastTestResult,
            totalAgentCalls: agentConfig.totalAgentCalls,
            totalAgentBookings: agentConfig.totalAgentBookings,
          }
        : null,
      status: {
        hasNumber,
        hasAgentConfig: Boolean(agentConfig),
        isFullyConfigured,
        agentStatus: agentConfig?.agentStatus || 'none',
      },
    });
  } catch (err) {
    console.error('Get client vobiz config error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Vobiz configuration' },
      { status: 500 },
    );
  }
}
