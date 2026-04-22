// ============================================================
// VOICEAI CALL ORCHESTRATOR SERVICE
// The BRAIN that ties: Vobiz SIP ↔ Gemini AI ↔ n8n ↔ Database
// Port: 3035
// ============================================================
//
// COMPLETE CALL FLOW:
// 1. Patient calls Vobiz number → Vobiz sends webhook HERE
// 2. Orchestrator creates session → Fetches clinic config from DB
// 3. Each speech turn: STT via Gemini → Process intent → TTS response via Vobiz
// 4. If booking/check/reschedule → Trigger n8n webhook
// 5. If emergency/angry → Transfer to clinic's human number
// 6. Call ends → Save full transcript, summary, sentiment to DB
// ============================================================

const PORT = 3035;

// Service URLs
const VOBIZ_SERVICE = `http://localhost:3031`;
const GEMINI_SERVICE = `http://localhost:3032`;
const MAIN_APP = `http://localhost:3000`;

// Vobiz Credentials
const VOBIZ_AUTH_ID = process.env.VOBIZ_AUTH_ID || 'MA_GU1ZOXC3';
const VOBIZ_AUTH_TOKEN = process.env.VOBIZ_AUTH_TOKEN || '';
const VOBIZ_MOBILE_NO = process.env.VOBIZ_MOBILE_NO || '+918065481672';
const VOBIZ_CREDENTIAL_ID = process.env.VOBIZ_CREDENTIAL_ID || '';

// ============================================================
// TYPES
// ============================================================

interface CallSession {
  callSid: string;
  clinicId: string;
  clinicName: string;
  doctorName: string;
  callerPhone: string;
  callerName: string | null;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'connected' | 'in-progress' | 'transferring' | 'completed' | 'failed';
  language: string;
  transferNumber: string | null;
  escalationEnabled: boolean;
  escalationAfter: number;
  conversationHistory: ConversationTurn[];
  transcript: string[];
  intent: string | null;
  sentiment: string | null;
  bookingDetails: {
    patientName: string | null;
    patientPhone: string | null;
    date: string | null;
    time: string | null;
    service: string | null;
    action: 'book' | 'check' | 'reschedule' | 'cancel' | null;
  } | null;
  n8nActions: N8nAction[];
  startedAt: string;
  endedAt: string | null;
  duration: number;
  lastActivityAt: string;
}

interface ConversationTurn {
  role: 'ai' | 'caller';
  text: string;
  timestamp: string;
  intent?: string;
  sentiment?: string;
}

interface N8nAction {
  type: 'booking_request' | 'booking_confirm' | 'check_availability' | 'reschedule' | 'cancel' | 'transfer' | 'escalation';
  payload: Record<string, unknown>;
  triggeredAt: string;
  status: 'pending' | 'sent' | 'success' | 'failed';
  response?: string;
}

interface ClinicConfig {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  services: string[];
  fee: string;
  hours: string;
  language: string;
  greetingMessage: string;
  farewellMessage: string;
  agentName: string;
  transferNumber: string | null;
  escalationEnabled: boolean;
  escalationAfter: number;
  escalationKeywords: string[];
  n8nWebhookUrl: string | null;
  sipNumber: string | null;
}

interface WebhookPayload {
  CallSid?: string;
  call_sid?: string;
  From?: string;
  from?: string;
  To?: string;
  to?: string;
  CallStatus?: string;
  Status?: string;
  RecordingUrl?: string;
  recording_url?: string;
  Duration?: string;
  CallerName?: string;
  SpeechResult?: string;
  DialCallStatus?: string;
  // Custom params passed from Vobiz
  clinicId?: string;
}

// ============================================================
// STATE
// ============================================================

const startTime = Date.now();
const activeSessions = new Map<string, CallSession>();

// ============================================================
// HELPERS
// ============================================================

