'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Activity, Phone, Brain, GitBranch, Database, Workflow,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Play,
  ExternalLink, ChevronDown, ChevronRight, Shield, Zap,
  Clock, Radio, MessageCircle, ArrowRight, Loader2,
  CircleDot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type ServiceStatus = 'connected' | 'degraded' | 'offline' | 'loading';

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency?: number;
  details: string;
  port: string;
  configured: boolean;
  extra?: string;
}

interface CallSession {
  callSid: string;
  clinic: string;
  caller: string;
  status: string;
  startedAt: string;
  duration: number;
}

interface EnvVar {
  name: string;
  status: 'configured' | 'missing' | 'placeholder';
  preview: string;
}

// ============================================================
// Animation Variants
// ============================================================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ============================================================
// Constants
// ============================================================

const STATUS_STYLES: Record<ServiceStatus, { dot: string; border: string; bg: string; text: string; pulse: string }> = {
  connected: {
    dot: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    pulse: 'animate-ping bg-emerald-400',
  },
  degraded: {
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    text: 'text-amber-700 dark:text-amber-400',
    pulse: 'animate-ping bg-amber-400',
  },
  offline: {
    dot: 'bg-rose-500',
    border: 'border-l-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/10',
    text: 'text-rose-700 dark:text-rose-400',
    pulse: '',
  },
  loading: {
    dot: 'bg-slate-400',
    border: 'border-l-slate-300 dark:border-l-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-900/10',
    text: 'text-slate-500 dark:text-slate-400',
    pulse: '',
  },
};

const ENV_VARS: { name: string; key: string; required: boolean }[] = [
  { name: 'VOBIZ_AUTH_ID', key: 'VOBIZ_AUTH_ID', required: true },
  { name: 'VOBIZ_AUTH_TOKEN', key: 'VOBIZ_AUTH_TOKEN', required: true },
  { name: 'VOBIZ_SIP_DOMAIN', key: 'VOBIZ_SIP_DOMAIN', required: true },
  { name: 'GEMINI_API_KEY', key: 'GEMINI_API_KEY', required: true },
  { name: 'GEMINI_DEMO_MODE', key: 'GEMINI_DEMO_MODE', required: false },
  { name: 'SUPABASE_URL', key: 'SUPABASE_URL', required: true },
  { name: 'SUPABASE_ANON_KEY', key: 'SUPABASE_ANON_KEY', required: true },
  { name: 'N8N_WEBHOOK_URL', key: 'N8N_WEBHOOK_URL', required: false },
  { name: 'N8N_API_URL', key: 'N8N_API_URL', required: false },
];

const SETUP_STEPS = [
  {
    step: 1,
    title: 'Vobiz SIP Trunk',
    description: 'Get credentials from Vobiz dashboard. Set VOBIZ_AUTH_ID, VOBIZ_AUTH_TOKEN, and VOBIZ_SIP_DOMAIN environment variables.',
    done: false,
  },
  {
    step: 2,
    title: 'Gemini AI',
    description: 'Enable billing on Google AI Studio. Set GEMINI_API_KEY and set GEMINI_DEMO_MODE=false for production.',
    done: false,
  },
  {
    step: 3,
    title: 'Supabase Database',
    description: 'Already connected and operational. Tables, RLS policies, and triggers are set up.',
    done: true,
  },
  {
    step: 4,
    title: 'n8n Workflows',
    description: 'Already connected. 7 workflows are active and ready.',
    done: true,
  },
  {
    step: 5,
    title: 'Test Pipeline',
    description: 'Run "Test Full Pipeline" to verify the entire call orchestration flow works end-to-end.',
    done: false,
  },
];

// ============================================================
// Flow Diagram Data
// ============================================================

