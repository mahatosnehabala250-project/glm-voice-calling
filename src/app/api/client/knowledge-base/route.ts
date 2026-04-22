import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/knowledge-base — Get the clinic's AI agent knowledge base
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json(
        { error: 'x-clinic-id header required' },
        { status: 400 },
      );
    }

    let config = await db.agentConfig.findUnique({
      where: { clinicId },
    });

    // Auto-create AgentConfig if it doesn't exist
    if (!config) {
      config = await db.agentConfig.create({
        data: { clinicId },
      });
    }

    // Parse JSON strings into arrays
    let faqs: { question: string; answer: string }[] = [];
    let services: string[] = [];

    if (config.faqJson) {
      try {
        faqs = JSON.parse(config.faqJson);
      } catch {
        faqs = [];
      }
    }

    if (config.servicesJson) {
      try {
        services = JSON.parse(config.servicesJson);
      } catch {
        services = [];
      }
    }

    return NextResponse.json({
      faqs,
      services,
      clinicDescription: config.clinicDescription ?? '',
      specializations: config.specializations ?? '',
      specialNotes: config.specialNotes ?? '',
    });
  } catch (err) {
    console.error('Get knowledge base error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 },
    );
  }
}

// PUT /api/client/knowledge-base — Update the clinic's knowledge base
export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json(
        { error: 'x-clinic-id header required' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    // Validate and serialize faqs
    if (body.faqs !== undefined) {
      if (!Array.isArray(body.faqs)) {
        return NextResponse.json(
          { error: 'faqs must be an array of {q, a} objects' },
          { status: 400 },
        );
      }
      for (let i = 0; i < body.faqs.length; i++) {
        const faq = body.faqs[i];
        if (
          typeof faq !== 'object' ||
          faq === null ||
          typeof faq.q !== 'string' ||
          typeof faq.a !== 'string'
        ) {
          return NextResponse.json(
            { error: `faqs[${i}] must have string "q" and "a" fields` },
            { status: 400 },
          );
        }
      }
      // Convert {q, a} format to {question, answer} for storage
      const normalizedFaqs = body.faqs.map(
        (f: { q: string; a: string }) => ({
          question: f.q,
          answer: f.a,
        }),
      );
      updateData.faqJson = JSON.stringify(normalizedFaqs);
    }

    // Validate and serialize services
    if (body.services !== undefined) {
      if (!Array.isArray(body.services)) {
        return NextResponse.json(
          { error: 'services must be an array of strings' },
          { status: 400 },
        );
      }
      for (let i = 0; i < body.services.length; i++) {
        if (typeof body.services[i] !== 'string') {
          return NextResponse.json(
            { error: `services[${i}] must be a string` },
            { status: 400 },
          );
        }
      }
      updateData.servicesJson = JSON.stringify(body.services);
    }

    // Store plain string fields
    if (body.clinicDescription !== undefined) {
      if (typeof body.clinicDescription !== 'string') {
        return NextResponse.json(
          { error: 'clinicDescription must be a string' },
          { status: 400 },
        );
      }
      updateData.clinicDescription = body.clinicDescription;
    }

    if (body.specializations !== undefined) {
      if (typeof body.specializations !== 'string') {
        return NextResponse.json(
          { error: 'specializations must be a string' },
          { status: 400 },
        );
      }
      updateData.specializations = body.specializations;
    }

    if (body.specialNotes !== undefined) {
      if (typeof body.specialNotes !== 'string') {
        return NextResponse.json(
          { error: 'specialNotes must be a string' },
          { status: 400 },
        );
      }
      updateData.specialNotes = body.specialNotes;
    }

    const config = await db.agentConfig.upsert({
      where: { clinicId },
      create: {
        clinicId,
        ...updateData,
      },
      update: updateData,
    });

    // Parse the updated values for the response
    let faqs: { question: string; answer: string }[] = [];
    let services: string[] = [];

    if (config.faqJson) {
      try {
        faqs = JSON.parse(config.faqJson);
      } catch {
        faqs = [];
      }
    }

    if (config.servicesJson) {
      try {
        services = JSON.parse(config.servicesJson);
      } catch {
        services = [];
      }
    }

    return NextResponse.json({
      faqs,
      services,
      clinicDescription: config.clinicDescription ?? '',
      specializations: config.specializations ?? '',
      specialNotes: config.specialNotes ?? '',
    });
  } catch (err) {
    console.error('Update knowledge base error:', err);
    return NextResponse.json(
      { error: 'Failed to update knowledge base' },
      { status: 500 },
    );
  }
}
