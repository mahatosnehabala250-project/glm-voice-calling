'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Phone, PhoneCall, Calendar, Clock, MessageSquare, FileText,
  Tag, Filter, Download, Plus, ChevronRight, Star, AlertTriangle, CheckCircle,
  XCircle, UserPlus, Mail, MessageCircle, Edit3, Trash2, Eye, MoreHorizontal,
  Heart, Activity, TrendingUp, ArrowUpRight, ArrowDownRight, Hash,
  Stethoscope, Building2, Globe, ChevronDown, Ban, UserCheck, UserX,
  BookmarkPlus, Bell, Send, X, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

/* ============================================================
   Types
   ============================================================ */
interface Patient {
  phone: string;
  name: string;
  lastVisit: string;
  totalCalls: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  avgSentiment: string;
  totalSpent: number;
  tags: string[];
  lastCallStatus: string;
  nextAppointment?: string;
  notes: PatientNote[];
}

interface PatientNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  type: 'note' | 'follow-up' | 'reminder' | 'alert';
}

interface CallRecord {
  id: string;
  callerPhone: string;
  callerName: string | null;
  status: string;
  duration: number;
  startedAt: string;
  intent: string | null;
  sentiment: string | null;
  summary: string | null;
}

interface AppointmentRecord {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
  bookedVia: string;
  consultationFee: string | null;
}

/* ============================================================
   Constants
   ============================================================ */
const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
  neutral: 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400',
  negative: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400',
  angry: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
};

const SENTIMENT_ICONS: Record<string, typeof Heart> = {
  positive: Heart,
  neutral: Activity,
  negative: AlertTriangle,
  angry: AlertTriangle,
};

const STATUS_BADGES: Record<string, { color: string; icon: typeof CheckCircle }> = {
  confirmed: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  cancelled: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: XCircle },
  completed: { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: CheckCircle },
  no_show: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: UserX },
};

const TAG_COLORS: Record<string, string> = {
  'Regular': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'VIP': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'New': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Follow-up': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Follow-up Needed': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'High Value': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'Emergency': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Referred': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

const QUICK_FILTERS = [
  { label: 'All Patients', value: 'all' },
  { label: 'VIP', value: 'vip' },
  { label: 'New', value: 'new' },
  { label: 'Follow-up Due', value: 'followup' },
  { label: 'High Value', value: 'highvalue' },
];

const HINDI_NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Devi', 'Vikram Singh',
  'Anita Gupta', 'Rahul Verma', 'Meena Kumari', 'Suresh Yadav', 'Pooja Mehta',
  'Deepak Joshi', 'Kavita Rani', 'Manoj Tiwari', 'Ritu Agarwal', 'Ashok Mishra',
  'Neha Saxena', 'Ravi Dubey', 'Suman Pandey', 'Arun Kapoor', 'Geeta Devi',
  'Mohammad Irfan', 'Sneha Kulkarni', 'Alok Srivastava', 'Divya Nair', 'Prakash Reddy',
];

/* ============================================================
   Helper Functions
   ============================================================ */
