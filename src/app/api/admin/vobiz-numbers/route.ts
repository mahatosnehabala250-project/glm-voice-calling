import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Demo phone number pool for Vobiz provisioning
const VOBIZ_NUMBER_POOL = [
  '+919876543210',
  '+919876543211',
  '+919876543212',
  '+919876543213',
  '+919876543214',
  '+919876543215',
];

// GET /api/admin/vobiz-numbers — List all phone number assignments + available pool
export async function GET() {
  try {
    // Fetch all clinics with their SIP numbers and agent configs
    const clinics = await db.clinic.findMany({
      where: { isActive: true },
      include: {
        agentConfig: {
          select: {
            vobizPhoneNumber: true,
            vobizTrunkId: true,
            vobizTrunkDomain: true,
            vobizCredentialId: true,
            vobizCredentialUser: true,
            vobizAppId: true,
            vobizAppUrl: true,
            agentStatus: true,
            lastTestedAt: true,
            lastTestResult: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Determine which pool numbers are already assigned
    const assignedNumbers = new Set(
      clinics
        .map((c) => c.sipNumber)
        .filter((n): n is string => typeof n === 'string' && n.length > 0),
    );

    // Build number pool with assignment status
    const numbers = VOBIZ_NUMBER_POOL.map((phoneNumber) => {
      const assignedClinic = clinics.find((c) => c.sipNumber === phoneNumber);
      return {
        phoneNumber,
        assigned: assignedNumbers.has(phoneNumber),
        assignedTo: assignedClinic
          ? {
              clinicId: assignedClinic.id,
              clinicName: assignedClinic.name,
              city: assignedClinic.city,
            }
          : null,
      };
    });

    // Enrich clinics with assignment info
    const enrichedClinics = clinics.map((clinic) => ({
      id: clinic.id,
      name: clinic.name,
      doctorName: clinic.doctorName,
      city: clinic.city,
      status: clinic.status,
      sipNumber: clinic.sipNumber,
      sipId: clinic.sipId,
      escalationNumber: clinic.escalationNumber,
      vobizConfig: clinic.agentConfig
        ? {
            phoneNumber: clinic.agentConfig.vobizPhoneNumber,
            trunkId: clinic.agentConfig.vobizTrunkId,
            trunkDomain: clinic.agentConfig.vobizTrunkDomain,
            credentialId: clinic.agentConfig.vobizCredentialId,
            credentialUser: clinic.agentConfig.vobizCredentialUser,
            appId: clinic.agentConfig.vobizAppId,
            appUrl: clinic.agentConfig.vobizAppUrl,
            agentStatus: clinic.agentConfig.agentStatus,
            lastTestedAt: clinic.agentConfig.lastTestedAt,
            lastTestResult: clinic.agentConfig.lastTestResult,
          }
        : null,
      isNumberAssigned: typeof clinic.sipNumber === 'string' && clinic.sipNumber.length > 0,
    }));

    return NextResponse.json({
      numbers,
      clinics: enrichedClinics,
    });
  } catch (err) {
    console.error('List vobiz numbers error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Vobiz number assignments' },
      { status: 500 },
    );
  }
}

// POST /api/admin/vobiz-numbers — Assign a phone number to a clinic
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clinicId,
      phoneNumber,
      trunkId,
      trunkDomain,
      credentialId,
      credentialUser,
      appId,
      appUrl,
    } = body;

    if (!clinicId || !phoneNumber) {
      return NextResponse.json(
        { error: 'clinicId and phoneNumber are required' },
        { status: 400 },
      );
    }

    // Validate the phone number is from our pool
    if (!VOBIZ_NUMBER_POOL.includes(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be from the available number pool.' },
        { status: 400 },
      );
    }

    // Verify clinic exists
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      include: { agentConfig: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Check if the number is already assigned to another clinic
    const existingAssignment = await db.clinic.findFirst({
      where: {
        sipNumber: phoneNumber,
        id: { not: clinicId },
      },
    });
    if (existingAssignment) {
      return NextResponse.json(
        {
          error: `Phone number ${phoneNumber} is already assigned to clinic "${existingAssignment.name}"`,
        },
        { status: 409 },
      );
    }

    // Build Vobiz config update data
    const vobizConfigUpdate: Record<string, unknown> = {
      vobizPhoneNumber: phoneNumber,
    };
    if (trunkId !== undefined) vobizConfigUpdate.vobizTrunkId = trunkId;
    if (trunkDomain !== undefined) vobizConfigUpdate.vobizTrunkDomain = trunkDomain;
    if (credentialId !== undefined) vobizConfigUpdate.vobizCredentialId = credentialId;
    if (credentialUser !== undefined) vobizConfigUpdate.vobizCredentialUser = credentialUser;
    if (appId !== undefined) vobizConfigUpdate.vobizAppId = appId;
    if (appUrl !== undefined) vobizConfigUpdate.vobizAppUrl = appUrl;

    // Update Clinic sipNumber
    const updatedClinic = await db.clinic.update({
      where: { id: clinicId },
      data: { sipNumber: phoneNumber },
    });

    // Update or create AgentConfig with Vobiz fields
    let updatedConfig;
    if (clinic.agentConfig) {
      updatedConfig = await db.agentConfig.update({
        where: { clinicId },
        data: vobizConfigUpdate,
      });
    } else {
      updatedConfig = await db.agentConfig.create({
        data: {
          clinicId,
          ...vobizConfigUpdate,
        },
      });
    }

    return NextResponse.json({
      clinic: updatedClinic,
      config: updatedConfig,
      message: `Phone number ${phoneNumber} assigned to clinic "${updatedClinic.name}"`,
    });
  } catch (err) {
    console.error('Assign vobiz number error:', err);
    return NextResponse.json(
      { error: 'Failed to assign phone number' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/vobiz-numbers — Unassign a phone number from a clinic
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { clinicId } = body;

    if (!clinicId) {
      return NextResponse.json(
        { error: 'clinicId is required' },
        { status: 400 },
      );
    }

    // Verify clinic exists
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      include: { agentConfig: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    if (!clinic.sipNumber) {
      return NextResponse.json(
        { error: 'No phone number is currently assigned to this clinic' },
        { status: 400 },
      );
    }

    const previousNumber = clinic.sipNumber;

    // Clear phone number from Clinic
    const updatedClinic = await db.clinic.update({
      where: { id: clinicId },
      data: {
        sipNumber: null,
        sipId: null,
      },
    });

    // Clear Vobiz fields from AgentConfig if it exists
    let updatedConfig = null;
    if (clinic.agentConfig) {
      updatedConfig = await db.agentConfig.update({
        where: { clinicId },
        data: {
          vobizPhoneNumber: null,
          vobizTrunkId: null,
          vobizTrunkDomain: null,
          vobizCredentialId: null,
          vobizCredentialUser: null,
          vobizAppId: null,
          vobizAppUrl: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      previousNumber,
      clinic: updatedClinic,
      config: updatedConfig,
      message: `Phone number ${previousNumber} unassigned from clinic "${updatedClinic.name}"`,
    });
  } catch (err) {
    console.error('Unassign vobiz number error:', err);
    return NextResponse.json(
      { error: 'Failed to unassign phone number' },
      { status: 500 },
    );
  }
}
