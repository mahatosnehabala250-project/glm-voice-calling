'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Phone, CalendarCheck, IndianRupee, Activity,
  Clock, Globe, MessageSquare, Zap, TrendingUp, Brain, Star, Timer, Target, UserCheck,
  Trophy, Medal, Radio, MapPin, RefreshCw, PhoneIncoming, PhoneOff, MessageCircle, CalendarPlus,
  Bell, AlertTriangle, Shield, Info, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import AIPerformance from '@/components/admin/ai-performance';
import SystemHealthWidget from '@/components/shared/system-health-widget';
import { useAppStore } from '@/stores/app-store';
import { formatDistanceToNow } from 'date-fns';

interface MetricsData {
  totalClinics: number;
  activeClinics: number;
  trialClinics: number;
  overdueClinics: number;
  todayCalls: number;
  todayAppointments: number;
  totalRevenue: number;
  missedCallsToday: number;
  transferredCallsToday: number;
  analytics: { metricDate: string; metricType: string; metricValue: number }[];
  callStatusCounts: { status: string; count: number }[];
  clinicsWithStats: {
    id: string;
    name: string;
    doctorName: string;
    city: string;
    status: string;
    planType: string;
    _count: { calls: number; appointments: number; users: number };
    createdAt: string;
  }[];
  systemHealth: {
    uptime: string;
    avgLatency: string;
    geminiApiStatus: string;
    vobizSipStatus: string;
    whatsappApiStatus: string;
    lastIncident: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  answered: '#10b981',
  missed: '#f43f5e',
  completed: '#059669',
  transferred: '#f97316',
  ringing: '#8b5cf6',
  failed: '#64748b',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}{displayed.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

// Custom tooltip component for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// Active shape for pie chart hover
function ActivePieShape(props: { cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string; payload: { name: string; value: number; color: string } }) {
  return (
    <g>
      <circle cx={props.cx} cy={props.cy} r={props.outerRadius + 8} fill="none" stroke={props.fill} strokeWidth={2} opacity={0.3} />
      <circle cx={props.cx} cy={props.cy} fill="white" filter="url(#shadow)" r={props.outerRadius + 4} />
    </g>
  );
}

const RANK_STYLES = [
  { bg: 'bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20', border: 'border-amber-300 dark:border-amber-700', badge: 'bg-amber-500 text-white', rankLabel: '🥇', name: 'Gold' },
  { bg: 'bg-gradient-to-br from-slate-100 to-gray-50 dark:from-slate-800/60 dark:to-gray-800/40', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-400 text-white', rankLabel: '🥈', name: 'Silver' },
  { bg: 'bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20', border: 'border-orange-300 dark:border-orange-700', badge: 'bg-orange-600 text-white', rankLabel: '🥉', name: 'Bronze' },
];

// --- Live Activity Feed ---
interface ActivityEvent {
  id: string;
  type: 'call' | 'booking' | 'system' | 'whatsapp' | 'call_end';
  description: string;
  timestamp: string;
}

const EVENT_TEMPLATES: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
  { type: 'call', description: 'New call received at Sharma Dental Clinic' },
  { type: 'booking', description: 'Appointment booked: Priya Sharma → Dr. Rajesh Sharma' },
  { type: 'call_end', description: 'SIP call ended: 2m 34s' },
  { type: 'whatsapp', description: 'WhatsApp sent to +91-98765-43210' },
  { type: 'booking', description: 'Appointment booked: Amit Patel → Dr. Mehta Dental' },
  { type: 'call', description: 'New call received at SmileCare Clinic, Mumbai' },
  { type: 'system', description: 'AI model refreshed with latest clinic data' },
  { type: 'call_end', description: 'SIP call ended: 4m 12s' },
  { type: 'whatsapp', description: 'WhatsApp reminder sent to +91-87654-32109' },
  { type: 'call', description: 'New call received at Delhi Ortho Center' },
  { type: 'booking', description: 'Appointment booked: Ravi Kumar → Dr. Suresh Reddy' },
  { type: 'system', description: 'Auto-scaling triggered: 3 active calls on queue' },
  { type: 'call_end', description: 'SIP call ended: 1m 48s' },
  { type: 'whatsapp', description: 'WhatsApp sent to +91-76543-21098' },
  { type: 'call', description: 'New call received at Hyderabad Skin Clinic' },
  { type: 'booking', description: 'Appointment booked: Neha Gupta → Dr. Anita Verma' },
  { type: 'system', description: 'Cache cleared for updated pricing plans' },
  { type: 'call', description: 'New call received at Kolkata Eye Hospital' },
  { type: 'call_end', description: 'SIP call ended: 3m 05s' },
  { type: 'whatsapp', description: 'WhatsApp sent to +91-65432-10987' },
];

const EVENT_ICONS: Record<ActivityEvent['type'], typeof PhoneIncoming> = {
  call: PhoneIncoming,
  call_end: PhoneOff,
  booking: CalendarPlus,
  whatsapp: MessageCircle,
  system: Zap,
};

const EVENT_COLORS: Record<ActivityEvent['type'], string> = {
  booking: 'border-l-emerald-500',
  call: 'border-l-teal-500',
  call_end: 'border-l-teal-400',
  whatsapp: 'border-l-green-500',
  system: 'border-l-amber-500',
};

const EVENT_ICON_COLORS: Record<ActivityEvent['type'], string> = {
  booking: 'text-emerald-500',
  call: 'text-teal-500',
  call_end: 'text-teal-400',
  whatsapp: 'text-green-500',
  system: 'text-amber-500',
};

function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const eventIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEvent = useCallback(() => {
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    eventIdRef.current += 1;
    const newEvent: ActivityEvent = {
      id: `evt-${eventIdRef.current}`,
      type: template.type,
      description: template.description,
      timestamp: timeStr,
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 8));
  }, []);

