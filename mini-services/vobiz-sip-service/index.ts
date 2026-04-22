/**
 * Vobiz SIP Integration Mini-Service
 *
 * Provides API endpoints for call management via Vobiz SIP trunking.
 * Falls back to structured mock responses when Vobiz API is unreachable.
 *
 * Port: 3031
 */

// ============================================================
// Configuration
// ============================================================

const PORT = 3031;

const VOBIZ_AUTH_ID = process.env.VOBIZ_AUTH_ID || 'MA_GU1ZOXC3';
const VOBIZ_AUTH_TOKEN = process.env.VOBIZ_AUTH_TOKEN || '';
const VOBIZ_MOBILE_NO = process.env.VOBIZ_MOBILE_NO || '+918065481672';
const VOBIZ_CREDENTIAL_ID = process.env.VOBIZ_CREDENTIAL_ID || '';
const VOBIZ_BASE_URL = 'https://api.vobiz.com/v1';

// ============================================================
// Types
// ============================================================

interface CallRequest {
  to: string;
  clinicId: string;
  from?: string;
}

interface MockCallRecord {
  callSid: string;
  from: string;
  to: string;
  status: CallStatus;
  direction: 'inbound' | 'outbound';
  clinicId: string;
  duration: number;
  startedAt: string;
  endedAt: string | null;
  recordingUrl: string | null;
  cost: number;
}

type CallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'busy'
  | 'no-answer'
  | 'canceled';

interface HealthInfo {
  service: string;
  version: string;
  status: string;
  uptime: number;
  vobizConnected: boolean;
  port: number;
  timestamp: string;
  endpoints: string[];
}

// ============================================================
// State
// ============================================================

const startTime = Date.now();

// In-memory call store (survives hot reload since bun --hot preserves state)
const callStore = new Map<string, MockCallRecord>();
let mockCallCounter = 1000;

// Simulated call status transitions
const STATUS_TRANSITIONS: CallStatus[] = [
  'queued',
  'ringing',
  'in-progress',
  'completed',
];

// ============================================================
// Utility Functions
// ============================================================

function generateCallSid(): string {
  mockCallCounter++;
  return `CA${Date.now()}${mockCallCounter.toString().padStart(4, '0')}`;
}