function generateSessionId(): string {
  return `CALL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-clinic-id',
    },
  });
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

async function parseBody<T>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

async function fetchJSON(url: string, options?: RequestInit): Promise<{ ok: boolean; data: unknown }> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    console.warn(`⚠️ Fetch failed: ${url}`, err instanceof Error ? err.message : err);
    return { ok: false, data: { error: 'Service unavailable' } };
  }
}

// ============================================================
// CLINIC CONFIG LOADER (from Main App API)
// ============================================================

async function loadClinicConfig(clinicId: string): Promise<ClinicConfig | null> {
  try {
    // Try fetching from main app's API
    const res = await fetchJSON(`${MAIN_APP}/api/client/settings?clinicId=${clinicId}`);
    if (res.ok && res.data) {
      const d = res.data as Record<string, unknown>;
      return {
        id: clinicId,
        name: String(d.clinicName || d.name || 'VoiceAI Clinic'),
        doctorName: String(d.doctorName || 'Doctor'),
        phone: String(d.phone || ''),
        services: Array.isArray(d.services) ? d.services.map(String) : ['General Consultation'],
        fee: String(d.fee || d.consultationFee || '₹500'),
        hours: String(d.businessHours || '09:00-18:00 Mon-Sat'),
        language: String(d.language || 'hinglish'),
        greetingMessage: String(d.greetingMessage || ''),
        farewellMessage: String(d.farewellMessage || ''),
        agentName: String(d.agentName || 'VoiceAI Assistant'),
        transferNumber: String(d.escalationNumber || d.transferNumber || ''),
        escalationEnabled: Boolean(d.escalationEnabled ?? true),
        escalationAfter: Number(d.escalationAfter || 120),
        escalationKeywords: String(d.escalationKeywords || 'emergency,pain,bleeding,angry,gussa').split(','),
        n8nWebhookUrl: String(d.n8nWebhookUrl || ''),
        sipNumber: String(d.sipNumber || ''),
      };
    }
  } catch {
    // Fallback: load from env
  }

  // Fallback config from environment
  return {
    id: clinicId,
    name: process.env.CLINIC_NAME || 'VoiceAI Healthcare',
    doctorName: process.env.DOCTOR_NAME || 'Our Doctor',
    phone: VOBIZ_MOBILE_NO,
    services: ['General Consultation', 'Dental Checkup', 'Health Checkup'],
    fee: '₹500',
    hours: '09:00-18:00 Mon-Sat',
    language: 'hinglish',
    greetingMessage: 'Hello! Welcome to our clinic. How can I help you today?',
    farewellMessage: 'Thank you for calling. Have a great day!',
    agentName: 'VoiceAI Assistant',
    transferNumber: null,
    escalationEnabled: true,
    escalationAfter: 120,
    escalationKeywords: ['emergency', 'pain', 'bleeding', 'angry'],
    n8nWebhookUrl: null,
    sipNumber: VOBIZ_MOBILE_NO,
  };
}

// ============================================================
// GEMINI AI CHAT (calls Gemini service)
// ============================================================

async function askGemini(message: string, clinicContext: ClinicConfig, conversationHistory: ConversationTurn[]): Promise<string> {
  const res = await fetchJSON(`${GEMINI_SERVICE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      clinicContext: {
        clinicName: clinicContext.name,
        doctorName: clinicContext.doctorName,
        services: clinicContext.services,
        fee: clinicContext.fee,
        hours: clinicContext.hours,
        language: clinicContext.language,
      },
      conversationHistory: conversationHistory.slice(-10).map(turn => ({
        role: turn.role === 'ai' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      })),
    }),
  });

  if (res.ok && res.data) {
    const d = res.data as Record<string, unknown>;
    return String(d.response || d.message || 'Sorry, I could not process that.');
  }

  // Fallback demo response
  return 'I apologize, but I\'m having trouble connecting to my AI service. Please try again or let me transfer you to our staff.';
}

// ============================================================
// SENTIMENT & INTENT ANALYSIS
// ============================================================

