// Integration Status API
// Lightweight endpoint that checks all services directly (no orchestrator dependency)
import { NextResponse } from 'next/server';

const SERVICES = [
  { name: 'Vobiz SIP', url: 'http://localhost:3031/', port: 3031, icon: 'phone' },
  { name: 'Gemini AI', url: 'http://localhost:3032/', port: 3032, icon: 'brain' },
  { name: 'WS Bridge', url: 'http://localhost:3033/', port: 3033, icon: 'radio' },
  { name: 'Call Orchestrator', url: 'http://localhost:3035/', port: 3035, icon: 'git-branch' },
];

const ENV_CHECKS = [
  { key: 'VOBIZ_AUTH_ID', label: 'Vobiz Auth ID' },
  { key: 'VOBIZ_AUTH_TOKEN', label: 'Vobiz Auth Token', mask: true },
  { key: 'VOBIZ_MOBILE_NO', label: 'Vobiz Mobile No' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', mask: true },
  { key: 'GEMINI_DEMO_MODE', label: 'Gemini Demo Mode', mask: false },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', mask: false },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Key', mask: true },
  { key: 'N8N_WEBHOOK_BASE', label: 'n8n Base URL', mask: false },
];

async function checkService(url: string, timeout = 3000) {
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    const latency = Date.now() - start;
    return { status: res.ok ? 'connected' : 'degraded', latency };
  } catch {
    return { status: 'offline', latency: 0 };
  }
}

export async function GET() {
  const startTime = Date.now();

  const serviceResults = await Promise.all(
    SERVICES.map(async (svc) => {
      const health = await checkService(svc.url);
      return { ...svc, ...health };
    })
  );

  let n8nStatus = { status: 'offline' as string, latency: 0 };
  try {
    const start = Date.now();
    const n8nBase = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv1347095.hstgr.cloud';
    const res = await fetch(n8nBase, { signal: AbortSignal.timeout(5000) });
    n8nStatus = { status: res.ok || res.status === 404 ? 'connected' : 'degraded', latency: Date.now() - start };
  } catch {
    n8nStatus = { status: 'offline', latency: 0 };
  }

  let supabaseStatus = { status: 'offline' as string, latency: 0, details: '' };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const start = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/clinics?select=id&limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      supabaseStatus = { status: res.ok ? 'connected' : 'degraded', latency, details: res.ok ? '' : `HTTP ${res.status}` };
    } catch (err) {
      supabaseStatus = { status: 'offline', latency: 0, details: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  const environment = ENV_CHECKS.map(env => {
    const value = process.env[env.key] || '';
    const isEmpty = !value || value === 'placeholder';
    const isMasked = env.mask;
    const preview = isMasked
      ? value ? `${value.slice(0, 4)}${'*'.repeat(Math.max(0, 8 - value.length))}` : ''
      : value.length > 30 ? `${value.slice(0, 30)}...` : value;
    return {
      key: env.key,
      label: env.label,
      status: isEmpty ? 'missing' : env.key === 'GEMINI_DEMO_MODE' ? (value === 'true' ? 'demo' : 'production') : 'configured',
      preview: isEmpty ? '' : preview,
    };
  });

  const allServices = [...serviceResults, { name: 'n8n Workflows', icon: 'workflow', port: 0, ...n8nStatus, url: process.env.N8N_WEBHOOK_BASE || '' }];
  const allHealthy = allServices.filter(s => s.name !== 'n8n Workflows').every(s => s.status === 'connected');

  return NextResponse.json({
    status: allHealthy ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    services: allServices,
    supabase: supabaseStatus,
    environment,
    endpoints: allServices.filter(s => s.status === 'connected').map(s => `${s.name} (${s.port || 'external'})`),
  });
}
