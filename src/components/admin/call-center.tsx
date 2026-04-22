'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Phone, PhoneCall, PhoneMissed, Clock, TrendingUp, TrendingDown,
  Headphones, ArrowRightLeft, Search, Filter, ArrowUpDown,
  Activity, Zap, User, Star, ChevronDown, CalendarDays,
  BarChart3, Volume2, Users, AlertTriangle, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============================================================
// Types
// ============================================================

interface CallRecord {
  id: string;
  callSid: string;
  callerPhone: string;
  callerName: string;
  status: string;
  direction: string;
  duration: number;
  startedAt: string;
  intent: string;
  sentiment: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
}

interface ActiveCallMock {
  id: string;
  callerPhone: string;
  callerName: string;
  duration: number;
  intent: string;
  startedAt: Date;
  sentiment: string;
}

type StatusFilter = 'all' | 'completed' | 'missed' | 'transferred' | 'in-progress';
type SortField = 'date' | 'caller' | 'duration' | 'status';
type SortDir = 'asc' | 'desc';

// ============================================================
// Mock Data
// ============================================================

const MOCK_ACTIVE_CALLS: ActiveCallMock[] = [
  {
    id: 'ac-1',
    callerPhone: '+919876543210',
    callerName: 'Priya Sharma',
    duration: 142,
    intent: 'Appointment Booking',
    startedAt: new Date(Date.now() - 142000),
    sentiment: 'positive',
  },
  {
    id: 'ac-2',
    callerPhone: '+918765432109',
    callerName: 'Rahul Verma',
    duration: 87,
    intent: 'Fee Inquiry',
    startedAt: new Date(Date.now() - 87000),
    sentiment: 'neutral',
  },
  {
    id: 'ac-3',
    callerPhone: '+917654321098',
    callerName: 'Anita Patel',
    duration: 203,
    intent: 'Doctor Consultation',
    startedAt: new Date(Date.now() - 203000),
    sentiment: 'positive',
  },
];

const CALL_VOLUME_DATA = [
  { hour: '9AM', calls: 4 },
  { hour: '10AM', calls: 9 },
  { hour: '11AM', calls: 14 },
  { hour: '12PM', calls: 11 },
  { hour: '1PM', calls: 7 },
  { hour: '2PM', calls: 13 },
  { hour: '3PM', calls: 18 },
  { hour: '4PM', calls: 15 },
  { hour: '5PM', calls: 12 },
  { hour: '6PM', calls: 8 },
  { hour: '7PM', calls: 6 },
  { hour: '8PM', calls: 3 },
  { hour: '9PM', calls: 1 },
];