async function analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
  const res = await fetchJSON(`${GEMINI_SERVICE}/api/analyze-sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (res.ok && res.data) {
    const d = res.data as Record<string, unknown>;
    return { sentiment: String(d.sentiment || 'neutral'), confidence: Number(d.confidence || 0.5) };
  }
  return { sentiment: 'neutral', confidence: 0.5 };
}

function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (/book|appointment|slot|schedule|reserv/.test(t)) return 'appointment';
  if (/cancel/.test(t)) return 'cancellation';
  if (/reschedule|change.*date|change.*time|shift/.test(t)) return 'reschedule';
  if (/check|available|confirm|verify/.test(t)) return 'check_availability';
  if (/fee|cost|price|charge|kitna|paisa/.test(t)) return 'fee_inquiry';
  if (/emergency|urgent|pain|bleeding|chest|breathing|accident/.test(t)) return 'emergency';
  if (/angry|frustrat|complaint|terrible|worst|kharab|gussa|rud/.test(t)) return 'escalation';
  if (/timing|hours|open|close|when|samay/.test(t)) return 'timing';
  if (/doctor|dr|sahab/.test(t)) return 'doctor_inquiry';
  if (/thank|shukriya|dhanyavaad|bye|alvida/.test(t)) return 'farewell';
  return 'general';
}

// ============================================================
// n8n WEBHOOK TRIGGER
// ============================================================

async function triggerN8nAction(session: CallSession, actionType: string, payload: Record<string, unknown>): Promise<N8nAction> {
  const clinicConfig = await loadClinicConfig(session.clinicId);
  const n8nAction: N8nAction = {
    type: actionType as N8nAction['type'],
    payload,
    triggeredAt: new Date().toISOString(),
    status: 'pending',
  };

  // Resolve webhook URL: env-based mapping first, then clinic-specific fallback
  const webhookUrlMap: Record<string, string | undefined> = {
    booking_request: process.env.N8N_WEBHOOK_BOOKING,
    check_availability: process.env.N8N_WEBHOOK_CHECK_AVAILABILITY,
    reschedule: process.env.N8N_WEBHOOK_RESCHEDULE,
    cancel: process.env.N8N_WEBHOOK_CANCEL,
    transfer: process.env.N8N_WEBHOOK_ESCALATION,
    escalation: process.env.N8N_WEBHOOK_ESCALATION,
    call_ended: process.env.N8N_WEBHOOK_CALL_SUMMARY,
    test: process.env.N8N_WEBHOOK_TEST,
  };

  const webhookUrl = webhookUrlMap[actionType] || clinicConfig?.n8nWebhookUrl || '';
  if (!webhookUrl) {
    console.log(`⚠️ [n8n] No webhook URL configured for action "${actionType}" (clinic ${session.clinicId})`);
    n8nAction.status = 'failed';
    n8nAction.response = 'No webhook URL configured';
    return n8nAction;
  }

  console.log(`🔗 [n8n] Triggering ${actionType} → ${webhookUrl}`);
  n8nAction.status = 'sent';

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: actionType,
        callSid: session.callSid,
        clinicId: session.clinicId,
        clinicName: session.clinicName,
        callerPhone: session.callerPhone,
        callerName: session.callerName,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await res.text().catch(() => '');
    n8nAction.status = res.ok ? 'success' : 'failed';
    n8nAction.response = responseText.substring(0, 500);
    console.log(`✅ [n8n] ${actionType}: ${n8nAction.status}`);
  } catch (err) {
    n8nAction.status = 'failed';
    n8nAction.response = err instanceof Error ? err.message : 'Unknown error';
    console.log(`❌ [n8n] ${actionType} failed: ${n8nAction.response}`);
  }

  return n8nAction;
}

// ============================================================
// DATABASE RECORDING (via Main App API)
// ============================================================

async function saveCallToDatabase(session: CallSession): Promise<boolean> {
  try {
    const res = await fetchJSON(`${MAIN_APP}/api/vobiz?action=save-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-clinic-id': session.clinicId },
      body: JSON.stringify({
        callSid: session.callSid,
        clinicId: session.clinicId,
        callerPhone: session.callerPhone,
        callerName: session.callerName,
        status: session.status === 'completed' ? 'completed' : session.status === 'transferring' ? 'transferred' : 'failed',
        direction: session.direction,
        duration: session.duration,
        transcript: JSON.stringify(session.transcript.map((text, i) => ({
          role: session.conversationHistory[i]?.role || 'caller',
          text,
        }))),
        summary: session.conversationHistory.length > 0
          ? `${session.intent || 'General'} inquiry call. ${session.transcript.length} messages exchanged.`
          : null,
        sentiment: session.sentiment || 'neutral',
        intent: session.intent || 'general',
        tags: JSON.stringify(session.n8nActions.map(a => a.type)),
        startedAt: session.startedAt,
        endedAt: session.endedAt || new Date().toISOString(),
        // If there's a booking, save appointment too
        bookingDetails: session.bookingDetails,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================
// VOBiz TWIML GENERATOR
// ============================================================

function generateGatherTwiml(session: CallSession, aiResponseText: string): string {
  // Strip emojis and keep clean text for TTS
  const cleanText = aiResponseText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

  const lang = session.language === 'english' ? 'en-IN' : 'hi-IN';
  const voice = session.language === 'english' ? 'alice' : 'alice';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${lang}">${cleanText}</Say>
  <Gather numDigits="1" timeout="5" action="/api/orch/gather?callSid=${session.callSid}" method="POST" finishOnKey="">
    <Say voice="${voice}" language="${lang}">Press 1 to continue, press 2 to speak, or press 3 to talk to our staff.</Say>
  </Gather>
  <Redirect>/api/orch/gather?callSid=${session.callSid}&amp;timeout=true</Redirect>
</Response>`;
}

function generateTransferTwiml(transferTo: string, session: CallSession): string {
  const lang = session.language === 'english' ? 'en-IN' : 'hi-IN';
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${lang}">Please hold while I connect you with our staff.</Say>
  <Dial callerId="${VOBIZ_MOBILE_NO}" timeout="30" action="/api/orch/transfer-status?callSid=${session.callSid}" method="POST">
    <Number>${transferTo}</Number>
  </Dial>
  <Say voice="alice" language="${lang}">Sorry, our staff is not available right now. Please try again later.</Say>
  <Hangup />
</Response>`;
}

function generateHangupTwiml(message: string, session: CallSession): string {
  const lang = session.language === 'english' ? 'en-IN' : 'hi-IN';
  const cleanMsg = message.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu, '').trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${lang}">${cleanMsg}</Say>
  <Hangup />
</Response>`;
}

// ============================================================
// CORE: INBOUND CALL HANDLER
// ============================================================

async function handleInboundCall(body: WebhookPayload): Promise<Response> {
  const callSid = body.CallSid || body.call_sid || generateSessionId();
  const from = body.From || body.from || 'unknown';
  const to = body.To || body.to || VOBIZ_MOBILE_NO;
  const clinicId = body.clinicId || 'default';

  console.log(`📞 [INBOUND] Call ${callSid} from ${from} → ${to} (clinic: ${clinicId})`);

  // Load clinic config
  const clinic = await loadClinicConfig(clinicId);
  if (!clinic) {
    console.error(`❌ [INBOUND] Clinic ${clinicId} not found`);
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="alice">Sorry, this service is not configured. Please try again later.</Say><Hangup /></Response>`);
  }

  // Create call session
  const session: CallSession = {
    callSid,
    clinicId,
    clinicName: clinic.name,
    doctorName: clinic.doctorName,
    callerPhone: from,
    callerName: body.CallerName || null,
    direction: 'inbound',
    status: 'ringing',
    language: clinic.language,
    transferNumber: clinic.transferNumber,
    escalationEnabled: clinic.escalationEnabled,
    escalationAfter: clinic.escalationAfter,
    conversationHistory: [],
    transcript: [],
    intent: null,
    sentiment: null,
    bookingDetails: null,
    n8nActions: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    duration: 0,
    lastActivityAt: new Date().toISOString(),
  };

  activeSessions.set(callSid, session);

  // Start timeout timer for escalation
  if (clinic.escalationEnabled && clinic.escalationAfter > 0) {
    setTimeout(async () => {
      const s = activeSessions.get(callSid);
      if (s && s.status === 'in-progress' && !s.intent?.includes('farewell')) {
        console.log(`⏰ [ESCALATION] Call ${callSid} exceeded ${clinic.escalationAfter}s`);
        await handleEscalation(callSid);
      }
    }, clinic.escalationAfter * 1000);
  }

  // Generate greeting TwiML
  const greeting = clinic.greetingMessage || `${clinic.agentName || 'VoiceAI'} ki taraf se ${clinic.name} mein aapka swagat hai! Kaise madad kar sakti hoon?`;
  session.transcript.push(greeting);
  session.conversationHistory.push({ role: 'ai', text: greeting, timestamp: new Date().toISOString() });
  session.status = 'connected';

  console.log(`✅ [INBOUND] Session created for clinic: ${clinic.name}`);
  return xmlResponse(generateGatherTwiml(session, greeting));
}

