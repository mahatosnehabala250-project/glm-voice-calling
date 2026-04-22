import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Parse Q&A pairs from raw text.
 * Supports formats:
 *   "Q: ... A: ..."
 *   "Question: ... Answer: ..."
 *   "q: ... a: ..."
 *   "Q1: ... A1: ..."
 */
function parseFaqFromText(
  text: string,
): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  // Split on common Q indicators — each new question starts a new entry
  const blocks = text.split(/(?=^[ \t]*(?:Q\d*\s*[:.]|Question\s*[:.]))/im);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Match "Q: ... A: ..." pattern
    const match = trimmed.match(
      /^(?:Q(?:\d+)?\s*[:.]\s*|Question\s*[:.]\s*)([\s\S]*?)(?:A(?:\d+)?\s*[:.]\s*|Answer\s*[:.]\s*)([\s\S]*)$/i,
    );

    if (match) {
      const question = match[1].trim();
      const answer = match[2].trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    }
  }

  return faqs;
}

/**
 * Mock URL FAQ parsing — simulates scraping a URL and extracting Q&A pairs.
 * In production, this would fetch the URL and parse HTML/text content.
 */
function mockParseFaqFromUrl(url: string): {
  question: string;
  answer: string;
}[] {
  // Simulated FAQ content based on common healthcare clinic FAQs
  const mockFaqs = [
    {
      question: 'What are your clinic hours?',
      answer:
        'We are open Monday to Saturday, 9:00 AM to 7:00 PM. Sunday is by appointment only.',
    },
    {
      question: 'Do I need an appointment?',
      answer:
        'Walk-ins are welcome, but we recommend booking an appointment for faster service.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept cash, UPI, credit/debit cards, and all major digital wallets.',
    },
    {
      question: 'Is parking available?',
      answer:
        'Yes, free parking is available for all patients in the basement parking lot.',
    },
    {
      question: 'How can I cancel or reschedule my appointment?',
      answer:
        'You can cancel or reschedule by calling us at least 2 hours before your appointment time.',
    },
  ];

  console.log(`[Mock] Parsed FAQs from URL: ${url}`);
  return mockFaqs;
}

// POST /api/client/knowledge-base/import — Import FAQs from text or URL
export async function POST(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json(
        { error: 'x-clinic-id header required' },
        { status: 400 },
      );
    }

    const body = await req.json();

    // Validate that at least one input source is provided
    if (!body.text && !body.url) {
      return NextResponse.json(
        { error: 'Either "text" or "url" must be provided in the request body' },
        { status: 400 },
      );
    }

    if (body.text && typeof body.text !== 'string') {
      return NextResponse.json(
        { error: '"text" must be a string' },
        { status: 400 },
      );
    }

    if (body.url && typeof body.url !== 'string') {
      return NextResponse.json(
        { error: '"url" must be a string' },
        { status: 400 },
      );
    }

    // Parse FAQs from text or URL
    let newFaqs: { question: string; answer: string }[] = [];

    if (body.text) {
      newFaqs = parseFaqFromText(body.text);
    }

    if (body.url) {
      const urlFaqs = mockParseFaqFromUrl(body.url);
      newFaqs = [...newFaqs, ...urlFaqs];
    }

    if (newFaqs.length === 0) {
      return NextResponse.json(
        { error: 'No valid Q&A pairs could be parsed from the provided input' },
        { status: 400 },
      );
    }

    // Get existing config (auto-create if needed)
    let config = await db.agentConfig.findUnique({
      where: { clinicId },
    });

    if (!config) {
      config = await db.agentConfig.create({
        data: { clinicId },
      });
    }

    // Parse existing FAQs
    let existingFaqs: { question: string; answer: string }[] = [];
    if (config.faqJson) {
      try {
        existingFaqs = JSON.parse(config.faqJson);
      } catch {
        existingFaqs = [];
      }
    }

    // Append new FAQs to existing ones
    const mergedFaqs = [...existingFaqs, ...newFaqs];

    // Update the config
    const updatedConfig = await db.agentConfig.update({
      where: { clinicId },
      data: {
        faqJson: JSON.stringify(mergedFaqs),
      },
    });

    // Parse the updated values for the response
    let services: string[] = [];
    if (updatedConfig.servicesJson) {
      try {
        services = JSON.parse(updatedConfig.servicesJson);
      } catch {
        services = [];
      }
    }

    return NextResponse.json({
      faqs: mergedFaqs,
      importedCount: newFaqs.length,
      totalCount: mergedFaqs.length,
      services,
      clinicDescription: updatedConfig.clinicDescription ?? '',
      specializations: updatedConfig.specializations ?? '',
      specialNotes: updatedConfig.specialNotes ?? '',
    });
  } catch (err) {
    console.error('Import knowledge base error:', err);
    return NextResponse.json(
      { error: 'Failed to import knowledge base' },
      { status: 500 },
    );
  }
}