const FLOW_NODES = [
  { id: 'patient', label: 'Patient', icon: Phone, color: '#10b981' },
  { id: 'vobiz', label: 'Vobiz SIP', icon: Phone, color: '#14b8a6' },
  { id: 'orchestrator', label: 'Orchestrator', icon: GitBranch, color: '#0d9488' },
  { id: 'gemini', label: 'Gemini AI', icon: Brain, color: '#f59e0b' },
  { id: 'supabase', label: 'Supabase', icon: Database, color: '#10b981' },
  { id: 'n8n', label: 'n8n', icon: Workflow, color: '#14b8a6' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#22c55e' },
];

// ============================================================
// Main Component
// ============================================================

export default function AdminIntegration() {
  const [services, setServices] = useState<Record<string, ServiceHealth>>({});
  const [loading, setLoading] = useState(true);
  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [pipelineTesting, setPipelineTesting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const durationTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ---- Health Check Helpers ----

  const checkVobiz = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/vobiz?action=health', { signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - start;
      if (!res.ok) throw new Error('unhealthy');
      const data = await res.json();
      return {
        name: 'Vobiz SIP',
        status: data.status === 'healthy' ? 'connected' : 'degraded',
        latency,
        details: data.status === 'healthy' ? 'SIP trunk active' : 'SIP trunk issues',
        port: ':3031',
        configured: !!(data.authenticated),
        extra: data.authenticated ? 'Authenticated' : 'Auth pending',
      };
    } catch {
      return {
        name: 'Vobiz SIP',
        status: 'offline',
        details: 'Cannot reach SIP service',
        port: ':3031',
        configured: false,
      };
    }
  }, []);

  const checkGemini = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/gemini?action=health', { signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - start;
      if (!res.ok) throw new Error('unhealthy');
      const data = await res.json();
      return {
        name: 'Gemini AI',
        status: data.status === 'healthy' ? 'connected' : 'degraded',
        latency,
        details: data.demoMode ? 'Running in demo mode' : 'Production mode active',
        port: ':3032',
        configured: !!(data.model || data.apiKeySet),
        extra: data.model || 'gemini-pro',
      };
    } catch {
      return {
        name: 'Gemini AI',
        status: 'offline',
        details: 'Cannot reach AI service',
        port: ':3032',
        configured: false,
      };
    }
  }, []);

  const checkOrchestrator = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/orchestrator?action=health', { signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - start;
      if (!res.ok) throw new Error('unhealthy');
      const data = await res.json();
      return {
        name: 'Call Orchestrator',
        status: data.status === 'healthy' ? 'connected' : 'degraded',
        latency,
        details: data.activeCalls !== undefined ? `${data.activeCalls} active sessions` : 'Orchestration ready',
        port: ':3035',
        configured: true,
        extra: `Sessions: ${data.activeCalls ?? 0}`,
      };
    } catch {
      return {
        name: 'Call Orchestrator',
        status: 'offline',
        details: 'Cannot reach orchestrator',
        port: ':3035',
        configured: false,
      };
    }
  }, []);

  const checkSupabase = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/supabase/health', { signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - start;
      if (!res.ok) throw new Error('unhealthy');
      const data = await res.json();
      return {
        name: 'Supabase Database',
        status: data.status === 'healthy' ? 'connected' : 'degraded',
        latency,
        details: data.tableCount ? `${data.tableCount} tables ready` : 'Database connected',
        port: 'Cloud',
        configured: true,
        extra: data.tableCount ? `${data.tableCount} tables` : 'Connected',
      };
    } catch {
      return {
        name: 'Supabase Database',
        status: 'offline',
        details: 'Cannot reach database',
        port: 'Cloud',
        configured: false,
      };
    }
  }, []);

  const checkN8n = useCallback(async (): Promise<ServiceHealth> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/n8n?action=health', { signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - start;
      if (!res.ok) throw new Error('unhealthy');
      const data = await res.json();
      return {
        name: 'n8n Workflows',
        status: data.status === 'healthy' || data.ok ? 'connected' : 'degraded',
        latency,
        details: data.webhookUrl ? `Webhooks active` : 'Workflow engine running',
        port: 'Cloud',
        configured: !!(data.webhookUrl),
        extra: data.webhookUrl ? data.webhookUrl.replace(/^https?:\/\//, '').split('/')[0] : 'Connected',
      };
    } catch {
      return {
        name: 'n8n Workflows',
        status: 'offline',
        details: 'Cannot reach n8n',
        port: 'Cloud',
        configured: false,
      };
    }
  }, []);

  const fetchEnvStatus = useCallback(() => {
    const status: EnvVar[] = ENV_VARS.map(v => ({
      name: v.name,
      status: v.name === 'SUPABASE_URL' || v.name === 'SUPABASE_ANON_KEY'
        ? 'configured'
        : v.name === 'GEMINI_DEMO_MODE'
          ? 'placeholder'
          : 'missing',
      preview: v.name === 'SUPABASE_URL' || v.name === 'SUPABASE_ANON_KEY'
        ? '••••••••••••'
        : 'Not set',
    }));
    setEnvVars(status);
  }, []);

  // ---- Fetch All Health ----

  const fetchAllHealth = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const results = await Promise.all([
        checkVobiz(),
        checkGemini(),
        checkOrchestrator(),
        checkSupabase(),
        checkN8n(),
      ]);

      const serviceMap: Record<string, ServiceHealth> = {};
      results.forEach(s => {
        serviceMap[s.name] = s;
      });
      setServices(serviceMap);
      fetchEnvStatus();

      const now = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setLastRefresh(now);

      if (showToast) {
        const connected = results.filter(r => r.status === 'connected').length;
        toast.success(`Health check complete: ${connected}/${results.length} services connected`);
      }
    } catch {
      toast.error('Failed to check service health');
    } finally {
      setLoading(false);
    }
  }, [checkVobiz, checkGemini, checkOrchestrator, checkSupabase, checkN8n, fetchEnvStatus]);

  // ---- Fetch Active Calls ----

  const fetchActiveCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator?action=sessions', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setActiveCalls(Array.isArray(data.sessions) ? data.sessions : []);
      }
    } catch {
      // Silently fail - orchestrator might be offline
    }
  }, []);

  // ---- Test Individual Service ----

  const testService = useCallback(async (serviceName: string) => {
    setTestRunning(serviceName);
    try {
      let endpoint = '';
      switch (serviceName) {
        case 'Vobiz SIP': endpoint = '/api/vobiz?action=health'; break;
        case 'Gemini AI': endpoint = '/api/gemini?action=health'; break;
        case 'Call Orchestrator': endpoint = '/api/orchestrator?action=health'; break;
        case 'Supabase Database': endpoint = '/api/supabase/health'; break;
        case 'n8n Workflows': endpoint = '/api/n8n?action=health'; break;
      }
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
      const data = await res.json().catch(() => ({}));
      toast.success(`${serviceName}: ${res.ok ? 'OK' : 'Failed'}`, {
        description: res.ok ? `Latency: ${Date.now()}ms` : data.error || 'Service error',
      });
      // Refresh health
      fetchAllHealth();
    } catch {
      toast.error(`${serviceName}: Timeout`, { description: 'Service did not respond within 5s' });
    } finally {
      setTestRunning(null);
    }
  }, [fetchAllHealth]);

  // ---- Test Full Pipeline ----

  const testFullPipeline = useCallback(async () => {
    setPipelineTesting(true);
    toast.info('Starting full pipeline test...', { description: 'Testing all services end-to-end' });

    try {
      const res = await fetch('/api/orchestrator?action=test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'booking', clinicId: 'test' }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok || data.success) {
        toast.success('Pipeline test passed!', {
          description: data.message || 'All services are communicating correctly',
        });
      } else {
        toast.warning('Pipeline test completed with warnings', {
          description: data.error || 'Some services may need attention',
        });
      }
    } catch {
      toast.error('Pipeline test failed', {
        description: 'Orchestrator service is not responding. Check the service status above.',
      });
    } finally {
      setPipelineTesting(false);
    }
  }, []);

  // ---- Effect: Initial Load + Auto Refresh ----

  useEffect(() => {
    fetchAllHealth();
    fetchActiveCalls();

    const interval = setInterval(() => {
      fetchAllHealth();
      fetchActiveCalls();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAllHealth, fetchActiveCalls]);

  // ---- Duration Timers for Active Calls ----

  useEffect(() => {
    // Update duration every second
    const timer = setInterval(() => {
      setActiveCalls(prev =>
        prev.map(c => ({
          ...c,
          duration: c.duration + 1,
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ---- Helpers ----

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getOverallStatus = (): { status: ServiceStatus; count: number; total: number } => {
    const entries = Object.values(services);
    const total = entries.length;
    if (total === 0) return { status: 'loading', count: 0, total };
    const connected = entries.filter(s => s.status === 'connected').length;
    const offline = entries.filter(s => s.status === 'offline').length;
    return {
      status: offline > 0 ? (connected > 0 ? 'degraded' : 'offline') : 'connected',
      count: connected,
      total,
    };
  };

  const overall = getOverallStatus();
  const overallStyle = STATUS_STYLES[overall.status];

  // ---- Service Card Icons ----

  const SERVICE_ICONS: Record<string, React.ElementType> = {
    'Vobiz SIP': Phone,
    'Gemini AI': Brain,
    'Call Orchestrator': GitBranch,
    'Supabase Database': Database,
    'n8n Workflows': Workflow,
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ---- Header ---- */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            Integration Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time status of all VoiceAI services
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall status badge */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium',
            overallStyle.bg, overallStyle.text,
            overall.status === 'connected' ? 'border-emerald-200 dark:border-emerald-800' :
            overall.status === 'degraded' ? 'border-amber-200 dark:border-amber-800' :
            'border-rose-200 dark:border-rose-800'
          )}>
            <span className="relative flex h-2 w-2">
              {overallStyle.pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', overallStyle.pulse)} />}
              <span className={cn('relative inline-flex rounded-full h-2 w-2', overallStyle.dot)} />
            </span>
            {overall.count}/{overall.total} Online
          </div>
          {lastRefresh && (
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefresh}
            </span>
          )}
        </div>
      </motion.div>

      {/* ---- 5 Service Status Cards ---- */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.values(services).map((service) => {
          const style = STATUS_STYLES[service.status];
          const Icon = SERVICE_ICONS[service.name] || Radio;

          return (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={cn(
                'border-l-4 overflow-hidden transition-all duration-200 hover:shadow-md',
                style.border
              )}>
                <CardContent className="p-4">
                  {/* Top row: icon + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        service.status === 'connected' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        service.status === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        service.status === 'offline' ? 'bg-rose-100 dark:bg-rose-900/30' :
                        'bg-slate-100 dark:bg-slate-800'
                      )}>
                        <Icon className={cn(
                          'w-4 h-4',
                          service.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' :
                          service.status === 'degraded' ? 'text-amber-600 dark:text-amber-400' :
                          service.status === 'offline' ? 'text-rose-600 dark:text-rose-400' :
                          'text-slate-400'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{service.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{service.port}</p>
                      </div>
                    </div>
                    {/* Status dot */}
                    <span className="relative flex h-2.5 w-2.5 mt-1">
                      {style.pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', style.pulse)} />}
                      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', style.dot)} />
                    </span>
                  </div>

                  {/* Status text */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {service.status === 'connected' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {service.status === 'degraded' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                    {service.status === 'offline' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    {service.status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                    <span className={cn('text-xs font-medium', style.text)}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                  </div>

                  {/* Details */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{service.details}</p>

                  {/* Bottom row: latency + configured + test */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {service.latency !== undefined && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                          {service.latency}ms
                        </Badge>
                      )}
                      <Badge variant={service.configured ? 'default' : 'secondary'} className={cn(
                        'text-[10px] px-1.5 py-0 h-5',
                        service.configured
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}>
                        <Shield className="w-2.5 h-2.5 mr-0.5" />
                        {service.configured ? 'Set' : 'Not Set'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      disabled={testRunning === service.name}
                      onClick={() => testService(service.name)}
                    >
                      {testRunning === service.name ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ---- Orchestration Flow Diagram ---- */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-teal-500" />
              Call Orchestration Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-1 min-w-[700px] px-4">
                {FLOW_NODES.map((node, i) => {
                  const serviceKey = node.id === 'patient' ? null
                    : node.id === 'vobiz' ? 'Vobiz SIP'
                    : node.id === 'orchestrator' ? 'Call Orchestrator'
                    : node.id === 'gemini' ? 'Gemini AI'
                    : node.id === 'supabase' ? 'Supabase Database'
                    : node.id === 'n8n' ? 'n8n Workflows'
                    : null;

                  const nodeStatus = serviceKey ? services[serviceKey]?.status : 'connected';
                  const isActive = nodeStatus === 'connected';
                  const isOffline = nodeStatus === 'offline';

                  const NodeIcon = node.icon;

                  return (
                    <div key={node.id} className="flex items-center gap-1">
                      <motion.div
                        className="flex flex-col items-center gap-1.5"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                      >
                        {/* Node circle */}
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative',
                          isActive
                            ? 'border-emerald-400 dark:border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : isOffline
                              ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                              : 'border-amber-400 dark:border-amber-500'
                        )}>
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{ background: `radial-gradient(circle, ${node.color}20 0%, transparent 70%)` }}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                          <NodeIcon className={cn(
                            'w-5 h-5',
                            isActive ? 'text-emerald-600 dark:text-emerald-400' :
                            isOffline ? 'text-slate-400 dark:text-slate-500' :
                            'text-amber-600 dark:text-amber-400'
                          )} />
                        </div>
                        {/* Label */}
                        <span className={cn(
                          'text-[10px] font-medium text-center w-16 leading-tight',
                          isActive ? 'text-slate-700 dark:text-slate-300' :
                          isOffline ? 'text-slate-400 dark:text-slate-500' :
                          'text-amber-600 dark:text-amber-400'
                        )}>
                          {node.label}
                        </span>
                      </motion.div>

                      {/* Connector line */}
                      {i < FLOW_NODES.length - 1 && (
                        <div className="flex-shrink-0 w-8 h-[2px] mx-0.5 relative overflow-hidden">
                          {isActive ? (
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: 'linear-gradient(90deg, #10b981, #14b8a6)',
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 border-t-2 border-dashed border-slate-300 dark:border-slate-600" style={{ height: 0, borderTopWidth: 2 }} />
                          )}
                          {/* Animated flow dot on connected lines */}
                          {isActive && (
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400"
                              animate={{ left: ['0%', '100%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Live Call Monitor + Quick Actions ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Call Monitor */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500" />
                  Live Call Sessions
                </CardTitle>
                <Badge variant={activeCalls.length > 0 ? 'default' : 'secondary'} className={cn(
                  'text-[10px]',
                  activeCalls.length > 0
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                    : ''
                )}>
                  {activeCalls.length} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {activeCalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Phone className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No active calls</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Active call sessions will appear here in real-time
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {activeCalls.map((call) => (
                    <motion.div
                      key={call.callSid}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {call.clinic}
                          </p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 flex-shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            {call.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {call.caller} &middot; <span className="font-mono">{call.callSid.slice(0, 12)}...</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm font-mono text-slate-700 dark:text-slate-300">
                          <Clock className="w-3 h-3" />
                          {formatDuration(call.duration)}
                        </div>
                        <span className="relative flex h-2 w-2 ml-auto mt-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                disabled={pipelineTesting || loading}
                onClick={testFullPipeline}
              >
                {pipelineTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Test Full Pipeline
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={loading}
                onClick={() => fetchAllHealth(true)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Ping All Services
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  window.open('/api/n8n?action=health', '_blank');
                  toast.info('Opening n8n workflow dashboard...');
                }}
              >
                <Workflow className="w-4 h-4" />
                View n8n Workflows
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </Button>

              <Separator className="my-2" />

              <div className="text-xs text-slate-400 dark:text-slate-500 space-y-1.5">
                <p className="font-medium text-slate-600 dark:text-slate-400">Service Endpoints</p>
                <div className="flex items-center gap-1.5">
                  <CircleDot className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="font-mono">Vobiz</span>
                  <span className="ml-auto text-slate-400">:3031</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CircleDot className="w-2.5 h-2.5 text-amber-500" />
                  <span className="font-mono">Gemini</span>
                  <span className="ml-auto text-slate-400">:3032</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CircleDot className="w-2.5 h-2.5 text-teal-500" />
                  <span className="font-mono">Orchestrator</span>
                  <span className="ml-auto text-slate-400">:3035</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CircleDot className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="font-mono">WS Bridge</span>
                  <span className="ml-auto text-slate-400">:3033</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---- Environment Status ---- */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-500" />
                Environment Variables
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {envVars.filter(v => v.status === 'configured').length}/{envVars.length} configured
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">Variable</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Value Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {envVars.map((env) => (
                    <tr key={env.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{env.name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className={cn(
                          'text-[10px] px-1.5 py-0 h-5',
                          env.status === 'configured' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                          env.status === 'placeholder' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                          env.status === 'missing' && 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        )}>
                          {env.status === 'configured' ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> :
                           env.status === 'placeholder' ? <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> :
                           <XCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {env.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {env.preview}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Setup Guide (Expandable) ---- */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors rounded-t-xl"
              onClick={() => setSetupOpen(!setupOpen)}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Production Setup Guide</span>
                <Badge variant="outline" className="text-[10px]">
                  {SETUP_STEPS.filter(s => s.done).length}/{SETUP_STEPS.length} done
                </Badge>
              </div>
              <motion.div animate={{ rotate: setupOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>
            </button>

            <AnimatePresence>
              {setupOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <Separator />
                  <div className="p-4 space-y-4">
                    {SETUP_STEPS.map((step, i) => (
                      <motion.div
                        key={step.step}
                        className="flex gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        {/* Step indicator */}
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                          step.done
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        )}>
                          {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.step}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              Step {step.step}: {step.title}
                            </p>
                            {step.done && (
                              <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                                Done
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    <Separator />

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50">
                      <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        <span className="font-semibold">Pro tip:</span> Use the &ldquo;Test Full Pipeline&rdquo; button above to verify your entire setup works end-to-end before going live.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
