import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================
// Z-AI WEB DEV SDK — Real AI Backend
// ============================================

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    try {
      zaiInstance = await ZAI.create();
      console.log('[Gemini API] Z-AI SDK initialized');
    } catch (err) {
      console.error('[Gemini API] Z-AI SDK init failed:', err);
    }
  }
  return zaiInstance;
}

// VoiceAI System Prompt Builder
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
  const language = clinicContext?.language || 'Hinglish';
  const services = clinicContext?.services?.length
    ? clinicContext.services.join(', ')
    : 'General Consultation, Dental Care, Health Checkup';
  const fee = clinicContext?.fee || '₹500';
  const hours = clinicContext?.hours || 'Mon-Sat, 9:00 AM - 8:00 PM';

  return `You are VoiceAI, an AI receptionist for ${clinicName}. You speak in ${language}.
Your role is to:
1. Greet patients warmly
2. Help book, reschedule, or cancel appointments
3. Answer common questions about services, fees, and timing
4. Transfer to a human if the patient is upset or needs complex help
5. Always be polite, professional, and empathetic

Available services: ${services}
Doctor: ${doctorName}
Consultation fee: ${fee}
Business hours: ${hours}

Important guidelines:
- Always respond in ${language} unless the patient explicitly switches language
- Keep responses concise but helpful (max 2-3 sentences for most replies)
- If a patient wants to book, ask for their preferred date and time
- If a patient is angry or frustrated, apologize sincerely and offer to transfer to a human
- Never make up medical advice — suggest consulting the doctor
- For emergencies, advise the patient to visit the nearest hospital immediately`;
}

// Demo fallback responses (when Z-AI SDK unavailable)
function demoChatResponse(message: string, clinicContext?: Record<string, unknown>): string {
  const clinicName = String(clinicContext?.clinicName || 'our clinic');
  const doctorName = String(clinicContext?.doctorName || 'our doctor');
  const fee = String(clinicContext?.fee || '₹500');
  const hours = String(clinicContext?.hours || 'Mon-Sat, 9:00 AM - 8:00 PM');
  const msg = message.toLowerCase();

  if (/hello|hi|hey|namaste/.test(msg)) return `Namaste! ${clinicName} mein aapka swagat hai! 🙏 Main VoiceAI hoon, aapki AI receptionist. Kaise madad kar sakti hoon?`;
  if (/book|appointment|slot|schedule/.test(msg)) return `Bilkul! ${clinicName} mein appointment book karna bahut aasan hai. ✅ ${doctorName} ke liye slots available hain. Kaunsa date aur time suit karega? Humari timing ${hours} hai.`;
  if (/fee|cost|price|kitna/.test(msg)) return `${clinicName} mein consultation fee ${fee} hai. Kya aap appointment book karna chahte hain?`;
  if (/emergency|pain|bleeding|urgent/.test(msg)) return `⚠️ Yeh ek emergency lag rahi hai! Please turant apne nearest hospital mein jayen.`;
  if (/angry|frustrat|complaint|worst/.test(msg)) return `Main bahut sorry hoon. 🙏 Main ${doctorName} se baat karke aapki problem solve karne ki koshish karti hoon.`;
  if (/thank|shukriya|dhanyavaad/.test(msg)) return `Aapka dhanyavaad! 🙏 ${clinicName} se judne ke liye shukriya.`;
  if (/bye|alvida|goodbye/.test(msg)) return `Alvida! ${clinicName} se judne ke liye dhanyavaad. 😊 Aapka din shubh ho!`;
  return `Ji haan, main samajh gayi. ${clinicName} mein aapki help ke liye main yahan hoon. Appointment book karna chahte hain ya koi aur sawal hai?`;
}

