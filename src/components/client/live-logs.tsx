'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Terminal, RefreshCw, Filter, Trash2, AlertCircle, Info,
  AlertTriangle, ChevronDown, ChevronRight, Zap, Clock
} from 'lucide-react';

/* ============================================================
   Types & Data
   ============================================================ */

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  detail: string | null;
  timestamp: string;
}

const LEVEL_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; borderColor: string; badgeBg: string; badgeText: string }> = {
  info: {
    label: 'Info',
    icon: Info,
    color: 'text-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-900/15',
    borderColor: 'border-sky-200 dark:border-sky-800',
    badgeBg: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    badgeText: 'text-sky-700 dark:text-sky-400',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/15',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    badgeText: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-900/15',
    borderColor: 'border-rose-200 dark:border-rose-800',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    badgeText: 'text-rose-700 dark:text-rose-400',
  },
};

// Sample demo logs for initial display
const DEMO_LOGS: LogEntry[] = [
  {
    id: 'log-1', level: 'info', source: 'ai-agent', message: 'Call session started for +919876543210',
    detail: 'Agent: Rekha | Language: Hinglish | Duration: 00:00',
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'log-2', level: 'info', source: 'ai-agent', message: 'Intent detected: appointment_booking',
    detail: 'Confidence: 0.92 | Patient asked about available slots for root canal consultation',
    timestamp: new Date(Date.now() - 95000).toISOString(),
  },
  {
    id: 'log-3', level: 'warning', source: 'call-router', message: 'Patient sentiment shifting negative during call',
    detail: 'Sentiment changed from positive → negative at 01:23 into call. Reason: long hold time. Escalation triggered.',
    timestamp: new Date(Date.now() - 80000).toISOString(),
  },
  {
    id: 'log-4', level: 'info', source: 'booking', message: 'Appointment booked successfully',
    detail: 'Patient: Rajesh Kumar | Date: 2025-01-20 | Time: 10:30 AM | Service: Root Canal | Fee: ₹2500',
    timestamp: new Date(Date.now() - 65000).toISOString(),
  },
  {
    id: 'log-5', level: 'error', source: 'sip-gateway', message: 'SIP connection timeout for outbound call to +919988776655',
    detail: 'Error: ETIMEDOUT | Vobiz API did not respond within 10s | Retry attempt 1/3 | Fallback to queue initiated',
    timestamp: new Date(Date.now() - 50000).toISOString(),
  },
  {
    id: 'log-6', level: 'info', source: 'whatsapp', message: 'WhatsApp confirmation sent to +919876543210',
    detail: 'Template: appointment_confirmation | Status: delivered | MSG91 Message ID: msg_abc123',
    timestamp: new Date(Date.now() - 40000).toISOString(),
  },
  {
    id: 'log-7', level: 'warning', source: 'ai-agent', message: 'Gemini API response latency above threshold',
    detail: 'Response time: 3.2s (threshold: 2s) | Model: gemini-2.0-flash | Tokens: 847 | Recommendation: Consider caching FAQ responses',
    timestamp: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'log-8', level: 'info', source: 'analytics', message: 'Daily analytics snapshot generated',
    detail: 'Date: 2025-01-19 | Calls: 47 | Bookings: 12 | Conversion: 25.5% | Revenue: ₹30,000',
    timestamp: new Date(Date.now() - 20000).toISOString(),
  },
  {
    id: 'log-9', level: 'error', source: 'scheduler', message: 'Failed to process callback queue - rate limit exceeded',
    detail: 'Error: 429 Too Many Requests | Vobiz rate limit: 10 calls/min | Pending callbacks: 23 | Cooldown: 60s',
    timestamp: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'log-10', level: 'info', source: 'ai-agent', message: 'Call session completed for +919876543210',
    detail: 'Duration: 02:15 | Status: completed | Sentiment: positive | Booking: confirmed | Agent: Rekha',
    timestamp: new Date(Date.now() - 5000).toISOString(),
  },
];

/* ============================================================
   Sub-components
   ============================================================ */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
}

function formatFullTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

function LogEntryCard({ entry, index }: { entry: LogEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        'rounded-lg border transition-all duration-200',
        'bg-white dark:bg-slate-900/80',
        config.borderColor,
        'hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Level icon */}
        <div className={cn('mt-0.5 shrink-0', config.color)}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-[10px] font-semibold px-1.5 py-0', config.badgeBg)}>
              {config.label.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
              {entry.source}
            </Badge>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(entry.timestamp)}
            </span>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5 font-medium leading-snug">
            {entry.message}
          </p>

          {entry.detail && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 hover:text-emerald-500 mt-1.5 transition-colors font-mono"
              >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {expanded ? 'Hide details' : 'View details'}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-2.5 rounded-md bg-slate-900 dark:bg-slate-950 border border-slate-700/50 font-mono text-[11px] text-emerald-400 leading-relaxed whitespace-pre-wrap break-all">
                      {entry.detail}
                    </div>
                    <div className="mt-1 text-[9px] text-slate-400 dark:text-slate-600 font-mono">
                      {formatFullTime(entry.timestamp)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyLogState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-800 blur-xl" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
          <Terminal className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-6">No logs yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm">
        Logs will appear here as the AI agent processes calls and the system generates events.
      </p>
    </motion.div>
  );
}

/* ============================================================
   Main Component
   ============================================================ */

export default function LiveLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>(DEMO_LOGS);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      params.set('limit', '100');
      const res = await fetch(`/api/client/logs?${params.toString()}`, {
        headers: { 'x-clinic-id': 'demo-clinic-1' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
          setHasFetched(true);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  // Scroll to bottom on new logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = levelFilter === 'all'
    ? logs
    : logs.filter(l => l.level === levelFilter);

  const levelCounts = {
    info: logs.filter(l => l.level === 'info').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Logs</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Real-time system event viewer</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {autoRefresh && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="data-[state=checked]:bg-emerald-500"
            />
            <span className={cn(
              'text-xs font-medium',
              autoRefresh ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            )}>
              Auto-refresh
            </span>
            {autoRefresh && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">5s</span>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-rose-200 dark:border-rose-800">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900 dark:bg-slate-950 border-slate-700/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Level</span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'info', 'warning', 'error'] as const).map((level) => {
                const count = level === 'all' ? logs.length : levelCounts[level];
                const cfg = level !== 'all' ? LEVEL_CONFIG[level] : null;
                const LevelIcon = cfg?.icon || Info;
                return (
                  <button
                    key={level}
                    onClick={() => setLevelFilter(level)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      levelFilter === level
                        ? level === 'all'
                          ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                          : cn(cfg!.bgColor, cfg!.color, 'ring-1 ring-current/30')
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                    )}
                  >
                    {level !== 'all' && <LevelIcon className="w-3 h-3" />}
                    {level === 'all' ? 'All' : cfg!.label}
                    <span className="ml-1 px-1.5 py-0 rounded-full bg-slate-700/50 text-[10px] font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700 text-xs text-slate-300">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="ai-agent">AI Agent</SelectItem>
                  <SelectItem value="call-router">Call Router</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">{filteredLogs.length}</span> entries
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          {levelCounts.info} info
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {levelCounts.warning} warnings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          {levelCounts.error} errors
        </span>
        {!hasFetched && (
          <>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              Showing demo data
            </span>
          </>
        )}
      </div>

      {/* Log Entries */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900 dark:bg-slate-950 overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 ml-2">voiceai-logs — live stream</span>
          {autoRefresh && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              STREAMING
            </span>
          )}
        </div>

        {/* Log list */}
        <div className="max-h-[500px] overflow-y-auto">
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-slate-800/50">
              <AnimatePresence>
                {filteredLogs.map((entry, i) => (
                  <LogEntryCard key={entry.id} entry={entry} index={i} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-16">
              <EmptyLogState />
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-3">
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            Fetching logs...
          </div>
        </div>
      )}
    </div>
  );
}
