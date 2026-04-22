import { NextRequest, NextResponse } from 'next/server';

const GEMINI_SERVICE_URL = 'http://localhost:3032';

// Build the direct service URL (server-side fetch uses localhost directly)
function getServiceUrl(path: string, searchParams?: string): string {
  let url = `${GEMINI_SERVICE_URL}${path}`;
  if (searchParams) {
    url += `?${searchParams}`;
  }
  return url;
}

/**
 * GET /api/gemini — Proxy GET requests to Gemini AI service
 * Query params:
 *   action=health  → GET / (health check)
 *   action=models  → GET /api/models
 *   (no action)    → GET / (health check)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'health';

    let targetPath = '/';
    const proxyParams = new URLSearchParams();

    switch (action) {
      case 'models':
        targetPath = '/api/models';
        break;
      case 'health':
      default:
        targetPath = '/';
        break;
    }

    const serviceUrl = getServiceUrl(targetPath, proxyParams.toString());
    console.log(`[Gemini Proxy GET] action=${action} → ${serviceUrl}`);

    const response = await fetch(serviceUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[Gemini Proxy GET] Error:', err);
    return NextResponse.json(
      { error: 'Gemini AI service unavailable' },
      { status: 503 }
    );
  }
}

/**
 * POST /api/gemini — Proxy POST requests to Gemini AI service
 * Body: {
 *   action: 'chat' | 'transcribe' | 'analyze-sentiment' | 'generate-summary',
 *   ...payload  (depends on action)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    let targetPath = '';

    switch (action) {
      case 'chat':
        targetPath = '/api/chat';
        break;
      case 'transcribe':
        targetPath = '/api/transcribe';
        break;
      case 'analyze-sentiment':
        targetPath = '/api/analyze-sentiment';
        break;
      case 'generate-summary':
        targetPath = '/api/generate-summary';
        break;
      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Use 'chat', 'transcribe', 'analyze-sentiment', or 'generate-summary'`,
          },
          { status: 400 }
        );
    }

    const serviceUrl = getServiceUrl(targetPath);
    console.log(`[Gemini Proxy POST] action=${action} → ${serviceUrl}`);

    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[Gemini Proxy POST] Error:', err);
    return NextResponse.json(
      { error: 'Gemini AI service unavailable' },
      { status: 503 }
    );
  }
}
