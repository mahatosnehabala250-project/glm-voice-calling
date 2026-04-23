'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Phone,
  Brain,
  Radio,
  GitBranch,
  Database,
  Workflow,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Shield,
  Server,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Circle,
  ExternalLink,
  Thermometer,
  TrendingUp,
  BarChart3,
  Globe,
  Key,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────────

interface UptimeCheck {
  timestamp: string;
  status: 'connected' | 'degraded' | 'offline';
  latency: number;
}

interface ServiceData {
  name: string;
  key: string;
  icon: string;
  port: number;
  url: string;
  status: 'connected' | 'degraded' | 'offline';
  latency: number;
  uptimePercent: number;
  uptimeChecks: UptimeCheck[];
  latencyHistogram: number[];
  totalChecks: number;
  totalUptime: number;
  lastSeen: string | null;
  version?: string | null;
  service?: string | null;
  uptime?: number | null;
  uptimeFormatted?: string | null;
  demoMode?: boolean | string | null;
  activeCalls?: number | null;
  totalCallsHandled?: number | null;
  vobizConnected?: boolean | null;
  geminiLiveReady?: boolean | null;
  primaryModel?: string | null;
  fallbackModel?: string | null;
  protocol?: string | null;
  audioFormat?: string | null;
  tableQueryResult?: string | null;
  httpStatus?: number | null;
  error?: string | null;
}

interface EnvVar {
  key: string;
  label: string;
  status: 'configured' | 'missing' | 'demo' | 'production';
  preview: string;
}

interface IntegrationStatusResponse {
  status: 'operational' | 'degraded';
  timestamp: string;
  responseTime: number;
  services: ServiceData[];
  supabase: ServiceData;
  environment: EnvVar[];
  endpoints: string[];
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  phone: Phone,
  brain: Brain,
  radio: Radio,
  'git-branch': GitBranch,
  workflow: Workflow,
  database: Database,
};

// ─── Animation Variants ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Sparkline Component ─────────────────────────────────────────────────────────

