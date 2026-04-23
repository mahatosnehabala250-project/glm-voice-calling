// VoiceAI Call Orchestrator API Route
// Proxies requests from the Next.js frontend to the Call Orchestrator service on port 3035

import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_URL = 'http://localhost:3035';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'health';

  try {
    let targetUrl = action === 'status'
      ? `${ORCHESTRATOR_URL}/api/orchestrate/status`
      : `${ORCHESTRATOR_URL}/`;

    console.log(`[Orchestrator Proxy GET] action=${action} → ${targetUrl}`);

    const headers: Record<string, string> = {};
    const clinicId = req.headers.get('x-clinic-id');
    if (clinicId) headers['x-clinic-id'] = clinicId;

    const res = await fetch(targetUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Orchestrator Proxy GET] Error:', error);
    return NextResponse.json(
      { error: 'Orchestrator service unavailable', status: 'offline' },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || '';

  try {
    let targetUrl = action.includes('/')
      ? `${ORCHESTRATOR_URL}${action}`
      : `${ORCHESTRATOR_URL}/api/orchestrate/${action}`;

    console.log(`[Orchestrator Proxy POST] action=${action} → ${targetUrl}`);

    const body = await req.json();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const clinicId = req.headers.get('x-clinic-id');
    if (clinicId) headers['x-clinic-id'] = clinicId;

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('xml')) {
      const xml = await res.text();
      return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Orchestrator Proxy POST] Error:', error);
    return NextResponse.json(
      { error: 'Orchestrator service unavailable', action },
      { status: 503 }
    );
  }
}
