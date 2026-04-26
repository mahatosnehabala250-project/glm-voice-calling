'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Send, CheckCheck, AlertCircle, RefreshCw,
  Search, Eye, Calendar, FileText, PartyPopper, Bell,
  Users, BarChart3, Mail, ArrowUpRight, TrendingUp, Phone,
  ToggleLeft, ToggleRight, Edit3, Zap, Settings, Clock,
  CalendarPlus, CreditCard, UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WATemplate {
  id: string;
  name: string;
  description: string;
  body: string;
  category: string;
  variables: string[];
  usageCount: number;
  enabled: boolean;
}

interface WASentMessage {
  id: string;
  recipient: string;
  phone: string;
  recipientName: string;
  templateType: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: string;
  scheduledAt?: string;
  messagePreview: string;
  clinicName: string;
}

interface WAAnalytics {
  messagesSentToday: number;
  messagesSentTodayTrend: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  weeklyVolume: { day: string; count: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  sent: { color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', borderColor: 'border-emerald-200 dark:border-emerald-800', label: 'Sent' },
  delivered: { color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', borderColor: 'border-cyan-200 dark:border-cyan-800', label: 'Delivered' },
  read: { color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-100 dark:bg-teal-900/30', borderColor: 'border-teal-200 dark:border-teal-800', label: 'Read' },
  failed: { color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-900/30', borderColor: 'border-rose-200 dark:border-rose-800', label: 'Failed' },
};

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  appointment: Calendar,
  reminder: Bell,
  notification: FileText,
  greeting: PartyPopper,
};

const CATEGORY_COLORS: Record<string, string> = {
  appointment: 'from-emerald-500 to-teal-500',
  reminder: 'from-cyan-500 to-teal-500',
  notification: 'from-amber-500 to-orange-500',
  greeting: 'from-pink-500 to-rose-500',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── WhatsApp Bubble Component ────────────────────────────────────────────────

function WhatsAppBubble({ message, isSent, time, showPreview }: {
  message: string;
  isSent: boolean;
  time?: string;
  showPreview?: boolean;
}) {
  const formatTime = (t?: string) => {
    if (!t) return '';
    try {
      return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
  };

  const preview = showPreview
    ? message
        .replace(/\{patient_name\}/g, 'Rajesh Kumar')
        .replace(/\{date\}/g, '15/01/2025')
        .replace(/\{time\}/g, '10:30 AM')
        .replace(/\{doctor_name\}/g, 'Dr. Sharma')
        .replace(/\{clinic_name\}/g, 'Sharma Dental Clinic')
        .replace(/\{clinic_address\}/g, 'MG Road, Jaipur')
        .replace(/\{clinic_phone\}/g, '+91 98765 43210')
        .replace(/\{amount\}/g, '₹500')
        .replace(/\{payment_mode\}/g, 'UPI')
        .replace(/\{receipt_number\}/g, 'RCP-2025-001')
        .replace(/\{festival_name\}/g, 'Diwali')
        .replace(/\{new_date\}/g, '16/01/2025')
        .replace(/\{new_time\}/g, '2:00 PM')
        .replace(/\{visit_date\}/g, '12/01/2025')
    : message;

  return (
    <div className={cn('flex', isSent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn('relative max-w-[85%] rounded-2xl px-3 py-2 shadow-sm', isSent ? 'rounded-br-sm' : 'rounded-bl-sm')}
        style={isSent ? { backgroundColor: '#DCF8C6' } : { backgroundColor: 'white' }}
      >
        <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">{preview}</p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px] text-slate-500">{time ? formatTime(time) : '10:30 AM'}</span>
          {isSent && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin WhatsApp Component ────────────────────────────────────────────

export default function AdminWhatsApp() {
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [messages, setMessages] = useState<WASentMessage[]>([]);
  const [analytics, setAnalytics] = useState<WAAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'templates' | 'messages'>('overview');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk send
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [bulkTemplate, setBulkTemplate] = useState('');
  const [bulkSending, setBulkSending] = useState(false);

  // Edit template dialog
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WATemplate | null>(null);

  // View message dialog
  const [viewMessage, setViewMessage] = useState<WASentMessage | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp?action=all');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setMessages(data.messages || []);
        setAnalytics(data.analytics || null);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => { fetchData(); });
    return () => cancelAnimationFrame(id);
  }, [fetchData]);

  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    if (statusFilter !== 'all') filtered = filtered.filter(m => m.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.phone.toLowerCase().includes(q) ||
        m.recipient.includes(q) ||
        m.recipientName.toLowerCase().includes(q) ||
        m.clinicName.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [messages, statusFilter, searchQuery]);

  const weeklyMax = useMemo(() => {
    if (!analytics) return 1;
    return Math.max(...analytics.weeklyVolume.map(d => d.count), 1);
  }, [analytics]);

  const handleToggleTemplate = async (tpl: WATemplate) => {
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-template', templateId: tpl.id, enabled: !tpl.enabled }),
      });
      if (res.ok) {
        toast.success(`Template "${tpl.name}" ${!tpl.enabled ? 'enabled' : 'disabled'}`);
        setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, enabled: !t.enabled } : t));
      }
    } catch { toast.error('Failed to update template'); }
  };

  const handleResend = async (msgId: string) => {
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', messageId: msgId }),
      });
      if (res.ok) { toast.success('Message resent'); fetchData(); }
    } catch { toast.error('Failed to resend'); }
  };

  const handleBulkSend = async () => {
    if (!bulkTemplate) { toast.error('Select a template'); return; }
    setBulkSending(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          to: '+919876543210',
          templateId: bulkTemplate,
          message: templates.find(t => t.id === bulkTemplate)?.body || '',
        }),
      });
      if (res.ok) {
        toast.success('Bulk send initiated (demo - 1 message sent)');
        setBulkSendOpen(false);
        setBulkTemplate('');
        fetchData();
      }
    } catch { toast.error('Bulk send failed'); }
    setBulkSending(false);
  };

  const formatIndianDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return dateStr; }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* ─── Header ─── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>
            WhatsApp Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Platform-wide WhatsApp messaging management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/5 text-xs gap-1.5" onClick={() => setBulkSendOpen(true)}>
            <Users className="w-3.5 h-3.5" />
            Bulk Send
          </Button>
          <Button className="bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1FB855] hover:to-[#0F7A6E] text-white text-xs gap-1.5 shadow-lg shadow-[#25D366]/20">
            <Settings className="w-3.5 h-3.5" />
            API Settings
          </Button>
        </div>
      </motion.div>

      {/* ─── View Switcher ─── */}
      <motion.div variants={item} className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {[
          { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
          { id: 'templates' as const, label: 'Templates', icon: CalendarPlus },
          { id: 'messages' as const, label: 'All Messages', icon: Mail },
        ].map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeView === v.id
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </motion.div>

      {/* ─── OVERVIEW ─── */}
      {activeView === 'overview' && (
        <div className="space-y-5">
          {/* Stats Row */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Sent Today', value: analytics?.messagesSentToday ?? 0, trend: analytics?.messagesSentTodayTrend, icon: Send, color: 'from-[#25D366] to-[#128C7E]' },
              { label: 'Delivery Rate', value: `${analytics?.deliveryRate ?? 0}%`, icon: CheckCheck, color: 'from-cyan-500 to-teal-500' },
              { label: 'Read Rate', value: `${analytics?.readRate ?? 0}%`, icon: Eye, color: 'from-teal-500 to-emerald-500' },
              { label: 'Response Rate', value: `${analytics?.responseRate ?? 0}%`, icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -2 }}>
                  <Card className="border-slate-200 dark:border-slate-800 overflow-hidden relative hover:shadow-md transition-shadow">
                    <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r', stat.color)} />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                            {stat.trend !== undefined && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3" />{stat.trend}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', stat.color)}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Weekly Volume + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div variants={item} className="lg:col-span-2">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#25D366]" />
                    Weekly Sending Volume
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {analytics ? (
                    <div className="flex items-end gap-3 h-36 px-2">
                      {analytics.weeklyVolume.map((day, i) => {
                        const height = Math.max((day.count / weeklyMax) * 100, 6);
                        const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                        return (
                          <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{day.count}</span>
                            <div className="w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: '80px' }}>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
                                className={cn('w-full rounded-lg', isToday ? 'bg-gradient-to-t from-[#25D366] to-[#4AE36D]' : 'bg-gradient-to-t from-[#25D366]/50 to-[#25D366]/20')}
                              />
                            </div>
                            <span className={cn('text-[10px] font-medium', isToday ? 'text-[#25D366] dark:text-emerald-400' : 'text-slate-400')}>{day.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Skeleton className="h-36 rounded-lg" />
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item} className="space-y-4">
              {/* Template Status */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Active</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{templates.filter(t => t.enabled).length} / {templates.length}</span>
                  </div>
                  {templates.slice(0, 4).map(tpl => (
                    <div key={tpl.id} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{tpl.name}</span>
                      <div className={cn('w-2 h-2 rounded-full', tpl.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Connection Status */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#25D366]" />
                    API Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Number</span>
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">+91 98765 43210</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Monthly Usage</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">810 / 5,000</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '16.2%' }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}

      {/* ─── TEMPLATES ─── */}
      {activeView === 'templates' && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-[#25D366]" />
              Message Templates
              <Badge variant="outline" className="text-[10px] ml-1">{templates.filter(t => t.enabled).length} active</Badge>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((tpl, i) => {
              const Icon = TEMPLATE_ICONS[tpl.category] || FileText;
              const gradient = CATEGORY_COLORS[tpl.category] || 'from-emerald-500 to-teal-500';
              return (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  whileHover={{ y: -2 }}
                  className={cn('rounded-xl border overflow-hidden transition-shadow hover:shadow-lg', tpl.enabled ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-50')}
                >
                  <div className={cn('h-1 bg-gradient-to-r', gradient)} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center', gradient)}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                          <Badge variant="outline" className="text-[9px] mt-0.5 px-1.5 py-0 font-medium capitalize">{tpl.category}</Badge>
                        </div>
                      </div>
                      <button onClick={() => handleToggleTemplate(tpl)} className="shrink-0">
                        {tpl.enabled
                          ? <ToggleRight className="w-8 h-5 text-[#25D366]" />
                          : <ToggleLeft className="w-8 h-5 text-slate-300 dark:text-slate-600" />
                        }
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{tpl.description}</p>

                    {/* WhatsApp Bubble Preview */}
                    <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-lg p-2 mb-2">
                      <WhatsAppBubble message={tpl.body} isSent showPreview time="" />
                    </div>

                    {/* Variables */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tpl.variables.map((v, vi) => (
                        <span key={vi} className="text-[9px] px-1.5 py-0.5 rounded bg-[#25D366]/10 text-[#128C7E] dark:text-emerald-400 font-mono font-medium">{`{${v}}`}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Used <span className="font-bold text-slate-600 dark:text-slate-300">{tpl.usageCount}</span>x</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-[#128C7E] hover:bg-[#25D366]/10"
                        onClick={() => { setEditingTemplate(tpl); setEditTemplateOpen(true); }}
                      >
                        <Edit3 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── MESSAGES ─── */}
      {activeView === 'messages' && (
        <motion.div variants={item}>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#25D366]" />
                  All Messages (Platform-wide)
                  <Badge variant="outline" className="text-[10px]">{messages.length} total</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search phone, patient, clinic..."
                      className="pl-8 h-8 text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-32 text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px]">Recipient</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px] hidden md:table-cell">Template</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px] hidden lg:table-cell">Clinic</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px]">Status</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px] hidden xl:table-cell">Sent At</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMessages.map((msg, i) => {
                      const statusCfg = STATUS_CONFIG[msg.status];
                      return (
                        <motion.tr
                          key={msg.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <p className="text-xs font-medium text-slate-900 dark:text-white">{msg.recipientName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{msg.recipient}</p>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span className="text-xs text-slate-600 dark:text-slate-300">{msg.templateType}</span>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{msg.clinicName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', statusCfg.bgColor, statusCfg.color, statusCfg.borderColor)}>
                              {msg.status === 'failed' ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCheck className="w-2.5 h-2.5" />}
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-400 hidden xl:table-cell">{formatIndianDate(msg.sentAt)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewMessage(msg)}>
                                <Eye className="w-3 h-3 text-slate-400" />
                              </Button>
                              {msg.status === 'failed' && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => handleResend(msg.id)}>
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredMessages.length === 0 && (
                  <div className="py-16 text-center">
                    <Mail className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No messages match your search</p>
                  </div>
                )}
              </ScrollArea>
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
                Showing {filteredMessages.length} of {messages.length} messages
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Bulk Send Dialog ─── */}
      <Dialog open={bulkSendOpen} onOpenChange={setBulkSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#25D366]" />
              Bulk Send Message
            </DialogTitle>
            <DialogDescription className="text-xs">Send a message to multiple patients across all clinics</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Select Template</label>
              <Select value={bulkTemplate} onValueChange={setBulkTemplate}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.enabled).map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkTemplate && (
              <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-lg p-3">
                <WhatsAppBubble message={templates.find(t => t.id === bulkTemplate)?.body || ''} isSent showPreview time="" />
              </div>
            )}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">⚠️ This will send to all active patients. In production, you can segment by clinic, appointment type, or date range.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkSendOpen(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleBulkSend} disabled={bulkSending || !bulkTemplate} className="bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white text-xs gap-1.5">
              {bulkSending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Send to All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Message Dialog ─── */}
      <Dialog open={!!viewMessage} onOpenChange={() => setViewMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#25D366]" /> Message Details
            </DialogTitle>
          </DialogHeader>
          {viewMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center border border-[#25D366]/30">
                  <span className="text-sm font-bold text-[#128C7E] dark:text-emerald-400">{viewMessage.recipientName.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewMessage.recipientName}</p>
                  <p className="text-xs text-slate-500 font-mono">{viewMessage.phone}</p>
                </div>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', STATUS_CONFIG[viewMessage.status].bgColor, STATUS_CONFIG[viewMessage.status].color, STATUS_CONFIG[viewMessage.status].borderColor)}>
                  {STATUS_CONFIG[viewMessage.status].label}
                </span>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Template</span>
                  <p className="font-medium text-slate-900 dark:text-white">{viewMessage.templateType}</p>
                </div>
                <div>
                  <span className="text-slate-500">Sent At</span>
                  <p className="font-medium text-slate-900 dark:text-white">{formatIndianDate(viewMessage.sentAt)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Clinic</span>
                  <p className="font-medium text-slate-900 dark:text-white">{viewMessage.clinicName}</p>
                </div>
                {viewMessage.scheduledAt && (
                  <div>
                    <span className="text-slate-500">Scheduled</span>
                    <p className="font-medium text-amber-600 dark:text-amber-400">{formatIndianDate(viewMessage.scheduledAt)}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Message</label>
                <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-lg p-3">
                  <WhatsAppBubble message={viewMessage.messagePreview} isSent showPreview time={viewMessage.sentAt} />
                </div>
              </div>
              {viewMessage.status === 'failed' && (
                <Button onClick={() => { handleResend(viewMessage.id); setViewMessage(null); }} className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white text-xs gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Resend Message
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}