function formatPhone(phone: string): string {
  if (phone.length === 10) return `+91 ${phone.slice(0,5)} ${phone.slice(5)}`;
  if (phone.startsWith('+91')) return phone;
  return phone;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr: string): string {
  const days = daysAgo(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/* ============================================================
   Main Component
   ============================================================ */
export default function PatientCRM() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId;

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'calls' | 'revenue'>('recent');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'follow-up' | 'reminder' | 'alert'>('note');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '', notes: '', tags: ['New'] as string[] });
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importFile, setImportFile] = useState<File | null>(null);

  // Fetch data
  useEffect(() => {
    if (!clinicId) return;
    const fetchData = async () => {
      try {
        const [callsRes, apptsRes] = await Promise.all([
          fetch('/api/client/calls', { headers: { 'x-clinic-id': clinicId } }),
          fetch('/api/client/appointments', { headers: { 'x-clinic-id': clinicId } }),
        ]);
        const callsData = await callsRes.json();
        const apptsData = await apptsRes.json();

        const callRecords: CallRecord[] = callsData.calls || callsData || [];
        const apptRecords: AppointmentRecord[] = apptsData.appointments || apptsData || [];

        setCalls(callRecords);
        setAppointments(apptRecords);

        // Build patient list from calls and appointments
        const patientMap = new Map<string, Patient>();

        // Process calls
        callRecords.forEach((call: CallRecord) => {
          const phone = call.callerPhone;
          const name = call.callerName || HINDI_NAMES[Math.abs(hashCode(phone)) % HINDI_NAMES.length];

          if (!patientMap.has(phone)) {
            patientMap.set(phone, {
              phone, name,
              lastVisit: call.startedAt,
              totalCalls: 0, totalAppointments: 0,
              completedAppointments: 0, cancelledAppointments: 0,
              avgSentiment: 'neutral', totalSpent: 0,
              tags: [], lastCallStatus: call.status, notes: [],
            });
          }
          const p = patientMap.get(phone)!;
          p.totalCalls++;
          if (call.sentiment) p.avgSentiment = call.sentiment;
          if (new Date(call.startedAt) > new Date(p.lastVisit)) p.lastVisit = call.startedAt;
          p.lastCallStatus = call.status;
          // Add tags based on call data
          if (p.totalCalls >= 5 && !p.tags.includes('Regular')) p.tags.push('Regular');
          if (call.intent === 'emergency' && !p.tags.includes('Emergency')) p.tags.push('Emergency');
        });

        // Process appointments
        apptRecords.forEach((appt: AppointmentRecord) => {
          const phone = appt.patientPhone;
          const name = appt.patientName || HINDI_NAMES[Math.abs(hashCode(phone)) % HINDI_NAMES.length];

          if (!patientMap.has(phone)) {
            patientMap.set(phone, {
              phone, name,
              lastVisit: appt.date,
              totalCalls: 0, totalAppointments: 0,
              completedAppointments: 0, cancelledAppointments: 0,
              avgSentiment: 'neutral', totalSpent: 0,
              tags: ['New'], lastCallStatus: 'completed', notes: [],
            });
          }
          const p = patientMap.get(phone)!;
          p.totalAppointments++;
          if (appt.status === 'completed') {
            p.completedAppointments++;
            const fee = parseInt(appt.consultationFee || '0');
            p.totalSpent += fee;
          }
          if (appt.status === 'cancelled') p.cancelledAppointments++;
          if (p.totalSpent >= 5000 && !p.tags.includes('High Value')) p.tags.push('High Value');
          if (p.totalSpent >= 10000 && !p.tags.includes('VIP')) p.tags.push('VIP');
          if (!p.tags.includes('New') && p.totalAppointments <= 2) p.tags.push('New');

          // Set next appointment
          if (appt.status === 'confirmed' || appt.status === 'pending') {
            const apptDate = new Date(`${appt.date}T${appt.time}`);
            if (!p.nextAppointment || apptDate > new Date(p.nextAppointment)) {
              p.nextAppointment = `${appt.date}T${appt.time}`;
            }
          }
        });

        // Sort by last visit
        const sorted = Array.from(patientMap.values())
          .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
        setPatients(sorted);
      } catch (err) {
        console.error('Failed to fetch patient data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clinicId]);

  // Filter & sort patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (activeFilter !== 'all') {
      switch (activeFilter) {
        case 'vip': result = result.filter(p => p.tags.includes('VIP')); break;
        case 'new': result = result.filter(p => p.tags.includes('New')); break;
        case 'followup': result = result.filter(p => p.tags.includes('Follow-up')); break;
        case 'highvalue': result = result.filter(p => p.tags.includes('High Value')); break;
      }
    }

    // Sort
    switch (sortBy) {
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'calls': result.sort((a, b) => b.totalCalls - a.totalCalls); break;
      case 'revenue': result.sort((a, b) => b.totalSpent - a.totalSpent); break;
      default: result.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
    }

    return result;
  }, [patients, searchQuery, activeFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const vipCount = patients.filter(p => p.tags.includes('VIP')).length;
    const regularCount = patients.filter(p => p.tags.includes('Regular')).length;
    const totalRevenue = patients.reduce((sum, p) => sum + p.totalSpent, 0);
    const avgCallsPerPatient = totalPatients > 0 ? (patients.reduce((sum, p) => sum + p.totalCalls, 0) / totalPatients).toFixed(1) : '0';
    const bookingRate = patients.length > 0
      ? ((patients.filter(p => p.totalAppointments > 0).length / totalPatients) * 100).toFixed(1)
      : '0';
    return { totalPatients, vipCount, regularCount, totalRevenue, avgCallsPerPatient, bookingRate };
  }, [patients]);

  // Selected patient's calls & appointments
  const patientCalls = useMemo(() => {
    if (!selectedPatient) return [];
    return calls.filter(c => c.callerPhone === selectedPatient.phone)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [selectedPatient, calls]);

  const patientAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments.filter(a => a.patientPhone === selectedPatient.phone)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPatient, appointments]);

  // Actions
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailPanel(true);
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !selectedPatient) return;
    const newNote: PatientNote = {
      id: Date.now().toString(),
      text: noteText,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Staff',
      type: noteType,
    };
    setPatients(prev => prev.map(p =>
      p.phone === selectedPatient.phone ? { ...p, notes: [...p.notes, newNote] } : p
    ));
    setSelectedPatient(prev => prev ? { ...prev, notes: [...prev.notes, newNote] } : null);
    setNoteText('');
    setShowAddNote(false);
    toast.success('Note added successfully');
  };

  const handleAddTag = (tag: string) => {
    if (!selectedPatient || selectedPatient.tags.includes(tag)) return;
    const updated = { ...selectedPatient, tags: [...selectedPatient.tags, tag] };
    setSelectedPatient(updated);
    setPatients(prev => prev.map(p => p.phone === selectedPatient.phone ? updated : p));
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedPatient) return;
    const updated = { ...selectedPatient, tags: selectedPatient.tags.filter(t => t !== tag) };
    setSelectedPatient(updated);
    setPatients(prev => prev.map(p => p.phone === selectedPatient.phone ? updated : p));
  };

  const handleAddPatient = () => {
    if (!newPatient.name.trim() || !newPatient.phone.trim()) {
      toast.error('Please fill in patient name and phone number');
      return;
    }
    const patient: Patient = {
      phone: newPatient.phone,
      name: newPatient.name,
      lastVisit: new Date().toISOString(),
      totalCalls: 0,
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      avgSentiment: 'neutral',
      totalSpent: 0,
      tags: newPatient.tags,
      lastCallStatus: 'new',
      notes: newPatient.email ? [{ id: Date.now().toString(), text: `Email: ${newPatient.email}`, createdAt: new Date().toISOString(), createdBy: user?.name || 'Staff', type: 'note' }] : [],
    };
    setPatients(prev => [patient, ...prev]);
    setShowAddPatient(false);
    setNewPatient({ name: '', phone: '', email: '', notes: '', tags: ['New'] });
    toast.success(`Patient ${patient.name} added successfully`);
  };

  const handleImportCSV = () => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          toast.error('CSV file is empty or has no data rows');
          return;
        }
        const imported: Patient[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 2) continue;
          const phone = cols[1] || '';
          const name = cols[0] || 'Unknown';
          if (phone.length < 10) continue;
          const existing = patients.find(p => p.phone === phone);
          if (existing) continue;
          const patient: Patient = {
            phone,
            name,
            lastVisit: new Date().toISOString(),
            totalCalls: 0,
            totalAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            avgSentiment: 'neutral',
            totalSpent: 0,
            tags: ['New'],
            lastCallStatus: 'new',
            notes: cols[2] ? [{ id: Date.now().toString() + i, text: `Email: ${cols[2]}`, createdAt: new Date().toISOString(), createdBy: 'Import', type: 'note' }] : [],
          };
          imported.push(patient);
        }
        if (imported.length === 0) {
          toast.error('No new patients found in CSV (all already exist)');
          return;
        }
        setPatients(prev => [...imported, ...prev]);
        setShowImport(false);
        setImportFile(null);
        toast.success(`Imported ${imported.length} patient(s) successfully`);
      } catch {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(importFile);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Total Calls', 'Appointments', 'Revenue', 'Last Visit', 'Tags', 'Sentiment'];
    const rows = filteredPatients.map(p => [
      p.name,
      formatPhone(p.phone),
      p.totalCalls,
      p.totalAppointments,
      `₹${p.totalSpent}`,
      formatDate(p.lastVisit),
      p.tags.join(', '),
      p.avgSentiment,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceai-patients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Patient list exported');
    setShowExport(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patient CRM</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage patients & build lasting relationships</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">
            <Users className="w-3 h-3 mr-1" />
            {stats.totalPatients} Patients
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImport(true)}
            className="gap-1.5"
          >
            <Download className="w-4 h-4 rotate-180" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExport(true)}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddPatient(true)}
            className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
          >
            <UserPlus className="w-4 h-4" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'from-emerald-500 to-teal-600', trend: '+12%' },
          { label: 'VIP Patients', value: stats.vipCount, icon: Star, color: 'from-amber-500 to-orange-600', trend: null },
          { label: 'Regular', value: stats.regularCount, icon: UserCheck, color: 'from-sky-500 to-blue-600', trend: null },
          { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'from-violet-500 to-purple-600', trend: '+8%' },
          { label: 'Avg Calls/Patient', value: stats.avgCallsPerPatient, icon: PhoneCall, color: 'from-rose-500 to-pink-600', trend: null },
          { label: 'Booking Rate', value: `${stats.bookingRate}%`, icon: Calendar, color: 'from-teal-500 to-cyan-600', trend: '+3%' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-slate-200/60 dark:border-slate-700/40 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  {stat.trend && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" />
                      {stat.trend}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search patients by name, phone, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {QUICK_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={activeFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(f.value)}
              className={`whitespace-nowrap text-xs ${activeFilter === f.value ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
            >
              {f.label}
            </Button>
          ))}
          <Separator orientation="vertical" className="h-6" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="calls">Most Calls</SelectItem>
              <SelectItem value="revenue">Highest Revenue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patient Grid/List */}
      {filteredPatients.length === 0 ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No patients found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {searchQuery ? 'Try a different search term' : 'Add your first patient to get started'}
          </p>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPatients.map((patient, i) => (
            <PatientCard
              key={patient.phone}
              patient={patient}
              index={i}
              onSelect={handleSelectPatient}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Patient</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Phone</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Calls</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Appts</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Revenue</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Last Visit</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Tags</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, i) => (
                  <PatientTableRow
                    key={patient.phone}
                    patient={patient}
                    index={i}
                    onSelect={handleSelectPatient}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="fixed bottom-24 lg:bottom-8 right-6 z-30 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-emerald-600' : ''}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0" width="7" height="7" rx="1.5" />
            <rect x="9" y="0" width="7" height="7" rx="1.5" />
            <rect x="0" y="9" width="7" height="7" rx="1.5" />
            <rect x="9" y="9" width="7" height="7" rx="1.5" />
          </svg>
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
          className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-emerald-600' : ''}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="1" width="16" height="3" rx="1" />
            <rect x="0" y="6.5" width="16" height="3" rx="1" />
            <rect x="0" y="12" width="16" height="3" rx="1" />
          </svg>
        </Button>
      </div>

      {/* Patient Detail Panel (Sheet) */}
      <AnimatePresence>
        {showDetailPanel && selectedPatient && (
          <PatientDetailPanel
            patient={selectedPatient}
            calls={patientCalls}
            appointments={patientAppointments}
            onClose={() => { setShowDetailPanel(false); setSelectedPatient(null); }}
            onAddNote={() => setShowAddNote(true)}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        )}
      </AnimatePresence>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Add Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Note Type</Label>
              <Select value={noteType} onValueChange={(v) => setNoteType(v as typeof noteType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">📝 General Note</SelectItem>
                  <SelectItem value="follow-up">🔄 Follow-up</SelectItem>
                  <SelectItem value="reminder">⏰ Reminder</SelectItem>
                  <SelectItem value="alert">🚨 Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Write a note about this patient..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
            <Button onClick={handleAddNote} className="bg-emerald-600 hover:bg-emerald-500">Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Patient Dialog */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Add New Patient
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient Name *</Label>
              <Input
                placeholder="Enter patient name"
                value={newPatient.name}
                onChange={(e) => setNewPatient(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                placeholder="+91 XXXXX XXXXX"
                value={newPatient.phone}
                onChange={(e) => setNewPatient(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                placeholder="patient@email.com"
                type="email"
                value={newPatient.email}
                onChange={(e) => setNewPatient(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Any initial notes about this patient..."
                value={newPatient.notes}
                onChange={(e) => setNewPatient(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1 min-h-[70px]"
              />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['New', 'VIP', 'Follow-up Needed', 'High Value', 'Referred', 'Emergency'].map(tag => (
                  <Badge
                    key={tag}
                    variant={newPatient.tags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer text-xs ${newPatient.tags.includes(tag) ? 'bg-emerald-600' : ''}`}
                    onClick={() => {
                      setNewPatient(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }));
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPatient(false)}>Cancel</Button>
            <Button onClick={handleAddPatient} className="bg-emerald-600 hover:bg-emerald-500">Add Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              Export Patients
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export {filteredPatients.length} patients as CSV file with all details.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExport(false)}>Cancel</Button>
            <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600 rotate-180" />
              Import Patients
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-emerald-200 dark:border-emerald-800 p-6 text-center">
              <Upload className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload CSV File</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Format: Name, Phone, Email (one patient per row)</p>
              <input
                type="file"
                accept=".csv"
                className="mt-3 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 cursor-pointer"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              {importFile && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                  Selected: {importFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportFile(null); }}>Cancel</Button>
            <Button onClick={handleImportCSV} disabled={!importFile} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Patient Card (Grid View)
   ============================================================ */
function PatientCard({ patient, index, onSelect }: { patient: Patient; index: number; onSelect: (p: Patient) => void }) {
  const SentIcon = SENTIMENT_ICONS[patient.avgSentiment] || Activity;
  const sentColor = SENTIMENT_COLORS[patient.avgSentiment] || SENTIMENT_COLORS.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className="cursor-pointer border-slate-200/60 dark:border-slate-700/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 group"
        onClick={() => onSelect(patient)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-11 h-11 border-2 border-emerald-100 dark:border-emerald-900/30">
                <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>
              {/* Online-like indicator */}
              {patient.lastCallStatus === 'completed' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + Phone */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {patient.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {formatPhone(patient.phone)}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {patient.tags.slice(0, 3).map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                  >
                    {tag}
                  </Badge>
                ))}
                {patient.tags.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{patient.tags.length - 3}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <PhoneCall className="w-3 h-3" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{patient.totalCalls}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3 h-3" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{patient.totalAppointments}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-3 h-3" />
                <span className="font-medium text-slate-700 dark:text-slate-300">₹{patient.totalSpent.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SentIcon className={`w-3 h-3 ${sentColor.split(' ')[0]}`} />
              <span className={`text-[10px] font-medium capitalize ${sentColor}`}>
                {patient.avgSentiment}
              </span>
            </div>
          </div>

          {/* Last visit */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
            Last visit: {timeAgo(patient.lastVisit)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================
   Patient Table Row (List View)
   ============================================================ */
function PatientTableRow({ patient, index, onSelect }: { patient: Patient; index: number; onSelect: (p: Patient) => void }) {
  const SentIcon = SENTIMENT_ICONS[patient.avgSentiment] || Activity;
  const sentColor = SENTIMENT_COLORS[patient.avgSentiment] || SENTIMENT_COLORS.neutral;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-slate-100 dark:border-slate-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors"
      onClick={() => onSelect(patient)}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              {getInitials(patient.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-slate-900 dark:text-white">{patient.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">{formatPhone(patient.phone)}</td>
      <td className="py-3 px-4 text-center text-sm font-medium text-slate-700 dark:text-slate-300">{patient.totalCalls}</td>
      <td className="py-3 px-4 text-center text-sm font-medium text-slate-700 dark:text-slate-300">{patient.totalAppointments}</td>
      <td className="py-3 px-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">₹{patient.totalSpent.toLocaleString('en-IN')}</td>
      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{timeAgo(patient.lastVisit)}</td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {patient.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className={`text-[10px] px-1.5 py-0 ${TAG_COLORS[tag] || ''}`}>
              {tag}
            </Badge>
          ))}
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${sentColor}`}>
          <SentIcon className="w-3 h-3" />
          {patient.avgSentiment}
        </div>
      </td>
    </motion.tr>
  );
}

/* ============================================================
   Patient Detail Panel (Right Sheet)
   ============================================================ */
function PatientDetailPanel({
  patient, calls, appointments, onClose, onAddNote, onAddTag, onRemoveTag
}: {
  patient: Patient;
  calls: CallRecord[];
  appointments: AppointmentRecord[];
  onClose: () => void;
  onAddNote: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'appointments' | 'timeline' | 'notes'>('overview');
  const SentIcon = SENTIMENT_ICONS[patient.avgSentiment] || Activity;
  const sentColor = SENTIMENT_COLORS[patient.avgSentiment] || SENTIMENT_COLORS.neutral;
  const allTags = ['VIP', 'Regular', 'New', 'Follow-up', 'Follow-up Needed', 'High Value', 'Referred', 'Emergency'];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-3 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {getInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{patient.name}</h2>
              <p className="text-emerald-100 text-sm font-mono">{formatPhone(patient.phone)}</p>
              <p className="text-emerald-200 text-xs mt-0.5">Last visit: {formatDate(patient.lastVisit)}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { label: 'Calls', value: patient.totalCalls, icon: PhoneCall },
              { label: 'Appts', value: patient.totalAppointments, icon: Calendar },
              { label: 'Spent', value: `₹${patient.totalSpent.toLocaleString('en-IN')}`, icon: TrendingUp },
              { label: 'Rating', value: patient.avgSentiment, icon: SentIcon },
            ].map(stat => (
              <div key={stat.label} className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
                <stat.icon className="w-4 h-4 mx-auto text-emerald-100 mb-1" />
                <p className="text-sm font-bold">{stat.value}</p>
                <p className="text-[10px] text-emerald-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 overflow-x-auto">
          <div className="flex gap-1">
            {(['overview', 'calls', 'appointments', 'timeline', 'notes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Patient Stats Summary Card */}
              <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5">
                <CardContent className="p-3">
                  <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">Patient Summary</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Total Visits', value: patient.completedAppointments.toString(), icon: Calendar, color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Last Visit', value: timeAgo(patient.lastVisit), icon: Clock, color: 'text-teal-600 dark:text-teal-400' },
                      { label: 'Outstanding', value: `₹${Math.max(0, patient.totalSpent - patient.completedAppointments * 500).toLocaleString('en-IN')}`, icon: TrendingDown, color: 'text-amber-600 dark:text-amber-400' },
                      { label: 'Loyalty Score', value: `${Math.min(100, (patient.totalCalls + patient.totalAppointments * 2 + (patient.tags.includes('VIP') ? 20 : 0) + (patient.tags.includes('Regular') ? 10 : 0)))}`, icon: Heart, color: 'text-rose-600 dark:text-rose-400' },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center gap-2">
                        <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{stat.label}</p>
                          <p className={`text-xs font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tags Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Patient Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {patient.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className={`text-xs gap-1 cursor-pointer ${TAG_COLORS[tag] || ''}`}
                      onClick={() => onRemoveTag(tag)}
                    >
                      {tag}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                  {allTags.filter(t => !patient.tags.includes(t)).map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                      onClick={() => onAddTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Quick Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Patient Info</h4>
                {[
                  { icon: Phone, label: 'Phone', value: formatPhone(patient.phone) },
                  { icon: Calendar, label: 'Next Appointment', value: patient.nextAppointment ? formatDate(patient.nextAppointment) : 'None scheduled' },
                  { icon: Heart, label: 'Sentiment', value: patient.avgSentiment },
                  { icon: Hash, label: 'Total Spent', value: `₹${patient.totalSpent.toLocaleString('en-IN')}` },
                  { icon: MessageSquare, label: 'Booking Rate', value: patient.totalCalls > 0 ? `${((patient.totalAppointments / patient.totalCalls) * 100).toFixed(0)}%` : 'N/A' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 text-sm">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400 w-28 flex-shrink-0">{item.label}</span>
                    <span className="font-medium text-slate-900 dark:text-white capitalize">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Next Appointment Card */}
              {patient.nextAppointment && (
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Upcoming Appointment</h4>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {formatDate(patient.nextAppointment)} at {new Date(patient.nextAppointment).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="space-y-2">
              {calls.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No call records found</p>
              ) : calls.map(call => {
                const StatusIcon = call.status === 'completed' || call.status === 'answered' ? CheckCircle : call.status === 'missed' ? XCircle : PhoneCall;
                const statusColor = call.status === 'completed' || call.status === 'answered' ? 'text-emerald-500' : call.status === 'missed' ? 'text-rose-500' : 'text-slate-400';
                return (
                  <Card key={call.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{call.status} Call</p>
                            <p className="text-xs text-slate-500">{formatDate(call.startedAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDuration(call.duration)}</p>
                          {call.sentiment && (
                            <Badge variant="secondary" className={`text-[10px] ${SENTIMENT_COLORS[call.sentiment] || ''}`}>
                              {call.sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {call.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{call.summary}</p>
                      )}
                      {call.intent && (
                        <Badge variant="outline" className="text-[10px] mt-1.5 capitalize">{call.intent}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-2">
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No appointments found</p>
              ) : appointments.map(appt => {
                const status = STATUS_BADGES[appt.status] || STATUS_BADGES.pending;
                const StatusIcon = status.icon;
                return (
                  <Card key={appt.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {formatDate(appt.date)} at {appt.time}
                            </p>
                            {appt.reason && (
                              <p className="text-xs text-slate-500">{appt.reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-[10px] ${status.color}`}>
                            <StatusIcon className="w-3 h-3 mr-0.5" />
                            {appt.status}
                          </Badge>
                          {appt.consultationFee && (
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                              ₹{appt.consultationFee}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                        <span>Via: {appt.bookedVia}</span>
                        {appt.consultationFee && <span>•</span>}
                        {appt.consultationFee && <span>Fee: ₹{appt.consultationFee}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-0">
              {(() => {
                const timeline = [
                  ...calls.map(c => ({
                    id: c.id, type: 'call' as const, date: c.startedAt,
                    title: `${c.status} Call`,
                    subtitle: c.intent ? `Intent: ${c.intent}` : '',
                    detail: `${formatDuration(c.duration)}`,
                    icon: PhoneCall,
                    color: c.status === 'completed' || c.status === 'answered' ? 'text-emerald-500' : c.status === 'missed' ? 'text-rose-500' : 'text-slate-400',
                  })),
                  ...appointments.map(a => ({
                    id: a.id, type: 'appointment' as const, date: `${a.date}T${a.time}`,
                    title: `${a.reason || 'Appointment'}`,
                    subtitle: a.status,
                    detail: a.consultationFee ? `₹${a.consultationFee}` : '',
                    icon: Calendar,
                    color: a.status === 'confirmed' ? 'text-emerald-500' : a.status === 'completed' ? 'text-teal-500' : 'text-amber-500',
                  })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (timeline.length === 0) return (
                  <p className="text-sm text-slate-500 text-center py-8">No communication history</p>
                );

                return timeline.map((item, i) => (
                  <div key={item.id} className="flex gap-3 pb-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.type === 'call' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-teal-50 dark:bg-teal-900/20'
                      }`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700" />}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-[10px] ${item.type === 'call' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
                      {item.detail && <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">{item.detail}</p>}
                    </div>
                  </div>
                ));
              })()
              }
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <Button onClick={onAddNote} size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
              {patient.notes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No notes yet</p>
                </div>
              ) : patient.notes.map(note => (
                <Card key={note.id} className="border-l-4 border-l-emerald-400 dark:border-l-emerald-600">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">{note.type}</Badge>
                      <span className="text-[10px] text-slate-400">{timeAgo(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{note.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">— {note.createdBy}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => toast.info(`Calling ${patient.name}...`)}>
            <PhoneCall className="w-4 h-4" />
            Call
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => toast.info(`Opening WhatsApp chat with ${patient.name}...`)}>
            <MessageCircle className="w-4 h-4" />
            Message
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => toast.success(`Appointment booking started for ${patient.name}`)}>
            <Calendar className="w-4 h-4" />
            Book
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setActiveTab('timeline')}>
            <FileText className="w-4 h-4" />
            History
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   Utility
   ============================================================ */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
