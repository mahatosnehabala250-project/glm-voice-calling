'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, CheckCheck, Clock, AlertCircle, Edit3,
  ToggleLeft, ToggleRight, Phone, Smartphone, Wifi, Calendar,
  TrendingUp, Search, ChevronRight, Play, ArrowRight, Zap,
  Bell, Users, Activity, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// Types & Mock Data
// ============================================================

interface WATemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  usageCount: number;
  enabled: boolean;
  category: 'appointment' | 'reminder' | 'followup' | 'emergency';
  icon: React.ElementType;
}

interface WAMessage {
  id: string;
  patient: string;
  phone: string;
  template: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: string;
}

interface QuickSendForm {
  patient: string;
  template: string;
  customMessage: string;
}

const STATUS_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  sent: {
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: Send,
    label: 'Sent',
  },
  delivered: {
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    icon: CheckCheck,
    label: 'Delivered',
  },
  read: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: CheckCheck,
    label: 'Read',
  },
  failed: {
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    icon: AlertCircle,
    label: 'Failed',
  },
};

const MOCK_TEMPLATES: WATemplate[] = [
  {
    id: 'tpl-1',
    name: 'Appointment Confirmed',
    description: 'Sent when a new appointment is booked',
    preview: 'Hello {patient_name}, your appointment has been confirmed for {date} at {time}. Please arrive 10 minutes early.',
    usageCount: 342,
    enabled: true,
    category: 'appointment',
    icon: Calendar,
  },
  {
    id: 'tpl-2',
    name: 'Appointment Reminder',
    description: 'Sent 24 hours before the scheduled appointment',
    preview: 'Hi {patient_name}, this is a reminder for your appointment tomorrow at {time}. Reply RESCHEDULE to change.',
    usageCount: 289,
    enabled: true,
    category: 'reminder',
    icon: Bell,
  },
  {
    id: 'tpl-3',
    name: 'Follow-up Reminder',
    description: 'Post-visit follow-up sent 48 hours after consultation',
    preview: 'Hello {patient_name}, we hope you are doing well after your visit. How are you feeling? Reply to update us.',
    usageCount: 156,
    enabled: true,
    category: 'followup',
    icon: Activity,
  },
  {
    id: 'tpl-4',
    name: 'Emergency Alert',
    description: 'Urgent escalation notification for critical situations',
    preview: '🚨 EMERGENCY: {patient_name} has been flagged for immediate attention. Contact {phone} urgently.',
    usageCount: 23,
    enabled: false,
    category: 'emergency',
    icon: AlertCircle,
  },
];

const MOCK_MESSAGES: WAMessage[] = [
  { id: 'msg-1', patient: 'Rajesh Kumar', phone: '+91-98765-43210', template: 'Appointment Confirmed', status: 'read', sentAt: '2025-01-15T10:30:00' },
  { id: 'msg-2', patient: 'Priya Sharma', phone: '+91-87654-32109', template: 'Appointment Reminder', status: 'delivered', sentAt: '2025-01-15T09:15:00' },
  { id: 'msg-3', patient: 'Amit Patel', phone: '+91-76543-21098', template: 'Follow-up Reminder', status: 'read', sentAt: '2025-01-14T14:20:00' },
  { id: 'msg-4', patient: 'Sunita Devi', phone: '+91-65432-10987', template: 'Appointment Confirmed', status: 'sent', sentAt: '2025-01-14T11:45:00' },
  { id: 'msg-5', patient: 'Mohammed Ali', phone: '+91-54321-09876', template: 'Emergency Alert', status: 'failed', sentAt: '2025-01-14T08:00:00' },
  { id: 'msg-6', patient: 'Deepa Nair', phone: '+91-43210-98765', template: 'Appointment Reminder', status: 'delivered', sentAt: '2025-01-13T16:30:00' },
  { id: 'msg-7', patient: 'Vikram Singh', phone: '+91-32109-87654', template: 'Follow-up Reminder', status: 'read', sentAt: '2025-01-13T10:00:00' },
  { id: 'msg-8', patient: 'Anjali Gupta', phone: '+91-21098-76543', template: 'Appointment Confirmed', status: 'delivered', sentAt: '2025-01-12T13:15:00' },
];

