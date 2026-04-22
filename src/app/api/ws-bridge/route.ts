import { NextRequest, NextResponse } from 'next/server';

const WS_BRIDGE_URL = 'http://localhost:3033';

/**
 * GET /api/ws-bridge — Proxy GET requests to WebSocket Bridge service
 * Query params: action (health, metrics, sessions)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'health';
    const sessionId = searchParams.get('sessionId');

    let targetPath = '/';
    switch (action) {
      case 'metrics':
        targetPath = '/api/metrics';
        break;
      case 'sessions':
        if (sessionId) {
          targetPath = `/api/sessions/${sessionId}`;
        } else {
          targetPath = '/api/sessions';
        }
        break;
      case 'health':
      default:
        targetPath = '/';
        break;
    }

    const proxyUrl = `${WS_BRIDGE_URL}${targetPath}`;
    console.log(`[WS Bridge Proxy GET] action=${action} → ${proxyUrl}`);

    const response = await fetch(proxyUrl);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[WS Bridge Proxy GET] Error:', err);
    return NextResponse.json({ error: 'WebSocket Bridge service unavailable' }, { status: 503 });
  }
}