// ============================================================
// CORE: SPEECH/INPUT PROCESSOR
// ============================================================

async function handleGather(callSid: string, speechText: string | null, digits: string | null): Promise<Response> {
  const session = activeSessions.get(callSid);
  if (!session) {
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="alice">Sorry, session expired.</Say><Hangup /></Response>`);
  }

  session.status = 'in-progress';
  session.lastActivityAt = new Date().toISOString();

  // Handle digit input
  if (digits) {
    if (digits === '3') {
      // Transfer to human
      return await handleTransferRequest(callSid);
    }
    if (digits === '1') {
      // Continue conversation - ask what they need
      const prompt = 'Kya aap mujhe bata sakte hain ki aapko kya chahiye? Appointment book karna hai, fees jaanna hai, ya kuch aur?';
      session.transcript.push(prompt);
      session.conversationHistory.push({ role: 'ai', text: prompt, timestamp: new Date().toISOString() });
      return xmlResponse(generateGatherTwiml(session, prompt));
    }
  }

  // No speech input - timeout
  if (!speechText) {
    const repeat = 'Kya aapne kuch kaha? Main sun nahi paayi. Please dobara boliye.';
    session.transcript.push(repeat);
    session.conversationHistory.push({ role: 'ai', text: repeat, timestamp: new Date().toISOString() });
    return xmlResponse(generateGatherTwiml(session, repeat));
  }

  // Process speech input
  console.log(`🗣️ [SPEECH] ${callSid}: "${speechText.substring(0, 100)}"`);
  session.transcript.push(speechText);
  session.conversationHistory.push({ role: 'caller', text: speechText, timestamp: new Date().toISOString() });

  // Analyze sentiment
  const sentimentResult = await analyzeSentiment(speechText);
  session.sentiment = sentimentResult.sentiment;

  // Detect intent
  const intent = detectIntent(speechText);
  session.intent = intent;
  console.log(`🧠 [INTENT] ${callSid}: ${intent} (sentiment: ${sentimentResult.sentiment})`);

  // Check for escalation keywords
  const clinic = await loadClinicConfig(session.clinicId);
  if (clinic && session.escalationEnabled) {
    const needsEscalation = clinic.escalationKeywords.some(kw => speechText.toLowerCase().includes(kw));
    if (needsEscalation || intent === 'emergency' || intent === 'escalation') {
      const escalation = await triggerN8nAction(session, 'escalation', {
        reason: `Escalation triggered: ${intent}`,
        sentiment: sentimentResult.sentiment,
        speechText,
      });
      session.n8nActions.push(escalation);

      if (intent === 'emergency') {
        const emergencyMsg = 'Yeh ek emergency hai! Main abhi apne staff se connect kar rahi hoon. Please wait.';
        session.transcript.push(emergencyMsg);
        session.conversationHistory.push({ role: 'ai', text: emergencyMsg, timestamp: new Date().toISOString() });
        return xmlResponse(generateTransferTwiml(session.transferNumber || clinic.phone, session));
      }
    }
  }

  // Handle intents with n8n triggers
  let aiResponse: string;
  const clinicContext = clinic || await loadClinicConfig(session.clinicId) || {
    name: session.clinicName, doctorName: session.doctorName,
    services: [], fee: '', hours: '', language: session.language,
    greetingMessage: '', farewellMessage: '', agentName: 'VoiceAI',
    transferNumber: null, escalationEnabled: false, escalationAfter: 120,
    escalationKeywords: [], n8nWebhookUrl: null, sipNumber: null,
    id: session.clinicId, phone: '',
  };

  switch (intent) {
    case 'appointment': {
      // Trigger n8n: booking request
      const n8n = await triggerN8nAction(session, 'booking_request', {
        patientPhone: session.callerPhone,
        patientName: session.callerName,
        speechText,
        requestType: 'new_booking',
      });
      session.n8nActions.push(n8n);
      session.bookingDetails = {
        patientName: session.callerName,
        patientPhone: session.callerPhone,
        date: null,
        time: null,
        service: null,
        action: 'book',
      };
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }

    case 'check_availability': {
      const n8n = await triggerN8nAction(session, 'check_availability', {
        patientPhone: session.callerPhone,
        query: speechText,
      });
      session.n8nActions.push(n8n);
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }

    case 'reschedule': {
      const n8n = await triggerN8nAction(session, 'reschedule', {
        patientPhone: session.callerPhone,
        query: speechText,
      });
      session.n8nActions.push(n8n);
      if (!session.bookingDetails) {
        session.bookingDetails = { patientName: session.callerName, patientPhone: session.callerPhone, date: null, time: null, service: null, action: 'reschedule' };
      } else {
        session.bookingDetails.action = 'reschedule';
      }
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }

    case 'cancellation': {
      const n8n = await triggerN8nAction(session, 'cancel', {
        patientPhone: session.callerPhone,
        query: speechText,
      });
      session.n8nActions.push(n8n);
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }

    case 'escalation': {
      const transferMsg = clinicContext.transferNumber
        ? 'Main samajh rahi hoon aapko problem ho rahi hai. Abhi apne staff se connect kar rahi hoon.'
        : 'Main samajh rahi hoon aapko problem ho rahi hai. Kya aap apna naam aur number de sakte hain taaki hum aapko call back kar sakein?';
      aiResponse = transferMsg;
      break;
    }

    case 'farewell': {
      const farewell = clinicContext.farewellMessage || `${clinicContext.name} ko call karne ke liye dhanyavaad! Aapka din shubh ho!`;
      session.transcript.push(farewell);
      session.conversationHistory.push({ role: 'ai', text: farewell, timestamp: new Date().toISOString() });
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      session.duration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

      // Save to database
      saveCallToDatabase(session).then(ok => {
        console.log(ok ? `✅ [DB] Call ${callSid} saved` : `⚠️ [DB] Call ${callSid} save failed`);
        activeSessions.delete(callSid);
      });

      return xmlResponse(generateHangupTwiml(farewell, session));
    }

    default: {
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
    }
  }

  // Check if AI response indicates transfer needed
  if (aiResponse.toLowerCase().includes('transfer') || aiResponse.toLowerCase().includes('connect you')) {
    session.transcript.push(aiResponse);
    session.conversationHistory.push({ role: 'ai', text: aiResponse, timestamp: new Date().toISOString() });
    return xmlResponse(generateTransferTwiml(session.transferNumber || clinicContext.phone || VOBIZ_MOBILE_NO, session));
  }

  session.transcript.push(aiResponse);
  session.conversationHistory.push({ role: 'ai', text: aiResponse, timestamp: new Date().toISOString(), intent });

  return xmlResponse(generateGatherTwiml(session, aiResponse));
}

// ============================================================
// TRANSFER HANDLERS
// ============================================================

async function handleTransferRequest(callSid: string): Promise<Response> {
  const session = activeSessions.get(callSid);
  if (!session) return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>`);

  const transferNumber = session.transferNumber || VOBIZ_MOBILE_NO;
  session.status = 'transferring';

  const n8n = await triggerN8nAction(session, 'transfer', {
    transferTo: transferNumber,
    reason: 'Patient requested human agent',
    conversationLength: session.conversationHistory.length,
  });
  session.n8nActions.push(n8n);

  console.log(`🔄 [TRANSFER] Call ${callSid} → ${transferNumber}`);
  return xmlResponse(generateTransferTwiml(transferNumber, session));
}

