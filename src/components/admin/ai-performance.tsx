'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Zap, Target, Clock, Star, AlertTriangle, Activity, Globe, MessageSquare, Mic,
  CheckCircle, TrendingUp, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';

// ============================
// Animation Variants
// ============================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ============================
// Custom Tooltip
// ============================

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.value}{entry.name === 'Rate' ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ============================
// Demo Data
// ============================

const KPI_DATA = [
  { label: 'AI Booking Rate', value: '87.3%', icon: Target, color: 'emerald', trend: '↑ 2.1%', trendColor: 'text-emerald-500' },
  { label: 'Avg Response Time', value: '1.2s', icon: Zap, color: 'teal', trend: null },
  { label: 'Intent Accuracy', value: '96.4%', icon: Brain, color: 'amber', trend: null },
  { label: 'Call Completion', value: '94.1%', icon: CheckCircle, color: 'emerald', trend: null },
  { label: 'Patient Satisfaction', value: '4.8/5', icon: Star, color: 'amber', trend: null },
  { label: 'Escalation Rate', value: '5.9%', icon: AlertTriangle, color: 'rose', trend: null },
];

const INTENT_DATA = [
  { name: 'Emergency Detection', accuracy: 99, color: '#10b981' },
  { name: 'General Inquiry', accuracy: 97, color: '#14b8a6' },
  { name: 'Appointment Booking', accuracy: 94, color: '#f59e0b' },
  { name: 'Rescheduling', accuracy: 91, color: '#f97316' },
  { name: 'Insurance Query', accuracy: 88, color: '#8b5cf6' },
];

const CALL_COMPLETION_DATA = [
  { day: 'Mon', rate: 92 },
  { day: 'Tue', rate: 95 },
  { day: 'Wed', rate: 93 },
  { day: 'Thu', rate: 96 },
  { day: 'Fri', rate: 94 },
  { day: 'Sat', rate: 91 },
  { day: 'Sun', rate: 89 },
];

const RESPONSE_TIME_DATA = [
  { t: '12AM', v: 1.4 }, { t: '4AM', v: 1.1 }, { t: '8AM', v: 1.3 },
  { t: '12PM', v: 1.5 }, { t: '4PM', v: 1.2 }, { t: '8PM', v: 1.0 },
];

const LANGUAGE_DATA = [
  { name: 'Hinglish', value: 62, color: '#10b981' },
  { name: 'English', value: 28, color: '#14b8a6' },
  { name: 'Hindi', value: 10, color: '#f59e0b' },
];

const TOPIC_DATA = [
  { topic: 'Dental Checkup', pct: 34 },
  { topic: 'Root Canal', pct: 18 },
  { topic: 'Teeth Cleaning', pct: 15 },
  { topic: 'Braces Consultation', pct: 12 },
  { topic: 'Emergency', pct: 8 },
];

const AGENT_HEALTH = [
  { name: 'Gemini API', status: '99.95% uptime', healthy: true },
  { name: 'Speech-to-Text', status: '99.98% uptime', healthy: true },
  { name: 'Function Calling', status: '100% success rate', healthy: true },
];

// ============================
// Color Config
// ============================

const KPI_COLORS: Record<string, { bg: string; text: string; iconBg: string; border: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-700 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    border: 'border-teal-200 dark:border-teal-800',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/40',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

// ============================
// Sparkline Bars Component
// ============================

function SparklineBars({ values, height = 24 }: { values: number[]; height?: number }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {values.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: 0.4 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
          className="w-1.5 rounded-sm bg-teal-400 dark:bg-teal-500"
          style={{ opacity: 0.5 + (i / values.length) * 0.5 }}
        />
      ))}
    </div>
  );
}

// ============================
// Circular Progress Component
// ============================

function CircularProgress({ value, size = 56, strokeWidth = 5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          className="stroke-amber-500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-800 dark:text-white">{value}%</span>
    </div>
  );
}

// ============================
// Star Rating Component
// ============================

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-4 h-4',
            i < Math.floor(rating)
              ? 'text-amber-400 fill-amber-400'
              : i < rating
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-slate-200 dark:text-slate-700'
          )}
        />
      ))}
    </div>
  );
}

// ============================
// Main Component
// ============================

