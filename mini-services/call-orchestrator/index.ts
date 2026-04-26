// ============================================================
// VOICEAI CALL ORCHESTRATOR SERVICE v2.0
// The BRAIN that ties: Vobiz SIP <-> Gemini AI <-> WS Bridge <-> n8n <-> Supabase
// Port: 3035
// ============================================================
//
// COMPLETE CALL FLOW:
// 1. Patient calls Vobiz number -> Vobiz sends webhook HERE
// 2. Orchestrator looks up clinic in Supabase -> creates callSession
// 3. Returns TwiML to connect call to WebSocket bridge
// 4. WS Bridge streams audio -> Gemini STT -> orchestrator processes
// 5. Each turn: Gemini AI chat + sentiment analysis -> response for TTS
// 6. If booking/check/reschedule -> trigger n8n webhook
// 7. If emergency/angry -> transfer to clinic human number
// 8. Call ends -> Gemini summary -> save to Supabase -> notify n8n
// ============================================================

const PORT = 3035;

// ============================================================
// ENVIRONMENT CONFIGURATION
// ============================================================

const VOBIZ_AUTH_ID = process.env.VOBIZ_AUTH_ID || '';
const VOBIZ_AUTH_TOKEN = process.env.VOBIZ_AUTH_TOKEN || '';
const VOBIZ_MOBILE_NO = process.env.VOBIZ_MOBILE_NO || '';
const VOBIZ_CREDENTIAL_ID = process.env.VOBIZ_CREDENTIAL_ID || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_DEMO_MODE = process.env.GEMINI_DEMO_MODE === 'true';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const N8N_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv1347095.hstgr.cloud';

// Downstream service URLs (supports Docker Compose networking via env vars)
const VOBIZ_SERVICE = process.env.VOBIZ_SERVICE_URL || 'http://localhost:3031';
const GEMINI_SERVICE = process.env.GEMINI_SERVICE_URL || 'http://localhost:3032';
const WS_BRIDGE_SERVICE = process.env.WS_BRIDGE_SERVICE_URL || 'http://localhost:3033';
const MAIN_APP = process.env.MAIN_APP_URL || 'http://localhost:3000';

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
  type: string;
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
  clinicId?: string;
}

interface ServiceHealth {
  status: 'connected' | 'degraded' | 'offline';
  latency?: number;
  details?: string;
}

// ============================================================
// STATE
// ============================================================

const startTime = Date.now();
const activeSessions = new Map<string, CallSession>();

// ============================================================
// CIRCUIT BREAKER PATTERN
// ============================================================

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000; // 60 seconds
const circuitBreakers = new Map<string, CircuitState>();

function getCircuit(serviceName: string): CircuitState {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, { failures: 0, lastFailure: 0, state: 'closed' });
  }
  return circuitBreakers.get(serviceName)!;
}

function recordFailure(serviceName: string): void {
  const c = getCircuit(serviceName);
  c.failures++;
  c.lastFailure = Date.now();
  if (c.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    c.state = 'open';
    console.error(`🔌 [CIRCUIT] ${serviceName} -> OPEN (after ${c.failures} failures)`);
  }
}

function recordSuccess(serviceName: string): void {
  const c = getCircuit(serviceName);
  c.failures = 0;
  c.state = 'closed';
}

function isCircuitOpen(serviceName: string): boolean {
  const c = getCircuit(serviceName);
  if (c.state === 'closed') return false;
  if (c.state === 'half-open') return false;
  // Open - check if reset time has passed
  if (Date.now() - c.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
    c.state = 'half-open';
    console.log(`🔌 [CIRCUIT] ${serviceName} -> HALF-OPEN (reset timeout)`);
    return false;
  }
  return true;
}

// ============================================================
// SMART RETRY WITH EXPONENTIAL BACKOFF
// ============================================================

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseTimeout = 8000,
  serviceName = 'unknown'
): Promise<{ ok: boolean; data: unknown; status: number; latency: number }> {
  if (isCircuitOpen(serviceName)) {
    return { ok: false, data: { error: 'Circuit breaker open' }, status: 503, latency: 0 };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const delay = attempt === 0 ? 0 : Math.min(1000 * Math.pow(2, attempt - 1), 8000);
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
      console.log(`🔄 [RETRY] ${serviceName} attempt ${attempt + 1}/${maxRetries} (delay: ${delay}ms)`);
    }

    const start = Date.now();
    try {
      const timeout = baseTimeout + (attempt * 2000); // Increase timeout on each retry
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeout),
      });
      const latency = Date.now() - start;
      const data = await res.json().catch(() => null);

      if (res.ok) {
        recordSuccess(serviceName);
        return { ok: true, data, status: res.status, latency };
      }

      // 4xx errors are not retried (client error)
      if (res.status >= 400 && res.status < 500) {
        recordSuccess(serviceName); // The service responded
        return { ok: false, data, status: res.status, latency };
      }

      // 5xx - may retry
      recordFailure(serviceName);
      if (attempt === maxRetries) {
        return { ok: false, data, status: res.status, latency };
      }
    } catch (err) {
      const latency = Date.now() - start;
      recordFailure(serviceName);
      console.warn(`⚠️ [RETRY] ${serviceName} attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
      if (attempt === maxRetries) {
        return { ok: false, data: { error: err instanceof Error ? err.message : 'Unknown error' }, status: 502, latency };
      }
    }
  }

  return { ok: false, data: { error: 'All retries exhausted' }, status: 502, latency: 0 };
}

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

// ============================================================
// SUPABASE DIRECT ACCESS (service role)
// ============================================================

async function supabaseQuery(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  query?: string
): Promise<{ ok: boolean; data: unknown; status: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { ok: false, data: null, status: 0 };
  }

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (query) url += `?${query}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': method === 'POST' ? 'return=representation' : 'count=exact',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, data, status: res.status };
  } catch (err) {
    console.warn(`⚠️ [SUPABASE] ${method} ${table} failed:`, err instanceof Error ? err.message : err);
    return { ok: false, data: null, status: 502 };
  }
}

// ============================================================
// CLINIC CONFIG LOADER (Supabase first, then fallback)
// ============================================================

