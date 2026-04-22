import { NextRequest, NextResponse } from 'next/server';

const VOIBIZ_SERVICE_URL = 'http://localhost:3031';

/**
 * GET /api/vobiz — Proxy GET requests to Vobiz SIP service
 * Query params: action (call-status, call-history, health), callSid, clinicId, limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    let targetPath = '';

    switch (action) {
      case 'call-status': {
        const callSid = searchParams.get('callSid');
        if (!callSid) {
          return NextResponse.json({ error: 'callSid is required' }, { status: 400 });
        }
        targetPath = `/api/call-status/${callSid}`;
        break;
      }
      case 'call-history': {
        const clinicId = searchParams.get('clinicId') || '';
        const limit = searchParams.get('limit') || '20';
        const offset = searchParams.get('offset') || '0';
        const params = new URLSearchParams();
        if (clinicId) params.set('clinicId', clinicId);
        params.set('limit', limit);
        params.set('offset', offset);
        targetPath = `/api/call-history?${params.toString()}`;
        break;
      }
      case 'health':
      default:
        targetPath = '/';
        break;
    }

    const proxyUrl = `${VOIBIZ_SERVICE_URL}${targetPath}`;
    console.log(`[Vobiz Proxy GET] action=${action} → ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      headers: {
        'x-clinic-id': req.headers.get('x-clinic-id') || '',
        Authorization: req.headers.get('authorization') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[Vobiz Proxy GET] Error:', err);
    return NextResponse.json({ error: 'Vobiz service unavailable' }, { status: 503 });
  }
}

/**
 * POST /api/vobiz — Proxy POST requests to Vobiz SIP service
 * Body: { action: 'make-call' | 'end-call' | 'webhook-inbound', ...params }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    let targetPath = '';

    switch (action) {
      case 'make-call':
        targetPath = '/api/make-call';
        break;
      case 'end-call': {
        const callSid = params.callSid;
        if (!callSid) {
          return NextResponse.json({ error: 'callSid is required' }, { status: 400 });
        }
        targetPath = `/api/end-call/${callSid}`;
        break;
      }
      case 'webhook-inbound':
        targetPath = '/api/webhook/inbound';
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use 'make-call', 'end-call', or 'webhook-inbound'` },
          { status: 400 }
        );
    }

    const proxyUrl = `${VOIBIZ_SERVICE_URL}${targetPath}`;
    console.log(`[Vobiz Proxy POST] action=${action} → ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-clinic-id': req.headers.get('x-clinic-id') || '',
        Authorization: req.headers.get('authorization') || '',
      },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get('content-type') || '';

    // Handle XML responses (e.g., webhook inbound returns TwiML)
    if (contentType.includes('xml')) {
      const xml = await response.text();
      return new NextResponse(xml, {
        status: response.status,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[Vobiz Proxy POST] Error:', err);
    return NextResponse.json({ error: 'Vobiz service unavailable' }, { status: 503 });
  }
}
