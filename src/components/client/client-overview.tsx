'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import {
  Phone, CalendarCheck, IndianRupee, PhoneMissed, CheckCircle2,
  ArrowRight, Clock, User, Activity, TrendingUp,
  Timer, Target, Brain, Star, AlertTriangle, Sun, Moon,
  CalendarCheck as CalendarCheckIcon,
  PhoneMissed as PhoneMissedIcon, Settings, Bell, Bot,
  AlertCircle, ShieldCheck, MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Area, AreaChart
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AiChatSimulator from './ai-chat-simulator';
import RevenueWidget from './revenue-widget';
import QuickActionsPanel from './quick-actions-panel';
import { StatCardSkeletons, ChartSkeleton, WelcomeBannerSkeleton } from '@/components/shared/skeleton-loader';

interface OverviewData {
  callsAnsweredToday: number;
  appointmentsToday: number;
  missedCallsToday: number;
  totalCalls: number;
  totalAppointments: number;
  totalRevenue: number;
  recentCalls: CallRow[];
  upcomingAppointments: AppointmentRow[];
  weeklyAnalytics: { metricDate: string; metricType: string; metricValue: number }[];
}

interface CallRow {
  id: string;
  callerPhone: string;
  callerName: string | null;
  status: string;
  duration: number;
  startedAt: string;
  intent: string | null;
}

interface AppointmentRow {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplayed(value); clearInterval(timer); }
      else setDisplayed(Math.floor(current));
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{displayed.toLocaleString('en-IN')}</span>;
}

function getGreeting(): { text: string; icon: React.ElementType; iconColor: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', icon: Sun, iconColor: 'text-amber-400' };
  if (hour < 17) return { text: 'Good Afternoon', icon: Sun, iconColor: 'text-orange-400' };
  return { text: 'Good Evening', icon: Moon, iconColor: 'text-violet-400' };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  confirmed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  completed: 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  no_show: 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  answered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  missed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  transferred: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  completed_call: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
};

