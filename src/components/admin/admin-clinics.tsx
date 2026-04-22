'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Eye, Pencil, Ban, X,
  Building2, Phone, MapPin, Download,
  CalendarCheck, TrendingUp, ArrowRight,
  UserCheck, Bot, Settings, Clock, Activity, BarChart3,
  LayoutGrid, List, CheckSquare, Square, Bell, FileDown,
  ArrowUpDown, Users, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TableBodySkeleton } from '@/components/shared/skeleton-loader';

// ============================================================
// Types & Constants
// ============================================================

interface Clinic {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address?: string;
  pincode?: string;
  planType: string;
  consultationFee?: string;
  whatsappNumber?: string;
  escalationNumber?: string;
  language?: string;
  status: string;
  createdAt: string;
  _count: { calls: number; appointments: number; users: number };
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const STATUS_CONFIG: Record<string, { color: string; dotColor: string; label: string }> = {
  active: {
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    label: 'Active',
  },
  trial: {
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    label: 'Trial',
  },
  overdue: {
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    label: 'Overdue',
  },
  suspended: {
    color: 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-400',
    label: 'Suspended',
  },
};

const PLAN_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  starter: {
    bg: 'bg-slate-100 dark:bg-slate-700/50',
    text: 'text-slate-600 dark:text-slate-300',
    label: 'Starter',
  },
  pro: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Pro',
  },
  enterprise: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Enterprise',
  },
};

const defaultForm = {
  name: '', doctorName: '', phone: '', email: '',
  address: '', city: '', state: '', pincode: '',
  businessHours: '09:00-18:00', consultationFee: '', planType: 'starter',
  whatsappNumber: '', escalationNumber: '', language: 'hinglish',
};

// ============================================================
// Animated Counter Hook
// ============================================================