async function loadClinicConfig(clinicId: string): Promise<ClinicConfig | null> {
  // 1. Try Supabase direct lookup
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const clinicRes = await supabaseQuery('clinics', 'GET', undefined, `id=eq.${clinicId}&select=*`);
    if (clinicRes.ok && Array.isArray(clinicRes.data) && clinicRes.data.length > 0) {
      const c = clinicRes.data[0] as Record<string, unknown>;
      const agentRes = await supabaseQuery('agent_configs', 'GET', undefined, `clinic_id=eq.${clinicId}&select=*`);
      const agent = Array.isArray(agentRes.data) && agentRes.data.length > 0
        ? agentRes.data[0] as Record<string, unknown>
        : {};

      return {
        id: clinicId,
        name: String(c.name || 'VoiceAI Clinic'),
        doctorName: String(c.doctor_name || c.doctorName || 'Doctor'),
        phone: String(c.phone || ''),
        services: c.services ? (Array.isArray(c.services) ? c.services : String(c.services).split(',').map((s: string) => s.trim())) : ['General Consultation'],
        fee: String(c.consultation_fee || c.fee || '₹500'),
        hours: String(c.business_hours || c.hours || '09:00-18:00 Mon-Sat'),
        language: String(agent.language || c.language || 'hinglish'),
        greetingMessage: String(agent.greeting_message || ''),
        farewellMessage: String(agent.farewell_message || ''),
        agentName: String(agent.agent_name || 'VoiceAI Assistant'),
        transferNumber: String(c.escalation_number || c.transferNumber || ''),
        escalationEnabled: agent.escalation_enabled !== false,
        escalationAfter: Number(agent.escalation_after || 120),
        escalationKeywords: String(agent.escalation_keywords || 'emergency,pain,bleeding,angry,gussa').split(',').map((k: string) => k.trim()),
        n8nWebhookUrl: String(agent.n8n_webhook_url || ''),
        sipNumber: String(c.sip_number || c.sipNumber || ''),
      };
    }
  }

  // 2. Try main app API
  try {
    const res = await fetchWithRetry(
      `${MAIN_APP}/api/client/settings?clinicId=${clinicId}`,
      {},
      1,
      3000,
      'main-app'
    );
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
    // Continue to fallback
  }

  // 3. Fallback config
  return {
    id: clinicId,
    name: 'VoiceAI Healthcare',
    doctorName: 'Our Doctor',
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
    sipNumber: VOBIZ_MOBILE_NO || null,
  };
}

// ============================================================
// GEMINI AI CHAT (calls Gemini service with retry)
// ============================================================

async function askGemini(message: string, clinicContext: ClinicConfig, conversationHistory: ConversationTurn[]): Promise<string> {
  const res = await fetchWithRetry(
    `${GEMINI_SERVICE}/api/chat`,
    {
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
    },
    2,
    30000,
    'gemini'
  );

  if (res.ok && res.data) {
    const d = res.data as Record<string, unknown>;
    return String(d.response || d.message || 'Sorry, I could not process that.');
  }

  return 'I apologize, but I\'m having trouble connecting to my AI service. Please try again or let me transfer you to our staff.';
}

// ============================================================
// SENTIMENT & INTENT ANALYSIS
// ============================================================

async function analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
  const res = await fetchWithRetry(
    `${GEMINI_SERVICE}/api/analyze-sentiment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    },
    1,
    10000,
    'gemini'
  );

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
// n8n WEBHOOK TRIGGER (with retry)
// ============================================================

async function triggerN8nAction(session: CallSession, actionType: string, payload: Record<string, unknown>): Promise<N8nAction> {
  const clinicConfig = await loadClinicConfig(session.clinicId);
  const n8nAction: N8nAction = {
    type: actionType,
    payload,
    triggeredAt: new Date().toISOString(),
    status: 'pending',
  };

  // Resolve webhook URL
  const webhookUrlMap: Record<string, string | undefined> = {
    booking_request: process.env.N8N_WEBHOOK_BOOKING,
    check_availability: process.env.N8N_WEBHOOK_CHECK_AVAILABILITY,
    reschedule: process.env.N8N_WEBHOOK_RESCHEDULE,
    cancel: process.env.N8N_WEBHOOK_CANCEL,
    transfer: process.env.N8N_WEBHOOK_ESCALATION,
    escalation: process.env.N8N_WEBHOOK_ESCALATION,
    call_ended: process.env.N8N_WEBHOOK_CALL_SUMMARY,
    call_completed: process.env.N8N_WEBHOOK_CALL_SUMMARY,
    test: process.env.N8N_WEBHOOK_TEST,
  };

  const webhookUrl = webhookUrlMap[actionType] || clinicConfig?.n8nWebhookUrl || `${N8N_BASE}/webhook/${actionType}`;
  if (!webhookUrl) {
    console.log(`⚠️ [n8n] No webhook URL for "${actionType}"`);
    n8nAction.status = 'failed';
    n8nAction.response = 'No webhook URL configured';
    return n8nAction;
  }

  console.log(`🔗 [n8n] Triggering ${actionType} -> ${webhookUrl}`);
  n8nAction.status = 'sent';

  const res = await fetchWithRetry(
    webhookUrl,
    {
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
    },
    1,
    5000,
    'n8n'
  );

  n8nAction.status = res.ok ? 'success' : 'failed';
  n8nAction.response = res.data ? JSON.stringify(res.data).substring(0, 500) : 'No response';
  console.log(`✅ [n8n] ${actionType}: ${n8nAction.status}`);

  return n8nAction;
}

// ============================================================
// DATABASE OPERATIONS (Supabase direct + Main App fallback)
// ============================================================

async function saveCallToSupabase(session: CallSession): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return false;
  }

  const res = await supabaseQuery('calls', 'POST', {
    call_sid: session.callSid,
    clinic_id: session.clinicId,
    caller_phone: session.callerPhone,
    caller_name: session.callerName,
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
    started_at: session.startedAt,
    ended_at: session.endedAt || new Date().toISOString(),
  });
  return res.ok;
}

async function saveCallLog(sessionId: string, role: string, text: string, intent?: string, sentiment?: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  const res = await supabaseQuery('call_logs', 'POST', {
    call_sid: sessionId,
    role,
    text,
    intent,
    sentiment,
    created_at: new Date().toISOString(),
  });
  return res.ok;
}

// ============================================================
// VOBiz TWIML GENERATOR
// ============================================================

function generateGatherTwiml(session: CallSession, aiResponseText: string): string {
  const cleanText = aiResponseText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  const lang = session.language === 'english' ? 'en-IN' : 'hi-IN';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${lang}">${cleanText}</Say>
  <Gather numDigits="1" timeout="5" action="/api/orch/gather?callSid=${session.callSid}" method="POST" finishOnKey="">
    <Say voice="alice" language="${lang}">Press 1 to continue, press 2 to speak, or press 3 to talk to our staff.</Say>
  </Gather>
  <Redirect>/api/orch/gather?callSid=${session.callSid}&amp;timeout=true</Redirect>
</Response>`;
}