const MOCK_HISTORY: CallRecord[] = [
  { id: 'h1', callSid: 'CA10001', callerPhone: '+919876543210', callerName: 'Priya Sharma', status: 'completed', direction: 'inbound', duration: 195, startedAt: '2025-01-15T10:30:00', intent: 'Appointment Booking', sentiment: 'positive', tags: ['booking', 'dental'] },
  { id: 'h2', callSid: 'CA10002', callerPhone: '+918765432109', callerName: 'Rahul Verma', status: 'missed', direction: 'inbound', duration: 0, startedAt: '2025-01-15T10:15:00', intent: 'Fee Inquiry', sentiment: 'negative', tags: ['inquiry'] },
  { id: 'h3', callSid: 'CA10003', callerPhone: '+917654321098', callerName: 'Anita Patel', status: 'completed', direction: 'inbound', duration: 312, startedAt: '2025-01-15T09:50:00', intent: 'Doctor Consultation', sentiment: 'positive', tags: ['consultation', 'follow-up'] },
  { id: 'h4', callSid: 'CA10004', callerPhone: '+916543210987', callerName: 'Deepak Kumar', status: 'transferred', direction: 'inbound', duration: 145, startedAt: '2025-01-15T09:30:00', intent: 'Emergency', sentiment: 'negative', tags: ['emergency', 'escalation'] },
  { id: 'h5', callSid: 'CA10005', callerPhone: '+915432109876', callerName: 'Meena Iyer', status: 'completed', direction: 'inbound', duration: 88, startedAt: '2025-01-15T09:10:00', intent: 'Appointment Booking', sentiment: 'positive', tags: ['booking'] },
  { id: 'h6', callSid: 'CA10006', callerPhone: '+914321098765', callerName: 'Sunil Gupta', status: 'completed', direction: 'outbound', duration: 67, startedAt: '2025-01-14T16:45:00', intent: 'Follow-up', sentiment: 'neutral', tags: ['follow-up', 'outbound'] },
  { id: 'h7', callSid: 'CA10007', callerPhone: '+913210987654', callerName: 'Kavitha Reddy', status: 'missed', direction: 'inbound', duration: 0, startedAt: '2025-01-14T15:30:00', intent: 'Appointment Booking', sentiment: 'negative', tags: ['missed'] },
  { id: 'h8', callSid: 'CA10008', callerPhone: '+912109876543', callerName: 'Arjun Singh', status: 'completed', direction: 'inbound', duration: 224, startedAt: '2025-01-14T14:15:00', intent: 'Doctor Consultation', sentiment: 'positive', tags: ['consultation', 'ortho'] },
  { id: 'h9', callSid: 'CA10009', callerPhone: '+911098765432', callerName: 'Neha Joshi', status: 'transferred', direction: 'inbound', duration: 98, startedAt: '2025-01-14T13:00:00', intent: 'Insurance Query', sentiment: 'neutral', tags: ['insurance', 'billing'] },
  { id: 'h10', callSid: 'CA10010', callerPhone: '+910987654321', callerName: 'Vikram Malhotra', status: 'completed', direction: 'inbound', duration: 156, startedAt: '2025-01-14T11:20:00', intent: 'Appointment Booking', sentiment: 'positive', tags: ['booking', 'new-patient'] },
  { id: 'h11', callSid: 'CA10011', callerPhone: '+919988776655', callerName: 'Sunita Devi', status: 'completed', direction: 'inbound', duration: 73, startedAt: '2025-01-14T10:05:00', intent: 'Lab Reports', sentiment: 'neutral', tags: ['lab', 'reports'] },
  { id: 'h12', callSid: 'CA10012', callerPhone: '+918877665544', callerName: 'Ramesh Nair', status: 'in-progress', direction: 'inbound', duration: 42, startedAt: '2025-01-15T11:00:00', intent: 'Appointment Booking', sentiment: 'positive', tags: ['booking'] },
];

// ============================================================
// Animation Variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ============================================================
// Utility Functions
// ============================================================