function useAnimatedCount(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;
    cancelAnimationFrame(rafRef.current);

    if (target === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  // Return target directly when it's 0, otherwise the animated count
  return target === 0 ? 0 : count;
}

// ============================================================
// Relative Time Helper
// ============================================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ============================================================
// Main Component
// ============================================================

export default function AdminClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [form, setForm] = useState({ ...defaultForm });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Quick stats
  const stats = useMemo(() => ({
    total: clinics.length,
    active: clinics.filter(c => c.status === 'active').length,
    suspended: clinics.filter(c => c.status === 'suspended').length,
    trial: clinics.filter(c => c.status === 'trial').length,
  }), [clinics]);

  const animTotal = useAnimatedCount(loading ? 0 : stats.total);
  const animActive = useAnimatedCount(loading ? 0 : stats.active);
  const animSuspended = useAnimatedCount(loading ? 0 : stats.suspended);
  const animTrial = useAnimatedCount(loading ? 0 : stats.trial);

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/admin/clinics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  // Selection logic
  const toggleSelectAll = () => {
    if (selectedIds.size === clinics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clinics.map(c => c.id)));
    }
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // Bulk actions
  const handleBulkAction = (action: string) => {
    const count = selectedIds.size;
    if (action === 'notify') {
      toast.success(`Notification sent to ${count} clinic${count > 1 ? 's' : ''}`);
    } else if (action === 'export') {
      toast.success(`Exported ${count} clinic${count > 1 ? 's' : ''} to CSV`);
    } else if (action === 'plan') {
      toast.info(`Plan change initiated for ${count} clinic${count > 1 ? 's' : ''}`);
    }
    setSelectedIds(new Set());
  };

  const handleCreateClinic = async () => {
    if (!form.name || !form.doctorName || !form.phone || !form.email) {
      toast.error('Name, Doctor, Phone, and Email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create clinic');
      }
      toast.success('Clinic created successfully');
      setShowAddDialog(false);
      setForm({ ...defaultForm });
      fetchClinics();
    } catch (err) {
      toast.error((err as Error).message);
    }
    finally { setSubmitting(false); }
  };

  const handleEditClinic = async () => {
    if (!selectedClinic) return;
    if (!form.name || !form.doctorName || !form.phone || !form.email) {
      toast.error('Name, Doctor, Phone, and Email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedClinic.id, ...form }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update clinic');
      }
      toast.success('Clinic updated successfully');
      if (form.planType !== selectedClinic.planType) {
        toast.info(`Plan changed from ${selectedClinic.planType} to ${form.planType}`);
      }
      setShowEditDialog(false);
      setForm({ ...defaultForm });
      setSelectedClinic(null);
      fetchClinics();
    } catch (err) {
      toast.error((err as Error).message);
    }
    finally { setSubmitting(false); }
  };

  const openEditDialog = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setForm({
      name: clinic.name,
      doctorName: clinic.doctorName,
      phone: clinic.phone,
      email: clinic.email,
      address: clinic.address || '',
      city: clinic.city || '',
      state: clinic.state || '',
      pincode: clinic.pincode || '',
      businessHours: '09:00-18:00',
      consultationFee: clinic.consultationFee || '',
      planType: clinic.planType,
      whatsappNumber: clinic.whatsappNumber || '',
      escalationNumber: clinic.escalationNumber || '',
      language: clinic.language || 'hinglish',
    });
    setShowEditDialog(true);
  };

  const handleSuspend = async (clinic: Clinic) => {
    try {
      const res = await fetch(`/api/admin/clinics?id=${clinic.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${clinic.name} has been suspended`);
        fetchClinics();
      }
    } catch {
      toast.error('Failed to suspend clinic');
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 10) return `+91-${phone.slice(0, 5)}-${phone.slice(5)}`;
    return phone;
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.suspended;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
        <Badge variant="outline" className={cn('text-xs font-medium px-2.5 py-0.5', cfg.color)}>
          {cfg.label}
        </Badge>
      </span>
    );
  };

  const getPlanBadge = (planType: string) => {
    const style = PLAN_STYLES[planType] || PLAN_STYLES.starter;
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', style.bg, style.text)}>
        {style.label}
      </span>
    );
  };

  const clinicFormFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Clinic Name *</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sharma Dental" />
        </div>
        <div className="space-y-2">
          <Label>Doctor Name *</Label>
          <Input value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Rajesh Sharma" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone *</Label>
          <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="clinic@example.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" />
        </div>
        <div className="space-y-2">
          <Label>Pincode</Label>
          <Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="400001" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Plan Type</Label>
          <Select value={form.planType} onValueChange={v => setForm({ ...form, planType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Consultation Fee</Label>
          <Input value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} placeholder="₹500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>WhatsApp Number</Label>
          <Input value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="919876543210" />
        </div>
        <div className="space-y-2">
          <Label>Escalation Number</Label>
          <Input value={form.escalationNumber} onChange={e => setForm({ ...form, escalationNumber: e.target.value })} placeholder="919876543210" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Language</Label>
        <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hinglish">Hinglish</SelectItem>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="hindi">Hindi</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ============================================================
  // Grid Card Component
  // ============================================================

  const ClinicCard = ({ clinic, index }: { clinic: Clinic; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group relative rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 cursor-pointer overflow-hidden transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600/50 hover:shadow-lg hover:shadow-emerald-500/5"
      onClick={() => { setSelectedClinic(clinic); setShowDetailDialog(true); }}
    >
      {/* Gradient border glow on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
            clinic.status === 'active' && 'bg-gradient-to-br from-emerald-500 to-teal-600',
            clinic.status === 'trial' && 'bg-gradient-to-br from-amber-500 to-orange-500',
            clinic.status === 'overdue' && 'bg-gradient-to-br from-rose-500 to-red-600',
            clinic.status === 'suspended' && 'bg-gradient-to-br from-slate-400 to-slate-500',
          )}>
            {clinic.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{clinic.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{clinic.doctorName}</p>
          </div>
          {getStatusBadge(clinic.status)}
        </div>

        {/* City & Plan */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">{clinic.city || 'Unknown'}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          {getPlanBadge(clinic.planType)}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-900/15 px-2.5 py-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{clinic._count.calls}</span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">calls</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-teal-50/80 dark:bg-teal-900/15 px-2.5 py-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">{clinic._count.appointments}</span>
            <span className="text-[10px] text-teal-600/70 dark:text-teal-500/70">bookings</span>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getRelativeTime(clinic.createdAt)}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600" onClick={() => { setSelectedClinic(clinic); setShowDetailDialog(true); }}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-teal-600" onClick={() => openEditDialog(clinic)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {clinic.status !== 'suspended' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600" onClick={() => handleSuspend(clinic)}>
                <Ban className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* ====== Quick Stats Pills ====== */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        {[
          { label: 'Total Clinics', value: animTotal, icon: Building2, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', dotColor: 'bg-emerald-500' },
          { label: 'Active', value: animActive, icon: UserCheck, color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800', dotColor: 'bg-green-500' },
          { label: 'Suspended', value: animSuspended, icon: Ban, color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800', dotColor: 'bg-rose-500' },
          { label: 'Trial', value: animTrial, icon: Clock, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800', dotColor: 'bg-amber-500' },
        ].map(stat => (
          <div key={stat.label} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300', stat.color)}>
            <stat.icon className="w-3.5 h-3.5" />
            <span className="font-bold">{stat.value}</span>
            <span>{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ====== Toolbar ====== */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        {/* Enhanced Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, city, doctor, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-9 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
            >
              <X className="w-2.5 h-2.5 text-slate-500 dark:text-slate-300" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-full sm:w-40 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 rounded-l-lg rounded-r-none', viewMode === 'table' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 rounded-r-lg rounded-l-none', viewMode === 'grid' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        {/* Add Clinic */}
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Clinic
        </Button>

        {/* Export */}
        <Button
          variant="outline"
          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => toast.info('Export feature coming soon!')}
        >
          <Download className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </motion.div>

      {/* ====== Result Count ====== */}
      {!loading && (
        <motion.div variants={item} className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{clinics.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.total}</span> clinics
            {debouncedSearch && <span className="text-slate-400"> matching &ldquo;{debouncedSearch}&rdquo;</span>}
          </span>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/15 hover:bg-emerald-100 dark:hover:bg-emerald-900/25">
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                  {selectedIds.size} selected
                  <ArrowUpDown className="w-3 h-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleBulkAction('notify')} className="text-sm cursor-pointer">
                  <Bell className="w-4 h-4 mr-2 text-emerald-500" />
                  Send Notification
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('export')} className="text-sm cursor-pointer">
                  <FileDown className="w-4 h-4 mr-2 text-teal-500" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('plan')} className="text-sm cursor-pointer">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-amber-500" />
                  Change Plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-500 cursor-pointer">
                  <X className="w-4 h-4 mr-2" />
                  Clear Selection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      )}

      {/* ====== Loading State ====== */}
      {loading && viewMode === 'table' && (
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="w-10 py-3 px-3" />
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Clinic</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">City</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Plan</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Calls</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Last Active</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableBodySkeleton rows={5} cols={10} />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {loading && viewMode === 'grid' && (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ====== Empty State ====== */}
      {!loading && clinics.length === 0 && (
        <motion.div
          variants={item}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">No clinics found</h3>
          {debouncedSearch ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
                No clinics matching &ldquo;<span className="font-medium">{debouncedSearch}</span>&rdquo;
              </p>
              <Button
                variant="outline"
                onClick={() => { setSearch(''); setDebouncedSearch(''); setStatusFilter('all'); }}
                className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Try adjusting your status filter or add a new clinic.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Clinic
              </Button>
            </>
          )}
        </motion.div>
      )}

      {/* ====== Table View ====== */}
      {!loading && viewMode === 'table' && clinics.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="w-10 py-3 px-3">
                        <Checkbox
                          checked={selectedIds.size === clinics.length && clinics.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Clinic</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">City</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Plan</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Calls</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Last Active</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {clinics.map((clinic, idx) => {
                      const isSelected = selectedIds.has(clinic.id);
                      return (
                        <tr
                          key={clinic.id}
                          className={cn(
                            'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all cursor-pointer border-l-2',
                            isSelected ? 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-l-transparent hover:border-l-emerald-500',
                            idx % 2 === 1 && !isSelected && 'bg-slate-50/50 dark:bg-slate-800/20'
                          )}
                          onClick={() => { setSelectedClinic(clinic); setShowDetailDialog(true); }}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(clinic.id)}
                              className="rounded"
                            />
                          </td>

                          {/* Clinic name with avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0',
                                clinic.status === 'active' && 'bg-gradient-to-br from-emerald-500 to-teal-600',
                                clinic.status === 'trial' && 'bg-gradient-to-br from-amber-500 to-orange-500',
                                clinic.status === 'overdue' && 'bg-gradient-to-br from-rose-500 to-red-600',
                                clinic.status === 'suspended' && 'bg-gradient-to-br from-slate-400 to-slate-500',
                              )}>
                                {clinic.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-sm">{clinic.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{clinic.doctorName}</p>
                              </div>
                            </div>
                          </td>

                          {/* City */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {clinic.city || '-'}
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 hidden lg:table-cell font-mono text-xs">
                            {formatPhone(clinic.phone)}
                          </td>

                          {/* Status with dot */}
                          <td className="py-3 px-4">
                            {getStatusBadge(clinic.status)}
                          </td>

                          {/* Plan as colored pill */}
                          <td className="py-3 px-4 hidden sm:table-cell">
                            {getPlanBadge(clinic.planType)}
                          </td>

                          {/* Calls badge */}
                          <td className="py-3 px-4 text-right hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs font-medium text-slate-700 dark:text-slate-300">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {clinic._count.calls}
                            </span>
                          </td>

                          {/* Bookings badge */}
                          <td className="py-3 px-4 text-right hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs font-medium text-slate-700 dark:text-slate-300">
                              <CalendarCheck className="w-3 h-3 text-teal-500" />
                              {clinic._count.appointments}
                            </span>
                          </td>

                          {/* Last Active */}
                          <td className="py-3 px-4 text-right text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3" />
                              {getRelativeTime(clinic.createdAt)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" onClick={() => { setSelectedClinic(clinic); setShowDetailDialog(true); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600" onClick={() => openEditDialog(clinic)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {clinic.status !== 'suspended' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleSuspend(clinic)}>
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ====== Grid View ====== */}
      {!loading && viewMode === 'grid' && clinics.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {clinics.map((clinic, index) => (
              <ClinicCard key={clinic.id} clinic={clinic} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ====== Add Clinic Dialog ====== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Clinic</DialogTitle>
            <DialogDescription>Register a new clinic on the VoiceAI platform</DialogDescription>
          </DialogHeader>
          {clinicFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setForm({ ...defaultForm }); }}>Cancel</Button>
            <Button onClick={handleCreateClinic} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? 'Creating...' : 'Create Clinic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Edit Clinic Dialog ====== */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setForm({ ...defaultForm }); setSelectedClinic(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Clinic</DialogTitle>
            <DialogDescription>Update clinic details for {selectedClinic?.name}</DialogDescription>
          </DialogHeader>
          {clinicFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setForm({ ...defaultForm }); setSelectedClinic(null); }}>Cancel</Button>
            <Button onClick={handleEditClinic} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Clinic Detail Dialog ====== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[85vh]">
          {selectedClinic && (
            <>
              {/* Gradient header matching status color */}
              <div className={cn(
                'relative px-6 pt-6 pb-4',
                selectedClinic.status === 'active' && 'bg-gradient-to-br from-emerald-500 to-teal-600',
                selectedClinic.status === 'trial' && 'bg-gradient-to-br from-amber-500 to-orange-500',
                selectedClinic.status === 'overdue' && 'bg-gradient-to-br from-rose-500 to-red-600',
                selectedClinic.status === 'suspended' && 'bg-gradient-to-br from-slate-500 to-slate-600',
              )}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-white text-lg">{selectedClinic.name}</DialogTitle>
                      <p className="text-white/70 text-xs">{selectedClinic.doctorName} • {selectedClinic.city || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="overview" className="px-6">
                <TabsList className="mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-full overflow-x-auto">
                  <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs">
                    <Building2 className="w-3.5 h-3.5 mr-1.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="agent" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs">
                    <Bot className="w-3.5 h-3.5 mr-1.5" />
                    Agent Config
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 text-xs">
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Stats
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200/60 dark:border-emerald-800/40 p-3 text-center">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{selectedClinic._count.calls}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Calls</p>
                    </div>
                    <div className="rounded-xl bg-teal-50 dark:bg-teal-900/15 border border-teal-200/60 dark:border-teal-800/40 p-3 text-center">
                      <CalendarCheck className="w-3.5 h-3.5 text-teal-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{selectedClinic._count.appointments}</p>
                      <p className="text-[10px] text-teal-600 dark:text-teal-500 font-medium">Bookings</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40 p-3 text-center">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                        {selectedClinic._count.calls > 0
                          ? Math.round((selectedClinic._count.appointments / selectedClinic._count.calls) * 100)
                          : 0}%
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">Conv. Rate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-900 dark:text-white mt-0.5 text-xs">{selectedClinic.email}</p></div>
                    <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-900 dark:text-white mt-0.5 font-mono text-xs">{formatPhone(selectedClinic.phone)}</p></div>
                    <div><span className="text-slate-500">Status</span><p className="mt-0.5">{getStatusBadge(selectedClinic.status)}</p></div>
                    <div><span className="text-slate-500">Plan</span><p className="mt-0.5">{getPlanBadge(selectedClinic.planType)}</p></div>
                  </div>

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Clinic Dashboard
                  </Button>
                </TabsContent>

                {/* Agent Config Tab */}
                <TabsContent value="agent" className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">AI Agent Summary</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400">Persona</span><p className="font-medium text-slate-700 dark:text-slate-300 capitalize mt-0.5">{selectedClinic.language || 'hinglish'}</p></div>
                        <div><span className="text-slate-400">Plan</span><p className="font-medium text-slate-700 dark:text-slate-300 capitalize mt-0.5">{selectedClinic.planType}</p></div>
                        <div><span className="text-slate-400">SIP Number</span><p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{(selectedClinic as Record<string, unknown>).sipNumber || 'Not assigned'}</p></div>
                        <div><span className="text-slate-400">Escalation</span><p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{selectedClinic.escalationNumber || 'Not set'}</p></div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-teal-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Agent Features</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Auto Booking', active: true },
                          { label: 'Voice Recognition', active: true },
                          { label: 'Escalation Handling', active: true },
                          { label: 'Multi-language Support', active: selectedClinic.language !== 'english' },
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400">{feature.label}</span>
                            <span className={cn(
                              'text-[10px] font-semibold',
                              feature.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            )}>
                              {feature.active ? 'Active' : 'Off'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Recent Calls</span>
                    </div>
                    {selectedClinic._count.calls === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No call activity yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Sample Call Record</p>
                              <p className="text-[10px] text-slate-400">Just now • 2m 15s</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarCheck className="w-4 h-4 text-teal-500" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Recent Appointments</span>
                    </div>
                    {selectedClinic._count.appointments === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No appointment activity yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                              <CalendarCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Sample Appointment</p>
                              <p className="text-[10px] text-slate-400">Tomorrow • 10:00 AM</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total Calls</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedClinic._count.calls}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">↑ 12%</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total Bookings</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedClinic._count.appointments}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400">↑ 8%</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Conversion Rate</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        {selectedClinic._count.calls > 0
                          ? Math.round((selectedClinic._count.appointments / selectedClinic._count.calls) * 100)
                          : 0}%
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={cn(
                          'text-[10px] font-medium',
                          (selectedClinic._count.calls > 0 && Math.round((selectedClinic._count.appointments / selectedClinic._count.calls) * 100)) >= 50
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        )}>
                          {selectedClinic._count.calls > 0 && Math.round((selectedClinic._count.appointments / selectedClinic._count.calls) * 100) >= 50 ? '↑' : '↓'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Active Staff</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedClinic._count.users}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Performance Score</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {Math.min(99, selectedClinic._count.calls > 0
                        ? Math.round((selectedClinic._count.appointments / selectedClinic._count.calls) * 100) + Math.min(10, selectedClinic._count.users * 5)
                        : 0
                      )}
                    </p>
                    <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-0.5">Based on conversion, bookings and staff count</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
