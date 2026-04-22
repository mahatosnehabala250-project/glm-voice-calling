'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, User, Clock, Star, IndianRupee, Calendar,
  TrendingUp, ArrowRight, Phone, Search, Video,
  Award, Heart, MessageSquare, BarChart3, Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { format } from 'date-fns';

// ============================================================
// Types
// ============================================================

interface OverviewData {
  callsAnsweredToday: number;
  appointmentsToday: number;
  missedCallsToday: number;
  totalCalls: number;
  totalAppointments: number;
  totalRevenue: number;
  upcomingAppointments: AppointmentRow[];
  weeklyAnalytics: { metricDate: string; metricType: string; metricValue: number }[];
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

interface ReviewItem {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  date: string;
}

// ============================================================
// Constants
// ============================================================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const APPOINTMENT_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Upcoming' },
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'In Progress' },
  completed: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400', label: 'Completed' },
  cancelled: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', label: 'Cancelled' },
};

const STAR_EMOJI: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '🤩',
};

// Mock patient reviews
const MOCK_REVIEWS: ReviewItem[] = [
  { id: '1', patientName: 'Priya Sharma', rating: 5, comment: 'Excellent experience! Doctor was very thorough and explained everything clearly. Highly recommended.', date: '2025-01-13' },
  { id: '2', patientName: 'Rahul Mehta', rating: 4, comment: 'Very professional clinic. Minimal wait time and good treatment. Will visit again.', date: '2025-01-12' },
  { id: '3', patientName: 'Anita Desai', rating: 5, comment: 'Best dental clinic in the area. The AI booking system made scheduling so easy!', date: '2025-01-11' },
  { id: '4', patientName: 'Vikram Singh', rating: 4, comment: 'Good consultation and reasonable fees. Staff is courteous and helpful.', date: '2025-01-10' },
  { id: '5', patientName: 'Sneha Patel', rating: 5, comment: 'Amazing service! Doctor is very caring. The follow-up call was a nice touch.', date: '2025-01-09' },
];