// ============================================
// GET /api/gemini — Health check & models
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'health';

    if (action === 'health') {
      const zai = await getZAI();
      return NextResponse.json({
        status: zai ? 'healthy' : 'degraded',
        service: 'VoiceAI Gemini Integration',
        version: '2.0.0',
        backend: zai ? 'z-ai-web-dev-sdk' : 'demo-fallback',
        aiReady: !!zai,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    return NextResponse.json({ error: 'Service error' }, { status: 500 });
  }
}

// ============================================
// POST /api/gemini — AI Chat, Sentiment, Summary
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;
    const zai = await getZAI();

    // ---- CHAT ----
    if (action === 'chat') {
      const { message, clinicContext, conversationHistory } = payload as {
        message: string;
        clinicContext?: Record<string, unknown>;
        conversationHistory?: Array<{ role: string; parts: Array<{ text: string }> }>;
      };

      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Missing message' }, { status: 400 });
      }

      if (zai) {
        try {
          const systemPrompt = buildSystemPrompt(clinicContext as Parameters<typeof buildSystemPrompt>[0]);
          const messages: Array<{ role: string; content: string }> = [
            { role: 'assistant', content: systemPrompt },
          ];

          if (conversationHistory?.length) {
            for (const msg of conversationHistory.slice(-8)) {
              messages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.parts?.[0]?.text || '',
              });
            }
          }
          messages.push({ role: 'user', content: message });

          const completion = await zai.chat.completions.create({
            messages,
            thinking: { type: 'disabled' },
          });

          const response = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';

          return NextResponse.json({
            success: true,
            response,
            model: 'z-ai-sdk',
            backend: 'z-ai-web-dev-sdk',
            timestamp: new Date().toISOString(),
          });
        } catch (aiErr) {
          console.error('[Gemini API] Z-AI chat error:', aiErr);
          // Fall through to demo
        }
      }

      // Demo fallback
      const demoResponse = demoChatResponse(message, clinicContext);
      return NextResponse.json({
        success: true,
        response: demoResponse,
        model: 'demo-fallback',
        backend: 'keyword-mock',
        timestamp: new Date().toISOString(),
      });
    }

    // ---- ANALYZE SENTIMENT ----
    if (action === 'analyze-sentiment') {
      const { text } = payload as { text: string };
      if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

      if (zai) {
        try {
          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: 'You are a sentiment analysis engine. Analyze patient messages to a healthcare clinic. Always respond in valid JSON: {"sentiment": "positive" or "negative" or "neutral", "confidence": <0-1>, "keywords": ["word1", "word2"]}' },
              { role: 'user', content: `Analyze: "${text}"` },
            ],
            thinking: { type: 'disabled' },
          });

          const raw = completion.choices?.[0]?.message?.content || '{}';
          const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const data = JSON.parse(clean);

          return NextResponse.json({
            success: true,
            sentiment: ['positive', 'negative', 'neutral'].includes(data.sentiment) ? data.sentiment : 'neutral',
            confidence: Math.min(1, Math.max(0, Number(data.confidence) || 0.5)),
            keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 5) : [],
            backend: 'z-ai-web-dev-sdk',
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Fall through
        }
      }

      // Demo fallback
      const msg = text.toLowerCase();
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (/angry|frustrat|complaint|worst|bad/.test(msg)) sentiment = 'negative';
      else if (/book|appointment|thank|hello/.test(msg)) sentiment = 'positive';

      return NextResponse.json({
        success: true,
        sentiment,
        confidence: 0.7,
        keywords: text.split(/\s+/).filter(w => w.length > 3).slice(0, 5),
        backend: 'keyword-mock',
        timestamp: new Date().toISOString(),
      });
    }

    // ---- GENERATE SUMMARY ----
    if (action === 'generate-summary') {
      const { transcript, clinicName } = payload as { transcript: string; clinicName?: string };
      if (!transcript) return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });

      if (zai) {
        try {
          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: `You are a call analysis assistant for VoiceAI${clinicName ? ` at ${clinicName}` : ''}. Analyze transcripts. Always respond in valid JSON: {"summary": "2-3 sentences", "intent": "Appointment Booking|General Inquiry|Rescheduling|Fee Inquiry|Emergency|Cancellation|Other", "tags": ["tag1","tag2","tag3"], "bookingDetails": {"patientName": null, "date": null, "time": null, "service": null}}` },
              { role: 'user', content: `Analyze:\n\n${transcript}` },
            ],
            thinking: { type: 'disabled' },
          });

          const raw = completion.choices?.[0]?.message?.content || '{}';
          const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const data = JSON.parse(clean);

          return NextResponse.json({
            success: true,
            summary: data.summary || 'No summary generated.',
            intent: data.intent || 'Other',
            tags: Array.isArray(data.tags) ? data.tags : ['unprocessed'],
            bookingDetails: data.bookingDetails || undefined,
            backend: 'z-ai-web-dev-sdk',
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Fall through
        }
      }

      // Demo fallback
      return NextResponse.json({
        success: true,
        summary: `Patient called${clinicName ? ` ${clinicName}` : ''} with an inquiry. VoiceAI assisted with the request.`,
        intent: 'General Inquiry',
        tags: ['ai-handled', 'inquiry'],
        backend: 'keyword-mock',
        timestamp: new Date().toISOString(),
      });
    }

    // ---- TRANSCRIBE ----
    if (action === 'transcribe') {
      return NextResponse.json({
        success: true,
        transcription: 'Audio transcription simulation. In production, this would use Gemini STT.',
        language: 'hi-IN',
        confidence: 0.92,
        backend: 'simulation',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use 'chat', 'transcribe', 'analyze-sentiment', or 'generate-summary'` },
      { status: 400 }
    );
  } catch (err) {
    console.error('[Gemini API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
