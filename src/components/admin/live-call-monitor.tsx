'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Phone, PhoneOff, ArrowRightLeft, Signal, Clock, PhoneMissed,
  PhoneCall, TrendingUp, Activity, BarChart3, RefreshCw, Zap, Mic,
  User, Building2, AlertCircle, Radio, Users, MessageSquare,
  Send, Brain, Hash, MapPin, CalendarCheck, ChevronRight,
  PhoneForwarded, HeartPulse, Wifi, WifiOff, Volume2,
  ArrowUpRight, ArrowDownRight, Minus, Shield, Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type ConversationPhase = 'greeting' | 'intent' | 'booking' | 'confirmation';
type CallStatus = 'ringing' | 'in-progress' | 'queued';
type AttentionLevel = 'active' | 'attention' | 'escalation';
type Sentiment = 'positive' | 'neutral' | 'negative';

interface TranscriptMessage {
  role: 'ai' | 'caller';
  text: string;
  timestamp: string;
}

interface LiveCall {
  id: string;
  callSid: string;
  callerPhone: string;
  callerName: string;
  callerCity: string;
  callHistoryCount: number;
  clinicName: string;
  clinicCity: string;
  doctorName: string;
  specialty: string;
  status: CallStatus;
  attention: AttentionLevel;
  phase: ConversationPhase;
  startedAt: Date;
  duration: number;
  sentiment: Sentiment;
  sentimentScore: number; // 0-100
  aiConfidence: number; // 0-100
  aiPersona: string;
  transcript: TranscriptMessage[];
  isTyping: boolean;
}

interface QueuedCall {
  id: string;
  callerPhone: string;
  callerName: string;
  clinicName: string;
  queuedAt: Date;
  waitTime: number;
  position: number;
}

interface TickerStat {
  id: string;
  label: string;
  value: number;
  suffix: string;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: number;
}

interface HeatmapCell {
  day: number; // 0=Mon
  hour: number; // 0-23
  count: number;
}

// ============================================================
// Constants
// ============================================================