function getBasicAuthHeader(): string {
  const credentials = `${VOBIZ_AUTH_ID}:${VOBIZ_AUTH_TOKEN}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

function randomDuration(): number {
  return Math.floor(Math.random() * 300) + 15; // 15s to ~5min
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

function parseBody<T>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

function getQueryParam(req: Request, key: string): string | null {
  const url = new URL(req.url);
  return url.searchParams.get(key);
}

function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Try calling the Vobiz API. If it fails, return null so the caller
 * can fall back to mock data.
 */
async function tryVobizApi(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; data: unknown } | null> {
  try {
    const url = `${VOBIZ_BASE_URL}${path}`;
    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: getBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`🌐 [Vobiz] ${method} ${url}`);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`⚠️  [Vobiz] API returned ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ [Vobiz] ${method} ${path} succeeded`);
    return { ok: true, data };
  } catch (err) {
    console.warn(`⚠️  [Vobiz] API call failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ============================================================
// Mock Data Generators
// ============================================================

function createMockCall(req: CallRequest): MockCallRecord {
  const callSid = generateCallSid();
  const now = new Date();

  const record: MockCallRecord = {
    callSid,
    from: req.from || VOBIZ_MOBILE_NO,
    to: req.to,
    status: 'queued',
    direction: 'outbound',
    clinicId: req.clinicId,
    duration: 0,
    startedAt: now.toISOString(),
    endedAt: null,
    recordingUrl: null,
    cost: 0,
  };

  callStore.set(callSid, record);

  // Simulate call progression
  simulateCallProgression(callSid);

  return record;
}

function simulateCallProgression(callSid: string) {
  const record = callStore.get(callSid);
  if (!record) return;

  // queued → ringing (1-2s)
  setTimeout(() => {
    const call = callStore.get(callSid);
    if (call) {
      call.status = 'ringing';
      console.log(`📞 [Mock] Call ${callSid} → ringing`);
    }
  }, 1500);

  // ringing → in-progress (3-5s)
  setTimeout(() => {
    const call = callStore.get(callSid);
    if (call) {
      call.status = 'in-progress';
      console.log(`📞 [Mock] Call ${callSid} → in-progress`);
    }
  }, 4000);

  // in-progress → completed (10-20s)
  const duration = randomDuration() * 1000;
  setTimeout(() => {
    const call = callStore.get(callSid);
    if (call) {
      call.status = 'completed';
      call.duration = Math.floor(duration / 1000);
      call.endedAt = new Date().toISOString();
      call.cost = parseFloat((duration / 1000 * 0.025).toFixed(3)); // ₹0.025/s
      call.recordingUrl = `https:// recordings.vobiz.com/${callSid}.mp3`;
      console.log(`📞 [Mock] Call ${callSid} → completed (${call.duration}s, ₹${call.cost})`);
    }
  }, duration + 4000);
}

function createMockCallHistory(clinicId: string, limit: number, offset: number) {
  // Generate mock history records
  const allRecords = Array.from(callStore.values())
    .filter((r) => r.clinicId === clinicId || !clinicId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // If not enough records in store, supplement with generated ones
  if (allRecords.length < limit + offset) {
    const needed = limit + offset - allRecords.length;
    for (let i = 0; i < needed; i++) {
      const sid = generateCallSid();
      const hoursAgo = Math.floor(Math.random() * 168); // up to 7 days
      const startTime = new Date(Date.now() - hoursAgo * 3600000);
      const dur = randomDuration();

      const statuses: CallStatus[] = ['completed', 'completed', 'completed', 'no-answer', 'busy', 'failed'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      allRecords.push({
        callSid: sid,
        from: VOBIZ_MOBILE_NO,
        to: `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`,
        status,
        direction: Math.random() > 0.3 ? 'outbound' : 'inbound',
        clinicId: clinicId || 'clinic-default',
        duration: status === 'completed' ? dur : 0,
        startedAt: startTime.toISOString(),
        endedAt: status === 'completed' ? new Date(startTime.getTime() + dur * 1000).toISOString() : null,
        recordingUrl: status === 'completed' ? `https://recordings.vobiz.com/${sid}.mp3` : null,
        cost: status === 'completed' ? parseFloat((dur * 0.025).toFixed(3)) : 0,
      });
    }

    // Re-sort after adding
    allRecords.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  const total = allRecords.length;
  const records = allRecords.slice(offset, offset + limit);

  return { calls: records, total, limit, offset };
}

// ============================================================
// Route Handlers
// ============================================================

async function handleHealthCheck(): Promise<Response> {
  const uptime = getUptimeSeconds();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  const info: HealthInfo = {
    service: 'Vobiz SIP Integration Service',
    version: '1.0.0',
    status: 'operational',
    uptime: uptime,
    vobizConnected: !!VOBIZ_AUTH_TOKEN,
    port: PORT,
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  / — Health check & service info',
      'POST /api/make-call — Initiate outbound call',
      'GET  /api/call-status/:callSid — Get call status',
      'POST /api/webhook/inbound — Inbound call webhook',
      'GET  /api/call-history — Call history with pagination',
      'POST /api/end-call/:callSid — End active call',
    ],
  };

  console.log(
    `💚 Health check — uptime: ${hours}h ${minutes}m ${seconds}s, active calls: ${callStore.size}`
  );

  return jsonResponse(info);
}

async function handleMakeCall(req: Request): Promise<Response> {
  try {
    const body = await parseBody<CallRequest>(req);

    // Validate request
    if (!body.to || !body.clinicId) {
      return jsonResponse(
        { error: 'Missing required fields: "to" and "clinicId" are required' },
        400
      );
    }

    // Validate phone number format (basic check)
    if (!/^[\+]?[0-9]{10,15}$/.test(body.to.replace(/[\s\-]/g, ''))) {
      return jsonResponse(
        { error: 'Invalid phone number format. Expected: +919XXXXXXXXX or 10-15 digits' },
        400
      );
    }

    console.log(`📞 [Make Call] to=${body.to}, clinicId=${body.clinicId}, from=${body.from || VOBIZ_MOBILE_NO}`);

    // Try Vobiz API first
    const vobizResult = await tryVobizApi('POST', '/Account/MAXGU1ZOXC3/Call/', {
      From: body.from || VOBIZ_MOBILE_NO,
      To: body.to,
      Url: 'https://voiceai.in/api/webhook/answer',
      StatusCallback: 'https://voiceai.in/api/webhook/status',
      CredentialSid: VOBIZ_CREDENTIAL_ID,
    });

    if (vobizResult && vobizResult.ok) {
      // Vobiz API succeeded — return real response
      const data = vobizResult.data as Record<string, unknown>;
      console.log(`✅ [Make Call] Vobiz accepted: ${JSON.stringify(data).substring(0, 200)}`);
      return jsonResponse({
        success: true,
        callSid: data.call_sid || data.CallSid || data.sid || generateCallSid(),
        status: 'queued',
        direction: 'outbound',
        to: body.to,
        from: body.from || VOBIZ_MOBILE_NO,
        clinicId: body.clinicId,
        source: 'vobiz',
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback: use mock
    console.log(`🔄 [Make Call] Using mock response (Vobiz API unavailable)`);
    const mockCall = createMockCall(body);

    return jsonResponse({
      success: true,
      callSid: mockCall.callSid,
      status: mockCall.status,
      direction: mockCall.direction,
      to: mockCall.to,
      from: mockCall.from,
      clinicId: mockCall.clinicId,
      source: 'mock',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('❌ [Make Call] Error:', err);
    return jsonResponse({ error: 'Failed to initiate call' }, 500);
  }
}

async function handleCallStatus(req: Request, callSid: string): Promise<Response> {
  try {
    if (!callSid) {
      return jsonResponse({ error: 'Call SID is required' }, 400);
    }

    console.log(`📊 [Call Status] callSid=${callSid}`);

    // Try Vobiz API first
    const vobizResult = await tryVobizApi(
      'GET',
      `/Account/${VOBIZ_AUTH_ID}/Call/${callSid}/`
    );

    if (vobizResult && vobizResult.ok) {
      const data = vobizResult.data as Record<string, unknown>;
      return jsonResponse({
        callSid,
        status: data.status || data.call_status || 'unknown',
        direction: data.direction || 'outbound',
        from: data.from || data.From,
        to: data.to || data.To,
        duration: parseInt(String(data.duration || data.call_duration || '0')),
        startedAt: data.start_time || data.date_created || null,
        endedAt: data.end_time || data.date_updated || null,
        price: data.price || '0.00',
        source: 'vobiz',
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback: check mock store
    const mockCall = callStore.get(callSid);
    if (mockCall) {
      return jsonResponse({
        callSid: mockCall.callSid,
        status: mockCall.status,
        direction: mockCall.direction,
        from: mockCall.from,
        to: mockCall.to,
        duration: mockCall.duration,
        startedAt: mockCall.startedAt,
        endedAt: mockCall.endedAt,
        price: mockCall.cost.toFixed(3),
        source: 'mock',
        timestamp: new Date().toISOString(),
      });
    }

    // Not found in either source
    return jsonResponse(
      { error: `Call ${callSid} not found`, source: 'none' },
      404
    );
  } catch (err) {
    console.error('❌ [Call Status] Error:', err);
    return jsonResponse({ error: 'Failed to get call status' }, 500);
  }
}

async function handleWebhookInbound(req: Request): Promise<Response> {
  try {
    const body = await parseBody<Record<string, unknown>>(req);
    console.log(`📥 [Webhook Inbound] Received: ${JSON.stringify(body).substring(0, 300)}`);

    // Extract call info from webhook payload
    const callSid = String(body.CallSid || body.call_sid || generateCallSid());
    const from = String(body.From || body.from || 'unknown');
    const to = String(body.To || body.to || VOBIZ_MOBILE_NO);
    const callStatus = String(body.CallStatus || body.Status || 'ringing');

    // Store inbound call
    const record: MockCallRecord = {
      callSid,
      from,
      to,
      status: callStatus as CallStatus,
      direction: 'inbound',
      clinicId: 'default',
      duration: 0,
      startedAt: new Date().toISOString(),
      endedAt: null,
      recordingUrl: null,
      cost: 0,
    };

    callStore.set(callSid, record);

    // Return TwiML/Vobiz XML response to accept the call
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Thank you for calling. Please wait while we connect you.</Say>
  <Play url="https://voiceai.in/assets/hold-music.mp3" loop="0"/>
</Response>`;

    return new Response(xmlResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (err) {
    console.error('❌ [Webhook Inbound] Error:', err);
    return jsonResponse({ error: 'Webhook processing failed' }, 500);
  }
}

async function handleCallHistory(req: Request): Promise<Response> {
  try {
    const clinicId = getQueryParam(req, 'clinicId') || '';
    const limit = Math.min(Math.max(parseInt(getQueryParam(req, 'limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(getQueryParam(req, 'offset') || '0'), 0);

    console.log(`📋 [Call History] clinicId=${clinicId}, limit=${limit}, offset=${offset}`);

    // Try Vobiz API first
    const vobizResult = await tryVobizApi(
      'GET',
      `/Account/${VOBIZ_AUTH_ID}/Calls/?PageSize=${limit}&PageToken=${offset}`
    );

    if (vobizResult && vobizResult.ok) {
      const data = vobizResult.data as Record<string, unknown>;
      return jsonResponse({
        calls: data.calls || [],
        total: parseInt(String(data.total || '0')),
        limit,
        offset,
        source: 'vobiz',
      });
    }

    // Fallback: mock data
    console.log('🔄 [Call History] Using mock response');
    const mockData = createMockCallHistory(clinicId, limit, offset);

    return jsonResponse({
      ...mockData,
      source: 'mock',
    });
  } catch (err) {
    console.error('❌ [Call History] Error:', err);
    return jsonResponse({ error: 'Failed to fetch call history' }, 500);
  }
}

async function handleEndCall(req: Request, callSid: string): Promise<Response> {
  try {
    if (!callSid) {
      return jsonResponse({ error: 'Call SID is required' }, 400);
    }

    console.log(`🔌 [End Call] callSid=${callSid}`);

    // Try Vobiz API first
    const vobizResult = await tryVobizApi(
      'POST',
      `/Account/${VOBIZ_AUTH_ID}/Call/${callSid}/`
    );

    if (vobizResult && vobizResult.ok) {
      // Update local store if present
      const localCall = callStore.get(callSid);
      if (localCall) {
        localCall.status = 'canceled';
        localCall.endedAt = new Date().toISOString();
      }

      return jsonResponse({
        success: true,
        callSid,
        status: 'canceled',
        message: 'Call ended via Vobiz API',
        source: 'vobiz',
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback: end mock call
    const localCall = callStore.get(callSid);
    if (localCall && (localCall.status === 'queued' || localCall.status === 'ringing' || localCall.status === 'in-progress')) {
      localCall.status = 'canceled';
      localCall.endedAt = new Date().toISOString();
      console.log(`🔌 [End Call] Mock call ${callSid} ended`);

      return jsonResponse({
        success: true,
        callSid: localCall.callSid,
        status: 'canceled',
        duration: localCall.duration,
        message: 'Call ended (mock)',
        source: 'mock',
        timestamp: new Date().toISOString(),
      });
    }

    return jsonResponse(
      { error: `Call ${callSid} not found or already ended`, source: 'none' },
      404
    );
  } catch (err) {
    console.error('❌ [End Call] Error:', err);
    return jsonResponse({ error: 'Failed to end call' }, 500);
  }
}

// ============================================================
// CORS preflight handler
// ============================================================

function handleOptions(): Response {
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

// ============================================================
// Request Router
// ============================================================

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  console.log(`→ ${req.method} ${pathname}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  // Health check
  if (pathname === '/' && req.method === 'GET') {
    return handleHealthCheck();
  }

  // POST /api/make-call
  if (pathname === '/api/make-call' && req.method === 'POST') {
    return handleMakeCall(req);
  }

  // GET /api/call-status/:callSid
  const callStatusMatch = pathname.match(/^\/api\/call-status\/([A-Za-z0-9]+)$/);
  if (callStatusMatch && req.method === 'GET') {
    return handleCallStatus(req, callStatusMatch[1]);
  }

  // POST /api/webhook/inbound
  if (pathname === '/api/webhook/inbound' && req.method === 'POST') {
    return handleWebhookInbound(req);
  }

  // GET /api/call-history
  if (pathname === '/api/call-history' && req.method === 'GET') {
    return handleCallHistory(req);
  }

  // POST /api/end-call/:callSid
  const endCallMatch = pathname.match(/^\/api\/end-call\/([A-Za-z0-9]+)$/);
  if (endCallMatch && req.method === 'POST') {
    return handleEndCall(req, endCallMatch[1]);
  }

  // 404 for unmatched routes
  return jsonResponse(
    { error: 'Route not found', availableEndpoints: ['/api/make-call', '/api/call-status/:callSid', '/api/webhook/inbound', '/api/call-history', '/api/end-call/:callSid'] },
    404
  );
}

// ============================================================
// Start Server (using bun's built-in HTTP)
// ============================================================

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  fetch: handleRequest,
});

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║   📞 Vobiz SIP Integration Service          ║');
console.log('║   Version: 1.0.0                             ║');
console.log(`║   Port: ${PORT}                                  ║`);
console.log(`║   Auth ID: ${VOBIZ_AUTH_ID.padEnd(30)}║`);
console.log(`║   Mobile: ${VOBIZ_MOBILE_NO.padEnd(30)}║`);
console.log(`║   Credentials: ${VOBIZ_CREDENTIAL_ID ? '✅ Configured' : '❌ Missing'.padEnd(26)}║`);
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log('Endpoints:');
console.log('  GET  / — Health check');
console.log('  POST /api/make-call — Initiate outbound call');
console.log('  GET  /api/call-status/:callSid — Call status');
console.log('  POST /api/webhook/inbound — Inbound webhook');
console.log('  GET  /api/call-history — Call history');
console.log('  POST /api/end-call/:callSid — End call');
console.log('');
console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
console.log('');
