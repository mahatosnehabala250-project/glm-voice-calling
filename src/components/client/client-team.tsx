'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Star, Clock, TrendingUp, Calendar, X, ChevronRight,
  Phone, Mail, Award, Languages, Heart, Stethoscope, Filter,
  CheckCircle2, AlertCircle, Loader2, CalendarDays, UserPlus,
  IndianRupee, Building2, Briefcase, GraduationCap, MessageSquare, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  yearsOfExperience: number;
  phone: string;
  email: string;
  consultationFee: number;
  availability: 'available' | 'in_consultation' | 'off_duty' | 'on_leave';
  languages: string[];
  rating: number;
  reviewCount: number;
  todayAppointments: number;
  patientsThisWeek: number;
  availableDays: string[];
  availableSlots: string[];
  bio: string;
  createdAt: string;
}

interface TeamStats {
  totalDoctors: number;
  availableToday: number;
  avgRating: number;
  patientsThisWeek: number;
}

interface TimeSlot {
  time: string;
  doctorId: string;
  doctorName: string;
  type: 'appointment' | 'break' | 'consultation';
}

// ─── Constants ───────────────────────────────────────────────────────────────────

const SPECIALIZATIONS = [
  'General Physician', 'Dentist', 'Orthopedic', 'Dermatologist',
  'Pediatrician', 'Gynecologist', 'ENT', 'Ophthalmologist', 'Cardiologist',
];