function generateTransferTwiml(transferTo: string, session: CallSession): string {
  const lang = session.language === 'english' ? 'en-IN' : 'hi-IN';
  const callerId = VOBIZ_MOBILE_NO || transferTo;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${lang}">Please hold while I connect you with our staff.</Say>
  <Dial callerId="${callerId}" timeout="30" action="/api/orch/transfer-status?callSid=${session.callSid}" method="POST">
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
// CORE: INBOUND CALL HANDLER (Vobiz webhook)
// ============================================================

async function handleInboundCall(body: WebhookPayload): Promise<Response> {
  const callSid = body.CallSid || body.call_sid || generateSessionId();
  const from = body.From || body.from || 'unknown';
  const to = body.To || body.to || VOBIZ_MOBILE_NO;
  const clinicId = body.clinicId || 'default';

  console.log(`📞 [INBOUND] Call ${callSid} from ${from} -> ${to} (clinic: ${clinicId})`);

  // Load clinic config
  const clinic = await loadClinicConfig(clinicId);

  // Create call session
  const session: CallSession = {
    callSid,
    clinicId,
    clinicName: clinic?.name || 'Unknown Clinic',
    doctorName: clinic?.doctorName || 'Doctor',
    callerPhone: from,
    callerName: body.CallerName || null,
    direction: 'inbound',
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

  // Save session to Supabase
  saveCallToSupabase(session).then(ok => {
    console.log(ok ? `✅ [DB] Session ${callSid} created in Supabase` : `⚠️ [DB] Session ${callSid} not saved`);
  });

  // Start escalation timer
  if (clinic?.escalationEnabled && clinic.escalationAfter > 0) {
    setTimeout(async () => {
      const s = activeSessions.get(callSid);
      if (s && s.status === 'in-progress' && !s.intent?.includes('farewell')) {
        console.log(`⏰ [ESCALATION] Call ${callSid} exceeded ${clinic.escalationAfter}s`);
        await handleEscalation(callSid);
      }
    }, clinic.escalationAfter * 1000);
  }

  // Generate greeting TwiML
  const greeting = clinic?.greetingMessage || `${clinic?.agentName || 'VoiceAI'} ki taraf se ${clinic?.name || 'clinic'} mein aapka swagat hai! Kaise madad kar sakti hoon?`;
  session.transcript.push(greeting);
  session.conversationHistory.push({ role: 'ai', text: greeting, timestamp: new Date().toISOString() });
  session.status = 'connected';

  console.log(`✅ [INBOUND] Session created for clinic: ${session.clinicName}`);
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

  if (digits) {
    if (digits === '3') return await handleTransferRequest(callSid);
    if (digits === '1') {
      const prompt = 'Kya aap mujhe bata sakte hain ki aapko kya chahiye? Appointment book karna hai, fees jaanna hai, ya kuch aur?';
      session.transcript.push(prompt);
      session.conversationHistory.push({ role: 'ai', text: prompt, timestamp: new Date().toISOString() });
      return xmlResponse(generateGatherTwiml(session, prompt));
    }
  }

  if (!speechText) {
    const repeat = 'Kya aapne kuch kaha? Main sun nahi paayi. Please dobara boliye.';
    session.transcript.push(repeat);
    session.conversationHistory.push({ role: 'ai', text: repeat, timestamp: new Date().toISOString() });
    return xmlResponse(generateGatherTwiml(session, repeat));
  }

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

  // Check escalation
  const clinic = await loadClinicConfig(session.clinicId);
  if (clinic?.escalationEnabled) {
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

  const clinicContext = clinic || await loadClinicConfig(session.clinicId) || {
    name: session.clinicName, doctorName: session.doctorName,
    services: [], fee: '', hours: '', language: session.language,
    greetingMessage: '', farewellMessage: '', agentName: 'VoiceAI',
    transferNumber: null, escalationEnabled: false, escalationAfter: 120,
    escalationKeywords: [], n8nWebhookUrl: null, sipNumber: null,
    id: session.clinicId, phone: '',
  };

  let aiResponse: string;

  switch (intent) {
    case 'appointment': {
      const n8n = await triggerN8nAction(session, 'booking_request', {
        patientPhone: session.callerPhone, patientName: session.callerName, speechText, requestType: 'new_booking',
      });
      session.n8nActions.push(n8n);
      session.bookingDetails = { patientName: session.callerName, patientPhone: session.callerPhone, date: null, time: null, service: null, action: 'book' };
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }
    case 'check_availability': {
      const n8n = await triggerN8nAction(session, 'check_availability', { patientPhone: session.callerPhone, query: speechText });
      session.n8nActions.push(n8n);
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }
    case 'reschedule': {
      const n8n = await triggerN8nAction(session, 'reschedule', { patientPhone: session.callerPhone, query: speechText });
      session.n8nActions.push(n8n);
      if (!session.bookingDetails) {
        session.bookingDetails = { patientName: session.callerName, patientPhone: session.callerPhone, date: null, time: null, service: null, action: 'reschedule' };
      } else { session.bookingDetails.action = 'reschedule'; }
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }
    case 'cancellation': {
      const n8n = await triggerN8nAction(session, 'cancel', { patientPhone: session.callerPhone, query: speechText });
      session.n8nActions.push(n8n);
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
      break;
    }
    case 'escalation': {
      aiResponse = clinicContext.transferNumber
        ? 'Main samajh rahi hoon aapko problem ho rahi hai. Abhi apne staff se connect kar rahi hoon.'
        : 'Main samajh rahi hoon aapko problem ho rahi hai. Kya aap apna naam aur number de sakte hain?';
      break;
    }
    case 'farewell': {
      const farewell = clinicContext.farewellMessage || `${clinicContext.name} ko call karne ke liye dhanyavaad! Aapka din shubh ho!`;
      session.transcript.push(farewell);
      session.conversationHistory.push({ role: 'ai', text: farewell, timestamp: new Date().toISOString() });
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      session.duration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      saveCallToSupabase(session).then(ok => {
        console.log(ok ? `✅ [DB] Call ${callSid} saved` : `⚠️ [DB] Call ${callSid} save failed`);
        activeSessions.delete(callSid);
      });
      return xmlResponse(generateHangupTwiml(farewell, session));
    }
    default: {
      aiResponse = await askGemini(speechText, clinicContext, session.conversationHistory);
    }
  }

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
    transferTo: transferNumber, reason: 'Patient requested human agent', conversationLength: session.conversationHistory.length,
  });
  session.n8nActions.push(n8n);
  console.log(`🔄 [TRANSFER] Call ${callSid} -> ${transferNumber}`);
  return xmlResponse(generateTransferTwiml(transferNumber, session));
}

async function handleTransferStatus(callSid: string, status: string): Promise<Response> {
  const session = activeSessions.get(callSid);
  if (!session) return jsonResponse({ ok: true });

  if (status === 'completed' || status === 'answered') {
    session.status = 'completed';
    session.transcript.push('Staff ne call utha liya. Transfer successful.');
  } else {
    const msg = 'Staff available nahi hai. Main wapas VoiceAI hoon.';
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
// CALL STATUS WEBHOOK
// ============================================================

async function handleCallStatus(body: WebhookPayload): Promise<Response> {
  const callSid = body.CallSid || body.call_sid || '';
  const status = body.CallStatus || body.Status || 'unknown';
  const duration = parseInt(body.Duration || '0');

  const session = activeSessions.get(callSid);
  if (!session) return jsonResponse({ ok: true });

  session.status = status === 'completed' ? 'completed' : 'failed';
  session.endedAt = new Date().toISOString();
  session.duration = duration;

  saveCallToSupabase(session).then(ok => {
    console.log(ok ? `✅ [DB] Call ${callSid} saved (${duration}s)` : `⚠️ [DB] Call ${callSid} save failed`);
    activeSessions.delete(callSid);
  });

  return jsonResponse({ ok: true, callSid, status });
}

// ============================================================
// NEW: /api/orchestrate/inbound-call
// ============================================================

async function handleOrchestrateInbound(req: Request): Promise<Response> {
  const body = await parseBody<{
    callerNumber?: string;
    clinicId?: string;
    callSid?: string;
    callStatus?: string;
    vobizNumber?: string;
  }>(req);

  const callerNumber = body.callerNumber || 'unknown';
  const vobizNumber = body.vobizNumber || '';
  let clinicId = body.clinicId || '';
  const callSid = body.callSid || generateSessionId();

  console.log(`🔄 [ORCH] Inbound call orchestration: ${callerNumber} -> clinic: ${clinicId || 'lookup by vobizNumber'}`);

  // Step 1: Look up clinic by vobizNumber if clinicId not provided
  if (!clinicId && vobizNumber) {
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const clinicRes = await supabaseQuery('clinics', 'GET', undefined, `sip_number=eq.${vobizNumber}&select=id,name`);
      if (clinicRes.ok && Array.isArray(clinicRes.data) && clinicRes.data.length > 0) {
        const c = clinicRes.data[0] as Record<string, unknown>;
        clinicId = String(c.id);
        console.log(`📋 [ORCH] Clinic found by SIP number: ${c.name} (${clinicId})`);
      }
    }
  }

  if (!clinicId) clinicId = 'default';

  // Step 2: Get clinic's agentConfig
  const clinic = await loadClinicConfig(clinicId);

  // Step 3: Create call session
  const session: CallSession = {
    callSid,
    clinicId,
    clinicName: clinic?.name || 'Unknown',
    doctorName: clinic?.doctorName || 'Doctor',
    callerPhone: callerNumber,
    callerName: null,
    direction: 'inbound',
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

  // Save to Supabase
  saveCallToSupabase(session);

  // Step 4: Generate TwiML to connect to WS Bridge
  const wsBridgeUrl = `ws://localhost:3033?callSid=${callSid}&clinicId=${clinicId}`;
  const greeting = clinic?.greetingMessage || `${clinic?.agentName || 'VoiceAI'} ki taraf se ${clinic?.name || 'clinic'} mein aapka swagat hai!`;
  session.transcript.push(greeting);
  session.conversationHistory.push({ role: 'ai', text: greeting, timestamp: new Date().toISOString() });
  session.status = 'connected';

  // Return TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${session.language === 'english' ? 'en-IN' : 'hi-IN'}">${greeting}</Say>
  <Connect>
    <Stream url="wss://localhost:3033?callSid=${callSid}&amp;clinicId=${clinicId}" />
  </Connect>
  <Gather numDigits="1" timeout="5" action="/api/orch/gather?callSid=${callSid}" method="POST" finishOnKey="">
    <Say voice="alice">Press 1 to continue, 2 to speak, 3 for staff.</Say>
  </Gather>
</Response>`;

  return xmlResponse(twiml);
}

// ============================================================
// NEW: /api/orchestrate/process-audio
// ============================================================

async function handleOrchestrateProcessAudio(req: Request): Promise<Response> {
  const body = await parseBody<{
    callSessionId?: string;
    audioText?: string;
    language?: string;
  }>(req);

  const callSessionId = body.callSessionId;
  const audioText = body.audioText;
  const language = body.language || 'hi-IN';

  if (!callSessionId || !audioText) {
    return jsonResponse({ error: 'Missing callSessionId or audioText' }, 400);
  }

  const session = activeSessions.get(callSessionId);
  if (!session) {
    return jsonResponse({ error: 'Call session not found or expired', callSessionId }, 404);
  }

  console.log(`🎤 [ORCH] Processing audio for ${callSessionId}: "${audioText.substring(0, 80)}..."`);

  // Record caller's turn
  session.transcript.push(audioText);
  session.conversationHistory.push({ role: 'caller', text: audioText, timestamp: new Date().toISOString() });
  session.lastActivityAt = new Date().toISOString();

  // Step 1: Send audioText + clinic context to Gemini
  const clinicContext = await loadClinicConfig(session.clinicId) || {
    name: session.clinicName, doctorName: session.doctorName,
    services: [], fee: '₹500', hours: '09:00-18:00', language: session.language,
    greetingMessage: '', farewellMessage: '', agentName: 'VoiceAI',
    transferNumber: null, escalationEnabled: false, escalationAfter: 120,
    escalationKeywords: [], n8nWebhookUrl: null, sipNumber: null,
    id: session.clinicId, phone: '',
  };

  const geminiRes = await fetchWithRetry(
    `${GEMINI_SERVICE}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: audioText,
        clinicContext: {
          clinicName: clinicContext.name,
          doctorName: clinicContext.doctorName,
          services: clinicContext.services,
          fee: clinicContext.fee,
          hours: clinicContext.hours,
          language: clinicContext.language,
        },
        conversationHistory: session.conversationHistory.slice(-10).map(turn => ({
          role: turn.role === 'ai' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        })),
      }),
    },
    2,
    30000,
    'gemini'
  );

  const aiResponse = geminiRes.ok && geminiRes.data
    ? String((geminiRes.data as Record<string, unknown>).response || (geminiRes.data as Record<string, unknown>).message || 'I cannot process that right now.')
    : 'I apologize, my AI service is currently unavailable.';

  // Step 2: Analyze sentiment
  const sentimentRes = await fetchWithRetry(
    `${GEMINI_SERVICE}/api/analyze-sentiment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: audioText }),
    },
    1,
    10000,
    'gemini-sentiment'
  );

  const sentiment = sentimentRes.ok && sentimentRes.data
    ? (sentimentRes.data as Record<string, unknown>)
    : { sentiment: 'neutral', confidence: 0.5 };

  // Detect intent locally
  const intent = detectIntent(audioText);
  session.intent = intent;
  session.sentiment = String(sentiment.sentiment || 'neutral');

  // Record AI's turn
  session.transcript.push(aiResponse);
  session.conversationHistory.push({
    role: 'ai', text: aiResponse, timestamp: new Date().toISOString(),
    intent, sentiment: session.sentiment,
  });

  // Step 3: Save call_log to Supabase
  saveCallLog(callSessionId, 'caller', audioText, intent, session.sentiment);
  saveCallLog(callSessionId, 'ai', aiResponse, intent, session.sentiment);

  // Trigger n8n for actionable intents
  if (['appointment', 'check_availability', 'reschedule', 'cancellation', 'emergency', 'escalation'].includes(intent)) {
    const n8n = await triggerN8nAction(session, intent === 'appointment' ? 'booking_request' : intent, {
      patientPhone: session.callerPhone,
      speechText: audioText,
      aiResponse,
      sentiment: session.sentiment,
    });
    session.n8nActions.push(n8n);
  }

  return jsonResponse({
    callSessionId,
    aiResponse,
    sentiment: String(sentiment.sentiment || 'neutral'),
    confidence: Number(sentiment.confidence || 0.5),
    intent,
    geminiLatency: geminiRes.latency,
    sentimentLatency: sentimentRes.latency,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// NEW: /api/orchestrate/end-call
// ============================================================

async function handleOrchestrateEndCall(req: Request): Promise<Response> {
  const body = await parseBody<{
    callSessionId?: string;
    duration?: number;
    finalTranscript?: string;
  }>(req);

  const callSessionId = body.callSessionId;
  if (!callSessionId) {
    return jsonResponse({ error: 'Missing callSessionId' }, 400);
  }

  const session = activeSessions.get(callSessionId);
  if (!session) {
    // Try to find in Supabase
    console.log(`📋 [ORCH] End call for ${callSessionId} - session not in memory, checking Supabase`);
    return jsonResponse({
      callSessionId,
      summary: 'Session already completed or not found in memory.',
      appointmentCreated: false,
      webhookTriggered: false,
      status: 'not_found',
    });
  }

  session.status = 'completed';
  session.endedAt = new Date().toISOString();
  session.duration = body.duration || Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

  console.log(`🏁 [ORCH] Ending call ${callSessionId} (duration: ${session.duration}s, turns: ${session.conversationHistory.length})`);

  // Step 1: Get all call_logs from Supabase (if available)
  let transcriptText = session.transcript.join('\n');
  if (body.finalTranscript) transcriptText = body.finalTranscript;

  // Step 2: Generate summary via Gemini
  let summary = `${session.intent || 'General'} inquiry call. ${session.transcript.length} messages exchanged.`;
  let bookingDetails: Record<string, unknown> | null = null;

  const summaryRes = await fetchWithRetry(
    `${GEMINI_SERVICE}/api/generate-summary`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcriptText, clinicName: session.clinicName }),
    },
    2,
    30000,
    'gemini-summary'
  );

  if (summaryRes.ok && summaryRes.data) {
    const sd = summaryRes.data as Record<string, unknown>;
    summary = String(sd.summary || summary);
    bookingDetails = (sd.bookingDetails as Record<string, unknown>) || null;
  }

  // Step 3: If appointment booked, create in Supabase
  let appointmentCreated = false;
  if (session.bookingDetails?.action === 'book' && bookingDetails) {
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const apptRes = await supabaseQuery('appointments', 'POST', {
        clinic_id: session.clinicId,
        patient_name: session.bookingDetails.patientName || session.callerName,
        patient_phone: session.bookingDetails.patientPhone || session.callerPhone,
        date: bookingDetails.date || session.bookingDetails.date,
        time: bookingDetails.time || session.bookingDetails.time,
        service: bookingDetails.service || session.bookingDetails.service,
        status: 'confirmed',
        source: 'ai_call',
        call_sid: session.callSid,
        created_at: new Date().toISOString(),
      });
      appointmentCreated = apptRes.ok;
      if (appointmentCreated) console.log(`📅 [ORCH] Appointment created for ${callSessionId}`);
    }
  }

  // Step 4: Trigger n8n call-completed webhook
  let webhookTriggered = false;
  const n8nAction = await triggerN8nAction(session, 'call_completed', {
    duration: session.duration,
    turns: session.conversationHistory.length,
    intent: session.intent,
    sentiment: session.sentiment,
    summary,
    bookingDetails: session.bookingDetails,
    appointmentCreated,
  });
  session.n8nActions.push(n8nAction);
  webhookTriggered = n8nAction.status === 'success';

  // Step 5: Update callSession in Supabase
  saveCallToSupabase(session);

  // Step 6: Clean up
  activeSessions.delete(callSessionId);

  return jsonResponse({
    callSessionId,
    summary,
    intent: session.intent,
    sentiment: session.sentiment,
    duration: session.duration,
    turns: session.conversationHistory.length,
    appointmentCreated,
    webhookTriggered,
    n8nActionsCount: session.n8nActions.length,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// NEW: /api/orchestrate/test-gemini
// ============================================================

async function handleOrchestrateTestGemini(): Promise<Response> {
  console.log(`🧪 [TEST] Testing Gemini AI connection...`);
  const start = Date.now();

  const res = await fetchWithRetry(
    `${GEMINI_SERVICE}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello, this is a test message. Please respond with "OK".',
        clinicContext: { clinicName: 'Test Clinic' },
      }),
    },
    2,
    10000,
    'gemini-test'
  );

  const latency = Date.now() - start;
  const data = res.data as Record<string, unknown> | null;

  return jsonResponse({
    connected: res.ok,
    model: String(data?.model || 'unknown'),
    demoMode: data?.demoMode || GEMINI_DEMO_MODE || false,
    responseTime: latency,
    latency,
    response: data?.response || data?.error || null,
    error: res.ok ? undefined : String(data?.error || 'Connection failed'),
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// NEW: /api/orchestrate/test-vobiz
// ============================================================

async function handleOrchestrateTestVobiz(): Promise<Response> {
  console.log(`🧪 [TEST] Testing Vobiz SIP connection...`);
  const start = Date.now();

  let connected = false;
  let accountSid: string | undefined;
  let error: string | undefined;

  // Try Vobiz service health check
  const res = await fetchWithRetry(`${VOBIZ_SERVICE}/`, {}, 1, 10000, 'vobiz-test');
  if (res.ok) {
    connected = true;
    const data = res.data as Record<string, unknown>;
    accountSid = VOBIZ_AUTH_ID || undefined;
  } else {
    error = String((res.data as Record<string, unknown>)?.error || 'Service unreachable');
    // Check if credentials are placeholder
    if (!VOBIZ_AUTH_TOKEN || VOBIZ_AUTH_TOKEN === 'placeholder') {
      error = 'Vobiz credentials not configured (placeholder token). Set VOBIZ_AUTH_TOKEN in .env';
    }
  }

  return jsonResponse({
    connected,
    accountSid,
    serviceUrl: VOBIZ_SERVICE,
    authId: VOBIZ_AUTH_ID ? `${VOBIZ_AUTH_ID.slice(0, 4)}***` : 'not set',
    hasToken: !!VOBIZ_AUTH_TOKEN && VOBIZ_AUTH_TOKEN !== 'placeholder',
    responseTime: Date.now() - start,
    error,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// NEW: /api/orchestrate/status - Full Integration Status
// ============================================================

async function checkServiceHealth(name: string, url: string, timeout = 5000, headers?: Record<string, string>): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout), headers });
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: 'connected', latency };
    }
    return { status: 'degraded', latency, details: `HTTP ${res.status}` };
  } catch {
    return { status: 'offline', details: 'Connection refused or timeout' };
  }
}