  useEffect(() => {
    // Add 3 initial events
    const initialTimers = [
      setTimeout(() => addEvent(), 0),
      setTimeout(() => addEvent(), 400),
      setTimeout(() => addEvent(), 800),
    ];

    const interval = setInterval(() => {
      addEvent();
    }, 3000 + Math.random() * 2000);

    return () => {
      clearInterval(interval);
      initialTimers.forEach(t => clearTimeout(t));
    };
  }, [addEvent]);

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-500" />
          Live Activity Feed
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">LIVE</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {events.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-4">Waiting for events...</div>
          )}
          {events.map((event, i) => {
            const EventIcon = EVENT_ICONS[event.type];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border-l-[3px] bg-slate-50/50 dark:bg-slate-800/30',
                  EVENT_COLORS[event.type]
                )}
                style={{ opacity: i >= 6 ? 0.5 : 1 }}
              >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-700 shadow-sm', EVENT_ICON_COLORS[event.type])}>
                  <EventIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{event.description}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{event.timestamp}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Geographic Distribution Data ---
const GEO_DATA = [
  { city: 'New Delhi', calls: 42 },
  { city: 'Mumbai', calls: 38 },
  { city: 'Hyderabad', calls: 28 },
  { city: 'Kolkata', calls: 18 },
  { city: 'Ahmedabad', calls: 15 },
];

export default function AdminOverview() {
  const { setAdminPage } = useAppStore();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState('2 seconds ago');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkTimer, setCheckTimer] = useState(2);
  const [recentAlerts, setRecentAlerts] = useState<Array<{ id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string }>>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/admin/metrics');
        if (res.ok) setData(await res.json());
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchMetrics();
  }, []);

  // Fetch recent alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (res.ok) {
          const d = await res.json();
          setRecentAlerts((d.notifications || []).slice(0, 5));
        }
      } catch { /* silently fail */ }
    };
    fetchAlerts();
  }, []);

  // Tick the last-checked timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCheckTimer(prev => {
        const next = prev + 1;
        if (next < 60) return next;
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const lastCheckedDisplay = checkTimer < 60
    ? `${checkTimer} second${checkTimer !== 1 ? 's' : ''} ago`
    : 'just now';

  if (loading) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </motion.div>
    );
  }

  if (!data) return <div className="text-center py-12 text-slate-500">Failed to load metrics</div>;

  // Process chart data
  const callStatusData = data.callStatusCounts.map(c => ({
    name: c.status.charAt(0).toUpperCase() + c.status.slice(1),
    value: c.count,
    color: STATUS_COLORS[c.status] || '#64748b',
  }));

  const dailyCallData = data.analytics
    .filter(a => a.metricType === 'daily_calls')
    .map(a => ({
      date: format(new Date(a.metricDate), 'dd MMM'),
      calls: a.metricValue,
    }));

  const dailyBookingData = data.analytics
    .filter(a => a.metricType === 'daily_bookings')
    .map(a => ({
      date: format(new Date(a.metricDate), 'dd MMM'),
      bookings: a.metricValue,
    }));

  const combinedChartData = dailyCallData.map(d => ({
    date: d.date,
    calls: d.calls,
    bookings: dailyBookingData.find(b => b.date === d.date)?.bookings || 0,
  }));

  // Top performing clinics by conversion rate
  const topClinics = [...data.clinicsWithStats]
    .filter(c => c._count.calls > 0)
    .map(c => ({
      ...c,
      conversionRate: Math.round((c._count.appointments / c._count.calls) * 100),
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 3);

  const aiBookingRate = data.todayCalls > 0
    ? Math.round((data.todayAppointments / data.todayCalls) * 100)
    : 0;

  const RING_COLORS: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b', rose: '#f43f5e',
  };

  const statCards = [
    { label: 'Active Clinics', value: data.activeClinics, icon: Building2, color: 'emerald', sub: `${data.totalClinics} total`, trend: '2 this week', trendPositive: true, pct: 80, bars: [3, 5, 4, 6, 5] },
    { label: "Today's Calls", value: data.todayCalls, icon: Phone, color: 'teal', sub: `${data.missedCallsToday} missed`, trend: '15% vs yesterday', trendPositive: true, pct: data.todayCalls > 0 ? Math.min(100, Math.round((data.todayCalls / 50) * 100)) : 0, bars: [8, 12, 10, 15, 13] },
    { label: "Today's Bookings", value: data.todayAppointments, icon: CalendarCheck, color: 'amber', sub: 'via AI agent', trend: '8% vs yesterday', trendPositive: true, pct: data.todayCalls > 0 ? Math.round((data.todayAppointments / data.todayCalls) * 100) : 0, bars: [4, 6, 5, 8, 7] },
    { label: 'Platform Revenue', value: data.totalRevenue, icon: IndianRupee, color: 'rose', prefix: '₹', sub: '₹3,300 today', trend: null, pct: 72, bars: [5, 7, 6, 8, 9] },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string; topLine: string; gradient: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', topLine: 'bg-emerald-500', gradient: 'from-emerald-500/20 to-emerald-600/5 dark:from-emerald-400/10 dark:to-transparent' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-900/40', topLine: 'bg-teal-500', gradient: 'from-teal-500/20 to-teal-600/5 dark:from-teal-400/10 dark:to-transparent' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40', topLine: 'bg-amber-500', gradient: 'from-amber-500/20 to-amber-600/5 dark:from-amber-400/10 dark:to-transparent' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-900/40', topLine: 'bg-rose-500', gradient: 'from-rose-500/20 to-rose-600/5 dark:from-rose-400/10 dark:to-transparent' },
  };

  const aiInsights = [
    { label: 'AI Booking Rate', value: `${aiBookingRate}%`, icon: Target, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', description: `${data.todayAppointments} of ${data.todayCalls} calls converted` },
    { label: 'Avg Call Duration', value: '2m 15s', icon: Timer, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30', description: 'Across all clinics today' },
    { label: 'AI Response Accuracy', value: '96%', icon: Brain, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', description: 'Intent recognition rate' },
    { label: 'Patient Satisfaction', value: '4.8/5', icon: Star, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30', description: 'Based on post-call feedback' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const colors = colorMap[stat.color];
          const Icon = stat.icon;
          return (
            <motion.div key={i} variants={item}>
              <Card className="border-slate-200 dark:border-slate-800 stat-card-hover overflow-hidden relative hover:scale-[1.02] transition-transform duration-200">
                {/* Thin colored top line */}
                <div className={cn('absolute top-0 left-0 right-0 h-0.5', colors.topLine)} />
                {/* Gradient overlay bottom-right */}
                <div className={cn('absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl rounded-tl-full opacity-50 pointer-events-none', colors.gradient)} />
                <CardContent className="p-4 lg:p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className={cn('text-2xl lg:text-3xl font-bold mt-1', colors.text)}>
                        <AnimatedNumber value={stat.value} prefix={stat.prefix} />
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {stat.trend && (
                          <p className={cn('text-xs font-medium', stat.trendPositive ? 'stat-trend-up' : 'stat-trend-down')}>
                            {stat.trend}
                          </p>
                        )}
                        <div className="flex items-end gap-px h-3">
                          {stat.bars.map((v, idx) => {
                            const mx = Math.max(...stat.bars);
                            return (
                              <motion.div
                                key={idx}
                                initial={{ height: 0 }}
                                animate={{ height: Math.max(2, (v / mx) * 12) + 'px' }}
                                transition={{ delay: 0.6 + idx * 0.06, duration: 0.4 }}
                                className={cn('rounded-sm', stat.trendPositive ? 'bg-emerald-400' : 'bg-rose-400')}
                                style={{ opacity: 0.3 + idx * 0.175, width: 3 }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0 ml-3">
                      <svg className="progress-ring" width="48" height="48" viewBox="0 0 48 48">
                        <circle className="progress-ring-bg" cx="24" cy="24" r="20" fill="none" strokeWidth="3" />
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke={RING_COLORS[stat.color] || '#10b981'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={String(2 * Math.PI * 20)}
                          strokeDashoffset={String(2 * Math.PI * 20 * (1 - (stat.pct || 0) / 100))}
                        />
                      </svg>
                      <div className={cn('absolute inset-0 flex items-center justify-center rounded-full', colors.iconBg)} style={{ width: 32, height: 32, top: 8, left: 8 }}>
                        <Icon className={cn('w-4 h-4', colors.text)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* AI Performance Card - gradient border */}
      <motion.div variants={item}>
        <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-[length:200%_100%] animate-gradient-shift shadow-lg shadow-emerald-500/10">
          <Card className="border-0 bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                AI Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {aiInsights.map((insight, i) => {
                  const Icon = insight.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', insight.bgColor)}>
                        <Icon className={cn('w-5 h-5', insight.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{insight.label}</p>
                        <p className={cn('text-lg font-bold', insight.color)}>{insight.value}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{insight.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* System Status Banner + Uptime Ring */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mb-1">
                {/* Uptime circular progress indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'conic-gradient(#10b981 0deg, #14b8a6 350deg, rgba(226,232,240,0.3) 350deg)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">99.9%</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">All Systems Operational</span>
                  </div>
                  <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-0.5">Platform uptime: 99.9% (30d)</p>
                </div>
              </div>
              {[
                { label: 'Platform Uptime', value: data.systemHealth.uptime, status: 'healthy', bars: [95, 98, 99, 99] },
                { label: 'Avg Latency', value: data.systemHealth.avgLatency, status: 'healthy', bars: [120, 95, 88, 78] },
                { label: 'Gemini API', value: data.systemHealth.geminiApiStatus, status: data.systemHealth.geminiApiStatus, bars: [200, 150, 120, 110] },
                { label: 'Vobiz SIP', value: data.systemHealth.vobizSipStatus, status: data.systemHealth.vobizSipStatus, bars: [180, 160, 140, 130] },
                { label: 'WhatsApp API', value: data.systemHealth.whatsappApiStatus, status: data.systemHealth.whatsappApiStatus, bars: [170, 155, 140, 125] },
              ].map((row, i) => {
                const isHealthy = row.status === 'healthy' || row.status === 'connected' || row.status === 'active';
                const barColor = isHealthy ? 'bg-emerald-400' : 'bg-rose-400';
                // Normalize bars: for latency lower is better, for uptime higher is better
                const normalizedBars = row.label === 'Platform Uptime'
                  ? row.bars.map(v => v / 100)
                  : row.bars.map(v => 1 - v / 250);
                return (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{row.label}</span>
                    <div className="flex items-center gap-2">
                      {/* Mini sparkline bars */}
                      <div className="flex items-end gap-0.5 h-4">
                        {normalizedBars.map((h, j) => (
                          <motion.div
                            key={j}
                            initial={{ height: 0 }}
                            animate={{ height: `${h * 16}px` }}
                            transition={{ delay: 0.5 + i * 0.08 + j * 0.05, duration: 0.4 }}
                            className={cn('w-1 rounded-sm', barColor)}
                            style={{ opacity: 0.4 + j * 0.2 }}
                          />
                        ))}
                      </div>
                      <span className={cn(
                        'text-sm font-medium min-w-[56px] text-right',
                        isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {row.value}
                      </span>
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
                      )} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Last checked: {lastCheckedDisplay}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={() => {
                    setIsRefreshing(true);
                    setTimeout(() => {
                      setLastChecked('just now');
                      setCheckTimer(0);
                      setIsRefreshing(false);
                    }, 600);
                  }}
                >
                  <RefreshCw className={cn('w-3 h-3 mr-1', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call Status Pie */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-500" />
                Calls by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <Pie
                      data={callStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                      animationBegin={300}
                      animationDuration={800}
                    >
                      {callStatusData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.color}
                          stroke={activePieIndex === index ? 'white' : 'transparent'}
                          strokeWidth={activePieIndex === index ? 3 : 0}
                          style={{
                            transform: activePieIndex === index ? 'scale(1.08)' : 'scale(1)',
                            transformOrigin: 'center',
                            transition: 'transform 0.2s ease',
                            filter: activePieIndex === index ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">No call data</div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {callStatusData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500 dark:text-slate-400">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call Volume Trend - AreaChart with gradient */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                7-Day Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {combinedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={combinedChartData}>
                    <defs>
                      <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#callsGradient)"
                      dot={{ r: 0, fill: '#10b981' }}
                      activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
                      name="Calls"
                      animationBegin={300}
                      animationDuration={800}
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#bookingsGradient)"
                      dot={{ r: 0, fill: '#f59e0b' }}
                      activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2, fill: 'white' }}
                      name="Bookings"
                      animationBegin={500}
                      animationDuration={800}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-sm text-slate-400">No trend data</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Geographic Distribution */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-500" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {GEO_DATA.map((geo, i) => {
                const maxCalls = Math.max(...GEO_DATA.map(g => g.calls));
                const widthPercent = (geo.calls / maxCalls) * 100;
                return (
                  <motion.div
                    key={geo.city}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-sm text-slate-600 dark:text-slate-400 w-24 flex-shrink-0 truncate">{geo.city}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ delay: 0.7 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-16 text-right flex-shrink-0">{geo.calls} calls</span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live Activity Feed */}
      <motion.div variants={item}>
        <LiveActivityFeed />
      </motion.div>

      {/* Recent Alerts */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              Recent Alerts
              {recentAlerts.filter(a => !a.isRead).length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {recentAlerts.filter(a => !a.isRead).length}
                </span>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-emerald-600 hover:text-emerald-700"
              onClick={() => setAdminPage('notifications')}
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">No recent alerts</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentAlerts.map((alert) => {
                  const severityConfig = {
                    system: { icon: Shield, bgColor: 'bg-emerald-100 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Info' },
                    alert: { icon: AlertTriangle, bgColor: 'bg-amber-100 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: 'Warning' },
                    billing: { icon: Info, bgColor: 'bg-slate-100 dark:bg-slate-800/50', iconColor: 'text-slate-500 dark:text-slate-400', badgeBg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800', label: 'Info' },
                  };
                  const config = severityConfig[alert.type as keyof typeof severityConfig] || severityConfig.system;
                  const AlertIcon = config.icon;
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                        !alert.isRead ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bgColor)}>
                        <AlertIcon className={cn('w-4 h-4', config.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn('text-sm font-medium truncate', !alert.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400')}>{alert.title}</p>
                          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0', config.badgeBg)}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{alert.message}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!alert.isRead && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health Monitor Widget */}
      <motion.div variants={item}>
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Infrastructure Monitoring</h3>
          </div>
          <SystemHealthWidget />
        </section>
      </motion.div>

      {/* Recent Clinic Activity */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Clinic Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Clinic</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Doctor</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">City</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Calls</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {data.clinicsWithStats.slice(0, 8).map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{clinic.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{clinic.doctorName}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{clinic.city || '-'}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={clinic.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-medium">{clinic._count.calls}</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-medium">{clinic._count.appointments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Performing Clinics Leaderboard */}
      {topClinics.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Performing Clinics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {topClinics.map((clinic, i) => {
                  const rankStyle = RANK_STYLES[i];
                  return (
                    <motion.div
                      key={clinic.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className={cn(
                        'rounded-xl border p-4 relative overflow-hidden',
                        rankStyle.bg, rankStyle.border
                      )}
                    >
                      {/* Rank Badge */}
                      <div className="absolute top-3 right-3">
                        <span className="text-2xl">{rankStyle.rankLabel}</span>
                      </div>

                      {/* Rank Number */}
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mb-3', rankStyle.badge)}>
                        #{i + 1}
                      </div>

                      {/* Clinic Name */}
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm pr-8">{clinic.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{clinic.city || 'India'}</p>

                      {/* Conversion Rate */}
                      <div className="mt-3">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{clinic.conversionRate}%</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Conversion Rate</p>
                      </div>

                      {/* Sub stats */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div>
                          <p className="text-lg font-bold text-slate-800 dark:text-white">{clinic._count.calls}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Calls</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{clinic._count.appointments}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Bookings</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Performance Dashboard */}
      <motion.div variants={item}>
        <AIPerformance />
      </motion.div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    trial: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    overdue: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    suspended: 'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', colors[status] || colors.suspended)}>
      {status}
    </Badge>
  );
}
