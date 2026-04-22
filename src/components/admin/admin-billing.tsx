'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, AlertTriangle, TrendingUp, IndianRupee, ArrowUpCircle, CheckCircle,
  Star, Zap, Crown, FileText, Download, Eye, Send, Wallet, Clock, Receipt,
  ChevronDown, Building2, CalendarDays, Hash, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';

// ============================
// Types
// ============================

interface ClinicBilling {
  id: string;
  name: string;
  doctorName: string;
  planType: string;
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  consultationFee: string | null;
  _count: { calls: number; appointments: number };
  totalCalls: number;
  totalBookings: number;
}

interface Invoice {
  id: string;
  clinicId: string;
  clinicName: string;
  doctorName: string;
  planType: string;
  planLabel: string;
  amount: number;
  subtotal: number;
  tax: number;
  status: 'paid' | 'pending' | 'overdue';
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

interface InvoiceSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalInvoices: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

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
// Constants
// ============================

const PLAN_PRICES: Record<string, number> = {
  starter: 2999,
  pro: 6999,
  enterprise: 14999,
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  pro: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  enterprise: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
};

const PLAN_STYLES: Record<string, { gradient: string; icon: React.ElementType; iconColor: string; features: string[] }> = {
  starter: {
    gradient: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 border-slate-200 dark:border-slate-700',
    icon: CreditCard,
    iconColor: 'text-slate-500',
    features: ['Basic AI features', '500 calls/mo', 'Email support'],
  },
  pro: {
    gradient: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 border-emerald-300 dark:border-emerald-700',
    icon: Zap,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    features: ['Advanced AI', '2000 calls/mo', 'Analytics dashboard', 'Priority support'],
  },
  enterprise: {
    gradient: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 border-amber-300 dark:border-amber-700',
    icon: Crown,
    iconColor: 'text-amber-600 dark:text-amber-400',
    features: ['Full AI suite', 'Unlimited calls', 'Custom integrations', '24/7 priority support', 'Dedicated manager'],
  },
};

const INVOICE_STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};

type InvoiceFilterType = 'all' | 'paid' | 'pending' | 'overdue';

const INVOICE_FILTER_TABS: { value: InvoiceFilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
];

// ============================
// Chart Demo Data
// ============================

const revenueData = [
  { month: 'Oct', revenue: 120000 },
  { month: 'Nov', revenue: 145000 },
  { month: 'Dec', revenue: 160000 },
  { month: 'Jan', revenue: 185000 },
  { month: 'Feb', revenue: 210000 },
  { month: 'Mar', revenue: 240000 },
];

const planDistributionData = [
  { name: 'Starter', value: 2, revenue: 5998, color: '#64748b' },
  { name: 'Pro', value: 2, revenue: 13998, color: '#10b981' },
  { name: 'Enterprise', value: 1, revenue: 14999, color: '#f59e0b' },
];

// Custom tooltip for charts
function BillingChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {entry.name === 'revenue' ? `₹${entry.value.toLocaleString('en-IN')}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================
// Component
// ============================

export default function AdminBilling() {
  // Clinic billing state
  const [clinics, setClinics] = useState<ClinicBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('all');
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicBilling | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [updating, setUpdating] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilterType>('all');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // ============================
  // Data Fetching
  // ============================

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (planFilter !== 'all') params.set('status', planFilter);
      const res = await fetch(`/api/admin/clinics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [planFilter]);

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const res = await fetch('/api/admin/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setInvoiceSummary(data.summary || null);
      }
    } catch { /* silently fail */ }
    finally { setInvoicesLoading(false); }
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ============================
  // Actions
  // ============================

  const handleChangePlan = async () => {
    if (!selectedClinic || !newPlan) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedClinic.id, planType: newPlan }),
      });
      if (res.ok) {
        toast.success(`${selectedClinic.name} plan updated to ${newPlan}`);
        setShowPlanDialog(false);
        fetchClinics();
        fetchInvoices();
      } else {
        toast.error('Failed to update plan');
      }
    } catch {
      toast.error('Failed to update plan');
    }
    finally { setUpdating(false); }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    toast.success(`Invoice ${invoice.id} downloaded`);
  };

  const handleSendReminder = (invoice: Invoice) => {
    toast.success(`Payment reminder sent to ${invoice.clinicName}`);
  };

  const handleBulkReminders = () => {
    const overdueClinics = new Set(
      invoices.filter(inv => inv.status === 'overdue').map(inv => inv.clinicName)
    );
    toast.success(`Payment reminders sent to ${overdueClinics.size} clinic(s)`);
  };

  // ============================
  // Computed Values
  // ============================

  const overdueCount = clinics.filter(c => c.status === 'overdue').length;
  const trialCount = clinics.filter(c => c.status === 'trial').length;
  const totalMRR = clinics.reduce((sum, c) => sum + (PLAN_PRICES[c.planType] || 0), 0);

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'all') return invoices;
    return invoices.filter(inv => inv.status === invoiceFilter);
  }, [invoices, invoiceFilter]);

  // ============================