async function handleOrchestrateStatus(): Promise<Response> {
  console.log(`📊 [STATUS] Checking all service connections...`);

  const [vobiz, gemini, wsBridge, supabase, n8n] = await Promise.all([
    checkServiceHealth('Vobiz SIP', `${VOBIZ_SERVICE}/`, 10000),
    checkServiceHealth('Gemini AI', `${GEMINI_SERVICE}/`, 5000),
    checkServiceHealth('WS Bridge', `${WS_BRIDGE_SERVICE}/`, 5000),
    checkServiceHealth('Supabase', `${SUPABASE_URL}/rest/v1/`, 5000, SUPABASE_SERVICE_KEY ? {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    } : undefined),
    checkServiceHealth('n8n', `${N8N_BASE}/healthz`, 5000),
  ]);

  // Check circuit breaker states
  const circuitStates: Record<string, { state: string; failures: number }> = {};
  for (const [name, circuit] of circuitBreakers) {
    circuitStates[name] = { state: circuit.state, failures: circuit.failures };
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const allHealthy = [vobiz, gemini, wsBridge, supabase].every(s => s.status === 'connected');

  return jsonResponse({
    service: 'VoiceAI Call Orchestrator',
    version: '2.0.0',
    status: allHealthy ? 'operational' : 'degraded',
    uptime,
    uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
    activeCalls: activeSessions.size,
    port: PORT,
    timestamp: new Date().toISOString(),
    services: {
      vobiz: { ...vobiz, port: 3031, configured: !!VOBIZ_AUTH_TOKEN && VOBIZ_AUTH_TOKEN !== 'placeholder' },
      gemini: { ...gemini, port: 3032, configured: !!GEMINI_API_KEY, demoMode: GEMINI_DEMO_MODE },
      wsBridge: { ...wsBridge, port: 3033 },
      supabase: { ...supabase, url: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 30)}...` : 'not configured' },
      n8n: { ...n8n, url: N8N_BASE },
    },
    circuitBreakers: Object.keys(circuitStates).length > 0 ? circuitStates : undefined,
    environment: {
      hasVobizAuth: !!VOBIZ_AUTH_ID,
      hasVobizToken: !!VOBIZ_AUTH_TOKEN && VOBIZ_AUTH_TOKEN !== 'placeholder',
      hasGeminiKey: !!GEMINI_API_KEY,
      geminiDemoMode: GEMINI_DEMO_MODE,
      hasSupabase: !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY,
      n8nBase: N8N_BASE,
    },
    endpoints: [
      'GET  / - Health check',
      'GET  /api/orchestrate/status - Full integration status',
      'POST /api/orchestrate/inbound-call - Inbound call (Vobiz webhook)',
      'POST /api/orchestrate/process-audio - Process transcribed audio',
      'POST /api/orchestrate/end-call - Call completed',
      'POST /api/orchestrate/test-gemini - Test Gemini API',
      'POST /api/orchestrate/test-vobiz - Test Vobiz API',
      'POST /api/orch/inbound - Vobiz inbound (legacy)',
      'POST /api/orch/gather - Speech processor (legacy)',
      'POST /api/orch/status - Call status (legacy)',
      'POST /api/orch/make-call - Outbound call',
      'GET  /api/orch/sessions - Active sessions',
      'POST /api/orch/test-call - Simulate test call',
    ],
  });
}

// ============================================================
// LEGACY: MAKE OUTBOUND CALL
// ============================================================

async function handleMakeCall(req: Request): Promise<Response> {
  const body = await parseBody<{ to: string; clinicId: string; patientName?: string }>(req);
  if (!body.to || !body.clinicId) return jsonResponse({ error: 'Missing "to" and "clinicId"' }, 400);

  const vobizRes = await fetchWithRetry(`${VOBIZ_SERVICE}/api/make-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: body.to, clinicId: body.clinicId }),
  }, 2, 10000, 'vobiz');

  if (!vobizRes.ok) return jsonResponse({ error: 'Failed to initiate call via Vobiz', details: vobizRes.data }, 502);

  const vobizData = vobizRes.data as Record<string, unknown>;
  const callSid = String(vobizData.callSid || generateSessionId());
  const clinic = await loadClinicConfig(body.clinicId);

  const session: CallSession = {
    callSid, clinicId: body.clinicId, clinicName: clinic?.name || 'Unknown',
    doctorName: clinic?.doctorName || 'Doctor', callerPhone: body.to,
    callerName: body.patientName || null, direction: 'outbound', status: 'ringing',
    language: clinic?.language || 'hinglish', transferNumber: clinic?.transferNumber || null,
    escalationEnabled: clinic?.escalationEnabled ?? true, escalationAfter: clinic?.escalationAfter || 120,
    conversationHistory: [], transcript: [], intent: null, sentiment: null,
    bookingDetails: null, n8nActions: [],
    startedAt: new Date().toISOString(), endedAt: null, duration: 0,
    lastActivityAt: new Date().toISOString(),
  };
  activeSessions.set(callSid, session);

  return jsonResponse({ success: true, callSid, clinicId: body.clinicId, message: 'Outbound call initiated.', vobizResponse: vobizData });
}

