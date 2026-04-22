import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// Generate a URL-friendly slug from clinic name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate a random 4-digit number
function random4Digits(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

// Check if slug exists and return a unique one
async function getUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let exists = await db.clinic.findFirst({ where: { slug } });

  if (!exists) return slug;

  // Try appending random 4-digit number
  let attempts = 0;
  while (exists && attempts < 10) {
    slug = `${baseSlug}-${random4Digits()}`;
    exists = await db.clinic.findFirst({ where: { slug } });
    attempts++;
  }

  // Last resort: use timestamp
  if (exists) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { clinicName, doctorName, email, password, phone, city, state } = body;

    // Step 1: Validate required fields
    if (!clinicName || !doctorName || !email || !password || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: clinicName, doctorName, email, password, phone' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Step 2: Check if email already exists
    const existingUser = await db.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Step 3: Generate unique slug
    const baseSlug = generateSlug(clinicName);
    const slug = await getUniqueSlug(baseSlug);

    // Step 4: Hash password
    const hashedPassword = await hash(password, 10);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Step 5: Create clinic record
    const clinic = await db.clinic.create({
      data: {
        name: clinicName,
        doctorName,
        slug,
        phone,
        email: email.toLowerCase(),
        city: city || '',
        state: state || '',
        status: 'trial',
        planType: 'starter',
        trialEndsAt,
        language: 'hinglish',
        services: JSON.stringify(['General Consultation', 'Follow-up', 'Emergency']),
        businessHours: '09:00-18:00',
        businessDays: 'Mon-Fri',
        isActive: true,
        totalCalls: 0,
        totalBookings: 0,
      },
    });

    // Step 6: Create user record
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: doctorName,
        role: 'client',
        clinicId: clinic.id,
        phone,
        isActive: true,
      },
    });

    // Step 7: Create agent_config record with default values
    await db.agentConfig.create({
      data: {
        clinicId: clinic.id,
        agentName: 'VoiceAI Assistant',
        agentPersona: 'professional',
        greetingMessage: `Hello! Welcome to ${clinicName}. How can I help you today?`,
        farewellMessage: `Thank you for calling ${clinicName}. Have a great day!`,
        language: 'hinglish',
        voiceProvider: 'gemini',
        voiceGender: 'female',
        voiceSpeed: 'normal',
        maxCallDuration: 300,
        transferOnFail: true,
        escalationPrompt: "I'll connect you with our staff. Please hold.",
        autoBookSlot: true,
        bookingSlotDuration: 30,
        bookingLeadDays: 7,
        bufferMinutes: 15,
        maxBookingsPerDay: 50,
        autoConfirm: true,
        requireConfirmation: true,
        escalationEnabled: true,
        escalationAfter: 120,
        sentimentThreshold: 'negative',
        askForFeedback: true,
        collectPatientInfo: true,
        agentStatus: 'draft',
        isActive: true,
        isConfigured: false,
        calendarProvider: 'none',
        calendarSyncEnabled: false,
        totalAgentCalls: 0,
        totalAgentBookings: 0,
        avgConversationTime: 0,
      },
    });

    // Step 8: Return user data (same format as login response for auto-login)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: clinic.id,
        clinicName: clinic.name,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