const PHASE_CONFIG: Record<ConversationPhase, { label: string; color: string; bg: string; step: number }> = {
  greeting: { label: 'Greeting', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30', step: 1 },
  intent: { label: 'Intent', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', step: 2 },
  booking: { label: 'Booking', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', step: 3 },
  confirmation: { label: 'Confirmation', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', step: 4 },
};

const ATTENTION_CONFIG: Record<AttentionLevel, { dot: string; ring: string; bg: string; label: string }> = {
  active: { dot: 'bg-emerald-500', ring: 'ring-emerald-400/30', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Active' },
  attention: { dot: 'bg-amber-500', ring: 'ring-amber-400/30', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Needs Attention' },
  escalation: { dot: 'bg-rose-500', ring: 'ring-rose-400/30', bg: 'bg-rose-50 dark:bg-rose-900/20', label: 'Escalation' },
};

const MOCK_CALLERS = [
  { name: 'Priya Sharma', city: 'Mumbai', history: 5 },
  { name: 'Rahul Verma', city: 'Delhi', history: 2 },
  { name: 'Anita Patel', city: 'Ahmedabad', history: 8 },
  { name: 'Deepak Kumar', city: 'Bangalore', history: 1 },
  { name: 'Meena Iyer', city: 'Chennai', history: 12 },
  { name: 'Sunil Gupta', city: 'Jaipur', history: 3 },
  { name: 'Kavitha Reddy', city: 'Hyderabad', history: 6 },
  { name: 'Arjun Singh', city: 'Pune', history: 4 },
  { name: 'Neha Joshi', city: 'Kolkata', history: 9 },
  { name: 'Vikram Malhotra', city: 'Lucknow', history: 1 },
];

const MOCK_CLINICS = [
  { name: 'Sharma Dental Clinic', city: 'Mumbai', doctor: 'Dr. Rajesh Sharma', specialty: 'Dentistry' },
  { name: 'City Medical Center', city: 'Delhi', doctor: 'Dr. Anita Mehta', specialty: 'General Medicine' },
  { name: 'HealthFirst Clinic', city: 'Bangalore', doctor: 'Dr. Prakash Rao', specialty: 'Dermatology' },
  { name: 'Ayurveda Wellness', city: 'Chennai', doctor: 'Dr. Lakshmi Iyer', specialty: 'Ayurveda' },
  { name: 'Smile Care Dental', city: 'Hyderabad', doctor: 'Dr. Suresh Reddy', specialty: 'Orthodontics' },
];

const AI_PERSONAS = ['Rekha', 'Priya', 'Sarah'];

const CONVERSATION_FLOWS: Record<string, TranscriptMessage[]> = {
  greeting: [
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha bol rahi hoon, aapki AI assistant.', timestamp: '' },
    { role: 'caller', text: 'Hello, mujhe Dr. Sharma ke saath appointment chahiye.', timestamp: '' },
  ],
  intent: [
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha bol rahi hoon.', timestamp: '' },
    { role: 'caller', text: 'Hi, mujhe cleaning ke liye booking karni hai.', timestamp: '' },
    { role: 'ai', text: 'Ji bilkul! Kya aap pehli baar visit kar rahe hain ya regular patient hain?', timestamp: '' },
    { role: 'caller', text: 'Pehli baar hai, actually pain bhi ho raha hai.', timestamp: '' },
    { role: 'ai', text: 'Samajh gaya. Kya aap bata sakte hain kaunsa area mein pain hai? Upper ya lower teeth?', timestamp: '' },
  ],
  booking: [
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha bol rahi hoon.', timestamp: '' },
    { role: 'caller', text: 'Hello, appointment chahiye root canal ke liye.', timestamp: '' },
    { role: 'ai', text: 'Ji bilkul! Root canal consultation Dr. Sharma ke saath available hai. Aaj shaam 5 baje ya kal subah 9 baje?', timestamp: '' },
    { role: 'caller', text: 'Kal subah 9 baje theek hai.', timestamp: '' },
    { role: 'ai', text: 'Perfect! Kal 9 AM confirm kar rahi hoon. Aapka naam aur phone number bataiye.', timestamp: '' },
    { role: 'caller', text: 'Priya Sharma, phone 98XXX-XX123.', timestamp: '' },
    { role: 'ai', text: 'Thank you Priya ji! Root canal consultation - 16/01/2025, 9:00 AM. ₹800 consultation fee hai. Kya aap confirm karte hain?', timestamp: '' },
  ],
  confirmation: [
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha bol rahi hoon.', timestamp: '' },
    { role: 'caller', text: 'Hi mujhe appointment chahiye.', timestamp: '' },
    { role: 'ai', text: 'Ji bilkul! Cleaning ke liye slots available hain. 10 AM ya 2 PM?', timestamp: '' },
    { role: 'caller', text: '10 AM please.', timestamp: '' },
    { role: 'ai', text: 'Confirm! Aapka appointment 16/01/2025 ko 10:00 AM hai. Dr. Sharma aapko check karenge. WhatsApp par confirmation bhej rahi hoon.', timestamp: '' },
    { role: 'caller', text: 'Thank you!', timestamp: '' },
    { role: 'ai', text: 'Aapka swagat hai! Kisi aur cheez ke liye call karein. Apna khayal rakhiye!', timestamp: '' },
  ],
};

const EXTRA_TRANSCRIPT_LINES = [
  { role: 'caller' as const, text: 'Haan, yeh theek lag raha hai.' },
  { role: 'ai' as const, text: 'Great! Ab aapka appointment book ho gaya hai. Kya kuch aur madad chahiye?' },
  { role: 'caller' as const, text: 'Nahi, bus yehi. Dhanyavaad.' },
  { role: 'ai' as const, text: 'Aapka swagat hai! Aapko WhatsApp par details mil jayengi. Have a nice day!' },
  { role: 'caller' as const, text: 'Fee kya hai consultation ki?' },
  { role: 'ai' as const, text: 'First consultation ₹500 hai, aur follow-up ₹300. Kya aap confirm karna chahenge?' },
  { role: 'caller' as const, text: 'Payment kaise karna hai?' },
  { role: 'ai' as const, text: 'Aap clinic pe cash ya UPI se payment kar sakte hain. Google Pay aur PhonePe bhi available hain.' },
];

// ============================================================
// Utility Functions
// ============================================================

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `+91-${digits.slice(0, 2)}XXX-XX${digits.slice(-3)}`;
  }
  return phone;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDurationLong(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function generateCallSid(): string {
  return `CA${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function generateHeatmapData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let base = 0;
      // Peak hours: 9-11 AM and 5-7 PM (Indian clinic patterns)
      if (hour >= 9 && hour <= 11) base = 6;
      else if (hour >= 17 && hour <= 19) base = 5;
      else if (hour >= 8 && hour <= 21) base = 2;
      else base = 0;
      // Weekday vs weekend
      const dayMultiplier = day < 5 ? 1 : 0.4;
      const count = Math.max(0, Math.round((base + Math.random() * 4) * dayMultiplier));
      cells.push({ day, hour, count });
    }
  }
  return cells;
}

function getHeatmapColor(count: number, max: number): string {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800/40';
  const ratio = max > 0 ? count / max : 0;
  if (ratio < 0.2) return 'bg-emerald-50 dark:bg-emerald-950/40';
  if (ratio < 0.4) return 'bg-emerald-100 dark:bg-emerald-900/50';
  if (ratio < 0.6) return 'bg-emerald-200 dark:bg-emerald-800/60';
  if (ratio < 0.8) return 'bg-emerald-300 dark:bg-emerald-700/70';
  return 'bg-emerald-500 dark:bg-emerald-500';
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
// Typing Indicator Component
// ============================================================

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mr-2">VoiceAI</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Live Waveform
// ============================================================

function LiveWaveform({ active, color = 'emerald' }: { active: boolean; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', teal: 'bg-teal-500',
  };
  const barColor = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex items-end gap-[2px] h-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            'w-[2px] rounded-full transition-all duration-300',
            active ? `${barColor} waveform-bar` : 'bg-slate-200 dark:bg-slate-700',
          )}
          style={{ height: active ? undefined : '3px', opacity: active ? 1 : 0.3 }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Sentiment Badge
// ============================================================

function SentimentBadge({ sentiment, score }: { sentiment: Sentiment; score: number }) {
  const config: Record<Sentiment, { bg: string; text: string; emoji: string }> = {
    positive: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', emoji: '😊' },
    neutral: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', emoji: '😐' },
    negative: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', emoji: '😟' },
  };
  const c = config[sentiment];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', c.bg, c.text)}>
      <span className="text-sm">{c.emoji}</span>
      <span>{score}%</span>
    </span>
  );
}

// ============================================================
// Sentiment Bar (colored bar)
// ============================================================

function SentimentBar({ sentiment, score }: { sentiment: Sentiment; score: number }) {
  const barColor = sentiment === 'positive' ? 'bg-emerald-500' : sentiment === 'negative' ? 'bg-rose-500' : 'bg-amber-500';
  const bgColor = sentiment === 'positive' ? 'bg-emerald-100 dark:bg-emerald-900/30' : sentiment === 'negative' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-amber-100 dark:bg-amber-900/30';

  return (
    <div className={cn('h-2 rounded-full overflow-hidden', bgColor)}>
      <motion.div
        className={cn('h-full rounded-full', barColor)}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// ============================================================
// Call Analytics Live Ticker
// ============================================================

function LiveTicker({ stats }: { stats: TickerStat[] }) {
  const tickerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-emerald-500/5 border border-emerald-200/50 dark:border-emerald-800/30"
    >
      <div
        ref={tickerRef}
        className="flex items-center gap-4 px-4 py-2.5 overflow-x-auto no-scrollbar"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="flex items-center gap-2.5 flex-shrink-0 bg-white/70 dark:bg-slate-900/50 rounded-lg px-3 py-1.5 shadow-sm"
            >
              <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', stat.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30' : stat.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' : stat.color === 'rose' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-teal-100 dark:bg-teal-900/30')}>
                <Icon className={cn('w-3.5 h-3.5', stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : stat.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : stat.color === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400')} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{stat.label}</span>
                <div className="flex items-center gap-1">
                  <span className={cn('text-sm font-bold tabular-nums leading-tight', stat.color === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' : stat.color === 'amber' ? 'text-amber-700 dark:text-amber-300' : stat.color === 'rose' ? 'text-rose-700 dark:text-rose-300' : 'text-teal-700 dark:text-teal-300')}>
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </span>
                  {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                  {stat.trend === 'flat' && <Minus className="w-3 h-3 text-slate-400" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================
// Call Card Component
// ============================================================

function CallCard({ call, onSelect }: { call: LiveCall; onSelect: (call: LiveCall) => void }) {
  const attentionCfg = ATTENTION_CONFIG[call.attention];
  const phaseCfg = PHASE_CONFIG[call.phase];
  const initials = call.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card
        className={cn(
          'relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg group',
          call.attention === 'active' && 'border-l-4 border-l-emerald-500 hover:shadow-emerald-500/10',
          call.attention === 'attention' && 'border-l-4 border-l-amber-500 hover:shadow-amber-500/10',
          call.attention === 'escalation' && 'border-l-4 border-l-rose-500 hover:shadow-rose-500/10',
        )}
        onClick={() => onSelect(call)}
      >
        <CardContent className="p-4">
          {/* Top row: Status + Attention + Persona */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Pulse indicator */}
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', attentionCfg.dot)} />
                <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', attentionCfg.dot)} />
              </span>
              <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0', phaseCfg.bg, phaseCfg.color)}>
                {phaseCfg.label}
              </Badge>
              {call.attention !== 'active' && (
                <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0', attentionCfg.bg, call.attention === 'escalation' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}>
                  {call.attention === 'escalation' ? '🔴' : '🟡'} {attentionCfg.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{call.aiPersona}</span>
            </div>
          </div>

          {/* Caller info */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className={cn('w-10 h-10 flex-shrink-0 ring-2', attentionCfg.ring)}>
              <AvatarFallback className={cn(
                'text-sm font-semibold',
                call.attention === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                call.attention === 'attention' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{call.callerName}</p>
                <SentimentBadge sentiment={call.sentiment} score={call.sentimentScore} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{maskPhone(call.callerPhone)}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{call.callerCity}</span>
              </div>
            </div>
          </div>

          {/* Clinic + Duration */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[160px]">{call.clinicName}</span>
            </div>
            <div className="flex items-center gap-2">
              {call.status === 'in-progress' && <LiveWaveform active={true} color={call.attention === 'escalation' ? 'rose' : call.attention === 'attention' ? 'amber' : 'emerald'} />}
              <div className="flex items-center gap-1 text-xs font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className={cn('font-semibold tabular-nums', call.status === 'in-progress' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
                  {call.status === 'in-progress' ? formatDuration(call.duration) : '--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Phase Progress */}
          <div className="flex items-center gap-1 mb-3">
            {(Object.keys(PHASE_CONFIG) as ConversationPhase[]).map((phase) => {
              const cfg = PHASE_CONFIG[phase];
              const isActive = phase === call.phase;
              const phaseOrder = Object.keys(PHASE_CONFIG);
              const currentIdx = phaseOrder.indexOf(call.phase);
              const thisIdx = phaseOrder.indexOf(phase);
              const isCompleted = thisIdx < currentIdx;

              return (
                <div key={phase} className="flex items-center gap-1 flex-1">
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all',
                    isActive && cfg.bg + ' ' + cfg.color + ' shadow-sm',
                    isCompleted && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    !isActive && !isCompleted && 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500',
                  )}>
                    {isCompleted ? (
                      <span className="text-emerald-500 text-xs">✓</span>
                    ) : isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </div>
                  {phase !== 'confirmation' && (
                    <div className={cn('w-4 h-px flex-shrink-0', isCompleted ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700')} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mini Transcript Preview */}
          <div className="space-y-1.5 max-h-16 overflow-hidden">
            {call.transcript.slice(-2).map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'ai' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[90%] px-2 py-1 rounded-lg text-[11px] leading-relaxed',
                  msg.role === 'ai'
                    ? 'bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300 rounded-bl-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-br-sm',
                )}>
                  <span className="text-[9px] font-bold opacity-50 mr-1">{msg.role === 'ai' ? call.aiPersona : 'Caller'}</span>
                  {msg.text}
                </div>
              </div>
            ))}
            {call.isTyping && <TypingIndicator />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Call Detail Sheet
// ============================================================

function CallDetailSheet({ call, open, onOpenChange, onEndCall, onTransfer }: {
  call: LiveCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEndCall: (callSid: string) => void;
  onTransfer: (callSid: string) => void;
}) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [call?.transcript.length, call?.isTyping]);

  if (!call) return null;

  const initials = call.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full p-0 overflow-hidden flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 pt-6 pb-4 flex-shrink-0">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call Details
            </SheetTitle>
            <SheetDescription className="text-emerald-100">
              Live call monitoring and controls
            </SheetDescription>
          </SheetHeader>

          {/* Caller summary in header */}
          <div className="flex items-center gap-3 mt-4">
            <Avatar className="w-12 h-12 ring-2 ring-white/30">
              <AvatarFallback className="text-sm font-bold bg-white/20 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{call.callerName}</p>
              <p className="text-sm text-emerald-100 font-mono">{maskPhone(call.callerPhone)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-2.5 py-1">
                <Clock className="w-3.5 h-3.5 text-white" />
                <span className="text-sm font-bold text-white tabular-nums">
                  {call.status === 'in-progress' ? formatDuration(call.duration) : '--:--'}
                </span>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">
                {PHASE_CONFIG[call.phase].label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Info Section */}
          <div className="p-4 space-y-4">
            {/* Patient Info */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Patient Info</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{maskPhone(call.callerPhone)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{call.callerCity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{call.callHistoryCount} previous calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">{call.sentiment}</span>
                </div>
              </div>
            </div>

            {/* Clinic Info */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clinic Info</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{call.clinicName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{call.doctorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{call.clinicCity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{call.specialty}</span>
                </div>
              </div>
            </div>

            {/* Sentiment & AI Confidence */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Brain className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Analysis</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300">Sentiment Score</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{call.sentimentScore}%</span>
                  </div>
                  <SentimentBar sentiment={call.sentiment} score={call.sentimentScore} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300">AI Confidence</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{call.aiConfidence}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-teal-100 dark:bg-teal-900/30">
                    <motion.div
                      className="h-full rounded-full bg-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${call.aiConfidence}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransfer(call.callSid)}
                className="flex-1 gap-1.5 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 h-9"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer to Doctor
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toast.success('WhatsApp summary sent', { description: `${call.callerName} will receive the summary.` });
                }}
                className="flex-1 gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-9"
              >
                <Send className="w-3.5 h-3.5" />
                Send WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onEndCall(call.callSid); onOpenChange(false); }}
                className="gap-1.5 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 h-9"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                End
              </Button>
            </div>

            {/* Full Transcript */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Transcript</span>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {call.transcript.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'ai' ? 'justify-start' : 'justify-end')}>
                    <div className={cn(
                      'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                      msg.role === 'ai'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-bl-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-br-md',
                    )}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn(
                          'text-[10px] font-bold',
                          msg.role === 'ai' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400',
                        )}>
                          {msg.role === 'ai' ? call.aiPersona : 'Caller'}
                        </span>
                      </div>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {call.isTyping && <TypingIndicator />}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Call Queue Visualization
// ============================================================

function CallQueue({ queue, avgWait }: { queue: QueuedCall[]; avgWait: number }) {
  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-sm font-semibold">Call Queue</CardTitle>
            <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              {queue.length} waiting
            </Badge>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Avg Wait: <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatDurationLong(avgWait)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {queue.map((qc, idx) => {
            const qInitials = qc.callerName.split(' ').map((w) => w[0]).join('').slice(0, 2);
            return (
              <motion.div
                key={qc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.25 }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Queue Position Badge */}
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{qc.position}</span>
                </div>
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {qInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{qc.callerName}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{maskPhone(qc.callerPhone)} · {qc.clinicName}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDurationLong(qc.waitTime)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Performance Heatmap
// ============================================================

function PerformanceHeatmap({ data }: { data: HeatmapCell[] }) {
  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-sm font-semibold">Call Volume Heatmap</CardTitle>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">This Week</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="overflow-x-auto no-scrollbar">
            {/* Hour labels */}
            <div className="flex items-center gap-0.5 mb-1 ml-8">
              {HOURS.filter((h) => h % 2 === 0).map((h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-slate-400 dark:text-slate-500 min-w-[18px]">
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-8 text-[10px] font-medium text-slate-500 dark:text-slate-400 flex-shrink-0">{day}</div>
                {HOURS.map((hour) => {
                  const cell = data.find((d) => d.day === dayIdx && d.hour === hour);
                  const count = cell?.count ?? 0;
                  const colorClass = getHeatmapColor(count, maxCount);

                  return (
                    <Tooltip key={`${dayIdx}-${hour}`}>
                      <TooltipTrigger asChild>
                        <div className={cn('flex-1 min-w-[9px] h-4 rounded-sm cursor-default transition-colors hover:ring-1 hover:ring-emerald-300 dark:hover:ring-emerald-700', colorClass)} />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-semibold">{day} {hour.toString().padStart(2, '0')}:00</p>
                        <p>{count} calls</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-1.5 mt-2 ml-8">
              <span className="text-[9px] text-slate-400 dark:text-slate-500">Less</span>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn('w-3 h-3 rounded-sm', getHeatmapColor(Math.round((i / 4) * maxCount), maxCount))}
                />
              ))}
              <span className="text-[9px] text-slate-400 dark:text-slate-500">More</span>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Animation Variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ============================================================
// Main Component
// ============================================================

export default function LiveCallMonitor() {
  // State
  const [activeCalls, setActiveCalls] = useState<LiveCall[]>([]);
  const [queuedCalls, setQueuedCalls] = useState<QueuedCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sipConnected, setSipConnected] = useState(false);

  // Ticker stats state
  const [tickerStats, setTickerStats] = useState<TickerStat[]>([
    { id: 'total', label: 'Total Calls Today', value: 47, suffix: '', icon: Phone, color: 'emerald', trend: 'up', trendValue: 12 },
    { id: 'active', label: 'Active Now', value: 3, suffix: '', icon: Radio, color: 'teal', trend: 'flat', trendValue: 0 },
    { id: 'wait', label: 'Avg Wait', value: 12, suffix: 's', icon: Clock, color: 'amber', trend: 'down', trendValue: 3 },
    { id: 'booking', label: 'Booking Rate', value: 68, suffix: '%', icon: CalendarCheck, color: 'emerald', trend: 'up', trendValue: 5 },
    { id: 'escalation', label: 'Escalations', value: 2, suffix: '', icon: AlertCircle, color: 'rose', trend: 'up', trendValue: 1 },
  ]);

  // Heatmap data
  const [heatmapData] = useState<HeatmapCell[]>(() => generateHeatmapData());

  // Refs
  const transcriptIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const extraLineIdxRef = useRef(0);

  // ---- Generate initial mock active calls ----
  const generateActiveCalls = useCallback(() => {
    const phases: ConversationPhase[] = ['greeting', 'intent', 'booking', 'confirmation'];
    const attentions: AttentionLevel[] = ['active', 'active', 'attention', 'escalation'];
    const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
    const sentimentsScores = [78, 55, 32];
    const aiConfidenceScores = [94, 87, 72];

    const calls: LiveCall[] = Array.from({ length: 3 }, (_, i) => {
      const clinic = MOCK_CLINICS[i];
      const caller = MOCK_CALLERS[i];
      const phase = phases[i];
      const attention = attentions[i];
      const sentiment = sentiments[i];

      return {
        id: `ac-${i}`,
        callSid: generateCallSid(),
        callerPhone: `+91${Math.floor(7000000000 + Math.random() * 3000000000).toString()}`,
        callerName: caller.name,
        callerCity: caller.city,
        callHistoryCount: caller.history,
        clinicName: clinic.name,
        clinicCity: clinic.city,
        doctorName: clinic.doctor,
        specialty: clinic.specialty,
        status: 'in-progress' as CallStatus,
        attention,
        phase,
        startedAt: new Date(Date.now() - (Math.floor(Math.random() * 180) + 30) * 1000),
        duration: Math.floor(Math.random() * 180) + 30,
        sentiment,
        sentimentScore: sentimentsScores[i],
        aiConfidence: aiConfidenceScores[i],
        aiPersona: AI_PERSONAS[i],
        transcript: [...CONVERSATION_FLOWS[phase]],
        isTyping: false,
      };
    });

    setActiveCalls(calls);
  }, []);

  // ---- Generate initial queued calls ----
  const generateQueuedCalls = useCallback(() => {
    const queue: QueuedCall[] = Array.from({ length: 5 }, (_, i) => ({
      id: `qc-${i}`,
      callerPhone: `+91${Math.floor(7000000000 + Math.random() * 3000000000).toString()}`,
      callerName: MOCK_CALLERS[i + 3 % MOCK_CALLERS.length].name,
      clinicName: MOCK_CLINICS[i % MOCK_CLINICS.length].name,
      queuedAt: new Date(Date.now() - (i + 1) * 15000),
      waitTime: (i + 1) * 15 + Math.floor(Math.random() * 10),
      position: i + 1,
    }));
    setQueuedCalls(queue);
  }, []);

  // ---- Simulate new transcript lines ----
  const addTranscriptLine = useCallback(() => {
    setActiveCalls((prev) => {
      return prev.map((call, idx) => {
        // Only add to in-progress calls, and stagger them
        if (call.status !== 'in-progress') return call;
        if (idx % 3 !== Math.floor(Date.now() / 3000) % 3) return call;

        // Toggle typing
        if (!call.isTyping) {
          return { ...call, isTyping: true };
        }

        // Add a line
        const line = EXTRA_TRANSCRIPT_LINES[extraLineIdxRef.current % EXTRA_TRANSCRIPT_LINES.length];
        extraLineIdxRef.current++;
        return {
          ...call,
          isTyping: false,
          transcript: [
            ...call.transcript,
            { role: line.role, text: line.text, timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) },
          ],
        };
      });
    });
  }, []);

  // ---- Simulate phase transitions ----
  const rotatePhases = useCallback(() => {
    setActiveCalls((prev) =>
      prev.map((call) => {
        if (call.status !== 'in-progress') return call;
        const phaseOrder: ConversationPhase[] = ['greeting', 'intent', 'booking', 'confirmation'];
        const currentIdx = phaseOrder.indexOf(call.phase);

        if (Math.random() < 0.15 && currentIdx < phaseOrder.length - 1) {
          const nextPhase = phaseOrder[currentIdx + 1];
          // Update transcript with phase-appropriate messages
          const newTranscript = [...call.transcript];
          if (nextPhase === 'confirmation') {
            newTranscript.push(
              { role: 'ai', text: 'Great! Aapka appointment confirm ho gaya hai. WhatsApp par details bhej rahi hoon.', timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) },
              { role: 'caller', text: 'Thank you so much!', timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) },
            );
          }

          return {
            ...call,
            phase: nextPhase,
            transcript: newTranscript,
            sentiment: call.sentiment === 'negative' ? 'neutral' : call.sentiment,
            sentimentScore: Math.min(100, call.sentimentScore + 5),
            aiConfidence: Math.min(99, call.aiConfidence + 2),
          };
        }

        // Occasionally change attention level
        if (Math.random() < 0.1) {
          const newAttention: AttentionLevel[] = ['active', 'attention', 'escalation'];
          return { ...call, attention: newAttention[Math.floor(Math.random() * 3)] };
        }

        return call;
      }),
    );
  }, []);

  // ---- Update queued calls wait time ----
  const updateQueue = useCallback(() => {
    setQueuedCalls((prev) =>
      prev.map((qc) => ({
        ...qc,
        waitTime: qc.waitTime + 1,
      }))
    );
  }, []);

  // ---- Update ticker stats ----
  const updateTickerStats = useCallback(() => {
    setTickerStats((prev) =>
      prev.map((stat) => {
        if (stat.id === 'total' && Math.random() < 0.3) {
          return { ...stat, value: stat.value + 1 };
        }
        if (stat.id === 'active') {
          return { ...stat, value: activeCalls.length };
        }
        if (stat.id === 'wait') {
          const avg = queuedCalls.length > 0 ? Math.round(queuedCalls.reduce((s, q) => s + q.waitTime, 0) / queuedCalls.length) : 0;
          return { ...stat, value: avg };
        }
        if (stat.id === 'booking' && Math.random() < 0.15) {
          return { ...stat, value: Math.min(95, stat.value + 1) };
        }
        return stat;
      })
    );
  }, [activeCalls.length, queuedCalls]);

  // ---- Initialize ----
  useEffect(() => {
    // Check SIP connectivity
    fetch('/api/vobiz?action=health')
      .then((r) => r.json())
      .then((d) => setSipConnected(d?.vobizConnected ?? d?.status === 'operational' ?? false))
      .catch(() => {});

    const initTimer = setTimeout(() => {
      generateActiveCalls();
      generateQueuedCalls();
      setLoading(false);
    }, 100);
    return () => clearTimeout(initTimer);
  }, [generateActiveCalls, generateQueuedCalls]);

  // ---- Duration counter (1s) ----
  useEffect(() => {
    durationIntervalRef.current = setInterval(() => {
      setActiveCalls((prev) =>
        prev.map((call) => ({
          ...call,
          duration: call.status === 'in-progress'
            ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
            : call.duration,
        }))
      );
      updateQueue();
    }, 1000);
    return () => { if (durationIntervalRef.current) clearInterval(durationIntervalRef.current); };
  }, [updateQueue]);

  // ---- Transcript simulation (2-3s) ----
  useEffect(() => {
    transcriptIntervalRef.current = setInterval(addTranscriptLine, 2500);
    return () => { if (transcriptIntervalRef.current) clearInterval(transcriptIntervalRef.current); };
  }, [addTranscriptLine]);

  // ---- Phase rotation (8s) ----
  useEffect(() => {
    phaseIntervalRef.current = setInterval(rotatePhases, 8000);
    return () => { if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current); };
  }, [rotatePhases]);

  // ---- Ticker stats update (3s) ----
  useEffect(() => {
    tickerIntervalRef.current = setInterval(updateTickerStats, 3000);
    return () => { if (tickerIntervalRef.current) clearInterval(tickerIntervalRef.current); };
  }, [updateTickerStats]);

  // ---- Handlers ----
  const handleSelectCall = useCallback((call: LiveCall) => {
    setSelectedCall(call);
    setSheetOpen(true);
  }, []);

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
      description: `Call ${callSid.slice(-6)} is being transferred to the doctor.`,
    });
  }, []);

  // ---- Derived values ----
  const activeCount = activeCalls.length;
  const avgQueueWait = queuedCalls.length > 0 ? Math.round(queuedCalls.reduce((s, q) => s + q.waitTime, 0) / queuedCalls.length) : 0;

  // ---- Loading state ----
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
      className="space-y-5"
    >
      {/* ============================================================
          Page Header
          ============================================================ */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Call Monitor</h1>
              <Badge variant="outline" className={cn(
                'text-xs font-medium gap-1.5 px-2.5 py-1',
                sipConnected
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
              )}>
                {sipConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {sipConnected ? 'Vobiz Connected' : 'SIP Offline'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time call monitoring across all clinics · Super Admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active calls counter pill */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5">
            <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 leading-tight tabular-nums">
                <AnimatedNumber value={activeCount} />
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { generateActiveCalls(); generateQueuedCalls(); toast.success('Refreshed'); }}
            className="gap-1.5 border-slate-200 dark:border-slate-700 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* ============================================================
          Live Analytics Ticker
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <LiveTicker stats={tickerStats} />
      </motion.div>

      {/* ============================================================
          Main Content Grid: Calls + Queue/Heatmap
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Active Call Stream (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live Call Stream</h2>
                <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Attention</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Escalation</span>
              </div>
            </div>

            {activeCalls.length === 0 ? (
              <Card className="border-dashed rounded-xl">
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
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {activeCalls.map((call) => (
                    <CallCard key={call.id} call={call} onSelect={handleSelectCall} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: Queue + Heatmap */}
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <CallQueue queue={queuedCalls} avgWait={avgQueueWait} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PerformanceHeatmap data={heatmapData} />
          </motion.div>
        </div>
      </div>

      {/* ============================================================
          Call Detail Sheet
          ============================================================ */}
      <CallDetailSheet
        call={selectedCall}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedCall(null);
        }}
        onEndCall={handleEndCall}
        onTransfer={handleTransfer}
      />
    </motion.div>
  );
}