// ============================================================
// LEGACY: TEST CALL SIMULATION
// ============================================================

async function handleTestCall(req: Request): Promise<Response> {
  const body = await parseBody<{ clinicId?: string; scenario?: string }>(req);
  const clinicId = body.clinicId || 'default';
  const scenario = body.scenario || 'booking';

  const scenarios: Record<string, string[]> = {
    booking: ['Hello, mujhe appointment book karna hai.', 'Haan, Dr. Test ke liye, kal 3 baje theek rahega.', 'Ok done, thank you!'],
    fee: ['Consultation fee kitna hai?', 'Root canal treatment ke liye kitna lagega?', 'Ok thank you.'],
    escalation: ['Main bahut gussa hoon, last time bahut wait karna pada!', 'Koi sense nahi hai aapki service mein!'],
    emergency: ['Emergency hai! Mere patient ko bahut pain ho raha hai!'],
  };

  const messages = scenarios[scenario] || scenarios.booking;
  const callSid = `TEST-${Date.now()}`;
  const clinic = await loadClinicConfig(clinicId);

  const testSession: CallSession = {
    callSid, clinicId, clinicName: clinic?.name || 'Test Clinic', doctorName: clinic?.doctorName || 'Dr. Test',
    callerPhone: '+919999999999', callerName: 'Test Patient', direction: 'inbound',
    status: 'in-progress', language: clinic?.language || 'hinglish',
    transferNumber: clinic?.transferNumber || null,
    escalationEnabled: clinic?.escalationEnabled ?? true, escalationAfter: 120,
    conversationHistory: [], transcript: [], intent: null, sentiment: null,
    bookingDetails: null, n8nActions: [],
    startedAt: new Date().toISOString(), endedAt: null, duration: 0,
    lastActivityAt: new Date().toISOString(),
  };
  activeSessions.set(callSid, testSession);

  for (const msg of messages) {
    testSession.transcript.push(msg);
    testSession.conversationHistory.push({ role: 'caller', text: msg, timestamp: new Date().toISOString() });
    const intent = detectIntent(msg);
    testSession.intent = intent;

    const aiResponse = await askGemini(msg, clinic || {
      name: 'Test Clinic', doctorName: 'Dr. Test', phone: '', services: [],
      fee: '₹500', hours: '09:00-18:00', language: 'hinglish',
      greetingMessage: '', farewellMessage: '', agentName: 'VoiceAI',
      transferNumber: null, escalationEnabled: true, escalationAfter: 120,
      escalationKeywords: ['emergency', 'pain', 'gussa'], n8nWebhookUrl: null,
      sipNumber: null, id: clinicId,
    }, testSession.conversationHistory);
    testSession.transcript.push(aiResponse);
    testSession.conversationHistory.push({ role: 'ai', text: aiResponse, timestamp: new Date().toISOString() });

    if (['appointment', 'reschedule', 'check_availability'].includes(intent)) {
      const n8n = await triggerN8nAction(testSession, intent === 'appointment' ? 'booking_request' : intent, { patientPhone: testSession.callerPhone, query: msg });
      testSession.n8nActions.push(n8n);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  testSession.status = 'completed';
  testSession.endedAt = new Date().toISOString();
  testSession.duration = messages.length * 15;
  activeSessions.delete(callSid);

  return jsonResponse({
    success: true, scenario, callSid, clinicId,
    messagesExchanged: testSession.conversationHistory.length,
    transcript: testSession.transcript,
    n8nActionsTriggered: testSession.n8nActions,
    intent: testSession.intent, duration: testSession.duration,
  });
}

// ============================================================
// REQUEST ROUTER
// ============================================================

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  // CORS
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

  // === NEW ORCHESTRATION ENDPOINTS ===

  // Full integration status
  if (pathname === '/api/orchestrate/status' && req.method === 'GET') {
    return handleOrchestrateStatus();
  }

  // Inbound call from Vobiz
  if (pathname === '/api/orchestrate/inbound-call' && req.method === 'POST') {
    return handleOrchestrateInbound(req);
  }

  // Process transcribed audio from WS Bridge
  if (pathname === '/api/orchestrate/process-audio' && req.method === 'POST') {
    return handleOrchestrateProcessAudio(req);
  }

  // End call
  if (pathname === '/api/orchestrate/end-call' && req.method === 'POST') {
    return handleOrchestrateEndCall(req);
  }

  // Test Gemini
  if (pathname === '/api/orchestrate/test-gemini' && req.method === 'POST') {
    return handleOrchestrateTestGemini();
  }

  // Test Vobiz
  if (pathname === '/api/orchestrate/test-vobiz' && req.method === 'POST') {
    return handleOrchestrateTestVobiz();
  }

  // === LEGACY ENDPOINTS (backward compatible) ===

  // Health check
  if (pathname === '/' && req.method === 'GET') {
    return handleOrchestrateStatus();
  }

  // Active sessions
  if (pathname === '/api/orch/sessions' && req.method === 'GET') {
    const sessions = Array.from(activeSessions.values()).map(s => ({
      callSid: s.callSid, clinicName: s.clinicName, callerPhone: s.callerPhone,
      status: s.status, intent: s.intent, sentiment: s.sentiment,
      duration: Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000),
      turns: s.conversationHistory.length, n8nActions: s.n8nActions.length,
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

  // GATHER (speech/digit input)
  if (pathname === '/api/orch/gather' && req.method === 'POST') {
    const body = await parseBody<{ SpeechResult?: string; Digits?: string; Result?: string; callSid?: string }>(req);
    const callSid = body.callSid || url.searchParams.get('callSid') || '';
    const isTimeout = url.searchParams.get('timeout') === 'true';
    if (isTimeout) return handleGather(callSid, null, null);
    return handleGather(callSid, body.SpeechResult || body.Result || null, body.Digits || null);
  }

  // CALL STATUS WEBHOOK
  if (pathname === '/api/orch/status' && req.method === 'POST') {
    const body = await parseBody<WebhookPayload>(req);
    return handleCallStatus(body);
  }

  // TRANSFER STATUS
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

  // 404
  return jsonResponse({
    error: 'Not Found',
    message: `Route ${pathname} with method ${req.method} not found`,
    availableEndpoints: [
      'GET  /',
      'GET  /api/orchestrate/status',
      'POST /api/orchestrate/inbound-call',
      'POST /api/orchestrate/process-audio',
      'POST /api/orchestrate/end-call',
      'POST /api/orchestrate/test-gemini',
      'POST /api/orchestrate/test-vobiz',
      'POST /api/orch/inbound',
      'POST /api/orch/gather',
      'POST /api/orch/status',
      'POST /api/orch/make-call',
      'GET  /api/orch/sessions',
      'POST /api/orch/test-call',
    ],
  }, 404);
}

// ============================================================
// START SERVER (Node.js http for stability)
// ============================================================

import { createServer } from 'http';

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
  }

  let body = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    for await (const chunk of req) {
      body += chunk.toString();
    }
  }

  const webRequest = new Request(url.toString(), {
    method: req.method || 'GET',
    headers,
    body: body || undefined,
  });

  try {
    const response = await handleRequest(webRequest);
    const status = response.status;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });
    const responseBody = await response.text();

    res.writeHead(status, responseHeaders);
    res.end(responseBody);

    // Log API calls
    if (url.pathname !== '/') {
      console.log(`📤 [${req.method}] ${url.pathname} -> ${status} (${responseBody.length} bytes)`);
    }
  } catch (error) {
    console.error('❌ Unhandled request error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧠 Call Orchestrator v2.0 running on port ${PORT}`);
  console.log(`   Vobiz SIP:     ${VOBIZ_SERVICE} (:3031)`);
  console.log(`   Gemini AI:     ${GEMINI_SERVICE} (:3032)`);
  console.log(`   WS Bridge:     ${WS_BRIDGE_SERVICE} (:3033)`);
  console.log(`   Supabase:      ${SUPABASE_URL ? 'CONNECTED' : 'NOT CONFIGURED'}`);
  console.log(`   n8n:           ${N8N_BASE}`);
  console.log(`   Gemini Demo:   ${GEMINI_DEMO_MODE ? 'ON' : 'OFF'}`);
  console.log(`   Vobiz Token:   ${VOBIZ_AUTH_TOKEN ? `${VOBIZ_AUTH_TOKEN.slice(0, 6)}...` : 'NOT SET'}`);
  console.log(`\n   NEW Endpoints:`);
  console.log(`   POST /api/orchestrate/inbound-call  - Vobiz webhook`);
  console.log(`   POST /api/orchestrate/process-audio - WS Bridge audio`);
  console.log(`   POST /api/orchestrate/end-call       - Call completed`);
  console.log(`   POST /api/orchestrate/test-gemini    - Test Gemini`);
  console.log(`   POST /api/orchestrate/test-vobiz     - Test Vobiz`);
  console.log(`   GET  /api/orchestrate/status         - Full status`);
  console.log(`\n   LEGACY Endpoints (/api/orch/*) still active`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Call Orchestrator...');
  // Close all active sessions
  for (const [sid, session] of activeSessions) {
    session.status = 'failed';
    session.endedAt = new Date().toISOString();
    saveCallToSupabase(session);
  }
  server.close(() => { console.log('✅ Server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Call Orchestrator...');
  server.close(() => { console.log('✅ Server closed'); process.exit(0); });
});
