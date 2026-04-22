// VoiceAI Call Orchestrator API Route
// Proxies requests to the Call Orchestrator mini-service (port 3035)

import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_URL = 'http://localhost:3035';

async function proxyRequest(req: NextRequest, path: string): Promise<NextResponse> {
  try {
    const url = `${ORCHESTRATOR_URL}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const clinicId = req.headers.get('x-clinic-id');
    if (clinicId) headers['x-clinic-id'] = clinicId;

    const options: RequestInit = { headers, method: req.method };
    if (req.method !== 'GET') {
      options.body = await req.json();
    }

    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Orch API Error]', error);
    return NextResponse.json({ error: 'Orchestrator service unavailable' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') || '';

  if (action === 'health') return proxyRequest(req, '/');
  if (action === 'sessions') return proxyRequest(req, '/api/orch/sessions');

  const callSid = searchParams.get('callSid');
  if (action === 'session' && callSid) {
    return proxyRequest(req, `/api/orch/session/${callSid}`);
  }

  if (action === 'test-call') {
    const scenario = searchParams.get('scenario') || 'booking';
    const clinicId = searchParams.get('clinicId') || 'default';
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/orch/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, clinicId }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: 'Test failed' }, { status: 503 });
    }
  }

  return proxyRequest(req, '/');
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') || '';

  if (action === 'inbound') return proxyRequest(req, '/api/orch/inbound');
  if (action === 'gather') return proxyRequest(req, '/api/orch/gather');
  if (action === 'make-call') return proxyRequest(req, '/api/orch/make-call');
  if (action === 'test-call') return proxyRequest(req, '/api/orch/test-call');
  if (action === 'transfer-status') return proxyRequest(req, '/api/orch/transfer-status');

  return proxyRequest(req, '/api/orch/test-call');
}
