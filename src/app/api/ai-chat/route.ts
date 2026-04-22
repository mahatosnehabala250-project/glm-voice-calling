import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================================
// Real AI Chat using z-ai-web-dev-sdk
// Uses Gemini LLM directly for clinic dashboard AI assistant
// ============================================================

// In-memory conversation store (per session)
const conversations = new Map<string, Array<{ role: 'assistant' | 'user'; content: string }>>();
const MAX_HISTORY = 20;
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Clean up old sessions periodically
function cleanupOldSessions() {
  const now = Date.now();
  for (const [sessionId] of conversations) {
    const sessionAge = now - parseInt(sessionId.split('-').pop() || '0');
    if (sessionAge > SESSION_TTL) {
      conversations.delete(sessionId);
    }
  }
}

// Build system prompt for clinic AI assistant
function buildSystemPrompt(clinicContext?: {
  clinicName?: string;
  doctorName?: string;
  services?: string[];
  fee?: string;
  hours?: string;
  language?: string;
}): string {
  const clinicName = clinicContext?.clinicName || 'VoiceAI Healthcare';
  const doctorName = clinicContext?.doctorName || 'our doctor';
  const language = clinicContext?.language || 'Hinglish (Hindi + English mix)';
  const services = clinicContext?.services?.length
    ? clinicContext.services.join(', ')
    : 'General Consultation, Dental Care, Health Checkup, Orthodontics';
  const fee = clinicContext?.fee || '₹500';
  const hours = clinicContext?.hours || 'Mon-Sat, 9:00 AM - 8:00 PM';

  return `You are VoiceAI Assistant, an intelligent AI helper for ${clinicName}'s dashboard. You speak in ${language}.

Your role is to help clinic staff manage their daily operations:
- View schedules, appointments, and call statistics
- Look up patient history by phone number
- Provide optimization tips for the VoiceAI phone system
- Summarize recent call activity and patient interactions
- Help with clinic settings and configuration

Available services: ${services}
Doctor: ${doctorName}
Consultation fee: ${fee}
Business hours: ${hours}

IMPORTANT GUIDELINES:
- Respond in ${language} — use natural, conversational style
- Use Markdown formatting: **bold** for emphasis, tables for data, bullet points for lists
- Keep responses concise but informative (3-5 sentences for most queries)
- For data/statistics: use tables and bullet points for clarity
- For patient lookups: format phone numbers as +91 XXXXX XXXXX
- Use ₹ symbol for Indian Rupee amounts
- Format dates in DD/MM/YYYY (Indian format)
- Add relevant emojis for visual appeal (📊 📅 📞 🔍 ✅ ⚠️)
- If you don't have real-time data, say "Based on the latest available data..." and provide reasonable estimates
- Always be helpful, professional, and friendly`;
}

// Rate limiter (simple in-memory)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(sessionId);
  if (!limit || now > limit.resetAt) {
    rateLimits.set(sessionId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (limit.count >= 20) return false;
  limit.count++;
  return true;
}

// Initialize ZAI instance (reuse across requests)
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/**
 * POST /api/ai-chat — Real AI chat using Gemini LLM
 * Body: {
 *   message: string,
 *   sessionId?: string,
 *   clinicContext?: { clinicName, doctorName, ... },
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId: rawSessionId, clinicContext } = body as {
      message: string;
      sessionId?: string;
      clinicContext?: {
        clinicName?: string;
        doctorName?: string;
        services?: string[];
        fee?: string;
        hours?: string;
        language?: string;
      };
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long. Maximum 2,000 characters.' }, { status: 400 });
    }

    const sessionId = rawSessionId || `session-${Date.now()}`;

    if (!checkRateLimit(sessionId)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.', rateLimited: true },
        { status: 429 }
      );
    }

    let history = conversations.get(sessionId);
    if (!history) {
      const systemPrompt = buildSystemPrompt(clinicContext);
      history = [{ role: 'assistant', content: systemPrompt }];
      conversations.set(sessionId, history);
    }

    history.push({ role: 'user', content: message.trim() });

    if (history.length > MAX_HISTORY) {
      history = [history[0], ...history.slice(-(MAX_HISTORY - 1))];
      conversations.set(sessionId, history);
    }

    const zai = await getZAI();
    const startTime = Date.now();

    try {
      const completion = await zai.chat.completions.create({
        messages: history.map(msg => ({ role: msg.role, content: msg.content })),
        thinking: { type: 'disabled' },
      });

      const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
      const responseTime = Date.now() - startTime;

      history.push({ role: 'assistant', content: aiResponse });
      conversations.set(sessionId, history);

      console.log(`[AI Chat] Session: ${sessionId.slice(0, 12)}..., Response time: ${responseTime}ms, History: ${history.length - 1} messages`);

      return NextResponse.json({
        success: true,
        response: aiResponse,
        sessionId,
        messageCount: history.length - 1,
        responseTimeMs: responseTime,
        model: 'gemini',
        timestamp: new Date().toISOString(),
      });
    } catch (llmError) {
      console.error('[AI Chat] LLM Error:', llmError);
      history.pop();
      conversations.set(sessionId, history);

      const errorMsg = llmError instanceof Error ? llmError.message : 'AI service temporarily unavailable';
      return NextResponse.json({
        success: false,
        error: errorMsg,
        sessionId,
        fallback: true,
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }
  } catch (err) {
    console.error('[AI Chat] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/ai-chat — Clear conversation history
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body as { sessionId?: string };

    if (sessionId) {
      conversations.delete(sessionId);
      rateLimits.delete(sessionId);
      return NextResponse.json({ success: true, message: 'Conversation cleared' });
    }

    const count = conversations.size;
    conversations.clear();
    rateLimits.clear();
    return NextResponse.json({ success: true, message: `Cleared ${count} conversations` });
  } catch {
    return NextResponse.json({ error: 'Failed to clear conversation' }, { status: 500 });
  }
}

setInterval(cleanupOldSessions, 5 * 60 * 1000);
