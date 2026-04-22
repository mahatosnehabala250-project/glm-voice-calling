'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  CheckCircle, XCircle, Clock,
  MessageSquare, Search, Plus, CalendarDays, Download,
  Check, AlertTriangle, CheckCircle2, Bot, User,
  ChevronLeft, ChevronRight, List
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday as dateFnsIsToday,
  addMonths, subMonths, getDay
} from 'date-fns';
import PatientDetailDrawer from './patient-detail-drawer';
import { TableBodySkeleton } from '@/components/shared/skeleton-loader';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
  whatsappSent: boolean;
  consultationFee: string | null;
  bookedVia: string;
}

const STATUS_CONFIG: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
  pending: {
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50',
    icon: Clock,
    label: 'Pending',
  },
  confirmed: {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50',
    icon: Check,
    label: 'Confirmed',
  },
  cancelled: {
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50',
    icon: XCircle,
    label: 'Cancelled',
  },
  no_show: {
    bg: 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50',
    icon: AlertTriangle,
    label: 'No Show',
  },
  completed: {
    bg: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50',
    icon: CheckCircle2,
    label: 'Completed',
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00',
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize',
      config.bg
    )}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function AppointmentTimeline({ status }: { status: string }) {
  const steps = [
    { label: 'Booked', completed: true },
    { label: 'Confirmed', completed: status === 'confirmed' || status === 'completed' },
    { label: 'Completed', completed: status === 'completed', upcoming: status !== 'completed' && status !== 'cancelled' && status !== 'no_show' },
  ];

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <div className="h-0.5 w-12 bg-slate-200 dark:bg-slate-700" />
        <div className="w-3 h-3 rounded-full bg-rose-500" />
        <span className="text-xs text-rose-500 font-medium ml-1">Cancelled</span>
      </div>
    );
  }

  if (status === 'no_show') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <div className="h-0.5 w-12 bg-slate-200 dark:bg-slate-700" />
        <div className="w-3 h-3 rounded-full bg-rose-500" />
        <span className="text-xs text-slate-500 font-medium ml-1">No Show</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-3 h-3 rounded-full border-2 transition-colors',
              step.completed
                ? 'bg-emerald-500 border-emerald-500'
                : step.upcoming
                  ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
            )}>
              {step.upcoming && (
                <div className="w-full h-full rounded-full bg-emerald-500/20 animate-pulse" />
              )}
            </div>
            <span className={cn(
              'text-[10px] mt-1 font-medium',
              step.completed ? 'text-emerald-600 dark:text-emerald-400' : step.upcoming ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'h-0.5 w-8 mx-1 mb-4',
              step.completed ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// Calendar View Component
function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(a => a.date === dayStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
          {days.map(day => {
            const dayAppts = getAppointmentsForDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const isTodayDate = dateFnsIsToday(day);
            const hasConfirmed = dayAppts.some(a => a.status === 'confirmed');
            const hasPending = dayAppts.some(a => a.status === 'pending');
            const hasCancelled = dayAppts.some(a => a.status === 'cancelled');

            return (
              <Popover key={day.toISOString()}>
                <PopoverTrigger asChild>
                  <div
                    className={cn(
                      'min-h-[72px] sm:min-h-[80px] p-1.5 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      !inMonth && 'bg-slate-50/50 dark:bg-slate-900/30',
                      inMonth && 'bg-white dark:bg-slate-900',
                      isTodayDate && 'bg-emerald-50/80 dark:bg-emerald-900/20',
                    )}
                  >
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                      !inMonth && 'text-slate-300 dark:text-slate-600',
                      inMonth && 'text-slate-700 dark:text-slate-300',
                      isTodayDate && 'bg-emerald-500 text-white font-bold',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayAppts.length > 0 && inMonth && (
                      <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                        {hasConfirmed && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                        {hasPending && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                        {hasCancelled && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-0.5">{dayAppts.length}</span>
                      </div>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" side="top" align="start">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {format(day, 'EEE, dd MMM yyyy')}
                      {isTodayDate && <Badge className="ml-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0">Today</Badge>}
                    </p>
                    {dayAppts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No appointments</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {dayAppts.map(appt => (
                          <div key={appt.id} className="flex items-center gap-2 p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60">
                            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{appt.patientName}</p>
                              <p className="text-[10px] text-slate-400">{appt.time} • {appt.reason || 'General'}</p>
                            </div>
                            <StatusBadge status={appt.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-1">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-500">Confirmed</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-slate-500">Pending</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[10px] text-slate-500">Cancelled</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientAppointments() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [todayFilter, setTodayFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ name: string; phone: string } | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // New booking form state
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    patientPhone: '',
    date: '',
    time: '',
    reason: '',
  });

  const fetchAppointments = useCallback(async () => {
    if (!user?.clinicId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (todayFilter) params.set('today', 'true');
      const res = await fetch(`/api/client/appointments?${params.toString()}`, {
        headers: { 'x-clinic-id': user.clinicId },
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        setTotal(data.total || 0);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [user?.clinicId, statusFilter, todayFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Client-side search filtering
  const filteredAppointments = appointments.filter((appt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      appt.patientName.toLowerCase().includes(q) ||
      appt.patientPhone.includes(q)
    );
  });

  const updateStatus = async (id: string, status: string) => {
    if (!user?.clinicId) return;
    setUpdatingId(id);
    try {
      const res = await fetch('/api/client/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': user.clinicId },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Appointment ${status}`);
        fetchAppointments();
        // Close detail dialog if open for this appointment
        if (detailAppointment?.id === id) {
          setDetailAppointment(null);
        }
      } else {
        toast.error('Failed to update appointment');
      }
    } catch {
      toast.error('Failed to update appointment');
    }
    finally { setUpdatingId(null); }
  };

  const handleCreateBooking = async () => {
    if (!user?.clinicId) return;
    if (!bookingForm.patientName || !bookingForm.patientPhone || !bookingForm.date || !bookingForm.time) {
      toast.error('Patient name, phone, date, and time are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/client/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': user.clinicId },
        body: JSON.stringify(bookingForm),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create appointment');
      }
      toast.success('Appointment booked successfully');
      setShowNewBooking(false);
      setBookingForm({ patientName: '', patientPhone: '', date: '', time: '', reason: '' });
      fetchAppointments();
    } catch (err) {
      toast.error((err as Error).message);
    }
    finally { setSubmitting(false); }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 10) return `+91-${phone.slice(0, 5)}-${phone.slice(5)}`;
    return phone;
  };

  const exportCSV = () => {
    const today = format(new Date(), 'ddMMyyyy');
    const headers = ['Date', 'Time', 'Patient', 'Phone', 'Reason', 'Status', 'Fee'];
    const rows = filteredAppointments.map((appt) => {
      return [formatDate(appt.date), formatTime(appt.time), appt.patientName, appt.patientPhone, appt.reason || '', appt.status, appt.consultationFee ? `\u20b9${appt.consultationFee}` : ''];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voiceai-appointments-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const openPatientDrawer = (name: string, phone: string) => {
    setSelectedPatient({ name, phone });
    setPatientDrawerOpen(true);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const isToday = (dateStr: string) => dateStr === todayStr;
  const isUpcoming = (dateStr: string) => dateStr >= todayStr;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* View Toggle + Filter Bar */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={todayFilter ? 'default' : 'outline'}
          onClick={() => {
            setTodayFilter(!todayFilter);
            setStatusFilter('all');
          }}
          className={cn(
            'transition-all',
            todayFilter
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-emerald-600'
              : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          )}
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Today
        </Button>
        <Button
          onClick={() => setShowNewBooking(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={filteredAppointments.length === 0}
          className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </motion.div>

      {/* Content based on view mode */}
      {viewMode === 'calendar' ? (
        <motion.div variants={itemAnim}>
          <CalendarView appointments={appointments} />
        </motion.div>
      ) : (
      /* Table */
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">WhatsApp</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading ? (
                    <TableBodySkeleton rows={5} cols={8} />
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                          className="flex flex-col items-center"
                        >
                          {searchQuery ? (
                            <>
                              <div className="relative mb-5">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/30">
                                  <Search className="w-10 h-10 text-emerald-300 dark:text-emerald-700" />
                                </div>
                              </div>
                              <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
                                No patients match your search
                              </p>
                              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs">
                                Try a different search term
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="relative mb-5">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
                                  <CalendarDays className="w-12 h-12 text-white" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700">
                                  <Plus className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center animate-float-pulse">
                                  <Clock className="w-3 h-3 text-emerald-500" />
                                </div>
                              </div>
                              <p className="text-slate-700 dark:text-slate-200 font-semibold text-lg mt-2">
                                No Appointments Found
                              </p>
                              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs text-center leading-relaxed">
                                {statusFilter !== 'all'
                                  ? 'No appointments match the selected filter. Try changing the status filter.'
                                  : 'Start by creating your first appointment to get going with your clinic\'s scheduling.'}
                              </p>
                              {statusFilter === 'all' && (
                                <Button
                                  onClick={() => setShowNewBooking(true)}
                                  className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/30 transition-all hover:shadow-xl hover:shadow-emerald-200/50"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  New Booking
                                </Button>
                              )}
                            </>
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => (
                      <motion.tr
                        key={appt.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p
                            className="font-medium text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            onClick={() => openPatientDrawer(appt.patientName, appt.patientPhone)}
                          >
                            {appt.patientName}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs hidden md:table-cell">
                          {formatPhone(appt.patientPhone)}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            {isToday(appt.date) && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded uppercase">
                                Today
                              </span>
                            )}
                            {formatDate(appt.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                          {formatTime(appt.time)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[140px] truncate">
                          {appt.reason || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="py-3 px-4 text-center hidden sm:table-cell">
                          {appt.whatsappSent ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              onClick={() => setDetailAppointment(appt)}
                            >
                              View
                            </Button>
                            {appt.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  onClick={() => updateStatus(appt.id, 'confirmed')}
                                  disabled={updatingId === appt.id}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                  onClick={() => updateStatus(appt.id, 'cancelled')}
                                  disabled={updatingId === appt.id}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                Showing {filteredAppointments.length} of {total} appointments
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog open={!!detailAppointment} onOpenChange={(open) => { if (!open) setDetailAppointment(null); }}>
        <DialogContent className="max-w-lg">
          {detailAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="w-5 h-5 text-emerald-500" />
                  Appointment Details
                </DialogTitle>
                <DialogDescription>
                  {isUpcoming(detailAppointment.date) ? 'Upcoming appointment details' : 'Past appointment details'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Patient info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {detailAppointment.patientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-base text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                      onClick={() => {
                        setDetailAppointment(null);
                        openPatientDrawer(detailAppointment.patientName, detailAppointment.patientPhone);
                      }}
                    >
                      {detailAppointment.patientName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {formatPhone(detailAppointment.patientPhone)}
                    </p>
                  </div>
                  <StatusBadge status={detailAppointment.status} />
                </div>

                {/* Appointment info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Date</p>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatFullDate(detailAppointment.date)}</p>
                    </div>
                    {isToday(detailAppointment.date) && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded uppercase">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Time</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatTime(detailAppointment.time)}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Consultation Fee</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {detailAppointment.consultationFee ? `\u20B9${detailAppointment.consultationFee}` : 'Not set'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Booked Via</p>
                    <div className="flex items-center gap-2">
                      {detailAppointment.bookedVia === 'ai' ? (
                        <Bot className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                        {detailAppointment.bookedVia === 'ai' ? 'AI Agent' : 'Manual'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {detailAppointment.reason && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-1">Reason</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{detailAppointment.reason}</p>
                  </div>
                )}

                {/* WhatsApp status */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">WhatsApp Notification</p>
                  <div className="ml-auto flex items-center gap-1.5">
                    {detailAppointment.whatsappSent ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Sent</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Not Sent</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-2">Status Timeline</p>
                  <AppointmentTimeline status={detailAppointment.status} />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {(detailAppointment.status === 'confirmed' || detailAppointment.status === 'pending') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => updateStatus(detailAppointment.id, 'cancelled')}
                      disabled={updatingId === detailAppointment.id}
                      className="border-rose-200 dark:border-rose-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        toast.info('Reschedule feature coming soon');
                      }}
                      variant="outline"
                      className="border-amber-200 dark:border-amber-800 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      Reschedule
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDetailAppointment(null);
                    openPatientDrawer(detailAppointment.patientName, detailAppointment.patientPhone);
                  }}
                >
                  View Patient
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={showNewBooking} onOpenChange={setShowNewBooking}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" />
              New Booking
            </DialogTitle>
            <DialogDescription>Manually book an appointment for a patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input
                  value={bookingForm.patientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={bookingForm.patientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientPhone: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={bookingForm.date}
                  min={todayStr}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Select value={bookingForm.time} onValueChange={(v) => setBookingForm({ ...bookingForm, time: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {formatTime(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={bookingForm.reason}
                onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                placeholder="Reason for appointment (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBooking(false)}>Cancel</Button>
            <Button
              onClick={handleCreateBooking}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? 'Booking...' : 'Book Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Patient Detail Drawer */}
      <PatientDetailDrawer
        open={patientDrawerOpen}
        onOpenChange={setPatientDrawerOpen}
        patientName={selectedPatient?.name || ''}
        patientPhone={selectedPatient?.phone || ''}
      />
    </motion.div>
  );
}