async function handleTransferStatus(callSid: string, status: string): Promise<Response> {
  const session = activeSessions.get(callSid);
  if (!session) return jsonResponse({ ok: true });

  console.log(`📞 [TRANSFER-STATUS] Call ${callSid}: ${status}`);

  if (status === 'completed' || status === 'answered') {
    session.status = 'completed';
    const msg = 'Staff ne call utha liya. Transfer successful.';
    session.transcript.push(msg);
    session.conversationHistory.push({ role: 'ai', text: msg, timestamp: new Date().toISOString() });
  } else {
    // Transfer failed - return to AI
    const msg = 'Staff available nahi hai. Main wapas VoiceAI hoon, kaise madad kar sakti hoon?';
    session.transcript.push(msg);
    session.conversationHistory.push({ role: 'ai', text: msg, timestamp: new Date().toISOString() });
    session.status = 'in-progress';
    return xmlResponse(generateGatherTwiml(session, msg));
  }

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>`);
}

async function handleEscalation(callSid: string): Promise<Response> {
  const session = activeSessions.get(callSid);
  if (!session) return jsonResponse({ ok: true });

  console.log(`🚨 [ESCALATION] Auto-escalating call ${callSid}`);
  return await handleTransferRequest(callSid);
}

// ============================================================
// CALL STATUS WEBHOOK (when call ends)
// ============================================================

async function handleCallStatus(body: WebhookPayload): Promise<Response> {
  const callSid = body.CallSid || body.call_sid || '';
  const status = body.CallStatus || body.Status || 'unknown';
  const duration = parseInt(body.Duration || '0');

  console.log(`📊 [STATUS] Call ${callSid}: ${status} (duration: ${duration}s)`);

  const session = activeSessions.get(callSid);
  if (!session) return jsonResponse({ ok: true });

  session.status = status === 'completed' ? 'completed' : 'failed';
  session.endedAt = new Date().toISOString();
  session.duration = duration;

  // Save to database
  saveCallToDatabase(session).then(ok => {
    console.log(ok ? `✅ [DB] Call ${callSid} saved (${duration}s)` : `⚠️ [DB] Call ${callSid} save failed`);
    activeSessions.delete(callSid);
  });

  return jsonResponse({ ok: true, callSid, status });
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

async function handleHealthCheck(): Promise<Response> {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  return jsonResponse({
    service: 'VoiceAI Call Orchestrator',
    version: '1.0.0',
    status: 'operational',
    uptime,
    activeCalls: activeSessions.size,
    port: PORT,
    vobizConnected: !!VOBIZ_AUTH_TOKEN,
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  / — Health check',
      'POST /api/orch/inbound — Vobiz inbound call webhook (TwiML)',
      'POST /api/orch/gather — Speech/digit input processor (TwiML)',
      'POST /api/orch/status — Call status webhook (completed/failed)',
      'POST /api/orch/transfer-status — Transfer result handler',
      'POST /api/orch/make-call — Initiate outbound call with AI',
      'GET  /api/orch/sessions — List active sessions',
      'GET  /api/orch/session/:callSid — Get session details',
      'POST /api/orch/test-call — Simulate a test call flow',
    ],
    flow: {
      '1': 'Patient calls Vobiz number → Webhook hits /api/orch/inbound',
      '2': 'Orchestrator loads clinic config, generates greeting TwiML',
      '3': 'Patient speaks → Vobiz sends to /api/orch/gather',
      '4': 'Orchestrator: STT → Intent detect → n8n trigger → Gemini AI response → TTS TwiML',
      '5': 'If booking/reschedule → n8n webhook triggered for backend action',
      '6': 'If emergency/escalation → Call transferred to human',
      '7': 'Call ends → Full transcript + summary saved to database',
    },
  });
}

async function handleMakeCall(req: Request): Promise<Response> {
  const body = await parseBody<{ to: string; clinicId: string; patientName?: string }>(req);

  if (!body.to || !body.clinicId) {
    return jsonResponse({ error: 'Missing "to" and "clinicId"' }, 400);
  }

  // Call Vobiz to initiate outbound call
  const vobizRes = await fetchJSON(`${VOBIZ_SERVICE}/api/make-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: body.to,
      clinicId: body.clinicId,
    }),
  });

  if (!vobizRes.ok) {
    return jsonResponse({ error: 'Failed to initiate call via Vobiz', details: vobizRes.data }, 502);
  }

  const vobizData = vobizRes.data as Record<string, unknown>;
  const callSid = String(vobizData.callSid || generateSessionId());

  // Create session
  const clinic = await loadClinicConfig(body.clinicId);
  const session: CallSession = {
    callSid,
    clinicId: body.clinicId,
    clinicName: clinic?.name || 'Unknown',
    doctorName: clinic?.doctorName || 'Doctor',
    callerPhone: body.to,
    callerName: body.patientName || null,
    direction: 'outbound',
    status: 'ringing',
    language: clinic?.language || 'hinglish',
    transferNumber: clinic?.transferNumber || null,
    escalationEnabled: clinic?.escalationEnabled ?? true,
    escalationAfter: clinic?.escalationAfter || 120,
    conversationHistory: [],
    transcript: [],
    intent: null,
    sentiment: null,
    bookingDetails: null,
    n8nActions: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    duration: 0,
    lastActivityAt: new Date().toISOString(),
  };

  activeSessions.set(callSid, session);

  return jsonResponse({
    success: true,
    callSid,
    clinicId: body.clinicId,
    message: 'Outbound call initiated. AI will handle the conversation.',
    vobizResponse: vobizData,
  });
}

