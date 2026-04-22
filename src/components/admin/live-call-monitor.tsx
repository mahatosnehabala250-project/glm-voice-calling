'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Phone, PhoneOff, ArrowRightLeft, Signal, Clock, PhoneMissed,
  PhoneCall, TrendingUp, Activity, CalendarCheck, BarChart3,
  RefreshCw, Zap, Volume2, Mic, User, Building2, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type CallStatus = 'ringing' | 'in-progress' | 'queued' | 'completed' | 'no-answer' | 'busy' | 'failed' | 'canceled';
type ActiveCallStatus = 'ringing' | 'in-progress' | 'queued';
type Sentiment = 'positive' | 'neutral' | 'negative';

interface ActiveCall {
  id: string;
  callSid: string;
  callerPhone: string;
  callerName: string;
  clinicName: string;
  clinicCity: string;
  status: ActiveCallStatus;
  startedAt: Date;
  duration: number; // seconds elapsed (live-updating)
  sentiment: Sentiment;
  transcript: TranscriptMessage[];
  waveformActive: boolean;
}

interface TranscriptMessage {
  role: 'ai' | 'caller';
  text: string;
  timestamp: string;
}

interface RecentCall {
  id: string;
  callerPhone: string;
  callerName: string;
  clinicName: string;
  duration: number;
  status: CallStatus;
  timestamp: string;
  outcome: 'booked' | 'transferred' | 'missed' | 'completed';
}

interface CallStats {
  total: number;
  answered: number;
  missed: number;
  avgDuration: number;
  bookingRate: number;
}

// ============================================================
// Constants
// ============================================================

const MOCK_CALLER_NAMES = [
  'Priya Sharma', 'Rahul Verma', 'Anita Patel', 'Deepak Kumar',
  'Meena Iyer', 'Sunil Gupta', 'Kavitha Reddy', 'Arjun Singh',
  'Neha Joshi', 'Vikram Malhotra', 'Sunita Devi', 'Ramesh Nair',
];

const MOCK_CLINICS = [
  { name: 'Sharma Dental Clinic', city: 'Mumbai' },
  { name: 'City Medical Center', city: 'Delhi' },
  { name: 'HealthFirst Clinic', city: 'Bangalore' },
  { name: 'Ayurveda Wellness', city: 'Chennai' },
  { name: 'Smile Care Dental', city: 'Hyderabad' },
];

const MOCK_TRANSCRIPTS: TranscriptMessage[][] = [
  [
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main VoiceAI bol rahi hoon.', timestamp: '' },
    { role: 'caller', text: 'Hello, mujhe appointment chahiye Dr. ke saath kal ke liye.', timestamp: '' },
    { role: 'ai', text: 'Bilkul! Kal kaunsa time suit karega aapko? Subah 10 baje ya dopahar 2 baje slots available hain.', timestamp: '' },
  ],
  [
    { role: 'ai', text: 'Good morning! City Medical Center mein aapka swagat hai.', timestamp: '' },
    { role: 'caller', text: 'Hi, I need to check my appointment for Thursday.', timestamp: '' },
    { role: 'ai', text: 'Ji bilkul! Aapka appointment 15 January ko 11:30 AM hai Dr. Mehta ke saath.', timestamp: '' },
  ],
  [
    { role: 'ai', text: 'Namaste! HealthFirst Clinic mein aapka swagat hai. Kaise madad kar sakti hoon?', timestamp: '' },
    { role: 'caller', text: 'Mujhe cleaning ke liye booking karni hai weekend pe.', timestamp: '' },
  ],
  [
    { role: 'ai', text: 'Ayurveda Wellness mein aapka swagat hai. Kya aap Panchakarma ke baare mein jaanna chahte hain?', timestamp: '' },
    { role: 'caller', text: 'Haan, mujhe thoda information chahiye aur fees bhi.', timestamp: '' },
    { role: 'ai', text: 'Ji bilkul! Panchakarma session ka ₹2,500 hai aur pura course ₹12,000 mein start hota hai.', timestamp: '' },
  ],
  [
    { role: 'ai', text: 'Smile Care Dental mein aapka swagat hai. Main aapki kya madad kar sakti hoon?', timestamp: '' },
    { role: 'caller', text: 'Root canal treatment ke liye appointment chahiye.', timestamp: '' },
    { role: 'ai', text: 'Ji, root canal consultation Dr. Rao ke saath available hai. Aaj shaam 5 baje ya kal subah 9 baje?', timestamp: '' },
  ],
];

