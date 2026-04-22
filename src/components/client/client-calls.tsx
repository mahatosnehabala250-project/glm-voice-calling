'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  Phone, Search,
  Clock, User, Bot, SmilePlus, Frown, Meh, Angry, Download,
  Timer, CheckCircle, PhoneForwarded, PhoneIncoming, PhoneMissed,
  PhoneCall, TrendingUp, Activity, Target, Play, Pause,
  Volume2, VolumeX, Gauge
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PatientDetailDrawer from './patient-detail-drawer';
import { TableBodySkeleton } from '@/components/shared/skeleton-loader';

interface Call {
  id: string;
  callerPhone: string;
  callerName: string | null;
  status: string;
  duration: number;
  startedAt: string;
  endedAt: string | null;
  intent: string | null;
  sentiment: string | null;
  tags: string | null;
  summary: string | null;
  transcript: string | null;
  direction: string;
}

interface TranscriptMessage {
  role: 'ai' | 'caller';
  text: string;
  timestamp?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// Simulated waveform bar heights (30 bars)
const WAVEFORM_HEIGHTS = [
  12, 24, 18, 32, 28, 40, 22, 36, 14, 30,
  26, 38, 20, 34, 16, 42, 24, 30, 18, 36,
  22, 28, 14, 38, 32, 26, 20, 34, 28, 16,
];

// Mock calls that have audio recordings
const CALLS_WITH_AUDIO = new Set(['call-rec-1', 'call-rec-2', 'call-rec-3', 'call-rec-4']);

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CALL_STATUS_CONFIG: Record<string, {
  color: string;
  icon: React.ElementType;
  iconBg: string;
  label: string;
  pulsing?: boolean;
}> = {
  answered: {
    color: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: PhoneCall,
    label: 'Connected',
  },
  completed: {
    color: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: PhoneCall,
    label: 'Connected',
  },
  missed: {
    color: 'text-rose-600 dark:text-rose-300',
    iconBg: 'bg-rose-100 dark:bg-rose-900/40',
    icon: PhoneMissed,
    label: 'Missed',
  },
  transferred: {
    color: 'text-amber-600 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    icon: PhoneForwarded,
    label: 'Transferred',
  },
  ringing: {
    color: 'text-violet-600 dark:text-violet-300',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    icon: PhoneIncoming,
    label: 'Ringing',
    pulsing: true,
  },
  failed: {
    color: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    icon: PhoneMissed,
    label: 'Failed',
  },
};

const TAG_COLORS: Record<string, string> = {
  booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  faq: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  transferred: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  complaint: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  emergency: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const SENTIMENT_CONFIG: Record<string, {
  icon: React.ElementType;
  bg: string;
  text: string;
  label: string;
}> = {
  positive: {
    icon: SmilePlus,
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Positive',
  },
  neutral: {
    icon: Meh,
    bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    text: 'text-slate-500 dark:text-slate-400',
    label: 'Neutral',
  },
  negative: {
    icon: Frown,
    bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700/50',
    text: 'text-rose-600 dark:text-rose-400',
    label: 'Negative',
  },
  angry: {
    icon: Angry,
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
    text: 'text-red-600 dark:text-red-400',
    label: 'Negative',
  },
};

const MAX_DURATION_BAR = 180; // 3 minutes

function CallStatusIndicator({ status }: { status: string }) {
  const config = CALL_STATUS_CONFIG[status] || CALL_STATUS_CONFIG.answered;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        config.iconBg,
        config.pulsing && 'animate-pulse'
      )}>
        <Icon className={cn('w-4 h-4', config.color)} />
        {config.pulsing && (
          <div className="absolute inset-0 rounded-full border-2 border-violet-300 dark:border-violet-600 animate-ping opacity-40" />
        )}
      </div>
      <span className={cn('text-xs font-semibold capitalize', config.color)}>
        {config.label}
      </span>
    </div>
  );
}

function DurationBar({ duration }: { duration: number }) {
  if (duration === 0) {
    return <span className="text-slate-400 font-mono text-xs">-</span>;
  }

  const percentage = Math.min((duration / MAX_DURATION_BAR) * 100, 100);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500"
        />
      </div>
      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium w-10 text-right">
        {durationText}
      </span>
    </div>
  );
}

