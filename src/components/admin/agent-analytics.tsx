'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, PhoneCall, Clock, TrendingUp, Users, CheckCircle2,
  AlertTriangle, XCircle, ArrowUpRight, ArrowDownRight, RefreshCw,
  Phone, PhoneOff, PhoneIncoming, CalendarCheck, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { toast } from 'sonner';

/* ── Types ── */
interface AgentConfig {
  id: string;
  clinicId: string;
  clinic: {
    id: string;
    name: string;
    doctorName: string;
    city: string;
    status: string;
    phone: string;
  };
  agentStatus: string;
  language: string;
  greetingMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClinicStats {
  id: string;
  name: string;
  doctorName: string;
  city: string;
  status: string;
  _count: { calls: number; appointments: number };
}

interface MetricsData {
  totalCalls: number;
  todayCalls: number;
  totalAppointments: number;
  todayAppointments: number;
  missedCallsToday: number;
  transferredCallsToday: number;
  clinicsWithStats: ClinicStats[];
  callStatusCounts: { status: string; count: number }[];
  totalRevenue: number;
  activeClinics: number;
}

/* ── Animated counter ── */
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{displayed.toLocaleString('en-IN')}</>;
}

/* ── Custom Tooltip for charts ── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3">
      <p className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Container & Item animation variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ── Funnel chart data ── */
const funnelData = [
  { stage: 'Ringing', value: 100, fill: '#94a3b8', dropoff: null },
  { stage: 'Answered', value: 78, fill: '#14b8a6', dropoff: '22%' },
  { stage: 'Intent Captured', value: 52, fill: '#10b981', dropoff: '33%' },
  { stage: 'Booked', value: 34, fill: '#059669', dropoff: '35%' },
];

/* ── Health status helpers ── */
function getHealthColor(status: string): string {
  switch (status) {
    case 'active': return 'text-emerald-500';
    case 'trial': return 'text-amber-500';
    case 'idle': return 'text-slate-400';
    default: return 'text-rose-500';
  }
}

function getHealthBg(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500';
    case 'trial': return 'bg-amber-500';
    case 'idle': return 'bg-slate-400';
    default: return 'bg-rose-500';
  }
}

function getHealthLabel(status: string): string {
  switch (status) {
    case 'active': return 'Healthy';
    case 'trial': return 'Trial';
    case 'idle': return 'Idle';
    case 'suspended': return 'Suspended';
    case 'overdue': return 'Overdue';
    default: return status;
  }
}

function getHealthIcon(status: string): React.ElementType {
  switch (status) {
    case 'active': return CheckCircle2;
    case 'trial': return AlertTriangle;
    default: return XCircle;
  }
}