function MiniSparkline({
  data,
  width = 80,
  height = 24,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((val, i) => {
      const x = i * step;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Uptime Dot Bar ──────────────────────────────────────────────────────────────

function UptimeDotBar({ checks, className }: { checks: UptimeCheck[]; className?: string }) {
  if (checks.length === 0) {
    return <span className="text-[10px] text-slate-400">No data yet</span>;
  }
  return (
    <div className={cn('flex items-center gap-[2px]', className)}>
      {checks.slice(-30).map((check, i) => {
        const color =
          check.status === 'connected'
            ? 'bg-emerald-500'
            : check.status === 'degraded'
              ? 'bg-amber-500'
              : 'bg-rose-500';
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, duration: 0.15 }}
            className={cn('w-[5px] h-[10px] rounded-[2px]', color)}
            title={`${new Date(check.timestamp).toLocaleTimeString()}: ${check.status} (${check.latency}ms)`}
          />
        );
      })}
    </div>
  );
}

// ─── Service Card ────────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  index,
}: {
  service: ServiceData;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[service.icon] || Server;

  const statusColor =
    service.status === 'connected'
      ? 'text-emerald-500'
      : service.status === 'degraded'
        ? 'text-amber-500'
        : 'text-rose-500';

  const statusBg =
    service.status === 'connected'
      ? 'bg-emerald-500'
      : service.status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-rose-500';

  const statusRing =
    service.status === 'connected'
      ? 'ring-emerald-500/20'
      : service.status === 'degraded'
        ? 'ring-amber-500/20'
        : 'ring-rose-500/20';

  const statusLabel =
    service.status === 'connected'
      ? 'Healthy'
      : service.status === 'degraded'
        ? 'Degraded'
        : 'Offline';

  const statusBadgeVariant =
    service.status === 'connected'
      ? 'default'
      : service.status === 'degraded'
        ? 'secondary'
        : 'destructive';

  // Build service-specific info
  const specificInfo: Array<{ label: string; value: string; icon?: React.ElementType }> = [];

  if (service.version) {
    specificInfo.push({ label: 'Version', value: `v${service.version}` });
  }
  if (service.uptimeFormatted) {
    specificInfo.push({ label: 'Service Uptime', value: service.uptimeFormatted, icon: Clock });
  } else if (service.uptime && service.uptime > 0) {
    const hrs = Math.floor(service.uptime / 3600);
    const mins = Math.floor((service.uptime % 3600) / 60);
    specificInfo.push({ label: 'Service Uptime', value: `${hrs}h ${mins}m`, icon: Clock });
  }
  if (service.activeCalls !== null && service.activeCalls !== undefined) {
    specificInfo.push({ label: 'Active Calls', value: String(service.activeCalls), icon: Phone });
  }
  if (service.totalCallsHandled !== null && service.totalCallsHandled !== undefined) {
    specificInfo.push({ label: 'Total Calls', value: String(service.totalCallsHandled) });
  }
  if (service.demoMode !== null && service.demoMode !== undefined) {
    const isDemo = service.demoMode === true || service.demoMode === 'true';
    specificInfo.push({
      label: 'Gemini Mode',
      value: isDemo ? 'Demo' : 'Production',
      icon: isDemo ? AlertTriangle : CheckCircle2,
    });
  }
  if (service.vobizConnected !== null && service.vobizConnected !== undefined) {
    specificInfo.push({
      label: 'Vobiz Connected',
      value: service.vobizConnected ? 'Yes' : 'No',
      icon: service.vobizConnected ? CheckCircle2 : XCircle,
    });
  }
  if (service.geminiLiveReady !== null && service.geminiLiveReady !== undefined) {
    specificInfo.push({
      label: 'Gemini Live Ready',
      value: service.geminiLiveReady ? 'Yes' : 'No',
      icon: service.geminiLiveReady ? CheckCircle2 : XCircle,
    });
  }
  if (service.primaryModel) {
    specificInfo.push({ label: 'Primary Model', value: service.primaryModel, icon: Brain });
  }
  if (service.fallbackModel) {
    specificInfo.push({ label: 'Fallback Model', value: service.fallbackModel });
  }
  if (service.protocol) {
    specificInfo.push({ label: 'Protocol', value: service.protocol });
  }
  if (service.audioFormat) {
    specificInfo.push({ label: 'Audio Format', value: service.audioFormat });
  }
  if (service.tableQueryResult) {
    specificInfo.push({ label: 'Table Query', value: service.tableQueryResult, icon: Database });
  }
  if (service.error) {
    specificInfo.push({ label: 'Error', value: service.error, icon: AlertTriangle });
  }
  if (service.httpStatus && service.status !== 'connected') {
    specificInfo.push({ label: 'HTTP Status', value: String(service.httpStatus) });
  }

  return (
    <motion.div
      variants={itemVariants}
      custom={index}
      className="group"
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300 hover:shadow-lg',
          'border-slate-200/60 dark:border-slate-800/60',
          service.status === 'connected' && 'hover:border-emerald-300/60 dark:hover:border-emerald-800/40',
          service.status === 'degraded' && 'hover:border-amber-300/60 dark:hover:border-amber-800/40',
          service.status === 'offline' && 'hover:border-rose-300/60 dark:hover:border-rose-800/40',
        )}
      >
        <CardContent className="p-4">
          {/* Top Row: Icon + Name + Status + Latency */}
          <div className="flex items-start gap-3">
            {/* Status dot with ring */}
            <div className="relative mt-0.5 flex-shrink-0">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg ring-2',
                  service.status === 'connected'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-emerald-500/20'
                    : service.status === 'degraded'
                      ? 'bg-amber-50 dark:bg-amber-950/40 ring-amber-500/20'
                      : 'bg-rose-50 dark:bg-rose-950/40 ring-rose-500/20',
                )}
              >
                <Icon
                  className={cn(
                    'h-4.5 w-4.5',
                    service.status === 'connected'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : service.status === 'degraded'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400',
                  )}
                />
              </span>
              {/* Pulsing ring for healthy services */}
              {service.status === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5">
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {service.name}
                </h3>
                <Badge
                  variant={statusBadgeVariant}
                  className={cn(
                    'text-[10px] px-2 py-0.5 font-medium flex-shrink-0',
                    service.status === 'connected' &&
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0',
                    service.status === 'degraded' &&
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0',
                    service.status === 'offline' &&
                      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-0',
                  )}
                >
                  {statusLabel}
                </Badge>
              </div>

              {/* Metrics row */}
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Thermometer className="w-3 h-3" />
                  <span className="font-mono">{service.latency > 0 ? `${service.latency}ms` : '--'}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-mono">{service.uptimePercent}%</span>
                </div>
                {service.port > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Server className="w-3 h-3" />
                    <span className="font-mono">:{service.port}</span>
                  </div>
                )}
              </div>

              {/* Latency sparkline */}
              {service.latencyHistogram.length >= 2 && (
                <div className="mt-2">
                  <MiniSparkline
                    data={service.latencyHistogram}
                    width={80}
                    height={20}
                    className={cn(statusColor, 'opacity-60')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse Button */}
          {specificInfo.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> Show Details ({specificInfo.length})
                  </>
                )}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      {specificInfo.map((info) => {
                        const InfoIcon = info.icon || Circle;
                        return (
                          <div
                            key={info.label}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <InfoIcon className="w-3 h-3 flex-shrink-0" />
                              {info.label}
                            </span>
                            <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                              {info.value}
                            </span>
                          </div>
                        );
                      })}

                      {/* Uptime History Dot Bar */}
                      <div className="pt-1.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                          Uptime History (last 30 checks)
                        </span>
                        <UptimeDotBar checks={service.uptimeChecks} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Environment Status Section ──────────────────────────────────────────────────

function EnvironmentStatus({ envVars }: { envVars: EnvVar[] }) {
  const [expanded, setExpanded] = useState(false);
  const configured = envVars.filter((e) => e.status === 'configured' || e.status === 'production').length;
  const demo = envVars.filter((e) => e.status === 'demo').length;
  const missing = envVars.filter((e) => e.status === 'missing').length;

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
        <CardHeader className="pb-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/40 ring-2 ring-teal-500/20">
                <Key className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                  Environment Variables
                </CardTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {configured + demo} configured &middot; {missing} missing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {configured > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-[10px] px-2 py-0.5">
                  {configured} ✓
                </Badge>
              )}
              {demo > 0 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0 text-[10px] px-2 py-0.5">
                  {demo} demo
                </Badge>
              )}
              {missing > 0 && (
                <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-0 text-[10px] px-2 py-0.5">
                  {missing} ✗
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="px-4 pb-3">
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                missing === 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : configured + demo >= envVars.length * 0.7
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                    : 'bg-gradient-to-r from-rose-500 to-red-400',
              )}
              style={{ width: `${((configured + demo) / envVars.length) * 100}%` }}
            />
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Hide Variables</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Show All Variables</>
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {envVars.map((env) => (
                    <div
                      key={env.key}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {env.status === 'configured' || env.status === 'production' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : env.status === 'demo' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        )}
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                          {env.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {env.preview && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {env.preview}
                          </span>
                        )}
                        <Badge
                          className={cn(
                            'text-[9px] px-1.5 py-0 border-0 font-medium',
                            env.status === 'configured' || env.status === 'production'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : env.status === 'demo'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
                          )}
                        >
                          {env.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Supabase Health Card ────────────────────────────────────────────────────────

function SupabaseCard({ supabase }: { supabase: ServiceData }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    supabase.status === 'connected'
      ? 'text-emerald-500'
      : supabase.status === 'degraded'
        ? 'text-amber-500'
        : 'text-rose-500';

  return (
    <motion.div variants={itemVariants}>
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300',
          'border-slate-200/60 dark:border-slate-800/60',
          supabase.status === 'connected' && 'hover:border-emerald-300/60 dark:hover:border-emerald-800/40',
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 flex-shrink-0">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg ring-2',
                  supabase.status === 'connected'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-emerald-500/20'
                    : 'bg-rose-50 dark:bg-rose-950/40 ring-rose-500/20',
                )}
              >
                <Database
                  className={cn(
                    'h-4.5 w-4.5',
                    supabase.status === 'connected'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                />
              </span>
              {supabase.status === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5">
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Supabase</h3>
                <Badge
                  className={cn(
                    'text-[10px] px-2 py-0.5 font-medium border-0',
                    supabase.status === 'connected'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
                  )}
                >
                  {supabase.status === 'connected' ? 'Connected' : 'Offline'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Thermometer className="w-3 h-3" />
                  <span className="font-mono">{supabase.latency > 0 ? `${supabase.latency}ms` : '--'}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-mono">{supabase.uptimePercent}%</span>
                </div>
              </div>

              {supabase.latencyHistogram.length >= 2 && (
                <div className="mt-2">
                  <MiniSparkline
                    data={supabase.latencyHistogram}
                    width={80}
                    height={20}
                    className={cn(statusColor, 'opacity-60')}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mt-3"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Hide Details</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Show Details</>
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  {supabase.tableQueryResult && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Database className="w-3 h-3" />
                        Table Query
                      </span>
                      <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {supabase.tableQueryResult}
                      </span>
                    </div>
                  )}
                  {supabase.error && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                      </span>
                      <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400">
                        {supabase.error}
                      </span>
                    </div>
                  )}
                  {supabase.url && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Globe className="w-3 h-3" />
                        URL
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                        {supabase.url}
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                      Uptime History (last 30 checks)
                    </span>
                    <UptimeDotBar checks={supabase.uptimeChecks} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export default function ServiceHealthMonitor() {
  const [data, setData] = useState<IntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async (isTest = false) => {
    if (isTest) setTesting(true);
    else if (!data) setLoading(true);

    try {
      const res = await fetch('/api/integration-status');
      if (res.ok) {
        const json = await res.json();
        if (mountedRef.current) {
          setData(json);
          setLastRefresh(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
        }
      }
    } catch {
      // Silently fail on network errors
    } finally {
      if (mountedRef.current) {
        if (isTest) setTesting(false);
        else setLoading(false);
      }
    }
  }, [data]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, 30000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  const handleTestAll = () => {
    fetchStatus(true);
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-900/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const connectedCount = data.services.filter((s) => s.status === 'connected').length;
  const totalCount = data.services.length + 1; // +1 for supabase
  const allUp = data.status === 'operational';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-emerald-500/30 blur-md" />
            <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Service Health Monitor
              <span
                className={cn(
                  'text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full',
                  allUp
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                )}
              >
                {allUp ? 'ALL SYSTEMS GO' : 'DEGRADED'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time monitoring of all platform services &middot; Auto-refreshes every 30s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Last: {lastRefresh} IST
            </span>
          )}
          <Button
            onClick={handleTestAll}
            disabled={testing}
            size="sm"
            className={cn(
              'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm',
              'transition-all duration-200',
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', testing && 'animate-spin')} />
            {testing ? 'Testing...' : 'Test All'}
          </Button>
        </div>
      </motion.div>

      {/* Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="p-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/30">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Services</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {connectedCount}/{totalCount}
                  </p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 dark:bg-teal-950/30">
                  <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">API Response</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {data.responseTime}ms
                  </p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-800/30">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Connected Endpoints</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {data.endpoints.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Live status strip */}
            <div className="flex items-center gap-1.5">
              {(data.services as ServiceData[]).map((svc) => (
                <div
                  key={svc.key}
                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md px-2 py-1"
                >
                  {(() => {
                    const Icon = ICON_MAP[svc.icon] || Server;
                    return <Icon className="w-3 h-3 text-slate-400 dark:text-slate-500" />;
                  })()}
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      svc.status === 'connected'
                        ? 'bg-emerald-500'
                        : svc.status === 'degraded'
                          ? 'bg-amber-500'
                          : 'bg-rose-500',
                    )}
                  />
                </div>
              ))}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md px-2 py-1">
                <Database className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    data.supabase.status === 'connected'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500',
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Grid: Services + Sidebar */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Services Grid (left 2/3) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.services.map((service, idx) => (
            <ServiceCard key={service.key} service={service} index={idx} />
          ))}

          {/* Supabase card */}
          <SupabaseCard supabase={data.supabase} />
        </div>

        {/* Right sidebar (1/3) */}
        <div className="space-y-4">
          {/* Environment Variables */}
          <EnvironmentStatus envVars={data.environment} />

          {/* Overall Uptime Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20">
                    <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Platform Status
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Overall system health
                    </p>
                  </div>
                </div>

                {/* Big status indicator */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mb-3">
                  <span
                    className={cn(
                      'relative flex h-4 w-4',
                      allUp ? '' : '',
                    )}
                  >
                    {allUp && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={cn(
                        'relative inline-flex rounded-full h-4 w-4',
                        allUp ? 'bg-emerald-500' : 'bg-amber-500',
                      )}
                    />
                  </span>
                  <div>
                    <p
                      className={cn(
                        'text-sm font-bold',
                        allUp
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {allUp ? 'All Systems Operational' : 'Partial Degradation'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {data.timestamp
                        ? new Date(data.timestamp).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : ''}
                      IST
                    </p>
                  </div>
                </div>

                {/* Per-service mini uptime list */}
                <div className="space-y-2">
                  {[...data.services, data.supabase].map((svc) => {
                    const isUp = svc.status === 'connected';
                    return (
                      <div key={svc.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = ICON_MAP[svc.icon] || Server;
                            return (
                              <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            );
                          })()}
                          <span className="text-[12px] text-slate-600 dark:text-slate-400">
                            {svc.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {svc.uptimePercent}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                isUp
                                  ? 'bg-emerald-500'
                                  : svc.status === 'degraded'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500',
                              )}
                              style={{ width: `${svc.uptimePercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card className="border-slate-200/60 dark:border-slate-800/60">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button
                    onClick={handleTestAll}
                    disabled={testing}
                    variant="outline"
                    className="w-full justify-start text-xs h-8 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-800"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5 mr-2', testing && 'animate-spin')} />
                    {testing ? 'Running Health Checks...' : 'Run Full Health Check'}
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-400 dark:text-slate-500">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    Auto-refresh every 30 seconds
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