const STATUS_CONFIG: Record<ActiveCallStatus, { color: string; bg: string; border: string; label: string }> = {
  ringing: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', label: 'Ringing' },
  'in-progress': { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', label: 'In Progress' },
  queued: { color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/30', border: 'border-slate-200 dark:border-slate-700/50', label: 'Queued' },
};

const OUTCOME_CONFIG: Record<string, { border: string; dot: string; label: string }> = {
  booked: { border: 'border-l-emerald-500', dot: 'bg-emerald-500', label: 'Booked' },
  transferred: { border: 'border-l-amber-500', dot: 'bg-amber-500', label: 'Transferred' },
  missed: { border: 'border-l-rose-500', dot: 'bg-rose-500', label: 'Missed' },
  completed: { border: 'border-l-slate-400', dot: 'bg-slate-400', label: 'Completed' },
};

const SENTIMENT_EMOJI: Record<Sentiment, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
};

// ============================================================
// Utility Functions
// ============================================================

function formatPhone(phone: string): string {
  if (phone.startsWith('+91')) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  return phone;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function generateCallSid(): string {
  return `CA${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

// ============================================================
// Waveform Component
// ============================================================

function LiveWaveform({ active, color = 'emerald' }: { active: boolean; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    teal: 'bg-teal-500',
  };
  const barColor = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex items-end gap-[3px] h-6">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className={cn(
            'w-[3px] rounded-full transition-all duration-300',
            active ? `${barColor} waveform-bar` : 'bg-slate-200 dark:bg-slate-700'
          )}
          style={{
            height: active ? undefined : '4px',
            opacity: active ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Sentiment Badge
// ============================================================

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const config: Record<Sentiment, { bg: string; text: string }> = {
    positive: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
    neutral: { bg: 'bg-slate-50 dark:bg-slate-800/30', text: 'text-slate-700 dark:text-slate-400' },
    negative: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400' },
  };
  const c = config[sentiment];

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', c.bg, c.text)}>
      <span className="text-sm">{SENTIMENT_EMOJI[sentiment]}</span>
      <span className="capitalize">{sentiment}</span>
    </span>
  );
}

// ============================================================
// Transcript Preview
// ============================================================

function TranscriptPreview({ messages }: { messages: TranscriptMessage[] }) {
  const visible = messages.slice(-3);

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-1.5 mb-1">
        <Mic className="w-3 h-3 text-slate-400" />
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Transcript</span>
      </div>
      <div className="space-y-1.5 max-h-24 overflow-y-auto">
        {visible.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              msg.role === 'ai' ? 'justify-start' : 'justify-end'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] px-2.5 py-1.5 rounded-xl text-xs leading-relaxed',
                msg.role === 'ai'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-bl-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-br-sm'
              )}
            >
              <span className="text-[10px] font-semibold opacity-60 block mb-0.5">
                {msg.role === 'ai' ? 'VoiceAI' : 'Caller'}
              </span>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Animated Number Component
// ============================================================

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      const diff = value - prevRef.current;
      const step = diff > 0 ? 1 : -1;
      const steps = Math.abs(diff);
      let current = prevRef.current;
      const interval = setInterval(() => {
        current += step;
        setDisplay(current);
        if (current === value) {
          clearInterval(interval);
        }
      }, Math.max(30, 200 / steps));
      prevRef.current = value;
      return () => clearInterval(interval);
    }
  }, [value]);

  return <span>{display}{suffix}</span>;
}

// ============================================================
// Main Component
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function LiveCallMonitor() {
  // State
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [stats, setStats] = useState<CallStats>({ total: 0, answered: 0, missed: 0, avgDuration: 0, bookingRate: 0 });
  const [sipConnected, setSipConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch call history and health
  const fetchData = useCallback(async () => {
    try {
      const [historyRes, healthRes] = await Promise.all([
        fetch('/api/vobiz?action=call-history&clinicId=all&limit=20'),
        fetch('/api/vobiz?action=health'),
      ]);

      const historyData = await historyRes.json();
      const healthData = await healthRes.json();

      // Check SIP connection
      setSipConnected(healthData?.vobizConnected ?? healthData?.status === 'operational' ?? false);

      // Process recent calls
      if (historyData?.calls && Array.isArray(historyData.calls)) {
        const outcomes: Array<'booked' | 'transferred' | 'missed' | 'completed'> = ['booked', 'transferred', 'missed', 'completed'];
        const mapped: RecentCall[] = historyData.calls.slice(0, 10).map((call: Record<string, unknown>, idx: number) => ({
          id: String(call.callSid || `rc-${idx}`),
          callerPhone: String(call.to || call.from || ''),
          callerName: MOCK_CALLER_NAMES[Math.floor(Math.random() * MOCK_CALLER_NAMES.length)],
          clinicName: MOCK_CLINICS[Math.floor(Math.random() * MOCK_CLINICS.length)].name,
          duration: Number(call.duration || 0),
          status: (call.status as CallStatus) || 'completed',
          timestamp: String(call.startedAt || new Date().toISOString()),
          outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
        }));
        setRecentCalls(mapped);

        // Compute stats
        const allCalls = historyData.calls;
        const total = allCalls.length;
        const answered = allCalls.filter((c: Record<string, unknown>) => c.status === 'completed' || c.status === 'in-progress').length;
        const missed = allCalls.filter((c: Record<string, unknown>) => c.status === 'no-answer' || c.status === 'busy' || c.status === 'failed').length;
        const completedCalls = allCalls.filter((c: Record<string, unknown>) => c.status === 'completed');
        const avgDuration = completedCalls.length > 0
          ? Math.round(completedCalls.reduce((s: number, c: Record<string, unknown>) => s + Number(c.duration || 0), 0) / completedCalls.length)
          : 0;
        const bookingRate = total > 0 ? Math.round((answered / total) * 100) : 0;

        setStats({ total, answered, missed, avgDuration, bookingRate });
      }
    } catch (err) {
      console.error('Failed to fetch call data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate initial mock active calls
  const generateActiveCalls = useCallback(() => {
    const statuses: ActiveCallStatus[] = ['ringing', 'in-progress', 'in-progress', 'queued'];
    const sentiments: Sentiment[] = ['positive', 'neutral', 'negative', 'positive'];
    const count = 3 + Math.floor(Math.random() * 2); // 3-4 active calls

    const calls: ActiveCall[] = Array.from({ length: count }, (_, i) => {
      const clinic = MOCK_CLINICS[i % MOCK_CLINICS.length];
      const status = statuses[i % statuses.length];
      const baseDuration = status === 'in-progress' ? Math.floor(Math.random() * 180) + 30 : 0;

      return {
        id: `ac-${i}`,
        callSid: generateCallSid(),
        callerPhone: `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`,
        callerName: MOCK_CALLER_NAMES[Math.floor(Math.random() * MOCK_CALLER_NAMES.length)],
        clinicName: clinic.name,
        clinicCity: clinic.city,
        status,
        startedAt: new Date(Date.now() - (baseDuration + Math.floor(Math.random() * 60)) * 1000),
        duration: baseDuration,
        sentiment: sentiments[i % sentiments.length],
        transcript: MOCK_TRANSCRIPTS[i % MOCK_TRANSCRIPTS.length],
        waveformActive: status === 'in-progress',
      };
    });

    setActiveCalls(calls);
  }, []);

  // Simulate active call state transitions
  const simulateCallChanges = useCallback(() => {
    setActiveCalls((prev) => {
      // Randomly update 1-2 calls
      const updated = prev.map((call) => {
        const roll = Math.random();

        if (roll < 0.08 && call.status === 'queued') {
          return { ...call, status: 'ringing' as ActiveCallStatus, waveformActive: false };
        }
        if (roll < 0.12 && call.status === 'ringing') {
          return { ...call, status: 'in-progress' as ActiveCallStatus, waveformActive: true };
        }
        // Sometimes change sentiment
        if (roll < 0.05) {
          const newSentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
          return { ...call, sentiment: newSentiments[Math.floor(Math.random() * 3)] };
        }
        return call;
      });

      // Occasionally add a new call
      if (Math.random() < 0.06 && updated.length < 5) {
        const clinic = MOCK_CLINICS[Math.floor(Math.random() * MOCK_CLINICS.length)];
        const newCall: ActiveCall = {
          id: `ac-${Date.now()}`,
          callSid: generateCallSid(),
          callerPhone: `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`,
          callerName: MOCK_CALLER_NAMES[Math.floor(Math.random() * MOCK_CALLER_NAMES.length)],
          clinicName: clinic.name,
          clinicCity: clinic.city,
          status: 'queued',
          startedAt: new Date(),
          duration: 0,
          sentiment: 'neutral',
          transcript: MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)],
          waveformActive: false,
        };
        return [newCall, ...updated];
      }

      // Occasionally remove a completed-simulated call
      if (Math.random() < 0.04 && updated.length > 2) {
        const removeIdx = Math.floor(Math.random() * updated.length);
        const removed = updated[removeIdx];
        if (removed.status === 'in-progress' && removed.duration > 120) {
          return updated.filter((_, i) => i !== removeIdx);
        }
      }

      return updated;
    });
  }, []);

  // Initialize
  useEffect(() => {
    fetchData();
    generateActiveCalls();
  }, [fetchData, generateActiveCalls]);

  // Live duration counter — update every second
  useEffect(() => {
    durationIntervalRef.current = setInterval(() => {
      setNow(Date.now());
      setActiveCalls((prev) =>
        prev.map((call) => ({
          ...call,
          duration: call.status === 'in-progress'
            ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
            : call.duration,
        }))
      );
    }, 1000);
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  // Simulation interval — state changes every 4s
  useEffect(() => {
    simulationIntervalRef.current = setInterval(simulateCallChanges, 4000);
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [simulateCallChanges]);

  // Refresh data every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handlers
  const handleEndCall = useCallback((callSid: string) => {
    setActiveCalls((prev) => prev.filter((c) => c.callSid !== callSid));
    toast.success('Call ended', { description: `Call ${callSid.slice(-6)} has been terminated.` });

    fetch('/api/vobiz?action=end-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end-call', callSid }),
    }).catch(() => {});
  }, []);

  const handleTransfer = useCallback((callSid: string) => {
    toast.info('Call transfer initiated', {
      description: `Call ${callSid.slice(-6)} is being transferred to receptionist.`,
    });
  }, []);

  const handleTestCall = useCallback(async () => {
    const clinic = MOCK_CLINICS[Math.floor(Math.random() * MOCK_CLINICS.length)];
    toast.loading('Initiating test call...', { id: 'test-call' });

    try {
      const res = await fetch('/api/vobiz?action=make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'make-call',
          to: `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`,
          clinicId: clinic.name,
        }),
      });
      const data = await res.json();

      if (data.success || data.callSid) {
        const newCall: ActiveCall = {
          id: `ac-test-${Date.now()}`,
          callSid: data.callSid,
          callerPhone: `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`,
          callerName: 'Test Caller',
          clinicName: clinic.name,
          clinicCity: clinic.city,
          status: 'queued',
          startedAt: new Date(),
          duration: 0,
          sentiment: 'neutral',
          transcript: [{ role: 'ai', text: 'Initiating test call to verify SIP connectivity...', timestamp: '' }],
          waveformActive: false,
        };
        setActiveCalls((prev) => [newCall, ...prev]);
        toast.success('Test call initiated', { id: 'test-call', description: `Call SID: ${data.callSid.slice(-8)}` });
      } else {
        toast.error('Failed to initiate call', { id: 'test-call', description: data.error || 'Unknown error' });
      }
    } catch {
      toast.error('Service unavailable', { id: 'test-call', description: 'Vobiz SIP service is not responding.' });
    }
  }, []);

  // Derived values
  const activeCount = activeCalls.length;
  const inProgressCount = activeCalls.filter((c) => c.status === 'in-progress').length;

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl animate-shimmer bg-slate-200/50 dark:bg-slate-800/50" />
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
          Header Section
          ============================================================ */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Pulsing live indicator */}
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Call Monitor</h1>
              {/* Connection status badge */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium gap-1.5 px-2.5 py-1',
                  sipConnected
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', sipConnected ? 'bg-emerald-500' : 'bg-rose-500')} />
                {sipConnected ? 'Connected to Vobiz SIP' : 'SIP Disconnected'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time call monitoring across all clinics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active calls counter */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5">
            <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active Calls</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 leading-tight">
                <AnimatedNumber value={activeCount} />
              </p>
            </div>
            {inProgressCount > 0 && (
              <span className="ml-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                {inProgressCount} live
              </span>
            )}
          </div>

          {/* Make Test Call */}
          <Button
            onClick={handleTestCall}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 gap-2"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Make Test Call</span>
            <span className="sm:hidden">Test</span>
          </Button>
        </div>
      </motion.div>

      {/* ============================================================
          Call Statistics Bar
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Phone, label: 'Total Calls', value: stats.total, color: 'emerald' },
            { icon: PhoneCall, label: 'Answered', value: stats.answered, color: 'teal' },
            { icon: PhoneMissed, label: 'Missed', value: stats.missed, color: 'rose' },
            { icon: Clock, label: 'Avg Duration', value: stats.avgDuration, color: 'amber', isDuration: true },
            { icon: TrendingUp, label: 'Booking Rate', value: stats.bookingRate, color: 'emerald', isPercent: true },
          ].map((stat) => {
            const colorClasses: Record<string, { icon: string; text: string; bg: string }> = {
              emerald: { icon: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              teal: { icon: 'text-teal-600 dark:text-teal-400', text: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-900/20' },
              rose: { icon: 'text-rose-600 dark:text-rose-400', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              amber: { icon: 'text-amber-600 dark:text-amber-400', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            };
            const c = colorClasses[stat.color];
            const Icon = stat.icon;
            const displayValue = stat.isDuration
              ? formatDuration(stat.value)
              : `${stat.value}${stat.isPercent ? '%' : ''}`;

            return (
              <div
                key={stat.label}
                className={cn('rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/40 transition-all duration-200 hover:shadow-md', c.bg)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('w-4 h-4', c.icon)} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                </div>
                <p className={cn('text-xl font-bold leading-tight', c.text)}>
                  {stat.isDuration ? displayValue : <AnimatedNumber value={stat.value} suffix={stat.isPercent ? '%' : ''} />}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ============================================================
          Active Calls Grid
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Calls</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-3 h-3" />
            <span>Auto-refreshing</span>
          </div>
        </div>

        {activeCalls.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No active calls right now</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Incoming calls will appear here in real-time
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {activeCalls.map((call) => {
                const statusCfg = STATUS_CONFIG[call.status];
                const initials = call.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2);

                return (
                  <motion.div
                    key={call.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Card className={cn(
                      'relative overflow-hidden transition-all duration-200 hover:shadow-lg',
                      call.status === 'in-progress' && 'ring-1 ring-emerald-200 dark:ring-emerald-800/50',
                    )}>
                      {/* Colored top border based on status */}
                      <div className={cn(
                        'absolute top-0 left-0 right-0 h-1',
                        call.status === 'in-progress' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                        call.status === 'ringing' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                        'bg-gradient-to-r from-slate-400 to-slate-500'
                      )} />

                      <CardContent className="p-4 pt-5">
                        {/* Header: Caller info + Status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
                              <AvatarFallback className={cn(
                                'text-sm font-semibold',
                                call.status === 'in-progress' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                call.status === 'ringing' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                              )}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{call.callerName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatPhone(call.callerPhone)}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5', statusCfg.bg, statusCfg.color, statusCfg.border)}>
                              {call.status === 'in-progress' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                              )}
                              {call.status === 'ringing' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
                              )}
                              {statusCfg.label}
                            </Badge>
                            <SentimentBadge sentiment={call.sentiment} />
                          </div>
                        </div>

                        {/* Clinic + Duration row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[180px]">{call.clinicName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {call.status === 'in-progress' && <LiveWaveform active={true} />}
                            <div className="flex items-center gap-1 text-xs font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className={cn(
                                'font-semibold tabular-nums',
                                call.status === 'in-progress' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                              )}>
                                {call.status === 'in-progress' ? formatDuration(call.duration) : '--:--'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Transcript Preview */}
                        {call.transcript.length > 0 && (
                          <TranscriptPreview messages={call.transcript} />
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            SID: {call.callSid.slice(-8)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTransfer(call.callSid)}
                              className="h-7 gap-1 text-xs border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-800 dark:hover:text-amber-300"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span className="hidden sm:inline">Transfer</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEndCall(call.callSid)}
                              className="h-7 gap-1 text-xs border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-800 dark:hover:text-rose-300"
                            >
                              <PhoneOff className="w-3 h-3" />
                              <span className="hidden sm:inline">End Call</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ============================================================
          Recent Calls Timeline
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Calls</h2>
            <Badge variant="outline" className="text-xs text-slate-500 dark:text-slate-400">{recentCalls.length} calls</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>

        {recentCalls.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent calls</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence>
              {recentCalls.map((call, idx) => {
                const outcome = OUTCOME_CONFIG[call.outcome] || OUTCOME_CONFIG.completed;
                const initials = call.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2);

                return (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                  >
                    <Card className={cn(
                      'border-l-4 transition-all duration-200 hover:shadow-md',
                      outcome.border
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarFallback className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{call.callerName}</p>
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{formatPhone(call.callerPhone)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{call.clinicName}</span>
                              <span className="text-slate-200 dark:text-slate-700">·</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                {call.duration > 0 ? formatDuration(call.duration) : '--'}
                              </span>
                            </div>
                          </div>

                          {/* Right side: Outcome + Timestamp */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-medium px-2 py-0',
                                call.outcome === 'booked' && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                                call.outcome === 'transferred' && 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
                                call.outcome === 'missed' && 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
                                call.outcome === 'completed' && 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400',
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full mr-1', outcome.dot)} />
                              {outcome.label}
                            </Badge>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {formatTimestamp(call.timestamp)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ============================================================
          Footer Info
          ============================================================ */}
      <motion.div variants={itemVariants} className="text-center py-4">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span>Powered by Vobiz SIP</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3 h-3" />
            <span>Gemini AI Transcription</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3" />
            <span>Real-time Monitoring</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