const quickStats = [
  { label: 'Avg Call Duration', value: '2m 15s', icon: Timer, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30', indicator: 'bg-teal-500', trend: 'down', trendValue: '-8s' },
  { label: 'Booking Rate', value: '67%', icon: Target, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', indicator: 'bg-emerald-500', trend: 'up', trendValue: '+5%' },
  { label: 'AI Accuracy', value: '96%', icon: Brain, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', indicator: 'bg-amber-500', trend: 'up', trendValue: '+2%' },
  { label: 'Patient Satisfaction', value: '4.8/5', icon: Star, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30', indicator: 'bg-rose-500', trend: 'up', trendValue: '+0.2' },
  { label: 'Escalations', value: '1 today', icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30', indicator: 'bg-orange-500', trend: 'down', trendValue: '-3' },
];

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

// Quick actions are now handled by the extracted QuickActionsPanel component

const activityTypeConfig: Record<string, { icon: React.ElementType; borderColor: string; iconBg: string; iconColor: string }> = {
  booking: { icon: CalendarCheckIcon, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  escalation: { icon: AlertTriangle, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  missed_call: { icon: PhoneMissedIcon, borderColor: 'border-l-rose-500', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
  system: { icon: Settings, borderColor: 'border-l-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-800/50', iconColor: 'text-slate-500 dark:text-slate-400' },
};

export default function ClientOverview() {
  const { user } = useAuthStore();
  const { setClientPage } = useAppStore();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showAiDemo, setShowAiDemo] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<{
    revenueThisMonth: number;
    activePatients: number;
    upcomingAppointments: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.clinicId) return;
    const fetchOverview = async () => {
      try {
        const res = await fetch('/api/client/overview', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) setData(await res.json());
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchOverview();
  }, [user?.clinicId]);

  // Fetch notifications for activity feed
  useEffect(() => {
    if (!user?.clinicId) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/client/notifications', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications((data.notifications || []).slice(0, 5));
        }
      } catch { /* silently fail */ }
    };
    fetchNotifications();
  }, [user?.clinicId]);

  // Fetch dashboard stats for revenue and deadlines
  useEffect(() => {
    if (!user?.clinicId) return;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/client/dashboard-stats', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) {
          const stats = await res.json();
          setDashboardStats(stats);
        }
      } catch { /* silently fail */ }
    };
    fetchStats();
  }, [user?.clinicId]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const chartData = data?.weeklyAnalytics
    ? data.weeklyAnalytics.filter(a => a.metricType === 'daily_calls').map(a => ({
        date: format(new Date(a.metricDate), 'EEE'),
        calls: a.metricValue,
      }))
    : [];

  // Simulated sentiment trend data for past 7 days
  const sentimentTrendData = [
    { day: 'Mon', positive: 62, neutral: 28, negative: 10 },
    { day: 'Tue', positive: 58, neutral: 30, negative: 12 },
    { day: 'Wed', positive: 70, neutral: 22, negative: 8 },
    { day: 'Thu', positive: 65, neutral: 25, negative: 10 },
    { day: 'Fri', positive: 72, neutral: 20, negative: 8 },
    { day: 'Sat', positive: 55, neutral: 32, negative: 13 },
    { day: 'Sun', positive: 68, neutral: 24, negative: 8 },
  ];

  const statCards = [
    { label: 'Calls Answered', value: data?.callsAnsweredToday || 0, icon: Phone, color: 'emerald', prefix: '' },
    { label: 'Appointments', value: data?.appointmentsToday || 0, icon: CalendarCheck, color: 'teal', prefix: '' },
    { label: 'Revenue Saved', value: data?.totalRevenue || 0, icon: IndianRupee, color: 'amber', prefix: '₹' },
    { label: 'Missed Calls', value: data?.missedCallsToday || 0, icon: PhoneMissed, color: 'rose', prefix: '' },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-900/40' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-900/40' },
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  if (loading) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <WelcomeBannerSkeleton className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        </motion.div>
        <motion.div variants={item}>
          <StatCardSkeletons count={4} />
        </motion.div>
        <motion.div variants={item}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Loading...</CardTitle></CardHeader>
              <CardContent><ChartSkeleton height={200} /></CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Loading...</CardTitle></CardHeader>
              <CardContent><ChartSkeleton height={200} /></CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Banner */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl animated-banner-border bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 p-6 lg:p-10 glass-emerald">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-4">
              {/* Greeting icon with pulse */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-white/30 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 relative">
                  <GreetingIcon className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl lg:text-2xl font-bold text-white text-shimmer">
                  {greeting.text}, {user?.name || 'User'}!
                </h2>
                <p className="text-emerald-100 mt-1 text-sm lg:text-base">
                  <AnimatedNumber value={data?.callsAnsweredToday || 0} /> calls handled today,{' '}
                  <AnimatedNumber value={data?.appointmentsToday || 0} /> appointments booked
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
                  {format(new Date(), 'EEEE, dd MMM')}
                </Badge>
                <span className="text-emerald-100 text-xs font-medium">
                  Clinic is {new Date().getHours() >= 9 && new Date().getHours() < 18 ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>

            {/* Today's Summary mini stat row */}
            <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-tight">
                    <AnimatedNumber value={data?.callsAnsweredToday || 0} />
                  </p>
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-medium">Calls Today</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-tight">
                    <AnimatedNumber value={data?.appointmentsToday || 0} />
                  </p>
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-medium">Booked</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-tight">
                    {data?.callsAnsweredToday > 0
                      ? Math.round(((data?.appointmentsToday || 0) / data.callsAnsweredToday) * 100)
                      : 0}%
                  </p>
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-medium">Conv. Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Pills */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-900/15 border border-rose-200/60 dark:border-rose-800/40"
          whileHover={{ y: -1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
            Missed Today: <AnimatedNumber value={data?.missedCallsToday || 0} />
          </span>
        </motion.div>
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40"
          whileHover={{ y: -1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Avg Wait Time: 12s</span>
        </motion.div>
      </motion.div>

      {/* Quick Actions Panel */}
      <motion.div variants={item}>
        <QuickActionsPanel />
      </motion.div>

      {/* Try AI Demo Button */}
      <motion.div variants={item}>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setShowAiDemo(true)}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Try AI Demo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Watch the AI voice agent handle a live call simulation</p>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-500" />
        </motion.button>
      </motion.div>

      {/* AI Chat Simulator Dialog */}
      <AiChatSimulator open={showAiDemo} onOpenChange={setShowAiDemo} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const colors = colorMap[stat.color];
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow cursor-default card-shine">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className={cn('text-2xl lg:text-3xl font-bold mt-1', colors.text)}>
                        <AnimatedNumber value={stat.value} prefix={stat.prefix} />
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Today</p>
                    </div>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
                      <Icon className={cn('w-5 h-5', colors.text)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats Horizontal Strip */}
      <motion.div variants={item}>
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <div className="flex gap-3 px-4 lg:px-0 pb-2 min-w-max">
            {quickStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex-shrink-0 cursor-default"
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.bgColor)}>
                    <Icon className={cn('w-4 h-4', stat.color)} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <p className={cn('text-sm font-bold leading-tight', stat.color)}>{stat.value}</p>
                      {/* Micro trend arrow */}
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className={cn(
                          'text-[10px] font-bold flex items-center gap-0.5',
                          stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
                        )}
                      >
                        {stat.trend === 'up' ? '↑' : '↓'}
                        <span className="font-medium">{stat.trendValue}</span>
                      </motion.span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{stat.label}</p>
                  </div>
                  {/* Mini sparkline indicator */}
                  <div className="flex items-end gap-[2px] h-4 ml-1">
                    {[3, 5, 2, 6, 4, 7, 3, 5].map((h, j) => (
                      <motion.div
                        key={j}
                        className={cn('w-[3px] rounded-full', stat.indicator)}
                        initial={{ height: 0 }}
                        animate={{ height: `${h * 14}%` }}
                        transition={{ delay: 0.5 + j * 0.05, duration: 0.3 }}
                        style={{ minHeight: '2px', maxHeight: '16px' }}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Revenue & Billing + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <RevenueWidget />
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {[
                  { label: 'Subscription Renewal', sub: 'Pro plan renews in 3 days', urgency: 'urgent' as const, icon: AlertTriangle },
                  { label: 'Patient Review Pending', sub: '2 reviews awaiting response', urgency: 'soon' as const, icon: Clock },
                  { label: 'AI Agent Config', sub: 'Configuration complete', urgency: 'ok' as const, icon: ShieldCheck },
                  { label: 'WhatsApp API Credit', sub: '₹142 remaining balance', urgency: 'ok' as const, icon: MessageCircle },
                ].map((deadline, i) => {
                  const urgencyConfig = {
                    urgent: { badge: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
                    soon: { badge: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
                    ok: { badge: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
                  };
                  const config = urgencyConfig[deadline.urgency];
                  const Icon = deadline.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/40"
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.badge)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{deadline.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{deadline.sub}</p>
                      </div>
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity Timeline */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">No recent activity</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Activity will appear here as events happen</p>
              </div>
            ) : (
              <div className="relative space-y-0">
                {notifications.map((notif, i) => {
                  const config = activityTypeConfig[notif.type] || activityTypeConfig.system;
                  const NotifIcon = config.icon;
                  return (
                    <div key={notif.id} className={cn('flex gap-3 pb-4 border-l-2 pl-4 relative', config.borderColor, i === notifications.length - 1 && 'pb-0')}>
                      <div className={cn('absolute -left-[13px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900', config.iconBg)}>
                        <NotifIcon className={cn('w-3 h-3', config.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-teal-500" />
                Upcoming Appointments
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => setClientPage('appointments')}
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {(!data?.upcomingAppointments || data.upcomingAppointments.length === 0) ? (
                <div className="py-8 text-center text-sm text-slate-400">No upcoming appointments</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {data.upcomingAppointments.map((appt) => (
                    <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{appt.patientName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{appt.reason || 'General consultation'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {format(new Date(appt.date), 'dd/MM')} {appt.time}
                        </p>
                        <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLORS[appt.status] || STATUS_COLORS.pending)}>
                          {appt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Calls */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                Recent Calls
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => setClientPage('calls')}
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {(!data?.recentCalls || data.recentCalls.length === 0) ? (
                <div className="py-8 text-center text-sm text-slate-400">No recent calls</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {data.recentCalls.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                        call.status === 'answered' || call.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : call.status === 'missed'
                          ? 'bg-rose-100 dark:bg-rose-900/30'
                          : 'bg-amber-100 dark:bg-amber-900/30'
                      )}>
                        <Phone className={cn(
                          'w-4 h-4',
                          call.status === 'answered' || call.status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : call.status === 'missed'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {call.callerName || call.callerPhone}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {call.intent ? `Intent: ${call.intent}` : format(new Date(call.startedAt), 'dd/MM/yyyy, h:mm a')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLORS[call.status] || STATUS_COLORS.answered)}>
                          {call.status}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDuration(call.duration)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Agent Performance Card */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal-500" />
              AI Agent Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Booking Conversion', value: 67, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Call Answer Rate', value: 89, color: 'bg-teal-500', textColor: 'text-teal-600 dark:text-teal-400' },
              { label: 'Avg Satisfaction', value: 96, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', display: '4.8/5' },
              { label: 'Escalation Rate', value: 5, color: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400', inverted: true },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{metric.label}</span>
                  <span className={cn('text-xs font-bold', metric.textColor)}>
                    {metric.display || `${metric.value}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: metric.inverted ? `${metric.value}%` : `${metric.value}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', metric.color)}
                  />
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Chart */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800 chart-container-enter">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Weekly Call Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--card-foreground))',
                    }}
                  />
                  <Bar dataKey="calls" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400">No chart data available</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sentiment Trend Widget */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Call Sentiment Trend
            </CardTitle>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Positive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Negative</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={sentimentTrendData}>
                <defs>
                  <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} fill="url(#gradPositive)" />
                <Area type="monotone" dataKey="neutral" stroke="#f59e0b" strokeWidth={2} fill="url(#gradNeutral)" />
                <Area type="monotone" dataKey="negative" stroke="#f43f5e" strokeWidth={2} fill="url(#gradNegative)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
