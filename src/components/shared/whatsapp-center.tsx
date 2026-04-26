'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, CheckCheck, Clock, AlertCircle, RefreshCw,
  Search, Filter, Calendar, Eye, CalendarPlus, CreditCard, UserPlus,
  PartyPopper, Bell, FileText, ChevronDown, ChevronUp, Phone, X,
  TrendingUp, BarChart3, Mail, MoreHorizontal, ArrowUpRight,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
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

interface WhatsAppCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope?: 'client' | 'admin';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  sent: { color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', borderColor: 'border-emerald-200 dark:border-emerald-800', label: 'Sent' },
  delivered: { color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', borderColor: 'border-cyan-200 dark:border-cyan-800', label: 'Delivered' },
  read: { color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-100 dark:bg-teal-900/30', borderColor: 'border-teal-200 dark:border-teal-800', label: 'Read' },
  failed: { color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-900/30', borderColor: 'border-rose-200 dark:border-rose-800', label: 'Failed' },
};

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  'appointment': Calendar,
  'reminder': Bell,
  'notification': FileText,
  'greeting': PartyPopper,
};

const CATEGORY_COLORS: Record<string, string> = {
  appointment: 'from-emerald-500 to-teal-500',
  reminder: 'from-cyan-500 to-teal-500',
  notification: 'from-amber-500 to-orange-500',
  greeting: 'from-pink-500 to-rose-500',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  const Icon = status === 'failed' ? AlertCircle : status === 'read' ? CheckCheck : status === 'delivered' ? CheckCheck : Send;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      config.bgColor, config.color, config.borderColor,
    )}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

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
        className={cn(
          'relative max-w-[85%] rounded-2xl px-3 py-2 shadow-sm',
          isSent
            ? 'rounded-br-sm'
            : 'rounded-bl-sm',
        )}
        style={isSent
          ? { backgroundColor: '#DCF8C6' }
          : { backgroundColor: 'white' }
        }
      >
        <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">
          {preview}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px] text-slate-500">
            {time ? formatTime(time) : '10:30 AM'}
          </span>
          {isSent && (
            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({ label, value, trend, icon: Icon, colorClass }: {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colorClass)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-slate-900 dark:text-white">{value}</span>
          {trend !== undefined && (
            <span className={cn(
              'text-[10px] font-semibold flex items-center gap-0.5',
              trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
            )}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-90" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WhatsAppCenter({ open, onOpenChange, scope = 'client' }: WhatsAppCenterProps) {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [messages, setMessages] = useState<WASentMessage[]>([]);
  const [analytics, setAnalytics] = useState<WAAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchPhone, setSearchPhone] = useState('');

  // Composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPhone, setComposerPhone] = useState('');
  const [composerTemplate, setComposerTemplate] = useState('');
  const [composerMessage, setComposerMessage] = useState('');
  const [composerSchedule, setComposerSchedule] = useState<'now' | 'schedule'>('now');
  const [composerDateTime, setComposerDateTime] = useState('');
  const [composerSending, setComposerSending] = useState(false);

  // View message dialog
  const [viewMessage, setViewMessage] = useState<WASentMessage | null>(null);

  // Fetch data
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
    if (open) {
      const id = requestAnimationFrame(() => { fetchData(); });
      return () => cancelAnimationFrame(id);
    }
  }, [open, fetchData]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    if (searchPhone) {
      const q = searchPhone.toLowerCase();
      filtered = filtered.filter(m =>
        m.phone.toLowerCase().includes(q) ||
        m.recipient.toLowerCase().includes(q) ||
        m.recipientName.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [messages, statusFilter, searchPhone]);

  // Composer preview message
  const previewMessage = useMemo(() => {
    const selected = templates.find(t => t.id === composerTemplate);
    return composerMessage || selected?.body || '';
  }, [composerMessage, composerTemplate, templates]);

  // Handle send
  const handleSend = async () => {
    if (!composerPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    const fullPhone = composerPhone.startsWith('+91') ? composerPhone : `+91${composerPhone}`;

    setComposerSending(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          to: fullPhone,
          templateId: composerTemplate || 'tpl-appointment-confirmation',
          message: previewMessage,
          scheduledAt: composerSchedule === 'schedule' && composerDateTime ? composerDateTime : undefined,
        }),
      });
      if (res.ok) {
        toast.success(composerSchedule === 'schedule' ? 'Message scheduled!' : 'Message sent successfully!');
        setComposerOpen(false);
        setComposerPhone('');
        setComposerTemplate('');
        setComposerMessage('');
        setComposerSchedule('now');
        setComposerDateTime('');
        fetchData();
      }
    } catch {
      toast.error('Failed to send message');
    }
    setComposerSending(false);
  };

  // Handle resend
  const handleResend = async (msgId: string) => {
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', messageId: msgId }),
      });
      if (res.ok) {
        toast.success('Message resent successfully');
        fetchData();
      }
    } catch {
      toast.error('Failed to resend message');
    }
  };

  // Weekly bar chart max
  const weeklyMax = useMemo(() => {
    if (!analytics) return 1;
    return Math.max(...analytics.weeklyVolume.map(d => d.count), 1);
  }, [analytics]);

  const formatIndianDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return dateStr; }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            'w-full sm:max-w-2xl p-0 flex flex-col gap-0',
            'bg-white dark:bg-slate-900',
          )}
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                  <MessageCircle className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  WhatsApp Notifications
                </SheetTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {scope === 'admin' ? 'Platform-wide messaging' : 'Your clinic messaging'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => setComposerOpen(true)}
                className="h-8 px-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1FB855] hover:to-[#0F7A6E] text-white text-xs font-medium gap-1.5 shadow-md shadow-[#25D366]/20"
              >
                <Send className="w-3 h-3" />
                <span className="hidden sm:inline">New Message</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-2 shrink-0">
              <TabsList className="w-full h-9 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <TabsTrigger value="templates" className="flex-1 h-8 text-[11px] font-medium rounded-md gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                  <CalendarPlus className="w-3 h-3" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="messages" className="flex-1 h-8 text-[11px] font-medium rounded-md gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                  <Mail className="w-3 h-3" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 h-8 text-[11px] font-medium rounded-md gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                  <BarChart3 className="w-3 h-3" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─── Templates Tab ─── */}
            <TabsContent value="templates" className="flex-1 overflow-y-auto mt-0 p-4">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((tpl, i) => {
                    const Icon = TEMPLATE_ICONS[tpl.category] || FileText;
                    const gradient = CATEGORY_COLORS[tpl.category] || 'from-emerald-500 to-teal-500';
                    return (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        whileHover={{ y: -2 }}
                        className={cn(
                          'rounded-xl border overflow-hidden transition-shadow hover:shadow-md',
                          tpl.enabled
                            ? 'border-slate-200 dark:border-slate-700'
                            : 'border-slate-200 dark:border-slate-700 opacity-60',
                        )}
                      >
                        {/* Color strip */}
                        <div className={cn('h-1 bg-gradient-to-r', gradient)} />
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center', gradient)}>
                                <Icon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{tpl.name}</h4>
                                <Badge variant="outline" className="text-[9px] mt-0.5 px-1.5 py-0 font-medium capitalize">{tpl.category}</Badge>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">{tpl.usageCount}x</span>
                          </div>

                          {/* WhatsApp Bubble Preview */}
                          <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-lg p-2 mb-2">
                            <WhatsAppBubble message={tpl.body} isSent showPreview time="" />
                          </div>

                          {/* Variables */}
                          {tpl.variables.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tpl.variables.map((v, vi) => (
                                <span key={vi} className="text-[9px] px-1.5 py-0.5 rounded bg-[#25D366]/10 text-[#128C7E] dark:text-emerald-400 font-mono font-medium">
                                  {`{${v}}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─── Messages Tab ─── */}
            <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 mt-0">
              {/* Filters */}
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search by phone..."
                      className="pl-8 h-8 text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      value={searchPhone}
                      onChange={e => setSearchPhone(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-28 text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Message List */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No messages found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMessages.map((msg, i) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center shrink-0 border border-[#25D366]/30">
                            <span className="text-[11px] font-bold text-[#128C7E] dark:text-emerald-400">
                              {msg.recipientName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{msg.recipientName}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{msg.recipient}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={msg.status} />
                                <span className="text-[10px] text-slate-400">{formatIndianDate(msg.sentAt)}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{msg.messagePreview}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">{msg.templateType}</Badge>
                              {scope === 'admin' && (
                                <span className="text-[9px] text-slate-400">{msg.clinicName}</span>
                              )}
                              {msg.scheduledAt && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> Scheduled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewMessage(msg)}>
                              <Eye className="w-3 h-3 text-slate-400" />
                            </Button>
                            {msg.status === 'failed' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => handleResend(msg.id)}>
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer count */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center shrink-0">
                Showing {filteredMessages.length} of {messages.length} messages
              </div>
            </TabsContent>

            {/* ─── Analytics Tab ─── */}
            <TabsContent value="analytics" className="flex-1 overflow-y-auto mt-0 p-4">
              {loading || !analytics ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                  <Skeleton className="h-48 rounded-xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <AnalyticsCard
                      label="Sent Today"
                      value={analytics.messagesSentToday}
                      trend={analytics.messagesSentTodayTrend}
                      icon={Send}
                      colorClass="bg-gradient-to-br from-[#25D366] to-[#128C7E]"
                    />
                    <AnalyticsCard
                      label="Delivery Rate"
                      value={`${analytics.deliveryRate}%`}
                      icon={CheckCheck}
                      colorClass="bg-gradient-to-br from-cyan-500 to-teal-500"
                    />
                    <AnalyticsCard
                      label="Read Rate"
                      value={`${analytics.readRate}%`}
                      icon={Eye}
                      colorClass="bg-gradient-to-br from-teal-500 to-emerald-500"
                    />
                    <AnalyticsCard
                      label="Response Rate"
                      value={`${analytics.responseRate}%`}
                      icon={TrendingUp}
                      colorClass="bg-gradient-to-br from-amber-500 to-orange-500"
                    />
                  </div>

                  {/* Weekly volume chart */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-[#25D366]" />
                      Last 7 Days — Sending Volume
                    </h3>
                    <div className="flex items-end gap-2 h-32">
                      {analytics.weeklyVolume.map((day, i) => {
                        const height = Math.max((day.count / weeklyMax) * 100, 4);
                        const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                        return (
                          <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{day.count}</span>
                            <div className="w-full rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: '80px' }}>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
                                className={cn(
                                  'w-full rounded-md',
                                  isToday
                                    ? 'bg-gradient-to-t from-[#25D366] to-[#4AE36D]'
                                    : 'bg-gradient-to-t from-[#25D366]/60 to-[#25D366]/30',
                                )}
                              />
                            </div>
                            <span className={cn(
                              'text-[10px] font-medium',
                              isToday ? 'text-[#25D366] dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                            )}>
                              {day.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Connected Number</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">+91 98765 43210</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <FileText className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Monthly Usage</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">810 / 5,000</p>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">16.2%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '16.2%' }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* ─── Message Composer Dialog ─── */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-white" />
              </div>
              Compose WhatsApp Message
            </DialogTitle>
            <DialogDescription className="text-xs">Send a WhatsApp notification to a patient</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">To (Phone Number)</label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  +91
                </div>
                <Input
                  placeholder="Enter 10-digit phone number"
                  className="rounded-l-none border-slate-200 dark:border-slate-700 text-xs font-mono"
                  value={composerPhone}
                  onChange={e => setComposerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Template</label>
              <Select value={composerTemplate} onValueChange={v => {
                setComposerTemplate(v);
                const selected = templates.find(t => t.id === v);
                if (selected) setComposerMessage(selected.body);
              }}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.enabled).map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        {(() => { const Ic = TEMPLATE_ICONS[t.category] || FileText; return <Ic className="w-3 h-3 text-slate-400" />; })()}
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Message</label>
              <Textarea
                placeholder="Type your message or select a template..."
                className="min-h-[100px] text-xs font-mono border-slate-200 dark:border-slate-700 resize-none"
                value={composerMessage}
                onChange={e => setComposerMessage(e.target.value)}
              />
              {/* Variable chips */}
              {composerTemplate && (() => {
                const vars = templates.find(t => t.id === composerTemplate)?.variables || [];
                if (vars.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1">
                    {vars.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#25D366]/10 text-[#128C7E] dark:text-emerald-400 font-mono font-medium hover:bg-[#25D366]/20 transition-colors"
                        onClick={() => setComposerMessage(prev => prev.replace(`{${v}}`, `{${v}}`))}
                      >
                        {`{${v}}`}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Schedule</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={composerSchedule === 'now' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs flex-1',
                    composerSchedule === 'now'
                      ? 'bg-[#25D366] hover:bg-[#1FB855] text-white'
                      : 'border-slate-200 dark:border-slate-700',
                  )}
                  onClick={() => setComposerSchedule('now')}
                >
                  Send Now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={composerSchedule === 'schedule' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs flex-1',
                    composerSchedule === 'schedule'
                      ? 'bg-[#25D366] hover:bg-[#1FB855] text-white'
                      : 'border-slate-200 dark:border-slate-700',
                  )}
                  onClick={() => setComposerSchedule('schedule')}
                >
                  Schedule
                </Button>
              </div>
              {composerSchedule === 'schedule' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Input
                    type="datetime-local"
                    className="border-slate-200 dark:border-slate-700 text-xs"
                    value={composerDateTime}
                    onChange={e => setComposerDateTime(e.target.value)}
                  />
                </motion.div>
              )}
            </div>

            {/* WhatsApp Preview */}
            {previewMessage && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-[#25D366]" />
                  WhatsApp Preview
                </label>
                <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-lg p-3">
                  <WhatsAppBubble message={previewMessage} isSent showPreview time={new Date().toISOString()} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setComposerOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={composerSending}
              className="bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1FB855] hover:to-[#0F7A6E] text-white text-xs gap-1.5 shadow-md shadow-[#25D366]/20"
            >
              {composerSending ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <RefreshCw className="w-3 h-3" />
                </motion.div>
              ) : (
                <Send className="w-3 h-3" />
              )}
              {composerSchedule === 'schedule' ? 'Schedule' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Message Dialog ─── */}
      <Dialog open={!!viewMessage} onOpenChange={() => setViewMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#25D366]" />
              Message Details
            </DialogTitle>
          </DialogHeader>
          {viewMessage && (
            <div className="space-y-4">
              {/* Recipient info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center border border-[#25D366]/30">
                  <span className="text-sm font-bold text-[#128C7E] dark:text-emerald-400">
                    {viewMessage.recipientName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewMessage.recipientName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{viewMessage.phone}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={viewMessage.status} />
                </div>
              </div>

              <Separator />

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Template</span>
                  <p className="font-medium text-slate-900 dark:text-white">{viewMessage.templateType}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Sent At</span>
                  <p className="font-medium text-slate-900 dark:text-white">{formatIndianDate(viewMessage.sentAt)}</p>
                </div>
                {viewMessage.scheduledAt && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Scheduled At</span>
                    <p className="font-medium text-amber-600 dark:text-amber-400">{formatIndianDate(viewMessage.scheduledAt)}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Clinic</span>
                  <p className="font-medium text-slate-900 dark:text-white">{viewMessage.clinicName}</p>
                </div>
              </div>

              <Separator />

              {/* Message bubble */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Message Content</label>
                <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-lg p-3">
                  <WhatsAppBubble message={viewMessage.messagePreview} isSent showPreview time={viewMessage.sentAt} />
                </div>
              </div>

              {/* Actions for failed */}
              {viewMessage.status === 'failed' && (
                <Button
                  onClick={() => { handleResend(viewMessage.id); setViewMessage(null); }}
                  className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1FB855] hover:to-[#0F7A6E] text-white text-xs gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend Message
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