function SentimentPill({ sentiment }: { sentiment: string }) {
  const config = SENTIMENT_CONFIG[sentiment];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
      config.bg,
      config.text
    )}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function CallAnalyticsCard({ calls }: { calls: Call[] }) {
  const analytics = useMemo(() => {
    if (calls.length === 0) {
      return {
        totalCalls: 0,
        answeredRate: 0,
        avgDuration: '0:00',
        bookingRate: 0,
      };
    }

    const answeredCalls = calls.filter(
      (c) => c.status === 'answered' || c.status === 'completed'
    );
    const answeredCount = answeredCalls.length;
    const totalDuration = answeredCalls.reduce((sum, c) => sum + c.duration, 0);
    const avgDurationSec = answeredCount > 0 ? Math.round(totalDuration / answeredCount) : 0;

    // Parse tags to check for bookings
    const bookedCalls = calls.filter((c) => {
      if (!c.tags) return false;
      try {
        const parsed = JSON.parse(c.tags);
        return Array.isArray(parsed) && parsed.some((t: string) => t === 'booked');
      } catch {
        return c.tags.includes('booked');
      }
    });

    const avgMin = Math.floor(avgDurationSec / 60);
    const avgSec = avgDurationSec % 60;

    return {
      totalCalls: calls.length,
      answeredRate: Math.round((answeredCount / calls.length) * 100),
      avgDuration: `${avgMin}:${avgSec.toString().padStart(2, '0')}`,
      bookingRate: Math.round((bookedCalls.length / calls.length) * 100),
    };
  }, [calls]);

  const stats = [
    {
      icon: Phone,
      label: 'Total Calls',
      value: analytics.totalCalls.toString(),
      bgClass: 'card-gradient-emerald hover-lift',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      icon: TrendingUp,
      label: 'Answered Rate',
      value: `${analytics.answeredRate}%`,
      bgClass: 'card-gradient-emerald hover-lift',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      valueColor: 'text-teal-700 dark:text-teal-300',
    },
    {
      icon: Activity,
      label: 'Avg Duration',
      value: analytics.avgDuration,
      bgClass: 'card-gradient-emerald hover-lift',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      icon: Target,
      label: 'Booking Rate',
      value: `${analytics.bookingRate}%`,
      bgClass: 'card-gradient-emerald hover-lift',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-700 dark:text-violet-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <div className={cn('rounded-xl p-4', stat.bgClass)}>
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', stat.iconBg)}>
                  <Icon className={cn('w-5 h-5', stat.iconColor)} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                    {stat.label}
                  </p>
                  <p className={cn('text-xl font-bold', stat.valueColor)}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ClientCalls() {
  const { user } = useAuthStore();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ name: string; phone: string } | null>(null);
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration] = useState(135); // 2:15 in seconds
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Audio playback simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAudioProgress(prev => {
        if (prev >= audioDuration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + (playbackSpeed / 4); // advance by 0.25s * speed per tick
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, audioDuration]);

  const fetchCalls = useCallback(async () => {
    if (!user?.clinicId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/client/calls?${params.toString()}`, {
        headers: { 'x-clinic-id': user.clinicId },
      });
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
        setTotal(data.total || 0);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [user?.clinicId, statusFilter]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const viewTranscript = async (call: Call) => {
    setSelectedCall(call);
    setTranscriptLoading(true);
    setExpandedId(call.id);
    try {
      const res = await fetch(`/api/client/calls?id=${call.id}`, {
        headers: { 'x-clinic-id': user?.clinicId || '' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.call?.transcript) {
          try {
            const parsed = JSON.parse(data.call.transcript);
            setTranscript(Array.isArray(parsed) ? parsed : []);
          } catch {
            setTranscript([]);
          }
        } else {
          setTranscript([]);
        }
      }
    } catch { setTranscript([]); }
    finally { setTranscriptLoading(false); }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 10) return `+91-${phone.slice(0, 5)}-${phone.slice(5)}`;
    return phone;
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy, h:mm a');
    } catch {
      return dateStr;
    }
  };

  const parseTags = (tags: string | null): string[] => {
    if (!tags) return [];
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return tags.split(',').map(t => t.trim());
    }
  };

  const exportCSV = () => {
    const today = format(new Date(), 'ddMMyyyy');
    const headers = ['Date', 'Caller', 'Phone', 'Duration', 'Status', 'Intent', 'Sentiment'];
    const rows = calls.map((call) => {
      const d = format(new Date(call.startedAt), 'dd/MM/yyyy');
      return [d, call.callerName || 'Unknown', call.callerPhone, call.duration > 0 ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '0:00', call.status, call.intent || '', call.sentiment || ''];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voiceai-calls-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const openPatientDrawer = (name: string, phone: string) => {
    setSelectedPatient({ name, phone });
    setPatientDrawerOpen(true);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Call Analytics Summary Card */}
      {!loading && calls.length > 0 && (
        <motion.div variants={itemAnim}>
          <CallAnalyticsCard calls={calls} />
        </motion.div>
      )}

      {/* Sentiment Distribution Summary */}
      {!loading && calls.length > 0 && (
        <motion.div
          variants={itemAnim}
          className="grid grid-cols-3 gap-3"
        >
          {(() => {
            const positiveCount = calls.filter(c => c.sentiment === 'positive').length;
            const neutralCount = calls.filter(c => c.sentiment === 'neutral').length;
            const negativeCount = calls.filter(c => c.sentiment === 'negative' || c.sentiment === 'angry').length;
            const total = positiveCount + neutralCount + negativeCount;

            if (total === 0) {
              return (
                <div className="col-span-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  No sentiment data available
                </div>
              );
            }

            const sentiments = [
              { label: 'Positive Calls', count: positiveCount, icon: SmilePlus, bgColor: 'bg-emerald-50 dark:bg-emerald-900/15', borderColor: 'border-emerald-200/60 dark:border-emerald-800/40', textColor: 'text-emerald-700 dark:text-emerald-400', barColor: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Neutral Calls', count: neutralCount, icon: Meh, bgColor: 'bg-amber-50 dark:bg-amber-900/15', borderColor: 'border-amber-200/60 dark:border-amber-800/40', textColor: 'text-amber-700 dark:text-amber-400', barColor: 'bg-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Negative Calls', count: negativeCount, icon: Frown, bgColor: 'bg-rose-50 dark:bg-rose-900/15', borderColor: 'border-rose-200/60 dark:border-rose-800/40', textColor: 'text-rose-700 dark:text-rose-400', barColor: 'bg-rose-500', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
            ];

            return sentiments.map((s, i) => {
              const SIcon = s.icon;
              const proportion = total > 0 ? (s.count / total) * 100 : 0;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.08 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className={cn('rounded-xl p-4 border', s.bgColor, s.borderColor)}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.iconBg)}>
                      <SIcon className={cn('w-4 h-4', s.iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium truncate">{s.label}</p>
                      <p className={cn('text-lg font-bold leading-tight', s.textColor)}>{s.count}</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/60 dark:bg-slate-800/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${proportion}%` }}
                      transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', s.barColor)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{proportion.toFixed(0)}% of calls</p>
                </motion.div>
              );
            });
          })()}
        </motion.div>
      )}

      {/* Filter Bar */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search callers..." className="pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" disabled />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={calls.length === 0}
          className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </motion.div>

      {/* Calls Table */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Caller</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Duration</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Intent</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Tags</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Sentiment</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading ? (
                    <TableBodySkeleton rows={5} cols={8} />
                  ) : calls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                          className="flex flex-col items-center"
                        >
                          <div className="relative mb-5">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
                              <Phone className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700">
                              <Bot className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center animate-float-pulse">
                              <Activity className="w-3 h-3 text-emerald-500" />
                            </div>
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 font-semibold text-lg mt-2">
                            No Call Records
                          </p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs text-center leading-relaxed">
                            Call logs will appear here when VoiceAI handles calls for your clinic
                          </p>
                          <div className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/30">
                            <div className="flex gap-1">
                              <span className="w-1 h-3 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-4 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                              <span className="w-1 h-6 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '100ms' }} />
                              <span className="w-1 h-3 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '250ms' }} />
                            </div>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">AI ready &amp; waiting for calls</span>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => {
                      const tags = parseTags(call.tags);
                      const sentimentConfig = SENTIMENT_CONFIG[call.sentiment || ''];

                      return (
                        <motion.tr
                          key={call.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p
                                className="font-medium text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                onClick={() => openPatientDrawer(call.callerName || 'Unknown Caller', call.callerPhone)}
                              >
                                {call.callerName || 'Unknown Caller'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatPhone(call.callerPhone)}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                            {formatTime(call.startedAt)}
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <DurationBar duration={call.duration} />
                          </td>
                          <td className="py-3 px-4">
                            <CallStatusIndicator status={call.status} />
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 capitalize hidden md:table-cell">
                            {call.intent || '-'}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag, i) => (
                                <span key={i} className={cn('px-2 py-0.5 rounded text-[10px] font-medium capitalize', TAG_COLORS[tag] || 'bg-slate-100 text-slate-500')}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center hidden lg:table-cell">
                            {call.sentiment && sentimentConfig ? (
                              <SentimentPill sentiment={call.sentiment} />
                            ) : null}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              onClick={() => viewTranscript(call)}
                              disabled={transcriptLoading}
                            >
                              {expandedId === call.id ? 'Close' : 'View'}
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                Showing {calls.length} of {total} calls
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transcript Dialog */}
      <Dialog open={!!selectedCall && expandedId === selectedCall.id} onOpenChange={(open) => { if (!open) { setSelectedCall(null); setExpandedId(null); setTranscript([]); setIsPlaying(false); setAudioProgress(0); setPlaybackSpeed(1); }}}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" />
              Call Transcript
            </DialogTitle>
            <DialogDescription>
              {selectedCall?.callerName || selectedCall?.callerPhone}
            </DialogDescription>
          </DialogHeader>

          {/* Audio Recording Section */}
          {selectedCall && (() => {
            const hasAudio = CALLS_WITH_AUDIO.has(selectedCall.id);
            return (
              <div className={cn(
                'rounded-xl p-4 border',
                hasAudio
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/30'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              )}>
                {hasAudio ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <Play className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Audio Recording
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Recording available
                      </span>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="flex items-center gap-[2px] h-10 mb-3 px-1">
                      {WAVEFORM_HEIGHTS.map((height, i) => {
                        const barProgress = (i / WAVEFORM_HEIGHTS.length);
                        const isPlayed = barProgress <= (audioProgress / audioDuration);
                        return (
                          <motion.div
                            key={i}
                            className={cn(
                              'flex-1 rounded-full min-w-[3px] max-w-[6px]',
                              isPlayed
                                ? 'bg-emerald-500 dark:bg-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-700'
                            )}
                            animate={isPlaying ? {
                              height: [height * 0.5, height, height * 0.7, height * 0.9, height * 0.5],
                            } : { height: height }}
                            transition={isPlaying ? {
                              duration: 0.8 + Math.random() * 0.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.02,
                            } : { duration: 0.2 }}
                          />
                        );
                      })}
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mb-3 cursor-pointer group"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        setAudioProgress(pct * audioDuration);
                      }}
                    >
                      <motion.div
                        className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                      />
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${(audioProgress / audioDuration) * 100}% - 6px)` }}
                      />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-3">
                      {/* Play / Pause */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-colors flex-shrink-0"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </motion.button>

                      {/* Time Display */}
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 w-20 flex-shrink-0">
                        {formatAudioTime(audioProgress)} / {formatAudioTime(audioDuration)}
                      </span>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Speed Control */}
                      <div className="flex items-center gap-1">
                        {[1, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold transition-all',
                              playbackSpeed === speed
                                ? 'bg-emerald-500 text-white'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            )}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>

                      {/* Volume */}
                      <div className="hidden sm:flex items-center gap-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            setVolume(Number(e.target.value));
                            setIsMuted(false);
                          }}
                          className="w-16 h-1 accent-emerald-500"
                        />
                      </div>

                      {/* Download */}
                      <button
                        className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        onClick={() => toast.info('Recording download started')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  /* No audio available state */
                  <div className="flex items-center justify-center py-3 gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Recording not available</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Audio was not captured for this call</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Call Duration & Status summary bar */}
          {selectedCall && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 flex-1">
                <Timer className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Duration</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDuration(selectedCall.duration)}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Status</p>
                  <div className="mt-0.5">
                    <CallStatusIndicator status={selectedCall.status} />
                  </div>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 flex-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Time</p>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">{formatTime(selectedCall.startedAt)}</p>
                </div>
              </div>
            </div>
          )}

          {selectedCall?.summary && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-300">
              <p className="font-medium text-xs mb-1 uppercase tracking-wider">AI Summary</p>
              {selectedCall.summary}
            </div>
          )}

          <ScrollArea className="max-h-64">
            {transcriptLoading ? (
              <div className="space-y-3 p-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-3/4" />
                ))}
              </div>
            ) : transcript.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No transcript available for this call
              </div>
            ) : (
              <div className="space-y-4 p-2">
                {transcript.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'caller' ? 'justify-start' : 'justify-end'
                    )}
                  >
                    <div className={cn(
                      'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm',
                      msg.role === 'caller'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none'
                        : 'bg-emerald-500 text-white rounded-br-none'
                    )}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.role === 'caller' ? (
                          <User className="w-3 h-3 opacity-60" />
                        ) : (
                          <Bot className="w-3 h-3 opacity-60" />
                        )}
                        <span className="text-[10px] font-medium opacity-60">
                          {msg.role === 'caller' ? 'Caller' : 'VoiceAI'}
                        </span>
                        {msg.timestamp && (
                          <span className="text-[10px] opacity-40 ml-auto">
                            {msg.timestamp}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
                {/* Typing indicator */}
                <div className="flex gap-2 justify-end">
                  <div className="bg-emerald-500/20 dark:bg-emerald-500/10 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">VoiceAI is typing</span>
                      <span className="flex gap-0.5 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 typing-dot" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Patient Detail Drawer */}
      <PatientDetailDrawer
        open={patientDrawerOpen}
        onOpenChange={setPatientDrawerOpen}
        patientName={selectedPatient?.name || ''}
        patientPhone={selectedPatient?.phone || ''}
      />
    </motion.div>
  );
}