function formatPhoneIndian(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

function formatDurationShort(seconds: number): string {
  if (seconds === 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: '\u{1F60A}',
  neutral: '\u{1F610}',
  negative: '\u{1F61F}',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'Completed' },
  missed: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', label: 'Missed' },
  transferred: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', label: 'Transferred' },
  'in-progress': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400', label: 'In Progress' },
  'no-answer': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', label: 'No Answer' },
  failed: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', label: 'Failed' },
  busy: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', label: 'Busy' },
};

const INTENT_STYLES: Record<string, { bg: string; text: string }> = {
  'Appointment Booking': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
  'Fee Inquiry': { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-400' },
  'Doctor Consultation': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400' },
  'Emergency': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400' },
  'Follow-up': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
  'Insurance Query': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
  'Lab Reports': { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400' },
};

function getIntentStyle(intent: string) {
  return INTENT_STYLES[intent] || { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-400' };
}

// ============================================================
// Animated Number Counter
// ============================================================

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

// ============================================================
// Sparkline Mini Chart
// ============================================================

function Sparkline({ data, color = '#10b981', height = 32, width = 80 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================
// Custom Tooltip for Chart
// ============================================================

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-emerald-600 dark:text-emerald-400 font-medium">{payload[0].value} calls</p>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function CallCenterDashboard() {
  // State
  const [calls, setCalls] = useState<CallRecord[]>(MOCK_HISTORY);
  const [activeCalls, setActiveCalls] = useState<ActiveCallMock[]>(MOCK_ACTIVE_CALLS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [elapsed, setElapsed] = useState(0);

  // Fetch call history from API
  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/vobiz?action=call-history&clinicId=all&limit=50');
      const data = await res.json();
      if (data?.calls && Array.isArray(data.calls) && data.calls.length > 0) {
        const mapped: CallRecord[] = data.calls.map((call: Record<string, unknown>, idx: number) => ({
          id: String(call.callSid || `h-${idx}`),
          callSid: String(call.callSid || ''),
          callerPhone: String(call.from || call.callerPhone || ''),
          callerName: String(call.callerName || ''),
          status: String(call.status || 'completed'),
          direction: String(call.direction || 'inbound'),
          duration: Number(call.duration || 0),
          startedAt: String(call.startedAt || new Date().toISOString()),
          intent: String(call.intent || ''),
          sentiment: String(call.sentiment || 'neutral'),
          transcript: call.transcript ? String(call.transcript) : undefined,
          summary: call.summary ? String(call.summary) : undefined,
          tags: Array.isArray(call.tags) ? call.tags.map(String) : [],
        }));
        setCalls(mapped);
      }
    } catch {
      // Keep mock data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Live duration counter for active calls
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
      setActiveCalls((prev) =>
        prev.map((call) => ({
          ...call,
          duration: Math.floor((Date.now() - call.startedAt.getTime()) / 1000),
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filtered + sorted calls
  const filteredCalls = calls
    .filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.callerName.toLowerCase().includes(q) ||
          c.callerPhone.includes(q) ||
          c.intent.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(); break;
        case 'caller': cmp = a.callerName.localeCompare(b.callerName); break;
        case 'duration': cmp = a.duration - b.duration; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // Computed metrics
  const totalCalls = calls.length;
  const missedCalls = calls.filter((c) => c.status === 'missed' || c.status === 'no-answer').length;
  const completedCalls = calls.filter((c) => c.status === 'completed');
  const avgDurationSec = completedCalls.length > 0
    ? Math.round(completedCalls.reduce((s, c) => s + c.duration, 0) / completedCalls.length)
    : 135;
  const bookingCalls = calls.filter((c) => c.intent === 'Appointment Booking' && c.status === 'completed').length;
  const bookingRate = totalCalls > 0 ? Math.round((bookingCalls / totalCalls) * 100) : 67;
  const missedRate = totalCalls > 0 ? Math.round((missedCalls / totalCalls) * 100) : 8;

  // Stats for display
  const stats = [
    { label: 'Active Calls', value: activeCalls.length, icon: PhoneCall, pulse: true, suffix: '', color: 'emerald' as const },
    { label: 'Calls Today', value: totalCalls > 0 ? totalCalls : 12, icon: Phone, pulse: false, suffix: '', color: 'teal' as const },
    { label: 'Avg Duration', value: avgDurationSec, icon: Clock, pulse: false, suffix: '', color: 'amber' as const, isDuration: true },
    { label: 'Missed Rate', value: missedRate, icon: AlertTriangle, pulse: false, suffix: '%', color: 'rose' as const },
    { label: 'Booking Rate', value: bookingRate, icon: TrendingUp, pulse: false, suffix: '%', color: 'emerald' as const },
  ];

  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/15', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/15', text: 'text-teal-700 dark:text-teal-300', icon: 'text-teal-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/15', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/15', text: 'text-rose-700 dark:text-rose-300', icon: 'text-rose-500' },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-xl animate-shimmer-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ============================================================
          1. HEADER — Gradient Emerald Card
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full bg-white/5" />

          <CardContent className="relative z-10 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Live pulse indicator */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <Headphones className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-white ring-2 ring-emerald-600" />
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    Call Center Operations
                  </h1>
                  <p className="text-emerald-100 text-sm mt-1">
                    Real-time monitoring &amp; analytics for all clinic calls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Live status badge */}
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300" />
                  </span>
                  <span className="text-white text-sm font-semibold">LIVE</span>
                </div>

                {/* Active calls badge */}
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  <PhoneCall className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold">{activeCalls.length} Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================
          2. LIVE METRICS BAR — 5 Animated Stat Cards
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, idx) => {
            const c = colorMap[stat.color] || colorMap.emerald;
            const Icon = stat.icon;
            const displayValue = stat.isDuration
              ? formatDurationShort(stat.value)
              : <AnimatedCounter target={stat.value} duration={800 + idx * 100} />;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.08, duration: 0.4, ease: 'easeOut' }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <Card className={cn(
                  'relative overflow-hidden border stat-card-hover',
                  c.bg,
                  'border-transparent',
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.bg)}>
                        <Icon className={cn('w-4.5 h-4.5', c.icon)} />
                      </div>
                      {stat.pulse && (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                      )}
                      {stat.label === 'Missed Rate' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20">
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                          {stat.value}%
                        </Badge>
                      )}
                      {stat.label === 'Booking Rate' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                          {stat.value}%
                        </Badge>
                      )}
                    </div>
                    <p className={cn('text-2xl font-bold tracking-tight', c.text)}>
                      {stat.isDuration ? displayValue : displayValue}{stat.suffix && !stat.isDuration ? stat.suffix : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ============================================================
          3. ACTIVE CALLS PANEL — Real-time list
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Calls</h2>
            <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
              {activeCalls.length} live
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {activeCalls.map((call, idx) => {
              const initials = call.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2);
              const intentStyle = getIntentStyle(call.intent);

              return (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.4, ease: 'easeOut' }}
                >
                  <Card className="relative overflow-hidden card-interactive border border-emerald-200/60 dark:border-emerald-800/40">
                    {/* Animated top border pulse */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* Subtle pulse overlay */}
                    <motion.div
                      className="absolute inset-0 bg-emerald-500/5"
                      animate={{ opacity: [0.02, 0.06, 0.02] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    <CardContent className="relative z-10 p-4">
                      {/* Caller info row */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-10 h-10 ring-2 ring-emerald-200 dark:ring-emerald-800/50">
                          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{call.callerName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatPhoneIndian(call.callerPhone)}</p>
                        </div>
                        {/* Live indicator */}
                        <span className="relative flex h-3 w-3 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                      </div>

                      {/* Duration counter + Intent */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                            {formatDurationShort(call.duration)}
                          </span>
                        </div>
                        <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 border', intentStyle.bg, intentStyle.text, 'border-current/20')}>
                          {call.intent}
                        </Badge>
                      </div>

                      {/* Sentiment */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-lg">{SENTIMENT_EMOJI[call.sentiment] || '\u{1F610}'}</span>
                        <span className="text-xs capitalize text-slate-500 dark:text-slate-400">{call.sentiment}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('Listening in', { description: `Connected to ${call.callerName}'s call` })}
                          className="flex-1 h-8 gap-1.5 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          Listen In
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('Transferring call', { description: `Transferring ${call.callerName} to receptionist` })}
                          className="flex-1 h-8 gap-1.5 text-xs border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Transfer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ============================================================
          4. CALL HISTORY TABLE
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <CardTitle className="text-lg">Call History</CardTitle>
                <Badge variant="outline" className="text-xs text-slate-500 dark:text-slate-400">{filteredCalls.length} calls</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search caller, phone, intent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-full sm:w-64 text-sm bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500/30"
                  />
                </div>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-9 w-full sm:w-40 text-sm bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                    <Filter className="w-4 h-4 text-slate-400 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="in-progress">In-progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    {[
                      { field: 'date' as SortField, label: 'Date' },
                      { field: 'caller' as SortField, label: 'Caller' },
                      { field: 'duration' as SortField, label: 'Duration' },
                      { field: 'status' as SortField, label: 'Status' },
                    ].map((col) => (
                      <th
                        key={col.field}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        onClick={() => handleSort(col.field)}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          <ArrowUpDown className={cn('w-3 h-3', sortField === col.field ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600')} />
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Intent
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Mood
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredCalls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <PhoneMissed className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No calls found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCalls.map((call, idx) => {
                      const statusCfg = STATUS_STYLES[call.status] || STATUS_STYLES.completed;
                      const intentStyle = getIntentStyle(call.intent);
                      const isMissed = call.status === 'missed' || call.status === 'no-answer';
                      const isTransferred = call.status === 'transferred';

                      return (
                        <motion.tr
                          key={call.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                          className={cn(
                            'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30',
                            isMissed && 'bg-rose-50/40 dark:bg-rose-900/5',
                            isTransferred && 'bg-amber-50/40 dark:bg-amber-900/5',
                          )}
                        >
                          {/* Date */}
                          <td className="px-4 py-3">
                            <div className="text-slate-900 dark:text-white font-medium text-xs">
                              {formatDate(call.startedAt)}
                            </div>
                            <div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                              {formatTime(call.startedAt)}
                            </div>
                          </td>

                          {/* Caller */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7 flex-shrink-0">
                                <AvatarFallback className={cn(
                                  'text-[10px] font-semibold',
                                  isMissed ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                    : isTransferred ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                                )}>
                                  {call.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-slate-900 dark:text-white font-medium truncate max-w-[140px]">{call.callerName}</p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs font-mono">{formatPhoneIndian(call.callerPhone)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="px-4 py-3">
                            {call.duration > 0 ? (
                              <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-medium">
                                {formatDurationShort(call.duration)}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">--</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 border-current/20', statusCfg.bg, statusCfg.text)}>
                              {statusCfg.label}
                            </Badge>
                          </td>

                          {/* Intent */}
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 border-current/20', intentStyle.bg, intentStyle.text)}>
                              {call.intent}
                            </Badge>
                          </td>

                          {/* Sentiment */}
                          <td className="px-4 py-3">
                            <span className="text-lg" title={call.sentiment}>
                              {SENTIMENT_EMOJI[call.sentiment] || '\u{1F610}'}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================
          5. CALL VOLUME CHART — AreaChart
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-lg">Call Volume</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 dark:text-slate-400">
                Today, 9AM - 9PM
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CALL_VOLUME_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="callVolumeStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="url(#callVolumeStroke)"
                    strokeWidth={2.5}
                    fill="url(#callVolumeGradient)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: 'white',
                      stroke: '#10b981',
                      strokeWidth: 2,
                    }}
                    animationBegin={300}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================
          6. AGENT PERFORMANCE PANEL — 3 Cards
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agent Performance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Agent */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <Card className="card-interactive h-full border-amber-200/60 dark:border-amber-800/40 overflow-hidden">
              {/* Gold gradient header */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Top Agent</span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-12 h-12 ring-2 ring-amber-300 dark:ring-amber-700">
                    <AvatarFallback className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-base font-bold">
                      RK
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Rekha</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Senior Agent</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Calls Handled</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">45</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Satisfaction</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">92%</span>
                  </div>
                  {/* Satisfaction bar */}
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: '92%' }}
                      transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Avg Response Time */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <Card className="card-interactive h-full border-emerald-200/60 dark:border-emerald-800/40 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Avg Response Time</span>
                </div>

                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">1.2</span>
                  <span className="text-lg text-slate-400 dark:text-slate-500 mb-1">sec</span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  AI picks up calls within 1.2 seconds on average
                </p>

                {/* Sparkline */}
                <div className="flex items-center gap-3">
                  <Sparkline
                    data={[2.1, 1.8, 1.5, 1.4, 1.6, 1.3, 1.2, 1.1, 1.3, 1.2, 1.0, 1.2]}
                    color="#10b981"
                    height={32}
                    width={100}
                  />
                  <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -0.4s this week
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Escalation Rate */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <Card className="card-interactive h-full border-teal-200/60 dark:border-teal-800/40 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Escalation Rate</span>
                </div>

                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">3</span>
                  <span className="text-lg text-slate-400 dark:text-slate-500 mb-1">%</span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Only 3% of calls require human intervention
                </p>

                <div className="flex items-center gap-3">
                  <Sparkline
                    data={[5, 4, 6, 4, 3, 5, 4, 3, 2, 3, 4, 3]}
                    color="#14b8a6"
                    height={32}
                    width={100}
                  />
                  <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -1% this week
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