// Render
  // ============================

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ================================ */}
      {/* Revenue Summary - 4 Mini Cards  */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Revenue Summary</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Revenue',
              value: invoiceSummary?.totalAmount ?? 0,
              icon: Wallet,
              color: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
              border: 'border-emerald-200 dark:border-emerald-800',
              valueClass: 'text-slate-900 dark:text-white',
            },
            {
              label: 'Collected',
              value: invoiceSummary?.paidAmount ?? 0,
              icon: TrendingUp,
              color: 'text-teal-600 dark:text-teal-400',
              bg: 'bg-teal-50 dark:bg-teal-900/20',
              border: 'border-teal-200 dark:border-teal-800',
              valueClass: 'text-teal-700 dark:text-teal-400',
            },
            {
              label: 'Pending Payments',
              value: invoiceSummary?.pendingAmount ?? 0,
              icon: Clock,
              color: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-50 dark:bg-amber-900/20',
              border: 'border-amber-200 dark:border-amber-800',
              valueClass: 'text-amber-700 dark:text-amber-400',
            },
            {
              label: 'Overdue Amount',
              value: invoiceSummary?.overdueAmount ?? 0,
              icon: AlertTriangle,
              color: 'text-rose-600 dark:text-rose-400',
              bg: 'bg-rose-50 dark:bg-rose-900/20',
              border: 'border-rose-200 dark:border-rose-800',
              valueClass: 'text-rose-700 dark:text-rose-400',
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                variants={scaleIn}
                whileHover={{ y: -2 }}
                className={cn('rounded-xl border p-3 transition-shadow hover:shadow-md', stat.bg, stat.border)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('w-4 h-4', stat.color)} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                </div>
                <p className={cn('text-xl font-bold', stat.valueClass)}>
                  ₹{stat.value.toLocaleString('en-IN')}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ================================ */}
      {/* Revenue Growth Trend Chart        */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Revenue Growth</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monthly MRR trend over 6 months</p>
                </div>
              </div>
              <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                ↑ 23.4%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<BillingChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGradient)" strokeWidth={2} dot={{ r: 4, fill: '#10b981', stroke: 'white', strokeWidth: 2 }} name="revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Plan Distribution Pie Chart       */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-base">Plan Distribution</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Active subscriptions by plan type</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-48 w-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={300}
                      animationDuration={800}
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} clinic(s)`, 'Count']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '13px',
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3 w-full">
                {planDistributionData.map((plan) => (
                  <div key={plan.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{plan.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{plan.value}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">({plan.revenue.toLocaleString('en-IN')} MRR)</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total MRR</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{planDistributionData.reduce((s, p) => s + p.revenue, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Enhanced Overdue Alert           */}
      {/* ================================ */}
      {(overdueCount > 0 || (invoiceSummary && invoiceSummary.overdueCount > 0)) && (
        <motion.div
          variants={itemAnim}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative overflow-hidden rounded-xl border border-rose-300 dark:border-rose-700 bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 p-4 sm:p-5">
            {/* Decorative background circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-10 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 flex-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"
                >
                  <AlertTriangle className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">
                    {(invoiceSummary?.overdueCount ?? overdueCount)} Overdue Invoice(s)
                  </p>
                  <p className="text-rose-100 text-xs sm:text-sm mt-0.5">
                    Outstanding amount: ₹{(invoiceSummary?.overdueAmount ?? 0).toLocaleString('en-IN')} — Follow up immediately to prevent service disruption
                  </p>
                </div>
              </div>
              <Button
                onClick={handleBulkReminders}
                className="bg-white text-rose-600 hover:bg-rose-50 font-medium text-xs sm:text-sm shadow-lg flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Send Bulk Reminders
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================================ */}
      {/* Subscription Management Stats    */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Subscription Management</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Monthly Revenue', value: totalMRR, icon: IndianRupee, prefix: '₹', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Total Clinics', value: clinics.length, icon: Building2, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' },
            { label: 'On Trial', value: trialCount, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400', bg: overdueCount > 0 ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={i} variants={scaleIn}>
                <Card className={cn(
                  'border-slate-200 dark:border-slate-800',
                  stat.label === 'Overdue' && overdueCount > 0 && 'border-rose-200 dark:border-rose-800'
                )}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                      <Icon className={cn('w-5 h-5', stat.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.prefix}{stat.value.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ================================ */}
      {/* Plan Filter + Billing Table      */}
      {/* ================================ */}
      <motion.div variants={itemAnim} className="flex items-center gap-3">
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-40 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Filter by plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Clinic</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Trial Ends</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Monthly Fee</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Bookings</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={7} className="py-3 px-4"><Skeleton className="h-8 w-full" /></td></tr>
                    ))
                  ) : clinics.map((clinic) => (
                    <tr
                      key={clinic.id}
                      className={cn(
                        'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                        clinic.status === 'overdue' && 'bg-rose-50/30 dark:bg-rose-900/5'
                      )}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{clinic.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{clinic.doctorName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={cn('text-xs font-medium capitalize', PLAN_COLORS[clinic.planType])}>
                          {clinic.planType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <Badge variant="outline" className={cn(
                          'text-xs font-medium capitalize',
                          clinic.status === 'active' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                          clinic.status === 'trial' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                          clinic.status === 'overdue' && 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800',
                          clinic.status === 'suspended' && 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                        )}>
                          {clinic.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                        {clinic.trialEndsAt ? format(new Date(clinic.trialEndsAt), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                        ₹{PLAN_PRICES[clinic.planType]?.toLocaleString('en-IN') || '0'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-medium hidden sm:table-cell">
                        {clinic._count.appointments}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={() => { setSelectedClinic(clinic); setNewPlan(clinic.planType); setShowPlanDialog(true); }}
                        >
                          <ArrowUpCircle className="w-3 h-3 mr-1" />
                          Change
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Invoice History Section          */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Recent Invoices</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {invoiceSummary ? `${invoiceSummary.totalInvoices} total invoices` : 'Loading...'}
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {INVOICE_FILTER_TABS.map(tab => {
                  const count = tab.value === 'all'
                    ? invoices.length
                    : invoices.filter(inv => inv.status === tab.value).length;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setInvoiceFilter(tab.value)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                        invoiceFilter === tab.value
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={cn(
                          'ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full',
                          invoiceFilter === tab.value
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Invoice #</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Clinic</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">Plan</th>
                    <th className="text-right py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Amount</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Status</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Date</th>
                    <th className="text-right py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {invoicesLoading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="py-2.5 px-4">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm text-slate-400 dark:text-slate-500">No invoices found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice, idx) => {
                      const statusCfg = INVOICE_STATUS_CONFIG[invoice.status];
                      return (
                        <motion.tr
                          key={invoice.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.2 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Hash className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{invoice.id.replace('INV-', '')}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="font-medium text-slate-900 dark:text-white text-xs">{invoice.clinicName}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{invoice.doctorName}</p>
                          </td>
                          <td className="py-2.5 px-4 hidden md:table-cell">
                            <Badge variant="outline" className={cn('text-[10px] font-medium capitalize', PLAN_COLORS[invoice.planType])}>
                              {invoice.planType}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-slate-900 dark:text-white text-xs">
                            ₹{invoice.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium', statusCfg.className)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dotClass)} />
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">
                            {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => handleViewInvoice(invoice)}
                                title="View"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                onClick={() => handleDownloadInvoice(invoice)}
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
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

      {/* ================================ */}
      {/* Plan Change Dialog               */}
      {/* ================================ */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>Update plan for {selectedClinic?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {['starter', 'pro', 'enterprise'].map((plan) => {
              const planStyle = PLAN_STYLES[plan];
              const PlanIcon = planStyle.icon;
              const isPro = plan === 'pro';
              return (
                <label
                  key={plan}
                  className={cn(
                    'relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    newPlan === plan
                      ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                    planStyle.gradient
                  )}
                  onClick={() => setNewPlan(plan)}
                >
                  {isPro && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                        <Star className="w-2.5 h-2.5" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  <input type="radio" name="plan" value={plan} checked={newPlan === plan} className="sr-only" readOnly />
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                    isPro ? 'bg-emerald-500/10' : plan === 'enterprise' ? 'bg-amber-500/10' : 'bg-slate-200/50 dark:bg-slate-700/50'
                  )}>
                    <PlanIcon className={cn('w-5 h-5', planStyle.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('font-semibold capitalize text-slate-900 dark:text-white', isPro && 'text-emerald-700 dark:text-emerald-400')}>{plan}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {plan === 'starter' && 'Basic AI features, 500 calls/mo'}
                      {plan === 'pro' && 'Advanced AI, 2000 calls/mo, analytics'}
                      {plan === 'enterprise' && 'Full suite, unlimited calls, priority support'}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {planStyle.features.map((feature, fi) => (
                        <li key={fi} className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <CheckCircle className={cn('w-3 h-3 flex-shrink-0', newPlan === plan ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600')} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-slate-400 dark:text-slate-500">per month</p>
                    <p className={cn(
                      'text-2xl font-bold text-slate-900 dark:text-white',
                      isPro && 'text-emerald-700 dark:text-emerald-400'
                    )}>
                      ₹{PLAN_PRICES[plan].toLocaleString('en-IN')}
                    </p>
                  </div>
                  {newPlan === plan && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                  )}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
            <Button
              onClick={handleChangePlan}
              disabled={updating || newPlan === selectedClinic?.planType}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updating ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================ */}
      {/* Payment History Table             */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-base">Payment History</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recent payment transactions across all clinics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Date</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Clinic</th>
                    <th className="text-right py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Amount</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">Plan</th>
                    <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Status</th>
                    <th className="text-right py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {[
                    { date: '15/03/2025', clinic: 'Sharma Dental Clinic', amount: 6999, plan: 'pro', status: 'paid' as const, invoice: 'INV-0012' },
                    { date: '14/03/2025', clinic: 'Agarwal Eye Hospital', amount: 14999, plan: 'enterprise', status: 'paid' as const, invoice: 'INV-0011' },
                    { date: '12/03/2025', clinic: 'Patel Physiotherapy', amount: 2999, plan: 'starter', status: 'pending' as const, invoice: 'INV-0010' },
                    { date: '10/03/2025', clinic: 'Gupta Skin Clinic', amount: 6999, plan: 'pro', status: 'overdue' as const, invoice: 'INV-0009' },
                    { date: '08/03/2025', clinic: 'Reddy Orthopaedic', amount: 2999, plan: 'starter', status: 'paid' as const, invoice: 'INV-0008' },
                  ].map((payment, idx) => {
                    const statusCfg = INVOICE_STATUS_CONFIG[payment.status];
                    return (
                      <motion.tr
                        key={payment.invoice}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.2 }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 text-xs">{payment.date}</td>
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-slate-900 dark:text-white text-xs">{payment.clinic}</p>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900 dark:text-white text-xs hidden sm:table-cell">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 hidden md:table-cell">
                          <Badge variant="outline" className={cn('text-[10px] font-medium capitalize', PLAN_COLORS[payment.plan])}>
                            {payment.plan}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium', statusCfg.className)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dotClass)} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-auto px-2 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-mono"
                            onClick={() => {
                              const inv = invoices.find(i => i.id === payment.invoice);
                              if (inv) handleViewInvoice(inv);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            {payment.invoice.replace('INV-', '#')}
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

      {/* ================================ */}
      {/* Invoice Detail Dialog            */}
      {/* ================================ */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-lg">
          {selectedInvoice && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    INVOICE
                  </DialogTitle>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', INVOICE_STATUS_CONFIG[selectedInvoice.status].className)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', INVOICE_STATUS_CONFIG[selectedInvoice.status].dotClass)} />
                    {INVOICE_STATUS_CONFIG[selectedInvoice.status].label}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                {/* Invoice Meta */}
                <div className="flex items-start justify-between text-sm">
                  <div>
                    <p className="font-mono text-slate-900 dark:text-white font-semibold">{selectedInvoice.id}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                      Issued: {format(new Date(selectedInvoice.invoiceDate), 'dd/MM/yyyy')}
                    </p>
                    {selectedInvoice.paidDate && (
                      <p className="text-emerald-600 dark:text-emerald-400 text-xs">
                        Paid: {format(new Date(selectedInvoice.paidDate), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Due Date</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {format(new Date(selectedInvoice.dueDate), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Bill To */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Bill To</p>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{selectedInvoice.clinicName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{selectedInvoice.doctorName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedInvoice.clinicName.includes('Dental') && 'MG Road, Sector 14'}
                      {selectedInvoice.clinicName.includes('Sharma') && 'DLF Phase 2, Near Metro Station'}
                      {selectedInvoice.clinicName.includes('Patel') && 'CG Road, Navrangpura'}
                      {selectedInvoice.clinicName.includes('Gupta') && 'Jubilee Hills, Road No. 36'}
                      {selectedInvoice.clinicName.includes('Iyer') && 'Anna Nagar, 3rd Avenue'}
                      {!['Dental', 'Sharma', 'Patel', 'Gupta', 'Iyer'].some(n => selectedInvoice.clinicName.includes(n)) && 'India'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedInvoice.clinicName.includes('Dental') && 'Gurugram, Haryana — 122001'}
                      {selectedInvoice.clinicName.includes('Sharma') && 'Gurugram, Haryana — 122002'}
                      {selectedInvoice.clinicName.includes('Patel') && 'Ahmedabad, Gujarat — 380009'}
                      {selectedInvoice.clinicName.includes('Gupta') && 'Hyderabad, Telangana — 500033'}
                      {selectedInvoice.clinicName.includes('Iyer') && 'Chennai, Tamil Nadu — 600040'}
                      {!['Dental', 'Sharma', 'Patel', 'Gupta', 'Iyer'].some(n => selectedInvoice.clinicName.includes(n)) && 'India — 000000'}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 font-medium text-slate-500 dark:text-slate-400 text-xs">Description</th>
                        <th className="text-left py-2 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Billing Period</th>
                        <th className="text-right py-2 font-medium text-slate-500 dark:text-slate-400 text-xs">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 text-slate-900 dark:text-white font-medium text-xs">{selectedInvoice.planLabel}</td>
                        <td className="py-3 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">
                          {format(new Date(selectedInvoice.billingPeriodStart), 'dd MMM')} — {format(new Date(selectedInvoice.billingPeriodEnd), 'dd MMM yyyy')}
                        </td>
                        <td className="py-3 text-right text-slate-900 dark:text-white font-medium text-xs">
                          ₹{selectedInvoice.subtotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="text-slate-700 dark:text-slate-300">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">GST (18%)</span>
                    <span className="text-slate-700 dark:text-slate-300">₹{selectedInvoice.tax.toLocaleString('en-IN')}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{selectedInvoice.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'overdue') && (
                  <Button
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => handleSendReminder(selectedInvoice)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