export default function AIPerformance() {
  const [activeLanguage, setActiveLanguage] = useState<number | null>(null);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Page Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Performance Dashboard</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Detailed analytics for AI agent metrics and health</p>
          </div>
        </div>
      </motion.div>

      {/* ================================ */}
      {/* KPI Cards - 2x3 / 3x2 Grid     */}
      {/* ================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {KPI_DATA.map((kpi, i) => {
          const colors = KPI_COLORS[kpi.color];
          const Icon = kpi.icon;
          const isEscalation = kpi.label === 'Escalation Rate';

          return (
            <motion.div
              key={i}
              variants={item}
              whileHover={{ y: -3, boxShadow: '0 8px 25px -5px rgba(0,0,0,0.1)' }}
              className={cn(
                'rounded-xl border p-4 relative overflow-hidden transition-all cursor-default',
                colors.bg, colors.border,
                isEscalation && 'ring-1 ring-rose-200 dark:ring-rose-800'
              )}
            >
              {/* Gradient overlay */}
              <div className={cn(
                'absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-30 pointer-events-none',
                kpi.color === 'emerald' ? 'bg-emerald-300 dark:bg-emerald-600' :
                kpi.color === 'teal' ? 'bg-teal-300 dark:bg-teal-600' :
                kpi.color === 'amber' ? 'bg-amber-300 dark:bg-amber-600' :
                'bg-rose-300 dark:bg-rose-600'
              )} />

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.iconBg)}>
                    <Icon className={cn('w-4.5 h-4.5', colors.text)} />
                  </div>
                  {kpi.trend && (
                    <span className={cn('text-xs font-semibold flex items-center gap-0.5', kpi.trendColor)}>
                      <ArrowUpRight className="w-3 h-3" />
                      {kpi.trend}
                    </span>
                  )}
                </div>

                <p className={cn('text-2xl font-bold', colors.text)}>{kpi.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</p>

                {/* Sparkline for Avg Response Time */}
                {kpi.label === 'Avg Response Time' && (
                  <div className="mt-2">
                    <SparklineBars values={[1.1, 1.3, 1.2, 1.4, 1.1, 1.0, 1.2]} />
                  </div>
                )}

                {/* Circular Progress for Intent Accuracy */}
                {kpi.label === 'Intent Accuracy' && (
                  <div className="mt-2 flex items-center gap-2">
                    <CircularProgress value={96.4} size={48} strokeWidth={4} />
                  </div>
                )}

                {/* Bar chart for Call Completion */}
                {kpi.label === 'Call Completion' && (
                  <div className="mt-2">
                    <SparklineBars values={[92, 95, 93, 96, 94, 91, 89]} height={20} />
                  </div>
                )}

                {/* Star Rating for Patient Satisfaction */}
                {kpi.label === 'Patient Satisfaction' && (
                  <div className="mt-2">
                    <StarRating rating={4.8} />
                  </div>
                )}

                {/* Warning indicator for Escalation Rate */}
                {isEscalation && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">Above 5% threshold</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ================================ */}
      {/* Charts Row                        */}
      {/* ================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Intent Recognition Breakdown */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Intent Recognition Breakdown</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Accuracy per intent type</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {INTENT_DATA.map((intent, i) => (
                  <motion.div
                    key={intent.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{intent.name}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{intent.accuracy}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${intent.accuracy}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: intent.color }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call Completion - 7 Day Bar Chart */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Call Completion Rate</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 7 days performance</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CALL_COMPLETION_DATA} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="rate" name="Rate" radius={[6, 6, 0, 0]}>
                      {CALL_COMPLETION_DATA.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.rate >= 95 ? '#10b981' : entry.rate >= 92 ? '#14b8a6' : '#f59e0b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================ */}
      {/* Bottom Row: Health, Language, Topics */}
      {/* ================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* AI Agent Health */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Agent Health</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Service status</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">All Systems Operational</span>
              </div>
              <div className="space-y-3">
                {AGENT_HEALTH.map((service, i) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{service.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{service.status}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Language Distribution - Donut Chart */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Language Distribution</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Call language breakdown</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={LANGUAGE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActiveLanguage(index)}
                      onMouseLeave={() => setActiveLanguage(null)}
                      animationBegin={300}
                      animationDuration={800}
                    >
                      {LANGUAGE_DATA.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.color}
                          stroke={activeLanguage === index ? 'white' : 'transparent'}
                          strokeWidth={activeLanguage === index ? 3 : 0}
                          style={{
                            transform: activeLanguage === index ? 'scale(1.08)' : 'scale(1)',
                            transformOrigin: 'center',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Share']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {LANGUAGE_DATA.map((lang, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                    <span className="text-slate-500 dark:text-slate-400">{lang.name} ({lang.value}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Conversation Topics */}
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Top Conversation Topics</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Most discussed subjects</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TOPIC_DATA.map((item_data, i) => (
                  <motion.div
                    key={item_data.topic}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{item_data.topic}</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">{item_data.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item_data.pct}%` }}
                          transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================ */}
      {/* Response Time Trend - Area Chart  */}
      {/* ================================ */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Response Time Trend</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">AI response latency over the day</p>
                </div>
              </div>
              <Badge className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                Avg 1.2s
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={RESPONSE_TIME_DATA}>
                  <defs>
                    <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="t" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0.5, 2]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}s`} axisLine={false} tickLine={false} width={35} />
                  <Tooltip
                    formatter={(value: number) => [`${value}s`, 'Response Time']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fill="url(#responseGradient)"
                    dot={{ r: 4, fill: '#14b8a6', stroke: 'white', strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: '#14b8a6', strokeWidth: 2, fill: 'white' }}
                    animationBegin={300}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