async function handleTestCall(req: Request): Promise<Response> {
  // Simulate a complete test call flow
  const body = await parseBody<{ clinicId?: string; scenario?: string }>(req);
  const clinicId = body.clinicId || 'default';
  const scenario = body.scenario || 'booking'; // booking, escalation, fee, emergency

  const testSession: CallSession = {
    callSid: `TEST-${Date.now()}`,
    clinicId,
    clinicName: 'Test Clinic',
    doctorName: 'Dr. Test',
    callerPhone: '+919999999999',
    callerName: 'Test Patient',
    direction: 'inbound',
    status: 'in-progress',
    language: 'hinglish',
    transferNumber: '+919876543210',
    escalationEnabled: true,
    escalationAfter: 120,
    conversationHistory: [],
    transcript: [],
    intent: null,
    sentiment: null,
    bookingDetails: null,
    n8nActions: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    duration: 0,
    lastActivityAt: new Date().toISOString(),
  };

  activeSessions.set(testSession.callSid, testSession);

  // Simulate conversation based on scenario
  const scenarios: Record<string, string[]> = {
    booking: [
      'Hello, mujhe appointment book karna hai.',
      'Haan, Dr. Test ke liye, kal 3 baje theek rahega.',
      'Ok done, thank you!',
    ],
    fee: [
      'Consultation fee kitna hai?',
      'Root canal treatment ke liye kitna lagega?',
      'Ok thank you.',
    ],
    escalation: [
      'Main bahut gussa hoon, last time bahut wait karna pada!',
      'Koi sense nahi hai aapki service mein!',
    ],
    emergency: [
      'Emergency hai! Mere patient ko bahut pain ho raha hai!',
    ],
  };

  const messages = scenarios[scenario] || scenarios.booking;

  for (const msg of messages) {
    testSession.transcript.push(msg);
    testSession.conversationHistory.push({ role: 'caller', text: msg, timestamp: new Date().toISOString() });

    const intent = detectIntent(msg);
    testSession.intent = intent;

    // Get AI response
    const clinic = await loadClinicConfig(clinicId) || {
      name: 'Test Clinic', doctorName: 'Dr. Test', phone: '', services: [],
      fee: '₹500', hours: '09:00-18:00', language: 'hinglish',
      greetingMessage: '', farewellMessage: '', agentName: 'VoiceAI',
      transferNumber: null, escalationEnabled: true, escalationAfter: 120,
      escalationKeywords: ['emergency', 'pain', 'gussa'], n8nWebhookUrl: null,
      sipNumber: null, id: clinicId,
    };

    const aiResponse = await askGemini(msg, clinic, testSession.conversationHistory);
    testSession.transcript.push(aiResponse);
    testSession.conversationHistory.push({ role: 'ai', text: aiResponse, timestamp: new Date().toISOString() });

    // Trigger n8n if applicable
    if (intent === 'appointment' || intent === 'reschedule' || intent === 'check_availability') {
      const n8n = await triggerN8nAction(testSession, intent === 'appointment' ? 'booking_request' : intent, {
        patientPhone: testSession.callerPhone,
        query: msg,
      });
      testSession.n8nActions.push(n8n);
    }

    // Small delay between messages for realism
    await new Promise(r => setTimeout(r, 500));
  }

  testSession.status = 'completed';
  testSession.endedAt = new Date().toISOString();
  testSession.duration = messages.length * 15; // Simulated 15s per turn
  activeSessions.delete(testSession.callSid);

  return jsonResponse({
    success: true,
    scenario,
    callSid: testSession.callSid,
    clinicId,
    messagesExchanged: testSession.conversationHistory.length,
    transcript: testSession.transcript,
    n8nActionsTriggered: testSession.n8nActions,
    intent: testSession.intent,
    duration: testSession.duration,
    note: 'Test call simulated. In production, this flow runs in real-time during a live call.',
  });
}