// ============================================================
// Helper Components
// ============================================================

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

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const starSize = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            starSize,
            star <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 dark:text-slate-700'
          )}
        />
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function DoctorPortal() {
  const { user } = useAuthStore();
  const { setClientPage } = useAppStore();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.clinicId) return;
    const fetchOverview = async () => {
      try {
        const res = await fetch('/api/client/overview', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) setData(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [user?.clinicId]);

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (data?.weeklyAnalytics && data.weeklyAnalytics.length > 0) {
      return data.weeklyAnalytics
        .filter((a) => a.metricType === 'daily_calls')
        .slice(0, 7)
        .map((a, i) => ({
          day: days[i] || format(new Date(a.metricDate), 'EEE'),
          appointments: Math.round(a.metricValue * 0.65),
          calls: a.metricValue,
        }));
    }
    // Fallback mock data
    return [
      { day: 'Mon', appointments: 6, calls: 12 },
      { day: 'Tue', appointments: 8, calls: 15 },
      { day: 'Wed', appointments: 5, calls: 10 },
      { day: 'Thu', appointments: 10, calls: 18 },
      { day: 'Fri', appointments: 7, calls: 14 },
      { day: 'Sat', appointments: 4, calls: 8 },
      { day: 'Sun', appointments: 2, calls: 4 },
    ];
  }, [data]);

  // Today's appointments with status
  const todayAppointments = useMemo(() => {
    if (!data?.upcomingAppointments) return [];
    const today = format(new Date(), 'yyyy-MM-dd');
    return data.upcomingAppointments
      .filter((a) => a.date === today || a.date <= today)
      .slice(0, 6);
  }, [data]);

  // Fetch clinic data for real doctor name (not the logged-in receptionist)
  const [clinicData, setClinicData] = useState<{ doctorName: string } | null>(null);

  useEffect(() => {
    if (!user?.clinicId) return;
    const fetchClinic = async () => {
      try {
        const res = await fetch('/api/client/settings', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.clinic) setClinicData(data.clinic);
        }
      } catch {
        // silently fail
      }
    };
    fetchClinic();
  }, [user?.clinicId]);

  // Use clinic's doctor name, not the logged-in user's name
  const doctorName = clinicData?.doctorName || 'Dr. Sharma';
  const initials = doctorName
    .replace(/^(Dr\.?\s*)/i, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avgRating = 4.8;
  const nextAppointment = todayAppointments.find((a) => a.status === 'confirmed' || a.status === 'pending');

  // Loading state
  if (loading) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <Skeleton className="h-48 rounded-2xl" />
        </motion.div>
        <motion.div variants={item}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </motion.div>
        <motion.div variants={item}>
          <Skeleton className="h-64 rounded-xl" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Doctor Profile Card */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 p-6 lg:p-8">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 right-16 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/5 rounded-full" />
          <div className="absolute bottom-4 left-1/3 w-16 h-16 bg-white/5 rounded-full" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
            {/* Large Avatar */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-white/20 blur-lg scale-110" />
              <Avatar className="w-20 h-20 lg:w-24 lg:h-24 ring-4 ring-white/30 relative">
                <AvatarFallback className="text-2xl lg:text-3xl font-bold bg-white/20 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
            </div>

            {/* Doctor Info */}
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl lg:text-2xl font-bold text-white">{doctorName}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1.5">
                <div className="flex items-center gap-1.5 text-emerald-100">
                  <Stethoscope className="w-4 h-4" />
                  <span className="text-sm font-medium">Dental Surgeon</span>
                </div>
                <span className="hidden sm:block text-emerald-200">•</span>
                <div className="flex items-center gap-1.5 text-emerald-100">
                  <Award className="w-4 h-4" />
                  <span className="text-sm font-medium">15+ years experience</span>
                </div>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-2">
                <StarDisplay rating={Math.round(avgRating)} size="md" />
                <span className="text-sm font-semibold text-white ml-1">{avgRating}</span>
                <span className="text-xs text-emerald-200">(127 reviews)</span>
              </div>
            </div>

            {/* Quick badge */}
            <div className="hidden lg:flex flex-col items-end gap-2">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                Available Today
              </Badge>
              <p className="text-xs text-emerald-200">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Patients Today',
            value: data?.appointmentsToday || 0,
            icon: User,
            color: 'emerald',
            prefix: '',
          },
          {
            label: 'Revenue Today',
            value: Math.round((data?.totalRevenue || 0) / 7),
            icon: IndianRupee,
            color: 'teal',
            prefix: '₹',
          },
          {
            label: 'Avg Rating',
            value: 0,
            displayValue: `${avgRating}/5`,
            icon: Star,
            color: 'amber',
            prefix: '',
          },
          {
            label: 'Next Appointment',
            value: 0,
            displayValue: nextAppointment ? nextAppointment.time : 'None',
            icon: Clock,
            color: 'rose',
            prefix: '',
          },
        ].map((stat, i) => {
          const colorConfig: Record<string, { bg: string; text: string; iconBg: string }> = {
            emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
            teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-900/40' },
            amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
            rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-900/40' },
          };
          const colors = colorConfig[stat.color];
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card className="border-slate-200 dark:border-slate-800 stat-card-hover overflow-hidden relative">
                <div className={cn('absolute top-0 left-0 right-0 h-0.5', stat.color === 'emerald' ? 'bg-emerald-500' : stat.color === 'teal' ? 'bg-teal-500' : stat.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500')} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className={cn('text-xl lg:text-2xl font-bold mt-1', colors.text)}>
                        {stat.displayValue || <AnimatedNumber value={stat.value} prefix={stat.prefix} />}
                      </p>
                    </div>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.iconBg)}>
                      <Icon className={cn('w-4 h-4', colors.text)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Today's Schedule */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-500" />
                Today&apos;s Schedule
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => setClientPage('schedule')}
              >
                View Full Schedule <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {todayAppointments.map((appt, i) => {
                  const statusStyle = APPOINTMENT_STATUS_STYLES[appt.status] || APPOINTMENT_STATUS_STYLES.confirmed;
                  return (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        statusStyle.bg,
                        'border-slate-100 dark:border-slate-800'
                      )}
                    >
                      {/* Time */}
                      <div className="flex-shrink-0 text-center w-14">
                        <p className={cn('text-sm font-bold', statusStyle.text)}>{appt.time}</p>
                      </div>

                      {/* Divider */}
                      <div className={cn('w-0.5 h-10 rounded-full', statusStyle.dot)} />

                      {/* Patient info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{appt.patientName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{appt.reason || 'General consultation'}</p>
                      </div>

                      {/* Status + Action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 capitalize', statusStyle.bg, statusStyle.text, `border-current/20`)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full mr-1', statusStyle.dot)} />
                          {statusStyle.label}
                        </Badge>
                        {appt.status === 'confirmed' && (
                          <Button size="sm" className="h-7 px-2.5 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                            <Play className="w-3 h-3" />
                            Start
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Metrics + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Performance Metrics - Weekly Bar Chart */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Weekly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyChartData} barGap={4}>
                  <defs>
                    <linearGradient id="portalCallsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="portalApptsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--card-foreground))',
                    }}
                  />
                  <Bar dataKey="calls" fill="url(#portalCallsGrad)" radius={[3, 3, 0, 0]} name="Calls" animationDuration={800} />
                  <Bar dataKey="appointments" fill="url(#portalApptsGrad)" radius={[3, 3, 0, 0]} name="Appointments" animationDuration={800} animationBegin={200} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Calls</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Appointments</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Patient Reviews */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  Patient Reviews
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {avgRating} avg
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {MOCK_REVIEWS.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                            {review.patientName.split(' ').map(w => w[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{review.patientName}</span>
                      </div>
                      <span className="text-lg" role="img" aria-label={`${review.rating} stars`}>
                        {STAR_EMOJI[review.rating] || STAR_EMOJI[3]}
                      </span>
                    </div>
                    <StarDisplay rating={review.rating} />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{review.comment}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{format(new Date(review.date), 'dd MMM yyyy')}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Start Consultation',
                  description: 'Begin a video or audio consultation',
                  icon: Video,
                  gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
                  iconColor: 'text-emerald-600 dark:text-emerald-400',
                  borderColor: 'border-emerald-200 dark:border-emerald-800',
                  action: () => setClientPage('calls'),
                },
                {
                  label: 'View Full Schedule',
                  description: 'See your complete weekly schedule',
                  icon: Calendar,
                  gradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
                  iconColor: 'text-teal-600 dark:text-teal-400',
                  borderColor: 'border-teal-200 dark:border-teal-800',
                  action: () => setClientPage('schedule'),
                },
                {
                  label: 'Patient Lookup',
                  description: 'Search and manage patient records',
                  icon: Search,
                  gradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
                  iconColor: 'text-amber-600 dark:text-amber-400',
                  borderColor: 'border-amber-200 dark:border-amber-800',
                  action: () => setClientPage('appointments'),
                },
              ].map((action, i) => {
                const ActionIcon = action.icon;
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={action.action}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-br cursor-pointer transition-shadow hover:shadow-md text-left',
                      action.gradient,
                      action.borderColor
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', action.iconColor)}>
                      <ActionIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{action.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{action.description}</p>
                    </div>
                    <ArrowRight className={cn('w-4 h-4 flex-shrink-0', action.iconColor, 'opacity-50')} />
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
