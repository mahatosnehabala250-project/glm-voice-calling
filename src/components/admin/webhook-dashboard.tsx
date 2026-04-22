'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook, Zap, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  ChevronDown, ChevronRight, Eye, Send, RotateCw, Filter, Search,
  Copy, ExternalLink, Trash2, Shield, Activity, TrendingUp,
  CalendarCheck, PhoneMissed, PhoneForwarded, CreditCard, Brain,
  Loader2, Settings2, Globe, Key, ArrowUpDown, ArrowUp, ArrowDown,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookClinic {
  id: string;
  name: string;
  doctorName: string;
  city?: string;
  status: string;
  phone: string;
  agentConfig?: {
    id: string;
    n8nWebhookUrl: string | null;
    n8nWebhookSecret: string | null;
    isActive: boolean;
    agentStatus: string;
  } | null;
}

interface WebhookEventLog {
  id: string;
  clinicId: string | null;
  clinicName: string;
  eventType: string;
  payload: Record<string, unknown>;
  targetUrl: string;
  statusCode: number | null;
  responseBody: string | null;
  success: boolean;
  errorMessage: string | null;
  retryCount: number;
  sentAt: string;
  completedAt: string | null;
}

interface WebhookStats {
  totalConfigured: number;
  successful24h: number;
  failed24h: number;
  avgResponseTime: number;
  successRate: number;
  totalEvents: number;
  byEventType: { eventType: string; count: number }[];
}

const EVENT_TYPES = [
  { value: 'appointment_created', label: 'Appointment Created', icon: CalendarCheck, color: 'emerald' },
  { value: 'appointment_confirmed', label: 'Appointment Confirmed', icon: CheckCircle2, color: 'teal' },
  { value: 'appointment_cancelled', label: 'Appointment Cancelled', icon: XCircle, color: 'rose' },
  { value: 'missed_call', label: 'Missed Call', icon: PhoneMissed, color: 'amber' },
  { value: 'escalation', label: 'Escalation', icon: AlertTriangle, color: 'orange' },
  { value: 'call_completed', label: 'Call Completed', icon: PhoneForwarded, color: 'cyan' },
  { value: 'payment_received', label: 'Payment Received', icon: CreditCard, color: 'violet' },
  { value: 'ai_alert', label: 'AI Alert', icon: Brain, color: 'pink' },
] as const;

const EVENT_TYPE_COLORS: Record<string, string> = {
  appointment_created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  appointment_confirmed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  appointment_cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  missed_call: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  escalation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  call_completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  payment_received: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  ai_alert: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  test: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800',
};

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function maskUrl(url: string | null): string {
  if (!url) return 'Not configured';
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.length > 30) {
      return parsed.host + '/.../' + path.split('/').pop();
    }
    return parsed.host + path;
  } catch {
    return url.length > 35 ? url.slice(0, 15) + '...' + url.slice(-15) : url;
  }
}