// ============================================================
// REQUEST ROUTER
// ============================================================

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-clinic-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Health check
  if (pathname === '/' && req.method === 'GET') return handleHealthCheck();

  // Active sessions
  if (pathname === '/api/orch/sessions' && req.method === 'GET') {
    const sessions = Array.from(activeSessions.values()).map(s => ({
      callSid: s.callSid,
      clinicName: s.clinicName,
      callerPhone: s.callerPhone,
      status: s.status,
      intent: s.intent,
      sentiment: s.sentiment,
      duration: Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000),
      turns: s.conversationHistory.length,
      n8nActions: s.n8nActions.length,
    }));
    return jsonResponse({ activeCalls: sessions, total: sessions.length });
  }

  // Get specific session
  const sessionMatch = pathname.match(/^\/api\/orch\/session\/([A-Za-z0-9\-]+)$/);
  if (sessionMatch && req.method === 'GET') {
    const session = activeSessions.get(sessionMatch[1]);
    if (!session) return jsonResponse({ error: 'Session not found' }, 404);
    return jsonResponse(session);
  }

  // INBOUND WEBHOOK from Vobiz
  if (pathname === '/api/orch/inbound' && req.method === 'POST') {
    const body = await parseBody<WebhookPayload>(req);
    return handleInboundCall(body);
  }

  // GATHER (speech/digit input) from Vobiz
  if (pathname === '/api/orch/gather' && req.method === 'POST') {
    const body = await parseBody<{ SpeechResult?: string; Digits?: string; Result?: string; callSid?: string }>(req);
    const callSid = body.callSid || url.searchParams.get('callSid') || '';
    const isTimeout = url.searchParams.get('timeout') === 'true';
    if (isTimeout) return handleGather(callSid, null, null);
    return handleGather(callSid, body.SpeechResult || body.Result || null, body.Digits || null);
  }

  // CALL STATUS WEBHOOK from Vobiz
  if (pathname === '/api/orch/status' && req.method === 'POST') {
    const body = await parseBody<WebhookPayload>(req);
    return handleCallStatus(body);
  }

  // TRANSFER STATUS from Vobiz
  if (pathname === '/api/orch/transfer-status' && req.method === 'POST') {
    const body = await parseBody<{ DialCallStatus?: string; callSid?: string }>(req);
    return handleTransferStatus(body.callSid || '', body.DialCallStatus || 'failed');
  }

  // MAKE OUTBOUND CALL
  if (pathname === '/api/orch/make-call' && req.method === 'POST') {
    return handleMakeCall(req);
  }

  // TEST CALL SIMULATION
  if (pathname === '/api/orch/test-call' && req.method === 'POST') {
    return handleTestCall(req);
  }

  return jsonResponse({
    error: 'Route not found',
    availableEndpoints: [
      'GET  /api/orch/sessions',
      'GET  /api/orch/session/:callSid',
      'POST /api/orch/inbound',
      'POST /api/orch/gather',
      'POST /api/orch/status',
      'POST /api/orch/transfer-status',
      'POST /api/orch/make-call',
      'POST /api/orch/test-call',
    ],
  }, 404);
}

// ============================================================
// START SERVER
// ============================================================

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  fetch: handleRequest,
});

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   🧠 VOICEAI CALL ORCHESTRATOR                     ║');
console.log('║   Version: 1.0.0                                    ║');
console.log(`║   Port: ${PORT}                                        ║`);
console.log('║                                                      ║');
console.log('║   Ties together:                                     ║');
console.log('║   📞 Vobiz SIP (3031) — Call control                ║');
console.log('║   🤖 Gemini AI (3032) — Conversation intelligence   ║');
console.log('║   🔗 n8n Workflows — Booking/Check/Reschedule        ║');
console.log('║   💾 Database — Full call recording                 ║');
console.log('║                                                      ║');
console.log('║   Flow: Inbound → Greeting → STT → Intent → AI → TTS ║');
console.log('║         → n8n Trigger → Transfer/Complete → Save DB  ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');
console.log(`🚀 Orchestrator running at http://0.0.0.0:${PORT}`);
console.log('');