const QUICK_SEND_PATIENTS = [
  { id: 'p1', name: 'Rajesh Kumar', phone: '+91-98765-43210' },
  { id: 'p2', name: 'Priya Sharma', phone: '+91-87654-32109' },
  { id: 'p3', name: 'Amit Patel', phone: '+91-76543-21098' },
  { id: 'p4', name: 'Sunita Devi', phone: '+91-65432-10987' },
  { id: 'p5', name: 'Mohammed Ali', phone: '+91-54321-09876' },
];

// ============================================================
// Animation Variants
// ============================================================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ============================================================
// Sub-components
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  const Icon = config.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize',
      config.bgColor, config.color,
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TemplateCard({ template, onToggle, onEdit }: {
  template: WATemplate;
  onToggle: (id: string) => void;
  onEdit: (tpl: WATemplate) => void;
}) {
  const Icon = template.icon;
  const categoryColors: Record<string, string> = {
    appointment: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    reminder: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    followup: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    emergency: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  };

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Category color strip */}
      <div className={cn('h-1', {
        'bg-emerald-500': template.category === 'appointment',
        'bg-teal-500': template.category === 'reminder',
        'bg-amber-500': template.category === 'followup',
        'bg-rose-500': template.category === 'emergency',
      })} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', categoryColors[template.category])}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{template.name}</h3>
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded capitalize', categoryColors[template.category])}>
                {template.category}
              </span>
            </div>
          </div>
          <div className={cn(
            'w-10 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-colors',
            template.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700',
          )} onClick={() => onToggle(template.id)}>
            <motion.div
              animate={{ x: template.enabled ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{template.description}</p>

        {/* Preview */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 mb-3">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
            {template.preview}
          </p>
          <div className="flex gap-2 mt-2">
            {template.preview.match(/\{(\w+)\}/g)?.map((placeholder, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-mono">
                {placeholder}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Used <span className="font-semibold text-slate-600 dark:text-slate-300">{template.usageCount}</span> times
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={() => onEdit(template)}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function WhatsAppCenter() {
  const [templates, setTemplates] = useState<WATemplate[]>(MOCK_TEMPLATES);
  const [messages] = useState<WAMessage[]>(MOCK_MESSAGES);
  const [quickSendOpen, setQuickSendOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WATemplate | null>(null);
  const [quickSendForm, setQuickSendForm] = useState<QuickSendForm>({ patient: '', template: '', customMessage: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => ({
    totalSent: messages.length,
    delivered: messages.filter(m => m.status === 'delivered').length + messages.filter(m => m.status === 'read').length,
    failed: messages.filter(m => m.status === 'failed').length,
  }), [messages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m =>
      m.patient.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.template.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const handleToggleTemplate = (id: string) => {
    setTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t)
    );
    const tpl = templates.find(t => t.id === id);
    toast.success(tpl?.enabled ? `"${tpl?.name}" disabled` : `"${tpl?.name}" enabled`);
  };

  const handleEditTemplate = (tpl: WATemplate) => {
    setEditingTemplate(tpl);
    setEditDialogOpen(true);
  };

  const handleQuickSend = () => {
    if (!quickSendForm.patient || !quickSendForm.template) {
      toast.error('Please select a patient and template');
      return;
    }
    toast.success(`WhatsApp message sent to ${quickSendForm.patient}`);
    setQuickSendOpen(false);
    setQuickSendForm({ patient: '', template: '', customMessage: '' });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* =================== PAGE HEADER =================== */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              {/* WhatsApp-style pulse */}
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>
            WhatsApp Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage automated WhatsApp messages for appointments, reminders &amp; alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 gap-2"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configure</span>
          </Button>
          <Button
            onClick={() => setQuickSendOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30"
          >
            <Send className="w-4 h-4" />
            Quick Send
          </Button>
        </div>
      </motion.div>

      {/* =================== STATS ROW =================== */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Sent',
            value: stats.totalSent,
            icon: Send,
            colorClass: 'text-emerald-700 dark:text-emerald-300',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            borderColor: 'bg-emerald-500',
            subValue: '+12 today',
            subColor: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Delivered / Read',
            value: stats.delivered,
            icon: CheckCheck,
            colorClass: 'text-teal-700 dark:text-teal-300',
            iconBg: 'bg-teal-100 dark:bg-teal-900/40',
            iconColor: 'text-teal-600 dark:text-teal-400',
            borderColor: 'bg-teal-500',
            subValue: '98.5% rate',
            subColor: 'text-teal-600 dark:text-teal-400',
          },
          {
            label: 'Failed',
            value: stats.failed,
            icon: AlertCircle,
            colorClass: 'text-rose-700 dark:text-rose-300',
            iconBg: 'bg-rose-100 dark:bg-rose-900/40',
            iconColor: 'text-rose-600 dark:text-rose-400',
            borderColor: 'bg-rose-500',
            subValue: 'Retry available',
            subColor: 'text-rose-500 dark:text-rose-400',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <Card className="border-slate-200 dark:border-slate-800 overflow-hidden relative hover:shadow-lg transition-shadow">
                <div className={cn('absolute top-0 left-0 right-0 h-0.5', stat.borderColor)} />
                <CardContent className="p-4 lg:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className={cn('text-2xl font-bold mt-1', stat.colorClass)}>{stat.value}</p>
                      <p className={cn('text-xs mt-0.5 font-medium', stat.subColor)}>{stat.subValue}</p>
                    </div>
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', stat.iconBg)}>
                      <Icon className={cn('w-5 h-5', stat.iconColor)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* =================== TEMPLATE MANAGEMENT =================== */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-emerald-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Message Templates</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">{templates.filter(t => t.enabled).length} active</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <TemplateCard
                template={tpl}
                onToggle={handleToggleTemplate}
                onEdit={handleEditTemplate}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* =================== RECENT MESSAGES LOG =================== */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                Recent Messages
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Search messages..."
                  className="pl-9 h-8 text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">Template</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredMessages.map((msg, i) => (
                    <motion.tr
                      key={msg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-xs">{msg.patient}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono md:hidden">{msg.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono hidden md:table-cell">
                        {msg.phone}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-xs text-slate-600 dark:text-slate-300">{msg.template}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500 hidden lg:table-cell">
                        {formatTime(msg.sentAt)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredMessages.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">
                No messages match your search
              </div>
            )}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              Showing {filteredMessages.length} of {messages.length} messages
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* =================== WHATSAPP BUSINESS INFO =================== */}
      <motion.div
        variants={item}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              WhatsApp Business Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Connected Number</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono">+91 98765 43210</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Business Name</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">VoiceAI Clinic</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">API Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Messages This Month</span>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">810 / 5,000</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '16.2%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>16.2% used</span>
              <span>Resets Feb 1</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Avg Delivery Time</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">&lt; 3 seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Read Rate</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">87.3%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Active Templates</span>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{templates.filter(t => t.enabled).length} / {templates.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Last Message Sent</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">2 min ago</span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <Users className="w-3 h-3 mr-1.5" />
                View Recipients
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Activity className="w-3 h-3 mr-1.5" />
                Activity Log
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* =================== QUICK SEND DIALOG =================== */}
      <Dialog open={quickSendOpen} onOpenChange={setQuickSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              Quick Send Message
            </DialogTitle>
            <DialogDescription>
              Send a WhatsApp message to a patient instantly
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Patient Picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Select Patient</label>
              <Select value={quickSendForm.patient} onValueChange={(v) => setQuickSendForm(f => ({ ...f, patient: v }))}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Choose a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_SEND_PATIENTS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.phone}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Select Template</label>
              <Select value={quickSendForm.template} onValueChange={(v) => setQuickSendForm(f => ({ ...f, template: v }))}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.enabled).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {quickSendForm.template && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg p-3"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Preview</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-mono">
                  {templates.find(t => t.id === quickSendForm.template)?.preview || ''}
                </p>
              </motion.div>
            )}

            {/* Custom Message */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Custom Message (optional)</label>
              <Textarea
                placeholder="Add a custom message or override the template..."
                className="min-h-[80px] text-xs border-slate-200 dark:border-slate-700 resize-none"
                value={quickSendForm.customMessage}
                onChange={(e) => setQuickSendForm(f => ({ ...f, customMessage: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickSendOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickSend}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================== EDIT TEMPLATE DIALOG =================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-500" />
              Edit Template
            </DialogTitle>
            <DialogDescription>
              {editingTemplate?.name}
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Template Name</label>
                <Input
                  defaultValue={editingTemplate.name}
                  className="text-sm border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Template Content</label>
                <Textarea
                  defaultValue={editingTemplate.preview}
                  className="min-h-[120px] text-xs font-mono border-slate-200 dark:border-slate-700 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400">Available placeholders:</span>
                {editingTemplate.preview.match(/\{(\w+)\}/g)?.map((p, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-mono cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success(`Template "${editingTemplate?.name}" updated`);
                setEditDialogOpen(false);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