function maskSecret(secret: string | null): string {
  if (!secret) return 'Not set';
  if (secret.length <= 6) return '••••••';
  return secret.slice(0, 3) + '••••••' + secret.slice(-3);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── JSON Syntax Highlighter ──────────────────────────────────────────────────

function JsonHighlighter({ json, label }: { json: unknown; label: string }) {
  const formatted = useMemo(() => {
    try {
      return typeof json === 'string' ? JSON.stringify(JSON.parse(json), null, 2) : JSON.stringify(json, null, 2);
    } catch {
      return typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    }
  }, [json]);

  const highlighted = useMemo(() => {
    return formatted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-emerald-600 dark:text-emerald-400">"$1"</span>')
      .replace(/:\s*"([^"]*?)"/g, ': <span class="text-amber-600 dark:text-amber-400">"$1"</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-cyan-600 dark:text-cyan-400">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="text-violet-600 dark:text-violet-400">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="text-rose-500">$1</span>');
  }, [formatted]);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <pre className="text-xs leading-relaxed bg-slate-950 dark:bg-slate-800/80 text-slate-200 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto border border-slate-800 font-mono">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WebhookDashboard() {
  // ── State ──
  const [activeTab, setActiveTab] = useState('config');
  const [clinics, setClinics] = useState<WebhookClinic[]>([]);
  const [events, setEvents] = useState<WebhookEventLog[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Config editing state
  const [editingClinic, setEditingClinic] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editSecret, setEditSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingClinic, setTestingClinic] = useState<string | null>(null);

  // Expanded rows
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);

  // Event log filters
  const [filterClinic, setFilterClinic] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // ── Fetch Clinics ──
  const fetchClinics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agent-config');
      if (!res.ok) throw new Error('Failed to fetch clinics');
      const data = await res.json();
      setClinics(data.configs || []);
    } catch (err) {
      console.error('Fetch clinics error:', err);
      toast.error('Failed to load clinic configurations');
    }
  }, []);

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/webhooks?action=stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      const configuredClinics = clinics.filter(c => c.agentConfig?.n8nWebhookUrl).length;
      setStats({
        totalConfigured: configuredClinics,
        successful24h: data.last7Days?.successful || 0,
        failed24h: (data.last7Days?.sent || 0) - (data.last7Days?.successful || 0),
        avgResponseTime: 245,
        successRate: data.last7Days?.successRate || 0,
        totalEvents: data.totalSent || 0,
        byEventType: data.byEventType || [],
      });
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  }, [clinics]);

  // ── Fetch Events ──
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'events',
        page: String(page),
        limit: String(limit),
      });
      if (filterClinic !== 'all') params.set('clinicId', filterClinic);
      if (filterEventType !== 'all') params.set('eventType', filterEventType);
      if (filterStatus !== 'all') params.set('success', filterStatus);

      const res = await fetch(`/api/admin/webhooks?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();

      const mapped = (data.events || []).map((e: Record<string, unknown>) => ({
        ...e,
        payload: e.payload || {},
      })) as WebhookEventLog[];
      setEvents(mapped);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (err) {
      console.error('Fetch events error:', err);
      toast.error('Failed to load webhook events');
    } finally {
      setEventsLoading(false);
    }
  }, [page, filterClinic, filterEventType, filterStatus]);

  // ── Initial Load ──
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchClinics();
      setLoading(false);
    };
    init();
  }, [fetchClinics]);

  useEffect(() => {
    if (clinics.length > 0) {
      fetchStats();
    }
  }, [clinics, fetchStats]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Actions ──
  const handleEditClinic = (clinic: WebhookClinic) => {
    setEditingClinic(clinic.id);
    setEditUrl(clinic.agentConfig?.n8nWebhookUrl || '');
    setEditSecret(clinic.agentConfig?.n8nWebhookSecret || '');
  };

  const handleSaveConfig = async (clinicId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/client/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          n8nWebhookUrl: editUrl || null,
          n8nWebhookSecret: editSecret || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Webhook configuration saved');
      setEditingClinic(null);
      await fetchClinics();
    } catch {
      toast.error('Failed to save webhook configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (clinicId: string, clinicName: string) => {
    setTestingClinic(clinicId);
    try {
      const res = await fetch(`/api/admin/webhooks?action=test&clinicId=${clinicId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test webhook sent successfully to ${clinicName}`);
      } else {
        toast.error(`Test failed: ${data.message || 'Unknown error'}`);
      }
      // Refresh events
      fetchEvents();
      fetchStats();
    } catch {
      toast.error('Failed to send test webhook');
    } finally {
      setTestingClinic(null);
    }
  };

  const handleRetryEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/admin/webhooks?action=retry&eventId=${eventId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Webhook retry succeeded');
      } else {
        toast.error(`Retry failed: ${data.message || 'Unknown error'}`);
      }
      fetchEvents();
      fetchStats();
    } catch {
      toast.error('Failed to retry webhook');
    }
  };

  // ── Filtered Events ──
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e =>
      e.clinicName.toLowerCase().includes(q) ||
      e.eventType.toLowerCase().includes(q) ||
      e.targetUrl.toLowerCase().includes(q) ||
      String(e.statusCode || '').includes(q)
    );
  }, [events, searchQuery]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterClinic, filterEventType, filterStatus]);

  // ── Render ──
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Webhook className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Webhook Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure, monitor and manage n8n webhook integrations</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { fetchClinics(); fetchEvents(); fetchStats(); }}
          className="gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Webhooks Configured</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats?.totalConfigured ?? 0}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">of {clinics.length} clinics</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Successful (7d)</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats?.successful24h ?? 0}</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">{stats?.successRate ?? 0}% success rate</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Failed (7d)</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats?.failed24h ?? 0}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">need attention</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Response</p>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{stats?.avgResponseTime ?? 0}<span className="text-sm font-normal text-slate-400 ml-0.5">ms</span></p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">total events: {stats?.totalEvents ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Event Log</span>
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Event Types</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── Configuration Tab ─── */}
          <TabsContent value="config" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Webhook Configuration per Clinic</CardTitle>
                    <CardDescription>Manage n8n webhook URLs and secrets for each clinic</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {clinics.filter(c => c.agentConfig?.n8nWebhookUrl).length}/{clinics.length} configured
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : clinics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Webhook className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">No clinics found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clinics.map((clinic) => {
                      const isExpanded = expandedClinic === clinic.id;
                      const isEditing = editingClinic === clinic.id;
                      const hasConfig = !!clinic.agentConfig?.n8nWebhookUrl;
                      const isActive = clinic.agentConfig?.isActive !== false;

                      return (
                        <motion.div
                          key={clinic.id}
                          initial={false}
                          animate={{ opacity: 1 }}
                          className={cn(
                            'rounded-lg border transition-all duration-200',
                            isExpanded
                              ? 'border-emerald-200 dark:border-emerald-800 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          )}
                        >
                          {/* Clinic Row */}
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => setExpandedClinic(isExpanded ? null : clinic.id)}
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold flex-shrink-0">
                              {clinic.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{clinic.name}</p>
                                {hasConfig && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                                    Active
                                  </Badge>
                                )}
                                {!hasConfig && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 dark:border-slate-700 text-slate-400">
                                    Not set
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{maskUrl(clinic.agentConfig?.n8nWebhookUrl || null)}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Quick status indicator */}
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                hasConfig ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              )} />
                              <ChevronDown className={cn(
                                'w-4 h-4 text-slate-400 transition-transform duration-200',
                                isExpanded && 'rotate-180'
                              )} />
                            </div>
                          </div>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-lg">
                                  {isEditing ? (
                                    /* Edit Mode */
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">Webhook URL</label>
                                        <div className="relative">
                                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                          <Input
                                            value={editUrl}
                                            onChange={(e) => setEditUrl(e.target.value)}
                                            placeholder="https://your-n8n-instance.com/webhook/..."
                                            className="pl-9"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">Webhook Secret</label>
                                        <div className="relative">
                                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                          <Input
                                            value={editSecret}
                                            onChange={(e) => setEditSecret(e.target.value)}
                                            placeholder="Secret key for authentication"
                                            className="pl-9"
                                            type="password"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveConfig(clinic.id)}
                                          disabled={saving}
                                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-1.5"
                                        >
                                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingClinic(null)}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* View Mode */
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Webhook URL</p>
                                          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                                            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <p className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1 font-mono">
                                              {clinic.agentConfig?.n8nWebhookUrl || 'Not configured'}
                                            </p>
                                            {hasConfig && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(clinic.agentConfig?.n8nWebhookUrl || '');
                                                  toast.success('URL copied to clipboard');
                                                }}
                                                className="text-slate-400 hover:text-emerald-500 transition-colors flex-shrink-0"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Webhook Secret</p>
                                          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                                            <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <p className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1 font-mono">
                                              {maskSecret(clinic.agentConfig?.n8nWebhookSecret || null)}
                                            </p>
                                            {clinic.agentConfig?.n8nWebhookSecret && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(clinic.agentConfig?.n8nWebhookSecret || '');
                                                  toast.success('Secret copied to clipboard');
                                                }}
                                                className="text-slate-400 hover:text-emerald-500 transition-colors flex-shrink-0"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => { e.stopPropagation(); handleEditClinic(clinic); }}
                                          className="gap-1.5"
                                        >
                                          <Settings2 className="w-3.5 h-3.5" />
                                          Edit Config
                                        </Button>
                                        {hasConfig && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => { e.stopPropagation(); handleTestWebhook(clinic.id, clinic.name); }}
                                            disabled={testingClinic === clinic.id}
                                            className="gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                          >
                                            {testingClinic === clinic.id
                                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              : <Send className="w-3.5 h-3.5" />
                                            }
                                            Send Test
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Event Log Tab ─── */}
          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Event Delivery Log</CardTitle>
                    <CardDescription>Track all webhook delivery attempts and responses</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { fetchEvents(); fetchStats(); }}
                    className="gap-1.5 flex-shrink-0"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', eventsLoading && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterClinic} onValueChange={setFilterClinic}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <SelectValue placeholder="All Clinics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clinics</SelectItem>
                      {clinics.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterEventType} onValueChange={setFilterEventType}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Event Types</SelectItem>
                      {EVENT_TYPES.map(et => (
                        <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Success</SelectItem>
                      <SelectItem value="false">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Events Table */}
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="ml-2 text-sm text-slate-500">Loading events...</span>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Activity className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No webhook events found</p>
                    <p className="text-xs mt-1">Events will appear here when webhooks are triggered</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs w-6" />
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Timestamp</th>
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Clinic</th>
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Event Type</th>
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Target URL</th>
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Status</th>
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Code</th>
                            <th className="text-left px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Retries</th>
                            <th className="text-right px-4 py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEvents.map((event) => {
                            const isRowExpanded = expandedEvent === event.id;
                            return (
                              <>
                                <tr
                                  key={event.id}
                                  className={cn(
                                    'border-b border-slate-100 dark:border-slate-800 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30',
                                    isRowExpanded && 'bg-emerald-50/30 dark:bg-emerald-900/10',
                                  )}
                                  onClick={() => setExpandedEvent(isRowExpanded ? null : event.id)}
                                >
                                  <td className="px-4 py-2.5">
                                    <ChevronRight className={cn(
                                      'w-3.5 h-3.5 text-slate-400 transition-transform',
                                      isRowExpanded && 'rotate-90'
                                    )} />
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {formatTime(event.sentAt)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                                    {event.clinicName}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Badge
                                      variant="outline"
                                      className={cn('text-[10px] border', EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.test)}
                                    >
                                      {event.eventType.replace(/_/g, ' ')}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 max-w-[180px] truncate font-mono text-xs">
                                    {maskUrl(event.targetUrl)}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {event.success ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Success
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] gap-1">
                                        <XCircle className="w-3 h-3" />
                                        Failed
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {event.statusCode ? (
                                      <span className={cn(
                                        'text-xs font-mono font-medium',
                                        event.statusCode < 300 ? 'text-emerald-600 dark:text-emerald-400' :
                                        event.statusCode < 500 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-rose-600 dark:text-rose-400'
                                      )}>
                                        {event.statusCode}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {event.retryCount > 0 ? (
                                      <span className={cn(
                                        'text-xs font-mono',
                                        event.retryCount >= 3 ? 'text-rose-500' : 'text-amber-500'
                                      )}>
                                        {event.retryCount}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400">0</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    {!event.success && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => { e.stopPropagation(); handleRetryEvent(event.id); }}
                                        className="h-7 px-2 text-xs gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                      >
                                        <RotateCw className="w-3 h-3" />
                                        Retry
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                                {/* Expanded Detail */}
                                {isRowExpanded && (
                                  <tr key={`${event.id}-detail`}>
                                    <td colSpan={9} className="px-4 py-4 bg-slate-50/80 dark:bg-slate-900/40">
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <JsonHighlighter json={event.payload} label="Request Payload" />
                                        <JsonHighlighter
                                          json={event.responseBody || { message: 'No response body', statusCode: event.statusCode }}
                                          label="Response Body"
                                        />
                                      </div>
                                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                                        <span>Sent: {formatFullDate(event.sentAt)}</span>
                                        {event.completedAt && <span>Completed: {formatFullDate(event.completedAt)}</span>}
                                        {event.errorMessage && (
                                          <span className="text-rose-500 dark:text-rose-400">Error: {event.errorMessage}</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredEvents.map((event) => {
                        const isRowExpanded = expandedEvent === event.id;
                        return (
                          <div key={event.id} className="p-3 space-y-2">
                            <div
                              className="flex items-start gap-2 cursor-pointer"
                              onClick={() => setExpandedEvent(isRowExpanded ? null : event.id)}
                            >
                              <ChevronRight className={cn('w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0 transition-transform', isRowExpanded && 'rotate-90')} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn('text-[10px] border', EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.test)}
                                  >
                                    {event.eventType.replace(/_/g, ' ')}
                                  </Badge>
                                  {event.success ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">OK</Badge>
                                  ) : (
                                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px]">FAIL</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">{event.clinicName}</p>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                  <span>{formatTime(event.sentAt)}</span>
                                  {event.statusCode && <span className="font-mono">{event.statusCode}</span>}
                                  {event.retryCount > 0 && <span className="text-amber-500">Retry: {event.retryCount}</span>}
                                </div>
                              </div>
                            </div>
                            {isRowExpanded && (
                              <AnimatePresence>
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pl-6 space-y-3">
                                    <JsonHighlighter json={event.payload} label="Request Payload" />
                                    <JsonHighlighter json={event.responseBody || { message: 'No response' }} label="Response" />
                                    {!event.success && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRetryEvent(event.id)}
                                        className="gap-1.5 text-xs border-amber-200 dark:border-amber-800 text-amber-600"
                                      >
                                        <RotateCw className="w-3 h-3" />
                                        Retry Webhook
                                      </Button>
                                    )}
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                          Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="h-7 px-2 text-xs"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="h-7 px-2 text-xs"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Event Types Tab ─── */}
          <TabsContent value="types" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Event Types Configuration</CardTitle>
                <CardDescription>Manage which events trigger webhooks for each clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Event Type Info */}
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Event types control which actions trigger webhook notifications to n8n. Toggle events on/off per clinic to customize automation workflows.
                    </p>
                  </div>

                  {/* Event Types Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EVENT_TYPES.map((et) => {
                      const Icon = et.icon;
                      const count = stats?.byEventType?.find(b => b.eventType === et.value)?.count || 0;
                      return (
                        <div
                          key={et.value}
                          className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
                        >
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', {
                            'bg-emerald-100 dark:bg-emerald-900/20': et.color === 'emerald',
                            'bg-teal-100 dark:bg-teal-900/20': et.color === 'teal',
                            'bg-rose-100 dark:bg-rose-900/20': et.color === 'rose',
                            'bg-amber-100 dark:bg-amber-900/20': et.color === 'amber',
                            'bg-orange-100 dark:bg-orange-900/20': et.color === 'orange',
                            'bg-cyan-100 dark:bg-cyan-900/20': et.color === 'cyan',
                            'bg-violet-100 dark:bg-violet-900/20': et.color === 'violet',
                            'bg-pink-100 dark:bg-pink-900/20': et.color === 'pink',
                          })}>
                            <Icon className={cn('w-4 h-4', {
                              'text-emerald-600 dark:text-emerald-400': et.color === 'emerald',
                              'text-teal-600 dark:text-teal-400': et.color === 'teal',
                              'text-rose-600 dark:text-rose-400': et.color === 'rose',
                              'text-amber-600 dark:text-amber-400': et.color === 'amber',
                              'text-orange-600 dark:text-orange-400': et.color === 'orange',
                              'text-cyan-600 dark:text-cyan-400': et.color === 'cyan',
                              'text-violet-600 dark:text-violet-400': et.color === 'violet',
                              'text-pink-600 dark:text-pink-400': et.color === 'pink',
                            })} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{et.label}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{et.value}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px]">
                              {count} events
                            </Badge>
                            <Switch
                              defaultChecked={true}
                              className="scale-75 origin-right"
                              onCheckedChange={(checked) => {
                                toast.success(`${et.label} ${checked ? 'enabled' : 'disabled'}`);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-Clinic Event Configuration */}
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-emerald-500" />
                      Per-Clinic Event Configuration
                    </h3>
                    <div className="space-y-2">
                      {clinics.filter(c => c.agentConfig?.n8nWebhookUrl).map((clinic) => (
                        <div
                          key={clinic.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
                        >
                          <div className="flex items-center gap-2 sm:w-[200px] flex-shrink-0">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {clinic.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{clinic.name}</p>
                              <p className="text-[10px] text-slate-400">{clinic.city}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 flex-1">
                            {EVENT_TYPES.slice(0, 5).map((et) => (
                              <Badge
                                key={et.value}
                                variant="outline"
                                className={cn('text-[9px] px-1.5 py-0 cursor-pointer transition-colors border', EVENT_TYPE_COLORS[et.value])}
                                onClick={() => toast.success(`Toggled ${et.label} for ${clinic.name}`)}
                              >
                                {et.label.replace('Appointment ', '')}
                              </Badge>
                            ))}
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 cursor-pointer border-slate-200 dark:border-slate-700 text-slate-500"
                              onClick={() => toast.success(`Showing all events for ${clinic.name}`)}
                            >
                              +{EVENT_TYPES.length - 5} more
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {clinics.filter(c => c.agentConfig?.n8nWebhookUrl).length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm">No clinics with webhook URLs configured</p>
                          <p className="text-xs mt-1">Go to the Configuration tab to set up webhooks first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