const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Kannada', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Urdu'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
];

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', pulse: true },
  in_consultation: { label: 'In Consultation', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', pulse: false },
  off_duty: { label: 'Off Duty', color: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', pulse: false },
  on_leave: { label: 'On Leave', color: 'bg-slate-400', textColor: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', pulse: false },
} as const;

const GRADIENT_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
];

const SCHEDULE_COLORS: Record<string, string> = {
  'DOC-001': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'DOC-002': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  'DOC-003': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'DOC-004': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  'DOC-005': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

const SPECIALTY_ICONS: Record<string, typeof Stethoscope> = {
  'General Physician': Stethoscope,
  'Dentist': Stethoscope,
  'Orthopedic': Briefcase,
  'Dermatologist': Heart,
  'Pediatrician': Heart,
  'Gynecologist': Heart,
  'ENT': Stethoscope,
  'Ophthalmologist': Stethoscope,
  'Cardiologist': Heart,
};

// ─── Animation variants ──────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

const cardHover = {
  rest: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  hover: { y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' },
};

// ─── Helper Functions ────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function getGradientColor(id: string) {
  const idx = parseInt(id.replace(/\D/g, ''), 10) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[idx] || GRADIENT_COLORS[0];
}

function formatPhone(phone: string) {
  if (phone.length === 10) return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  return phone;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getNext7Days() {
  const days: { date: Date; dayName: string; dateStr: string; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d,
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateStr: d.toISOString().split('T')[0],
      isToday: i === 0,
    });
  }
  return days;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 dark:text-slate-700'
          )}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export default function ClientTeam() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId;

  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [schedule, setSchedule] = useState<Record<string, TimeSlot[]>>({});
  const [specialtyCounts, setSpecialtyCounts] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [adding, setAdding] = useState(false);

  // Add Doctor Form
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: '',
    qualification: '',
    yearsOfExperience: '',
    consultationFee: '',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    startTime: '09:00',
    endTime: '18:00',
    languages: ['Hindi', 'English'] as string[],
    bio: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Fetch Data ─────────────────────────────────────────────────────────────

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/team?specialization=${activeFilter === 'All' ? '' : activeFilter}`, {
        headers: { 'x-clinic-id': clinicId || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
        setStats(data.stats || null);
        setSchedule(data.schedule || {});
        setSpecialtyCounts(data.specialtyCounts || {});
      }
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [clinicId, activeFilter]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Doctor name is required';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) errors.phone = 'Valid 10-digit phone required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email format';
    if (!form.specialization) errors.specialization = 'Specialization is required';
    if (!form.qualification.trim()) errors.qualification = 'Qualification is required';
    if (form.consultationFee && isNaN(Number(form.consultationFee))) errors.consultationFee = 'Must be a number';
    if (form.availableDays.length === 0) errors.availableDays = 'Select at least one day';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const resetForm = () => {
    setForm({
      name: '', phone: '', email: '', specialization: '', qualification: '',
      yearsOfExperience: '', consultationFee: '', availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '09:00', endTime: '18:00', languages: ['Hindi', 'English'], bio: '',
    });
    setFormErrors({});
  };

  const handleAddDoctor = async () => {
    if (!validateForm()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/client/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': clinicId || '' },
        body: JSON.stringify({
          ...form,
          consultationFee: Number(form.consultationFee) || 500,
          yearsOfExperience: Number(form.yearsOfExperience) || 0,
          availableHours: { start: form.startTime, end: form.endTime },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.doctor.name} (${data.doctor.id}) added to the team`);
        setShowAddDialog(false);
        resetForm();
        fetchTeamData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add doctor');
      }
    } catch {
      toast.error('Failed to add doctor');
    } finally {
      setAdding(false);
    }
  };

  // ─── Computed values ───────────────────────────────────────────────────────

  const filterChips = useMemo(() => {
    const allCount = Object.values(specialtyCounts).reduce((a, b) => a + b, 0);
    return [
      { label: 'All', count: allCount },
      ...Object.entries(specialtyCounts).map(([name, count]) => ({ label: name, count })),
    ];
  }, [specialtyCounts]);

  const next7Days = useMemo(() => getNext7Days(), []);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        {/* Filter skeleton */}
        <Skeleton className="h-10 w-full rounded-xl" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Team & Doctors</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your clinic&apos;s medical team</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchedule(!showSchedule)}
            className={cn(
              'border-slate-200 dark:border-slate-700',
              showSchedule && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            )}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {showSchedule ? 'Hide Schedule' : 'View Schedule'}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/25"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Doctor
          </Button>
        </div>
      </motion.div>

      {/* ─── Team Performance Stats ─────────────────────────────────── */}
      {stats && (
        <motion.div variants={itemAnim} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="glass-card border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Doctors</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalDoctors}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Available Today</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.availableToday}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Live</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgRating}</p>
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <StarRating rating={stats.avgRating} size="md" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-pink-500" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Patients This Week</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.patientsThisWeek}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">+12% from last week</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Specialty Filter Bar ───────────────────────────────────── */}
      <motion.div variants={itemAnim} className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter by Specialty</span>
        </div>
        <ScrollArea className="w-full" type="scroll">
          <div className="flex gap-2 pb-2 pr-4">
            {filterChips.map((chip) => (
              <motion.button
                key={chip.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveFilter(chip.label)}
                className={cn(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                  activeFilter === chip.label
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400'
                )}
              >
                {chip.label}
                <span className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                  activeFilter === chip.label
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}>
                  {chip.count}
                </span>
              </motion.button>
            ))}
          </div>
        </ScrollArea>
      </motion.div>

      {/* ─── Team Schedule Overview (toggleable) ────────────────────── */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div
            variants={itemAnim}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Weekly Schedule Overview
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    {next7Days[0].dateStr} — {next7Days[6].dateStr}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full" type="scroll">
                  <div className="min-w-[800px]">
                    {/* Schedule Grid */}
                    <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800">
                      {/* Header row */}
                      <div className="p-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50" />
                      {next7Days.map((day) => (
                        <div
                          key={day.dateStr}
                          className={cn(
                            'p-2 text-center border-r border-b border-slate-100 dark:border-slate-800',
                            day.isToday ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-slate-50 dark:bg-slate-900/50'
                          )}
                        >
                          <p className={cn(
                            'text-[10px] font-semibold',
                            day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                          )}>
                            {day.dayName}
                          </p>
                          <p className={cn(
                            'text-xs font-bold',
                            day.isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                          )}>
                            {day.date.getDate()}
                          </p>
                          {day.isToday && (
                            <Badge className="mt-0.5 text-[8px] px-1 py-0 bg-emerald-600 text-white">Today</Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Time slot rows */}
                    {TIME_SLOTS.slice(0, 12).map((time) => (
                      <div key={time} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        {/* Time label */}
                        <div className="p-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800 flex items-start pt-2.5">
                          {time}
                        </div>

                        {/* Day columns */}
                        {next7Days.map((day) => {
                          const daySlots = schedule[day.dateStr] || [];
                          const slot = daySlots.find((s) => s.time === time);
                          const colorClass = SCHEDULE_COLORS[slot?.doctorId] || '';

                          return (
                            <div
                              key={`${day.dateStr}-${time}`}
                              className={cn(
                                'p-0.5 border-r border-slate-100 dark:border-slate-800/50 min-h-[36px] cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
                                day.isToday && 'bg-emerald-50/30 dark:bg-emerald-900/5'
                              )}
                              onClick={() => {
                                if (slot) {
                                  toast.info(`Book appointment with ${slot.doctorName} at ${time}`, {
                                    action: {
                                      label: 'Book',
                                      onClick: () => toast.success(`Appointment booked with ${slot.doctorName}`),
                                    },
                                  });
                                }
                              }}
                            >
                              {slot && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={cn(
                                    'rounded px-1 py-0.5 border text-[9px] font-medium truncate',
                                    slot.type === 'break' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' : colorClass
                                  )}
                                >
                                  {slot.type === 'break' ? '☕ Break' : slot.doctorName.replace('Dr. ', '')}
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Doctor Cards Grid ──────────────────────────────────────── */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {doctors.map((doctor) => (
            <motion.div
              key={doctor.id}
              variants={itemAnim}
              layout
              initial="rest"
              whileHover="hover"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            >
              <Card className="border-slate-200 dark:border-slate-800 overflow-hidden rounded-xl cursor-pointer group" onClick={() => setExpandedDoctor(expandedDoctor === doctor.id ? null : doctor.id)}>
                {/* Top gradient header */}
                <div className={cn('h-20 bg-gradient-to-r relative', getGradientColor(doctor.id))}>
                  {/* Decorative circles */}
                  <div className="absolute top-2 right-4 w-16 h-16 rounded-full bg-white/10" />
                  <div className="absolute bottom-0 right-8 w-10 h-10 rounded-full bg-white/5" />

                  {/* Appointment count badge */}
                  {doctor.todayAppointments > 0 && (
                    <motion.div
                      className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Calendar className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-bold text-white">{doctor.todayAppointments}</span>
                    </motion.div>
                  )}

                  {/* Consultation fee badge */}
                  <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                    <span className="text-[10px] font-bold text-white">₹{doctor.consultationFee}</span>
                  </div>
                </div>

                <CardContent className="p-4 relative">
                  {/* Avatar overlap */}
                  <div className="absolute -top-8 left-4">
                    <div className="relative">
                      <div className={cn(
                        'w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900',
                        getGradientColor(doctor.id)
                      )}>
                        <span className="text-lg font-bold text-white">{getInitials(doctor.name)}</span>
                      </div>
                      {/* Availability dot */}
                      <div className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900',
                        AVAILABILITY_CONFIG[doctor.availability].color
                      )}>
                        {AVAILABILITY_CONFIG[doctor.availability].pulse && (
                          <motion.div
                            className={cn('absolute inset-0 rounded-full', AVAILABILITY_CONFIG[doctor.availability].color)}
                            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Doctor info */}
                  <div className="mt-6">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{doctor.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">
                        {doctor.specialization}
                      </Badge>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{doctor.qualification}</span>
                    </div>
                  </div>

                  {/* Experience & Rating */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{doctor.yearsOfExperience} yrs exp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={doctor.rating} />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">({doctor.reviewCount})</span>
                    </div>
                  </div>

                  {/* Availability status */}
                  <div className="mt-3">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
                      AVAILABILITY_CONFIG[doctor.availability].bg,
                      AVAILABILITY_CONFIG[doctor.availability].textColor,
                    )}>
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        AVAILABILITY_CONFIG[doctor.availability].color
                      )} />
                      {AVAILABILITY_CONFIG[doctor.availability].label}
                    </span>
                  </div>

                  {/* Languages */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {doctor.languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Languages className="w-2.5 h-2.5 mr-0.5" />
                        {lang}
                      </Badge>
                    ))}
                  </div>

                  {/* Expand indicator */}
                  <div className="flex items-center justify-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                      {expandedDoctor === doctor.id ? 'Show Less' : 'View Profile'}
                      <ChevronRight className={cn('w-3 h-3 transition-transform', expandedDoctor === doctor.id && 'rotate-90')} />
                    </span>
                  </div>
                </CardContent>

                {/* Expanded Profile Section */}
                <AnimatePresence>
                  {expandedDoctor === doctor.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                        {/* Bio */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">About</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{doctor.bio}</p>
                        </div>

                        {/* Contact Details */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{formatPhone(doctor.phone)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{doctor.email}</span>
                          </div>
                        </div>

                        {/* Fee & Qualification */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Consultation Fee</p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">₹{doctor.consultationFee}</p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Patients This Week</p>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{doctor.patientsThisWeek}</p>
                          </div>
                        </div>

                        {/* Available Days */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Available Days</p>
                          <div className="flex gap-1">
                            {WEEK_DAYS.map((day) => (
                              <div
                                key={day}
                                className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-colors',
                                  doctor.availableDays.includes(day)
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700'
                                )}
                              >
                                {day.slice(0, 2)}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Available Slots Today */}
                        {doctor.availability === 'available' && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                              Available Slots Today
                            </p>
                            <ScrollArea className="w-full" type="scroll">
                              <div className="flex gap-1.5 pb-1">
                                {doctor.availableSlots.slice(0, 10).map((slot) => (
                                  <button
                                    key={slot}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success(`Appointment booked with ${doctor.name} at ${slot}`);
                                    }}
                                    className="flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {/* Next 7 Days Calendar Strip */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Next 7 Days</p>
                          <div className="flex gap-1.5">
                            {next7Days.map((day) => {
                              const isAvailable = doctor.availableDays.includes(day.dayName) && doctor.availability !== 'on_leave';
                              return (
                                <div
                                  key={day.dateStr}
                                  className={cn(
                                    'flex-1 text-center py-2 rounded-lg border transition-colors',
                                    day.isToday
                                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                      : isAvailable
                                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                  )}
                                >
                                  <p className={cn(
                                    'text-[9px] font-medium',
                                    day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                                  )}>
                                    {day.dayName}
                                  </p>
                                  <p className={cn(
                                    'text-xs font-bold',
                                    isAvailable ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'
                                  )}>
                                    {day.date.getDate()}
                                  </p>
                                  {isAvailable && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto mt-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Doctor ID */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{doctor.id}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Joined {formatDate(doctor.createdAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {doctors.length === 0 && !loading && (
          <motion.div variants={itemAnim} className="col-span-full">
            <Card className="border-dashed border-slate-300 dark:border-slate-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No doctors found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try changing the filter or add a new doctor</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* ─── Add Doctor Dialog ──────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              Add New Doctor
            </DialogTitle>
            <DialogDescription>Fill in the details to add a new doctor to your clinic team</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors({ ...formErrors, name: '' }); }}
                  placeholder="e.g. Dr. Anita Verma"
                  className="border-slate-200 dark:border-slate-700"
                />
                {formErrors.name && (
                  <p className="text-[10px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Phone <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => { setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }); setFormErrors({ ...formErrors, phone: '' }); }}
                  placeholder="9876543210"
                  className="border-slate-200 dark:border-slate-700 font-mono"
                />
                {formErrors.phone && (
                  <p className="text-[10px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }); }}
                placeholder="doctor@clinic.in"
                className="border-slate-200 dark:border-slate-700"
              />
              {formErrors.email && (
                <p className="text-[10px] text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.email}
                </p>
              )}
            </div>

            {/* Specialization & Qualification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Specialization <span className="text-rose-500">*</span>
                </Label>
                <Select value={form.specialization} onValueChange={(v) => { setForm({ ...form, specialization: v }); setFormErrors({ ...formErrors, specialization: '' }); }}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.specialization && (
                  <p className="text-[10px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.specialization}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Qualification <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={form.qualification}
                  onChange={(e) => { setForm({ ...form, qualification: e.target.value }); setFormErrors({ ...formErrors, qualification: '' }); }}
                  placeholder="e.g. MBBS, MD"
                  className="border-slate-200 dark:border-slate-700"
                />
                {formErrors.qualification && (
                  <p className="text-[10px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.qualification}
                  </p>
                )}
              </div>
            </div>

            {/* Experience & Fee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Years of Experience</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={form.yearsOfExperience}
                  onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                  placeholder="e.g. 10"
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Consultation Fee (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.consultationFee}
                  onChange={(e) => { setForm({ ...form, consultationFee: e.target.value }); setFormErrors({ ...formErrors, consultationFee: '' }); }}
                  placeholder="e.g. 500"
                  className="border-slate-200 dark:border-slate-700"
                />
                {formErrors.consultationFee && (
                  <p className="text-[10px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.consultationFee}
                  </p>
                )}
              </div>
            </div>

            {/* Available Days */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                Available Days
              </Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                {WEEK_DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.availableDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{day}</span>
                  </label>
                ))}
              </div>
              {formErrors.availableDays && (
                <p className="text-[10px] text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.availableDays}
                </p>
              )}
            </div>

            {/* Available Hours */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Available Hours
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="border-slate-200 dark:border-slate-700 w-36"
                />
                <span className="text-xs text-slate-400">to</span>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="border-slate-200 dark:border-slate-700 w-36"
                />
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                Languages Spoken
              </Label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                {LANGUAGES.map((lang) => (
                  <motion.button
                    key={lang}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleLanguage(lang)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200',
                      form.languages.includes(lang)
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    )}
                  >
                    {form.languages.includes(lang) && <CheckCircle2 className="w-3 h-3 inline mr-0.5" />}
                    {lang}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Bio / About
              </Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Brief description about the doctor's expertise and experience..."
                className="border-slate-200 dark:border-slate-700 min-h-[80px] resize-none"
              />
            </div>

            {/* Photo Upload Placeholder */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Profile Photo</Label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
                  <GraduationCap className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Click to upload or drag & drop</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); resetForm(); }}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDoctor}
              disabled={adding}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Add Doctor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