/* ── Main Component ── */
export default function AgentAnalyticsDashboard() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configsRes, metricsRes] = await Promise.allSettled([
        fetch('/api/admin/agent-config'),
        fetch('/api/admin/metrics'),
      ]);

      if (configsRes.status === 'fulfilled' && configsRes.value.ok) {
        const data = await configsRes.value.json();
        setConfigs(data.configs || []);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const data = await metricsRes.value.json();
        setMetrics(data);
      }
    } catch {
      toast.error('Failed to fetch agent analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ── Derived metrics ── */
  const summaryStats = useMemo(() => {
    const totalCalls = metrics?.totalCalls ?? 0;
    const totalAppointments = metrics?.totalAppointments ?? 0;
    const conversionRate = totalCalls > 0 ? ((totalAppointments / totalCalls) * 100).toFixed(1) : '0.0';
    const activeAgents = configs.filter(c => c.agentStatus === 'active' || c.clinic?.status === 'active').length;

    return { totalCalls, totalAppointments, conversionRate, activeAgents };
  }, [metrics, configs]);

  /* ── Agent performance data (merge configs with clinic stats) ── */
  const agentPerformance = useMemo(() => {
    const clinicStatsMap = new Map<string, ClinicStats>();
    (metrics?.clinicsWithStats || []).forEach(c => clinicStatsMap.set(c.id, c));

    return configs.map(config => {
      const stats = clinicStatsMap.get(config.clinicId);
      const calls = stats?._count.calls ?? 0;
      const bookings = stats?._count.appointments ?? 0;
      const conversionRate = calls > 0 ? ((bookings / calls) * 100).toFixed(1) : '0.0';

      return {
        id: config.id,
        clinicName: config.clinic?.name || 'Unknown',
        doctorName: config.clinic?.doctorName || '',
        city: config.clinic?.city || '',
        totalCalls: calls,
        bookings,
        conversionRate: Number(conversionRate),
        status: config.clinic?.status || config.agentStatus || 'idle',
        lastActive: config.updatedAt || config.createdAt,
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);
  }, [configs, metrics]);

  /* ── Loading state ── */
  if (loading && configs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Agent Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Per-agent performance metrics and health monitoring</p>
          </div>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agent Calls */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Agent Calls</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  <AnimatedNumber value={summaryStats.totalCalls} />
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    +{metrics?.todayCalls ?? 0} today
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Conversation Time */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Conversation</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">2m 15s</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    -8s vs last week
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Conversion Rate */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booking Conversion</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {summaryStats.conversionRate}<span className="text-base ml-0.5">%</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    +2.3% improvement
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Agents</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  <AnimatedNumber value={summaryStats.activeAgents} />
                  <span className="text-base ml-1 text-slate-400 font-normal">/ {configs.length}</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {configs.length - summaryStats.activeAgents} inactive
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Conversion Funnel Chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <PhoneIncoming className="w-4 h-4 text-teal-500" />
                  Conversion Funnel
                </CardTitle>
                <CardDescription>Call flow from ringing to booked appointment</CardDescription>
              </div>
              <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
                Overall: {summaryStats.conversionRate}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((item, index) => (
                <div key={item.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.stage}</span>
                    <div className="flex items-center gap-3">
                      {item.dropoff && (
                        <span className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3" />
                          {item.dropoff}
                        </span>
                      )}
                      <span className="font-bold text-slate-900 dark:text-white">{item.value}%</span>
                    </div>
                  </div>
                  <div className="relative h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <motion.div
                      className="h-full rounded-lg relative overflow-hidden"
                      style={{ backgroundColor: item.fill }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 0.8, delay: index * 0.15, ease: 'easeOut' }}
                    >
                      {/* Animated shine */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 1.5, delay: index * 0.15 + 0.5, ease: 'easeInOut' }}
                      />
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>

            {/* Funnel summary */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">78%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Answer Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">67%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Intent Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{summaryStats.conversionRate}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Booking Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">1.4m</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avg Speed to Answer</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-column layout: Agent Performance Table + Agent Health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Agent Performance Table */}
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                Agent Performance
              </CardTitle>
              <CardDescription>
                Per-agent call volume, bookings, and conversion metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentPerformance.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No agent configurations found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Configure agents in the Agent Setup tab to see analytics
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Clinic</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">City</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Calls</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Bookings</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Conv. Rate</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentPerformance.map((agent, i) => (
                        <tr
                          key={agent.id}
                          className={cn(
                            'border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30',
                            i % 2 === 1 && 'bg-slate-50/30 dark:bg-slate-800/15',
                          )}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{agent.clinicName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{agent.doctorName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{agent.city}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-slate-900 dark:text-white">{agent.totalCalls}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{agent.bookings}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-mono text-xs',
                                agent.conversionRate >= 40
                                  ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                  : agent.conversionRate >= 20
                                    ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                    : 'border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
                              )}
                            >
                              {agent.conversionRate}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                            {new Date(agent.lastActive).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Health Status */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Agent Health
              </CardTitle>
              <CardDescription>
                Real-time status of each configured agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <div className="text-center py-12">
                  <PhoneOff className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No agents configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {configs.map((config, index) => {
                    const status = config.clinic?.status || config.agentStatus || 'idle';
                    const HealthIcon = getHealthIcon(status);
                    return (
                      <motion.div
                        key={config.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06, duration: 0.3 }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          status === 'active'
                            ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : status === 'trial'
                              ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30',
                        )}
                      >
                        {/* Status indicator */}
                        <div className="relative flex-shrink-0">
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', getHealthBg(status) + '/15')}>
                            <HealthIcon className={cn('w-4 h-4', getHealthColor(status))} />
                          </div>
                          {status === 'active' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {config.clinic?.name || 'Unknown Clinic'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {config.clinic?.city || 'N/A'} · {config.language || 'en'}
                          </p>
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 flex-shrink-0',
                            status === 'active'
                              ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                              : status === 'trial'
                                ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                                : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400',
                          )}
                        >
                          {getHealthLabel(status)}
                        </Badge>
                      </motion.div>
                    );
                  })}

                  {/* Health summary */}
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active: {configs.filter(c => c.clinic?.status === 'active' || c.agentStatus === 'active').length}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Trial: {configs.filter(c => c.clinic?.status === 'trial').length}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Issues: {configs.filter(c => c.clinic?.status === 'suspended' || c.clinic?.status === 'overdue').length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Agent Call Distribution Chart */}
      {agentPerformance.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="w-4 h-4 text-amber-500" />
                Calls by Agent
              </CardTitle>
              <CardDescription>
                Total calls handled by each configured agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentPerformance} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis
                    dataKey="clinicName"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="totalCalls" name="Total Calls" radius={[6, 6, 0, 0]} animationDuration={800}>
                    {agentPerformance.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index % 2 === 0 ? '#10b981' : '#14b8a6'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="bookings" name="Bookings" radius={[6, 6, 0, 0]} animationDuration={1000}>
                    {agentPerformance.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index % 2 === 0 ? '#f59e0b' : '#f97316'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Insights Footer */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200/60 dark:border-emerald-800/40">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Agent Analytics Insights</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {summaryStats.activeAgents > 0
                    ? `${summaryStats.activeAgents} agent${summaryStats.activeAgents > 1 ? 's' : ''} actively processing calls with ${summaryStats.conversionRate}% booking conversion rate.`
                    : 'Configure agents and enable SIP trunking to start seeing analytics.'}
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                {configs.length} agent{configs.length !== 1 ? 's' : ''} configured
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
