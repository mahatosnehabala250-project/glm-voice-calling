// Integration Status API (Enhanced)
// Checks all services, fetches detailed health data, tracks response time history & uptime
import { NextResponse } from 'next/server';

// ─── Service Definitions ─────────────────────────────────────────────────────────

const SERVICES = [
  { name: 'Vobiz SIP', url: 'http://localhost:3031/', port: 3031, icon: 'phone', key: 'vobiz' },
  { name: 'Gemini AI', url: 'http://localhost:3032/', port: 3032, icon: 'brain', key: 'gemini' },
  { name: 'WS Bridge', url: 'http://localhost:3033/', port: 3033, icon: 'radio', key: 'wsbridge' },
  { name: 'Call Orchestrator', url: 'http://localhost:3035/', port: 3035, icon: 'git-branch', key: 'orchestrator' },
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

// ─── In-memory History Tracking ─────────────────────────────────────────────────
// Persists across requests within the same Node.js process (hot-reload safe)

const MAX_HISTORY = 30;
const MAX_LATENCY_HISTOGRAM = 5;

interface ServiceHealthRecord {
  timestamp: string;
  status: 'connected' | 'degraded' | 'offline';
  latency: number;
}

interface ServiceHistory {
  uptimeChecks: ServiceHealthRecord[];
  latencyHistogram: number[];
  totalChecks: number;
  totalUptime: number;
  lastSeen: string | null;
}

const serviceHistories: Record<string, ServiceHistory> = {};
const supabaseHistory: ServiceHistory = {
  uptimeChecks: [],
  latencyHistogram: [],
  totalChecks: 0,
  totalUptime: 0,
  lastSeen: null,
};
const n8nHistory: ServiceHistory = {
  uptimeChecks: [],
  latencyHistogram: [],
  totalChecks: 0,
  totalUptime: 0,
  lastSeen: null,
};

for (const svc of SERVICES) {
  serviceHistories[svc.key] = {
    uptimeChecks: [],
    latencyHistogram: [],
    totalChecks: 0,
    totalUptime: 0,
    lastSeen: null,
  };
}

function pushHistory(
  history: ServiceHistory,
  status: 'connected' | 'degraded' | 'offline',
  latency: number
) {
  const now = new Date().toISOString();
  const isUp = status === 'connected';

  history.totalChecks++;
  history.totalUptime += isUp ? 1 : 0;
  history.lastSeen = now;

  history.uptimeChecks.push({ timestamp: now, status, latency });
  if (history.uptimeChecks.length > MAX_HISTORY) {
    history.uptimeChecks.shift();
  }

  history.latencyHistogram.push(latency);
  if (history.latencyHistogram.length > MAX_LATENCY_HISTOGRAM) {
    history.latencyHistogram.shift();
  }
}

function getUptimePercent(history: ServiceHistory): number {
  if (history.totalChecks === 0) return 100;
  return Math.round((history.totalUptime / history.totalChecks) * 1000) / 10;
}

// ─── Health Check Helpers ────────────────────────────────────────────────────────

interface DetailedHealthResult {
  status: 'connected' | 'degraded' | 'offline';
  latency: number;
  details: Record<string, unknown>;
}

async function checkServiceDetailed(url: string, timeout = 3000): Promise<DetailedHealthResult> {
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    const latency = Date.now() - start;
    let details: Record<string, unknown> = {};

    if (res.ok) {
      try {
        const body = await res.json();
        details = {
          version: body.version || null,
          service: body.service || null,
          uptime: body.uptime ?? body.uptimeSeconds ?? null,
          uptimeFormatted: body.uptimeFormatted || null,
          demoMode: body.demoMode ?? null,
          activeCalls: body.activeCalls ?? null,
          totalCallsHandled: body.totalCallsHandled ?? null,
          vobizConnected: body.vobizConnected ?? null,
          geminiLiveReady: body.geminiLiveReady ?? null,
          primaryModel: body.primaryModel ?? null,
          fallbackModel: body.fallbackModel ?? null,
          protocol: body.protocol ?? null,
          audioFormat: body.audioFormat ?? null,
        };
      } catch {
        // Non-JSON response, still healthy
      }
      return { status: 'connected', latency, details };
    }
    return { status: 'degraded', latency, details: { httpStatus: res.status } };
  } catch {
    return { status: 'offline', latency: 0, details: { error: 'Connection refused or timeout' } };
  }
}

// ─── GET Handler ────────────────────────────────────────────────────────────────

