'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, IndianRupee, Building2, Users, FileBarChart, Calendar,
  Download, Eye, ChevronLeft, ArrowRight, BarChart3, Clock,
  TrendingUp, UserCheck, Activity, FileText, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

// ============================
// Animation Variants
// ============================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

// ============================
// Types
// ============================

type ReportType = 'call-performance' | 'revenue' | 'clinic-comparison' | 'patient-insights';

interface ReportTemplate {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  meta: string;
  metaIcon: React.ElementType;
}

interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  dateRange: string;
}

// ============================
// Report Templates
// ============================

const reportTemplates: ReportTemplate[] = [
  {
    id: 'call-performance',
    title: 'Call Performance Report',
    description: 'Analyze call volumes, durations, answer rates, and booking conversions across all clinics.',
    icon: Phone,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    meta: 'Last 30 days',
    metaIcon: Calendar,
  },
  {
    id: 'revenue',
    title: 'Revenue Report',
    description: 'Track MRR, ARR, payment collection rates, and revenue trends across plans.',
    icon: IndianRupee,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    meta: 'MRR ₹34,995 / ARR ₹4,19,940',
    metaIcon: TrendingUp,
  },
  {
    id: 'clinic-comparison',
    title: 'Clinic Comparison',
    description: 'Compare clinic performance side by side: calls, bookings, revenue, and growth rates.',
    icon: Building2,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    meta: '5 clinics',
    metaIcon: Building2,
  },
  {
    id: 'patient-insights',
    title: 'Patient Insights',
    description: 'Understand patient demographics, peak booking times, and popular services.',
    icon: Users,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    meta: '2,847 total patients',
    metaIcon: UserCheck,
  },
];

// ============================
// Mock Report Data
// ============================

const callPerformanceData = [
  { date: '01/03', calls: 142, answered: 128, bookings: 38, avgDuration: '2m 15s' },
  { date: '02/03', calls: 156, answered: 141, bookings: 45, avgDuration: '2m 08s' },
  { date: '03/03', calls: 138, answered: 119, bookings: 32, avgDuration: '2m 22s' },
  { date: '04/03', calls: 167, answered: 152, bookings: 51, avgDuration: '1m 55s' },
  { date: '05/03', calls: 174, answered: 160, bookings: 56, avgDuration: '2m 01s' },
  { date: '06/03', calls: 148, answered: 131, bookings: 39, avgDuration: '2m 18s' },
  { date: '07/03', calls: 159, answered: 145, bookings: 47, avgDuration: '2m 10s' },
  { date: '08/03', calls: 181, answered: 166, bookings: 58, avgDuration: '1m 52s' },
  { date: '09/03', calls: 193, answered: 178, bookings: 63, avgDuration: '1m 48s' },
  { date: '10/03', calls: 172, answered: 155, bookings: 52, avgDuration: '2m 05s' },
];

const revenueChartData = [
  { month: 'Oct', revenue: 120000, newClinics: 1, churned: 0 },
  { month: 'Nov', revenue: 145000, newClinics: 1, churned: 0 },
  { month: 'Dec', revenue: 160000, newClinics: 0, churned: 0 },
  { month: 'Jan', revenue: 185000, newClinics: 1, churned: 0 },
  { month: 'Feb', revenue: 210000, newClinics: 0, churned: 0 },
  { month: 'Mar', revenue: 240000, newClinics: 1, churned: 0 },
];

const clinicComparisonData = [
  { clinic: 'Sharma Dental', calls: 186, bookings: 62, revenue: 6999, conversion: '33.3%' },
  { clinic: 'Agarwal Eye', calls: 164, bookings: 58, revenue: 14999, conversion: '35.4%' },
  { clinic: 'Patel Physio', calls: 142, bookings: 41, revenue: 2999, conversion: '28.9%' },
  { clinic: 'Gupta Skin', calls: 128, bookings: 39, revenue: 6999, conversion: '30.5%' },
  { clinic: 'Reddy Ortho', calls: 115, bookings: 35, revenue: 2999, conversion: '30.4%' },
];

const patientInsightsData = [
  { hour: '8AM', patients: 12, bookings: 8 },
  { hour: '9AM', patients: 28, bookings: 19 },
  { hour: '10AM', patients: 45, bookings: 32 },
  { hour: '11AM', patients: 52, bookings: 38 },
  { hour: '12PM', patients: 38, bookings: 24 },
  { hour: '1PM', patients: 22, bookings: 14 },
  { hour: '2PM', patients: 31, bookings: 21 },
  { hour: '3PM', patients: 48, bookings: 35 },
  { hour: '4PM', patients: 55, bookings: 40 },
  { hour: '5PM', patients: 42, bookings: 29 },
  { hour: '6PM', patients: 35, bookings: 22 },
  { hour: '7PM', patients: 18, bookings: 11 },
];

