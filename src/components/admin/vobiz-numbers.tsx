'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Link2,
  Unlink,
  Zap,
  Activity,
  Signal,
  Server,
  Clock,
  Shield,
  ArrowUpDown,
  AlertTriangle,
  Eye,
  TestTube,
  Radio,
  Building2,
  MapPin,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================
// Animation Variants
// ============================================================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const gridItem = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
};

// ============================================================
// Types
// ============================================================

interface VobizNumber {
  phoneNumber: string;
  assigned: boolean;
  assignedTo: {
    clinicId: string;
    clinicName: string;
    city: string;
  } | null;
}

interface VobizClinicConfig {
  phoneNumber: string | null;
  trunkId: string | null;
  trunkDomain: string | null;
  credentialId: string | null;
  credentialUser: string | null;
  appId: string | null;
  appUrl: string | null;
  agentStatus: string | null;
  lastTestedAt: string | null;
  lastTestResult: string | null;
}

interface Clinic {
  id: string;
  name: string;
  doctorName: string;
  city: string;
  status: string;
  sipNumber: string | null;
  sipId: string | null;
  vobizConfig: VobizClinicConfig | null;
  isNumberAssigned: boolean;
}

interface TestResult {
  success: boolean;
  phoneNumber: string;
  latency: string;
  status: string;
  sipRegistered: boolean;
  details?: {
    codec: string;
    transport: string;
    registrationExpiry: string;
    trunkStatus: string;
  };
  error?: string;
  testedAt: string;
}

// ============================================================
// Utility: Format Indian Phone Number
// ============================================================

function formatIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw;
}

// ============================================================
// Sub-components
// ============================================================

function StatusDotPulse({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        )}
      />
    </span>
  );
}

function AgentStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <Badge className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Draft
      </Badge>
    );
  }
  const config: Record<string, { label: string; classes: string }> = {
    active: {
      label: 'Active',
      classes: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    testing: {
      label: 'Testing',
      classes: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    draft: {
      label: 'Draft',
      classes: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
  };
  const c = config[status] || config.draft;
  return (
    <Badge className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', c.classes)}>
      {c.label}
    </Badge>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function VobizNumbers() {
  const [numbers, setNumbers] = useState<VobizNumber[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignPhoneNumber, setAssignPhoneNumber] = useState('');
  const [assignClinicId, setAssignClinicId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  // Optional config fields
  const [optTrunkId, setOptTrunkId] = useState('');
  const [optTrunkDomain, setOptTrunkDomain] = useState('');
  const [optCredentialId, setOptCredentialId] = useState('');
  const [optCredentialUser, setOptCredentialUser] = useState('');
  const [optAppId, setOptAppId] = useState('');
  const [optAppUrl, setOptAppUrl] = useState('');

  // Unassign confirmation
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [unassignClinic, setUnassignClinic] = useState<Clinic | null>(null);
  const [unassignSaving, setUnassignSaving] = useState(false);

  // Test dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testClinicId, setTestClinicId] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // ============================================================
  // Data Fetching
  // ============================================================

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/vobiz-numbers');
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers || []);
        setClinics(data.clinics || []);
      }
    } catch {
      toast.error('Failed to fetch Vobiz number data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  // ============================================================
  // Stats
  // ============================================================

  const stats = {
    total: numbers.length,
    assigned: numbers.filter((n) => n.assigned).length,
    available: numbers.filter((n) => !n.assigned).length,
    activeAgents: clinics.filter((c) => c.vobizConfig?.agentStatus === 'active').length,
  };

  // ============================================================
  // Assign Handler
  // ============================================================

  const openAssignDialog = (phoneNumber: string) => {
    setAssignPhoneNumber(phoneNumber);
    setAssignClinicId('');
    setOptTrunkId('');
    setOptTrunkDomain('');
    setOptCredentialId('');
    setOptCredentialUser('');
    setOptAppId('');
    setOptAppUrl('');
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assignClinicId) {
      toast.error('Please select a clinic');
      return;
    }
    setAssignSaving(true);
    try {
      const body: Record<string, string> = {
        clinicId: assignClinicId,
        phoneNumber: assignPhoneNumber,
      };
      if (optTrunkId) body.trunkId = optTrunkId;
      if (optTrunkDomain) body.trunkDomain = optTrunkDomain;
      if (optCredentialId) body.credentialId = optCredentialId;
      if (optCredentialUser) body.credentialUser = optCredentialUser;
      if (optAppId) body.appId = optAppId;
      if (optAppUrl) body.appUrl = optAppUrl;

      const res = await fetch('/api/admin/vobiz-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Phone number assigned successfully');
        setAssignDialogOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to assign number');
      }
    } catch {
      toast.error('Network error while assigning number');
    } finally {
      setAssignSaving(false);
    }
  };

  // ============================================================
  // Unassign Handler
  // ============================================================

  const openUnassignDialog = (clinic: Clinic) => {
    setUnassignClinic(clinic);
    setUnassignDialogOpen(true);
  };

  const handleUnassign = async () => {
    if (!unassignClinic) return;
    setUnassignSaving(true);
    try {
      const res = await fetch('/api/admin/vobiz-numbers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: unassignClinic.id }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Phone number unassigned');
        setUnassignDialogOpen(false);
        setUnassignClinic(null);
        await fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to unassign number');
      }
    } catch {
      toast.error('Network error while unassigning number');
    } finally {
      setUnassignSaving(false);
    }
  };

  // ============================================================
  // Test Handler
  // ============================================================

  const openTestDialog = (phoneNumber: string, clinicId?: string) => {
    setTestPhoneNumber(phoneNumber);
    setTestClinicId(clinicId || '');
    setTestResult(null);
    setTestLoading(true);
    setTestDialogOpen(true);

    // Fire test
    const body: Record<string, string> = { phoneNumber };
    if (clinicId) body.clinicId = clinicId;

    fetch('/api/admin/vobiz-numbers/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        setTestResult(data);
      })
      .catch(() => {
        setTestResult({
          success: false,
          phoneNumber,
          latency: '—',
          status: 'failed',
          sipRegistered: false,
          error: 'Network error — could not reach test endpoint',
          testedAt: new Date().toISOString(),
        });
      })
      .finally(() => {
        setTestLoading(false);
        fetchData(); // Refresh to get updated lastTestResult
      });
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ============================================================ */}
      {/* 1. Header Card with Gradient & Stats                         */}
      {/* ============================================================ */}
      <motion.div variants={itemAnim}>
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
          {/* Emerald gradient header */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 py-6 sm:px-8 sm:py-8">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />

            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <motion.div
                  className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Phone className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Vobiz Number Management</h1>
                  <p className="text-sm text-emerald-100 mt-1 max-w-xl">
                    Provision and manage Vobiz SIP trunk phone numbers for your health clinics. Assign, test, and monitor all active phone lines.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border-white/20 self-start flex-shrink-0"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {[
              { label: 'Total Numbers', value: stats.total, icon: Phone, color: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
              { label: 'Assigned', value: stats.assigned, icon: Link2, color: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
              { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
              { label: 'Active Agents', value: stats.activeAgents, icon: Activity, color: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  className="flex items-center gap-3 px-4 sm:px-6 py-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                >
                  <div className="relative">
                    <span className={cn('inline-block w-2 h-2 rounded-full', stat.dot)} />
                    <span className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-50', stat.dot)} />
                  </div>
                  <div>
                    <p className={cn('text-2xl font-bold', stat.color)}>{loading ? '—' : stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {stat.label}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* ============================================================ */}
      {/* 2. Number Pool Grid                                           */}
      {/* ============================================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center gap-2 mb-4">
          <Signal className="w-4 h-4 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Phone Number Pool</h2>
          <Badge className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full px-2">
            {numbers.length} numbers
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <Skeleton className="h-8 w-40 mb-3" />
                  <Skeleton className="h-5 w-24 mb-4" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))
            : numbers.map((num) => {
                const isAssigned = num.assigned;
                return (
                  <motion.div
                    key={num.phoneNumber}
                    variants={gridItem}
                    whileHover={{ y: -3 }}
                    className={cn(
                      'glass-card rounded-xl p-5 transition-all duration-200 card-interactive',
                      isAssigned && 'border-gradient'
                    )}
                  >
                    {/* Phone number */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                          {formatIndianPhone(num.phoneNumber)}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                          {num.phoneNumber}
                        </p>
                      </div>
                      <StatusDotPulse active={isAssigned} />
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4">
                      {isAssigned && num.assignedTo ? (
                        <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-medium px-2.5 py-1 rounded-lg">
                          <Link2 className="w-3 h-3 mr-1" />
                          {num.assignedTo.clinicName}
                          <span className="text-amber-500 dark:text-amber-500/70 ml-1.5 text-[10px]">
                            • {num.assignedTo.city}
                          </span>
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-medium px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Available
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!isAssigned ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-medium"
                          onClick={() => openAssignDialog(num.phoneNumber)}
                        >
                          <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                          Assign
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-9 text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            onClick={() => {
                              const clinic = clinics.find((c) => c.id === num.assignedTo?.clinicId);
                              if (clinic) openUnassignDialog(clinic);
                            }}
                          >
                            <Unlink className="w-3.5 h-3.5 mr-1.5" />
                            Unassign
                          </Button>
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 w-9 p-0 text-teal-600 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                  onClick={() => openTestDialog(num.phoneNumber, num.assignedTo?.clinicId)}
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Test Connection</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* 3. Clinic Assignment Table                                   */}
      {/* ============================================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Clinic Assignment Table</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    View and manage phone number assignments per clinic
                  </CardDescription>
                </div>
              </div>
              <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-2">
                {clinics.length} clinics
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clinic</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Doctor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">City</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Agent</th>
                    <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-4 w-36" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : clinics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <PhoneOff className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">No clinics found</p>
                      </td>
                    </tr>
                  ) : (
                    clinics.map((clinic, idx) => (
                      <tr
                        key={clinic.id}
                        className={cn(
                          'border-b border-slate-100 dark:border-slate-800/50 transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5',
                          idx % 2 === 1 && 'bg-slate-50/40 dark:bg-slate-800/20'
                        )}
                      >
                        {/* Clinic Name */}
                        <td className="px-4 sm:px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white text-sm truncate max-w-[160px] sm:max-w-none">
                                {clinic.name}
                              </p>
                              <p className="text-[11px] text-slate-400 sm:hidden">{clinic.city}</p>
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            {clinic.doctorName}
                          </p>
                        </td>

                        {/* City */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {clinic.city}
                          </p>
                        </td>

                        {/* Phone Number */}
                        <td className="px-4 py-3.5">
                          {clinic.isNumberAssigned && clinic.sipNumber ? (
                            <span className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-400">
                              {formatIndianPhone(clinic.sipNumber)}
                            </span>
                          ) : (
                            <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-2">
                              Not Assigned
                            </Badge>
                          )}
                        </td>

                        {/* Agent Status */}
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <AgentStatusBadge status={clinic.vobizConfig?.agentStatus || null} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!clinic.isNumberAssigned ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                      onClick={() => {
                                        const available = numbers.find((n) => !n.assigned);
                                        if (available) {
                                          setAssignPhoneNumber(available.phoneNumber);
                                          setAssignClinicId(clinic.id);
                                          setOptTrunkId('');
                                          setOptTrunkDomain('');
                                          setOptCredentialId('');
                                          setOptCredentialUser('');
                                          setOptAppId('');
                                          setOptAppUrl('');
                                          setAssignDialogOpen(true);
                                        } else {
                                          toast.error('No available numbers in the pool');
                                        }
                                      }}
                                    >
                                      <PhoneCall className="w-3 h-3 mr-1" />
                                      Assign
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Assign a number</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                        onClick={() =>
                                          openTestDialog(clinic.sipNumber || '', clinic.id)
                                        }
                                      >
                                        <Zap className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Test Connection</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                        onClick={() => openUnassignDialog(clinic)}
                                      >
                                        <Unlink className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Unassign</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================ */}
      {/* 4. Integration Status Dashboard                               */}
      {/* ============================================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Integration Status</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Vobiz API Connection */}
          <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="card-interactive">
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Vobiz API</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">SIP Trunking Service</p>
                    </div>
                  </div>
                  <StatusDotPulse active={true} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Connection</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Connected</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Port</span>
                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">3031</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Protocol</span>
                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">SIP/UDP</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Agents Summary */}
          <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="card-interactive">
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active Agents</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Voice AI Agents</p>
                    </div>
                  </div>
                  <Badge className="text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-full px-2">
                    {stats.activeAgents} active
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50/50 dark:bg-teal-900/10">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total Configured</span>
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                      {clinics.filter((c) => c.isNumberAssigned).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Testing</span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {clinics.filter((c) => c.vobizConfig?.agentStatus === 'testing').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Unassigned</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {clinics.filter((c) => !c.isNumberAssigned).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Last Test Results */}
          <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="card-interactive">
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <TestTube className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Test Results</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Latest per clinic</p>
                    </div>
                  </div>
                  <Shield className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-2 max-h-[132px] overflow-y-auto">
                  {clinics
                    .filter((c) => c.vobizConfig?.lastTestedAt)
                    .sort((a, b) => {
                      const tA = a.vobizConfig?.lastTestedAt ? new Date(a.vobizConfig.lastTestedAt).getTime() : 0;
                      const tB = b.vobizConfig?.lastTestedAt ? new Date(b.vobizConfig.lastTestedAt).getTime() : 0;
                      return tB - tA;
                    })
                    .slice(0, 3)
                    .map((clinic) => {
                      let testPassed = false;
                      try {
                        const parsed = JSON.parse(clinic.vobizConfig?.lastTestResult || '{}');
                        testPassed = parsed.success === true;
                      } catch {
                        // ignore
                      }
                      return (
                        <div
                          key={clinic.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40"
                        >
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[110px]">
                            {clinic.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {testPassed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <span className="text-[10px] text-slate-400">
                              {clinic.vobizConfig?.lastTestedAt
                                ? new Date(clinic.vobizConfig.lastTestedAt).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {clinics.filter((c) => c.vobizConfig?.lastTestedAt).length === 0 && (
                    <div className="px-3 py-4 text-center">
                      <Eye className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">No tests run yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* 5. Assign Number Dialog                                       */}
      {/* ============================================================ */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Assign Phone Number
            </DialogTitle>
            <DialogDescription>
              Assign a Vobiz phone number to a clinic. Optionally configure SIP trunk settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Selected Phone Number (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Phone Number
              </Label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatIndianPhone(assignPhoneNumber)}
                </span>
              </div>
            </div>

            {/* Clinic Selection (required) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Clinic <span className="text-rose-500">*</span>
              </Label>
              <Select value={assignClinicId} onValueChange={setAssignClinicId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a clinic..." />
                </SelectTrigger>
                <SelectContent>
                  {clinics
                    .filter((c) => !c.isNumberAssigned)
                    .map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        <div className="flex items-center gap-2">
                          <span>{clinic.name}</span>
                          <span className="text-slate-400 text-xs">• {clinic.city}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {clinics.filter((c) => !c.isNumberAssigned).length === 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  All clinics already have a number assigned
                </p>
              )}
            </div>

            <Separator />

            {/* Optional Configuration */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3" />
                Optional SIP Configuration
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Trunk ID</Label>
                  <Input
                    placeholder="e.g., trunk_abc123"
                    value={optTrunkId}
                    onChange={(e) => setOptTrunkId(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Trunk Domain</Label>
                  <Input
                    placeholder="e.g., sip.vobiz.in"
                    value={optTrunkDomain}
                    onChange={(e) => setOptTrunkDomain(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Credential ID</Label>
                  <Input
                    placeholder="UUID credential"
                    value={optCredentialId}
                    onChange={(e) => setOptCredentialId(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Credential User</Label>
                  <Input
                    placeholder="e.g., sip_user_123"
                    value={optCredentialUser}
                    onChange={(e) => setOptCredentialUser(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">App ID</Label>
                  <Input
                    placeholder="Vobiz application ID"
                    value={optAppId}
                    onChange={(e) => setOptAppId(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">App URL</Label>
                  <Input
                    placeholder="https://your-app.com/webhook"
                    value={optAppUrl}
                    onChange={(e) => setOptAppUrl(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              className="text-sm"
              disabled={assignSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assignSaving || !assignClinicId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              {assignSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 mr-1.5" />
                  Assign Number
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 6. Unassign Confirmation Dialog                               */}
      {/* ============================================================ */}
      <AlertDialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Unlink className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              Unassign Phone Number
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to unassign the phone number from{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {unassignClinic?.name}
                  </span>
                  ?
                </p>
                {unassignClinic?.sipNumber && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50">
                    <Phone className="w-4 h-4 text-rose-500" />
                    <span className="font-mono text-sm font-medium text-rose-700 dark:text-rose-400">
                      {formatIndianPhone(unassignClinic.sipNumber)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will also clear all Vobiz SIP configuration for this clinic. The number will return to the available pool.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassignSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUnassign();
              }}
              disabled={unassignSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {unassignSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-1.5" />
                  Unassign
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* 7. Test Connection Dialog                                      */}
      {/* ============================================================ */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              Test Connection
            </DialogTitle>
            <DialogDescription>
              Testing SIP connectivity for {formatIndianPhone(testPhoneNumber)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Testing State */}
            {testLoading && !testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="relative">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Phone className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.div
                    className="absolute -inset-2 rounded-2xl border-2 border-emerald-400/30"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Testing Connection...</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">SIP registration in progress</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="loading-dot w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="loading-dot w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="loading-dot w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </motion.div>
            )}

            {/* Result State */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Success / Fail Header */}
                <div className={cn(
                  'rounded-xl p-5 mb-4 text-center',
                  testResult.success
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border border-rose-200 dark:border-rose-800/50'
                )}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  >
                    {testResult.success ? (
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mx-auto mb-3">
                        <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                      </div>
                    )}
                  </motion.div>
                  <h3 className={cn(
                    'text-lg font-bold',
                    testResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  )}>
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {testResult.success
                      ? `SIP registered — ${testResult.status}`
                      : testResult.error || 'SIP registration failed'}
                  </p>
                </div>

                {/* Result Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      Phone Number
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formatIndianPhone(testResult.phoneNumber)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Latency
                    </span>
                    <span className={cn(
                      'text-xs font-semibold',
                      testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}>
                      {testResult.latency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      SIP Registered
                    </span>
                    <span className={cn(
                      'text-xs font-semibold',
                      testResult.sipRegistered ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}>
                      {testResult.sipRegistered ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* Extra details on success */}
                  {testResult.success && testResult.details && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                        Technical Details
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                          <p className="text-[10px] text-slate-400">Codec</p>
                          <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                            {testResult.details.codec}
                          </p>
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                          <p className="text-[10px] text-slate-400">Transport</p>
                          <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                            {testResult.details.transport}
                          </p>
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                          <p className="text-[10px] text-slate-400">Reg. Expiry</p>
                          <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                            {testResult.details.registrationExpiry}
                          </p>
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                          <p className="text-[10px] text-slate-400">Trunk</p>
                          <p className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                            {testResult.details.trunkStatus}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)} className="text-sm">
              Close
            </Button>
            {testResult && (
              <Button
                variant="outline"
                onClick={() => {
                  setTestResult(null);
                  setTestLoading(true);
                  const body: Record<string, string> = { phoneNumber: testPhoneNumber };
                  if (testClinicId) body.clinicId = testClinicId;
                  fetch('/api/admin/vobiz-numbers/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  })
                    .then((res) => res.json())
                    .then((data) => setTestResult(data))
                    .catch(() => {
                      setTestResult({
                        success: false,
                        phoneNumber: testPhoneNumber,
                        latency: '—',
                        status: 'failed',
                        sipRegistered: false,
                        error: 'Network error',
                        testedAt: new Date().toISOString(),
                      });
                    })
                    .finally(() => {
                      setTestLoading(false);
                      fetchData();
                    });
                }}
                className="text-sm text-emerald-600 border-emerald-200 dark:border-emerald-800"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retest
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