export async function GET() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Check all 4 mini-services in parallel
  const serviceResults = await Promise.all(
    SERVICES.map(async (svc) => {
      const health = await checkServiceDetailed(svc.url);
      const history = serviceHistories[svc.key];
      pushHistory(history, health.status, health.latency);

      return {
        name: svc.name,
        key: svc.key,
        icon: svc.icon,
        port: svc.port,
        url: svc.url,
        status: health.status,
        latency: health.latency,
        uptimePercent: getUptimePercent(history),
        uptimeChecks: history.uptimeChecks.slice(-30),
        latencyHistogram: history.latencyHistogram,
        totalChecks: history.totalChecks,
        totalUptime: history.totalUptime,
        lastSeen: history.lastSeen,
        ...health.details,
      };
    })
  );

  // Check n8n
  let n8nStatus: DetailedHealthResult = { status: 'offline', latency: 0, details: {} };
  try {
    const start = Date.now();
    const n8nBase = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv1347095.hstgr.cloud';
    const res = await fetch(n8nBase, { signal: AbortSignal.timeout(5000) });
    const latency = Date.now() - start;
    n8nStatus = {
      status: res.ok || res.status === 404 ? 'connected' : 'degraded',
      latency,
      details: { httpStatus: res.status },
    };
  } catch {
    n8nStatus = { status: 'offline', latency: 0, details: { error: 'Unreachable' } };
  }
  pushHistory(n8nHistory, n8nStatus.status, n8nStatus.latency);

  // Check Supabase with real table query
  let supabaseStatus: DetailedHealthResult & { tableQueryResult?: string } = {
    status: 'offline',
    latency: 0,
    details: {},
  };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const start = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/clinics?select=id,plan&limit=3`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;

      if (res.ok) {
        let tableResult = '';
        try {
          const data = await res.json();
          tableResult = `Queried clinics table: ${data.length} rows returned`;
        } catch {
          tableResult = 'Query executed successfully';
        }
        supabaseStatus = {
          status: 'connected',
          latency,
          details: { table: 'clinics', query: 'select=id,plan&limit=3' },
          tableQueryResult: tableResult,
        };
      } else {
        supabaseStatus = {
          status: 'degraded',
          latency,
          details: { httpStatus: res.status, error: `HTTP ${res.status}` },
        };
      }
    } catch (err) {
      supabaseStatus = {
        status: 'offline',
        latency: 0,
        details: { error: err instanceof Error ? err.message : 'Connection failed' },
      };
    }
  } else {
    supabaseStatus = {
      status: 'offline',
      latency: 0,
      details: { error: 'Credentials not configured' },
    };
  }
  pushHistory(supabaseHistory, supabaseStatus.status, supabaseStatus.latency);

  // Environment variable checks
  const environment = ENV_CHECKS.map((env) => {
    const value = process.env[env.key] || '';
    const isEmpty = !value || value === 'placeholder';
    const isMasked = !!env.mask;
    const preview = isMasked
      ? value
        ? `${value.slice(0, 4)}${'*'.repeat(Math.max(0, 8 - value.length))}`
        : ''
      : value.length > 30
        ? `${value.slice(0, 30)}...`
        : value;
    return {
      key: env.key,
      label: env.label,
      status: isEmpty
        ? 'missing'
        : env.key === 'GEMINI_DEMO_MODE'
          ? value === 'true'
            ? 'demo'
            : 'production'
          : 'configured',
      preview: isEmpty ? '' : preview,
    };
  });

  // Build n8n result object
  const n8nResult = {
    name: 'n8n Workflows',
    icon: 'workflow',
    key: 'n8n',
    port: 0,
    url: process.env.N8N_WEBHOOK_BASE || '',
    status: n8nStatus.status,
    latency: n8nStatus.latency,
    uptimePercent: getUptimePercent(n8nHistory),
    uptimeChecks: n8nHistory.uptimeChecks.slice(-30),
    latencyHistogram: n8nHistory.latencyHistogram,
    totalChecks: n8nHistory.totalChecks,
    totalUptime: n8nHistory.totalUptime,
    lastSeen: n8nHistory.lastSeen,
    ...n8nStatus.details,
  };

  // Build supabase result object
  const supabaseResult = {
    name: 'Supabase',
    icon: 'database',
    key: 'supabase',
    port: 0,
    url: supabaseUrl || '',
    status: supabaseStatus.status,
    latency: supabaseStatus.latency,
    uptimePercent: getUptimePercent(supabaseHistory),
    uptimeChecks: supabaseHistory.uptimeChecks.slice(-30),
    latencyHistogram: supabaseHistory.latencyHistogram,
    totalChecks: supabaseHistory.totalChecks,
    totalUptime: supabaseHistory.totalUptime,
    lastSeen: supabaseHistory.lastSeen,
    tableQueryResult: supabaseStatus.tableQueryResult,
    ...supabaseStatus.details,
  };

  // Merge all services
  const allServices = [...serviceResults, n8nResult];
  const allHealthy = serviceResults.every((s) => s.status === 'connected');

  return NextResponse.json({
    status: allHealthy ? 'operational' : 'degraded',
    timestamp,
    responseTime: Date.now() - startTime,
    services: allServices,
    supabase: supabaseResult,
    environment,
    endpoints: allServices.filter((s) => s.status === 'connected').map((s) => `${s.name} (${s.port || 'external'})`),
  });
}