// ============================
// Custom Tooltip
// ============================

function ReportChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400 capitalize">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('amount')
              ? `₹${entry.value.toLocaleString('en-IN')}`
              : entry.value.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================
// Report Preview Component
// ============================

function ReportPreview({
  reportType,
  startDate,
  endDate,
  onBack,
}: {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  onBack: () => void;
}) {
  const template = reportTemplates.find(t => t.id === reportType)!;
  const clinicName = 'All Clinics';
  const dateRangeLabel = `${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : '01/01/2025'} — ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}`;

  const handleDownloadPDF = () => {
    toast.success('Report downloaded as PDF!');
  };

  const handleDownloadCSV = () => {
    toast.success('Report downloaded as CSV!');
  };

  const renderChart = () => {
    switch (reportType) {
      case 'call-performance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Calls', value: '1,630', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Answer Rate', value: '92.1%', icon: Activity, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { label: 'Bookings', value: '481', icon: Calendar, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Avg Duration', value: '2m 07s', icon: Clock, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    variants={scaleIn}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', stat.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', stat.color)} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={callPerformanceData}>
                  <defs>
                    <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<ReportChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="calls" stroke="#10b981" fill="url(#callGradient)" strokeWidth={2} name="Calls" />
                  <Area type="monotone" dataKey="bookings" stroke="#f59e0b" fill="url(#bookingGradient)" strokeWidth={2} name="Bookings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Date</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Calls</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Answered</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Bookings</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {callPerformanceData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-4 text-slate-700 dark:text-slate-300 text-xs font-mono">{row.date}</td>
                          <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white text-xs">{row.calls}</td>
                          <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 text-xs hidden sm:table-cell">{row.answered}</td>
                          <td className="py-2 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{row.bookings}</td>
                          <td className="py-2 px-4 text-right text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{row.avgDuration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'revenue':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total MRR', value: '₹34,995', icon: IndianRupee, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Total ARR', value: '₹4,19,940', icon: TrendingUp, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { label: 'New MRR (Mar)', value: '₹6,999', icon: ArrowRight, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Churn Rate', value: '0%', icon: Activity, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    variants={scaleIn}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', stat.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', stat.color)} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ReportChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fill="url(#revGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', stroke: 'white', strokeWidth: 2 }}
                    name="revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Month</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Revenue</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">New Clinics</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Churned</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Growth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {revenueChartData.map((row, idx) => {
                        const prevRevenue = idx > 0 ? revenueChartData[idx - 1].revenue : row.revenue;
                        const growth = ((row.revenue - prevRevenue) / prevRevenue * 100).toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2 px-4 text-slate-700 dark:text-slate-300 text-xs font-medium">{row.month} 2025</td>
                            <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white text-xs">₹{row.revenue.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 text-xs hidden sm:table-cell">{row.newClinics}</td>
                            <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 text-xs hidden sm:table-cell">{row.churned}</td>
                            <td className="py-2 px-4 text-right">
                              <span className={cn('text-xs font-semibold', Number(growth) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                {Number(growth) >= 0 ? '+' : ''}{growth}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'clinic-comparison':
        return (
          <div className="space-y-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clinicComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="clinic" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<ReportChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="calls" fill="#10b981" radius={[4, 4, 0, 0]} name="Calls" />
                  <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Clinic Performance Table</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Clinic</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Calls</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Bookings</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Revenue</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {clinicComparisonData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-4 text-slate-900 dark:text-white text-xs font-medium">{row.clinic}</td>
                          <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white text-xs">{row.calls}</td>
                          <td className="py-2 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{row.bookings}</td>
                          <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400 text-xs hidden sm:table-cell">₹{row.revenue.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-4 text-right">
                            <Badge variant="outline" className={cn(
                              'text-[10px] font-medium',
                              Number(row.conversion) >= 35
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : Number(row.conversion) >= 30
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            )}>
                              {row.conversion}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'patient-insights':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Patients', value: '2,847', icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'New This Month', value: '342', icon: UserCheck, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { label: 'Peak Hour', value: '4 PM', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Top Service', value: 'Dental', icon: Activity, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    variants={scaleIn}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', stat.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', stat.color)} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientInsightsData}>
                  <defs>
                    <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="bookingBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<ReportChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="patients" fill="url(#patientGradient)" stroke="#10b981" radius={[4, 4, 0, 0]} name="Patients" />
                  <Bar dataKey="bookings" fill="url(#bookingBarGradient)" stroke="#14b8a6" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hourly Patient Flow</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Hour</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Patients</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Bookings</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {patientInsightsData.map((row, idx) => {
                        const rate = ((row.bookings / row.patients) * 100).toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2 px-4 text-slate-700 dark:text-slate-300 text-xs font-medium">{row.hour}</td>
                            <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-white text-xs">{row.patients}</td>
                            <td className="py-2 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{row.bookings}</td>
                            <td className="py-2 px-4 text-right text-xs">
                              <span className="text-amber-600 dark:text-amber-400 font-medium">{rate}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <motion.div variants={itemAnim} className="space-y-6">
      {/* Back button + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            onClick={onBack}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{template.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{dateRangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
            onClick={handleDownloadCSV}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download CSV
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleDownloadPDF}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Report Header Card */}
      <motion.div variants={scaleIn}>
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <template.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">{template.title}</h3>
                <p className="text-emerald-100 text-xs mt-0.5">{clinicName} • {dateRangeLabel}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generated on {format(new Date(), 'dd/MM/yyyy')} at {format(new Date(), 'hh:mm a')} IST
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Chart + Data */}
      <motion.div variants={itemAnim}>
        {renderChart()}
      </motion.div>
    </motion.div>
  );
}

// ============================
// Main Component
// ============================

export default function AdminReports() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([
    { id: 'r1', type: 'call-performance', title: 'Call Performance Report', generatedAt: '15/03/2025', dateRange: '01/03/2025 — 15/03/2025' },
    { id: 'r2', type: 'revenue', title: 'Revenue Report', generatedAt: '14/03/2025', dateRange: '01/10/2024 — 31/03/2025' },
    { id: 'r3', type: 'clinic-comparison', title: 'Clinic Comparison', generatedAt: '12/03/2025', dateRange: '01/01/2025 — 12/03/2025' },
    { id: 'r4', type: 'patient-insights', title: 'Patient Insights', generatedAt: '10/03/2025', dateRange: '01/03/2025 — 10/03/2025' },
    { id: 'r5', type: 'call-performance', title: 'Call Performance Report', generatedAt: '08/03/2025', dateRange: '01/02/2025 — 28/02/2025' },
  ]);

  const handleGenerate = (reportType: ReportType) => {
    setGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      const template = reportTemplates.find(t => t.id === reportType)!;
      const newReport: GeneratedReport = {
        id: `r${Date.now()}`,
        type: reportType,
        title: template.title,
        generatedAt: format(new Date(), 'dd/MM/yyyy'),
        dateRange: `${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : '01/01/2025'} — ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}`,
      };
      setRecentReports(prev => [newReport, ...prev].slice(0, 5));
      setActiveReport(reportType);
      setGenerating(false);
      toast.success(`${template.title} generated successfully!`);
    }, 1200);
  };

  const handleViewReport = (report: GeneratedReport) => {
    setActiveReport(report.type);
  };

  if (activeReport) {
    return (
      <div className="space-y-6">
        <motion.div variants={container} initial="hidden" animate="show">
          <ReportPreview
            reportType={activeReport}
            startDate={startDate}
            endDate={endDate}
            onBack={() => setActiveReport(null)}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ================================ */}
      {/* Page Header                       */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reports</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generate and download detailed analytics reports</p>
            </div>
          </div>
          <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 w-fit">
            {recentReports.length} reports generated
          </Badge>
        </div>
      </motion.div>

      {/* ================================ */}
      {/* Date Range Picker                 */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date Range</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:w-auto">
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <span className="text-slate-400 dark:text-slate-500 text-sm mt-5">to</span>
                <div className="flex-1 sm:w-auto">
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
                onClick={() => {
                  setStartDate('');
                  setEndDate(format(new Date(), 'yyyy-MM-dd'));
                  toast.success('Date range reset');
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Report Templates                  */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Report Templates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTemplates.map((template) => {
            const Icon = template.icon;
            const MetaIcon = template.metaIcon;
            return (
              <motion.div
                key={template.id}
                variants={scaleIn}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <Card className="border-slate-200 dark:border-slate-800 h-full hover:shadow-lg transition-shadow group cursor-pointer">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', template.iconBg)}>
                        <Icon className={cn('w-5 h-5', template.iconColor)} />
                      </div>
                      <div className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium',
                        'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      )}>
                        <MetaIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{template.meta}</span>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{template.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 mb-4 leading-relaxed">{template.description}</p>
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={() => handleGenerate(template.id)}
                      disabled={generating}
                    >
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <>
                          Generate
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ================================ */}
      {/* Recent Reports                    */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-base">Recent Reports</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 5 generated reports</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Report Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">Date Range</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Generated</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {recentReports.map((report, idx) => {
                    const template = reportTemplates.find(t => t.id === report.type);
                    const ReportIcon = template?.icon || FileText;
                    return (
                      <motion.tr
                        key={report.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', template?.iconBg)}>
                              <ReportIcon className={cn('w-3.5 h-3.5', template?.iconColor)} />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white text-xs">{report.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">{report.dateRange}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{report.generatedAt}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
