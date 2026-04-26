'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  Megaphone, Plus, Play, Pause, Trash2, Upload, Clock, Users, Phone,
  Calendar, ChevronRight, FileSpreadsheet, CheckCircle, XCircle,
  AlertTriangle, Loader2, ArrowLeft, Zap, BarChart3, UserPlus,
  PhoneCall, PhoneMissed, CalendarCheck, RefreshCw, MoreVertical,
  StopCircle, Download, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================
interface Contact {
  name: string;
  phone: string;
  notes?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  contactsJson: string;
  totalContacts: number;
  scheduleType: string;
  scheduleTime: string;
  scheduleDays: string | null;
  callDelaySeconds: number;
  maxRetries: number;
  systemPrompt: string | null;
  totalDispatched: number;
  totalCompleted: number;
  totalFailed: number;
  totalBooked: number;
  totalDuration: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'list' | 'detail' | 'create';

// ============================================
// Animation Variants
// ============================================
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ============================================
// Status Config
// ============================================
const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  animate?: boolean;
}> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    border: 'border-slate-200 dark:border-slate-700',
    icon: FileSpreadsheet,
  },
  active: {
    label: 'Active',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    border: 'border-sky-200 dark:border-sky-800/50',
    icon: Zap,
  },
  running: {
    label: 'Running',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    icon: Play,
    animate: true,
  },
  paused: {
    label: 'Paused',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    icon: Pause,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    border: 'border-rose-200 dark:border-rose-800/50',
    icon: XCircle,
  },
};

const SCHEDULE_LABELS: Record<string, string> = {
  once: 'One-time',
  daily: 'Daily',
  weekdays: 'Weekdays',
  custom: 'Custom Days',
};

const WEEKDAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================
// Helper Functions
// ============================================
function parseContacts(contactsJson: string): Contact[] {
  try {
    const parsed = JSON.parse(contactsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseScheduleDays(scheduleDays: string | null): string[] {
  if (!scheduleDays) return [];
  try {
    const parsed = JSON.parse(scheduleDays);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return phone;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseCSV(text: string): Contact[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];

  const contacts: Contact[] = [];
  const startIdx = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('phone') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Try to find phone and name
    let phone = '';
    let name = '';

    for (const val of values) {
      const digits = val.replace(/\D/g, '');
      if (digits.length >= 10 && !phone) {
        phone = digits.length > 10 ? digits : `91${digits}`;
      } else if (!name && val.length > 0) {
        name = val;
      }
    }

    if (phone) {
      contacts.push({ name: name || 'Unknown', phone });
    }
  }

  return contacts;
}

function parsePhoneList(text: string): Contact[] {
  const lines = text.trim().split('\n');
  const contacts: Contact[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 10) {
      const phone = digits.length > 10 ? digits : `91${digits}`;
      // Try to extract name if format is "Name: Phone" or "Name - Phone"
      const nameMatch = trimmed.match(/^([^:\-0-9]+?)[\s]*[:\-][\s]*(\d[\d\s\-+]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
      contacts.push({ name, phone });
    }
  }

  return contacts;
}

// ============================================
// CSV Drop Zone Component
// ============================================
function CSVDropZone({ onContactsParsed }: { onContactsParsed: (contacts: Contact[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a CSV or TXT file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const contacts = parseCSV(text);
      if (contacts.length > 0) {
        onContactsParsed(contacts);
        setParsedCount(contacts.length);
        toast.success(`Parsed ${contacts.length} contacts from CSV`);
      } else {
        toast.error('No valid contacts found in file');
      }
    };
    reader.readAsText(file);
  }, [onContactsParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/15 scale-[1.02]'
            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleInputChange}
          className="hidden"
        />
        <motion.div
          animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            isDragging
              ? 'bg-emerald-100 dark:bg-emerald-900/40'
              : 'bg-slate-100 dark:bg-slate-800'
          )}
        >
          <Upload className={cn(
            'w-6 h-6 transition-colors',
            isDragging ? 'text-emerald-500' : 'text-slate-400'
          )} />
        </motion.div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isDragging ? 'Drop your CSV file here' : 'Drag & drop CSV file'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            or click to browse — supports name, phone columns
          </p>
        </div>
        {parsedCount > 0 && (
          <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {parsedCount} contacts loaded
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================
// Create Campaign Dialog
// ============================================
function CreateCampaignDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    contactsJson: Contact[];
    scheduleType: string;
    scheduleTime: string;
    scheduleDays: string[];
    callDelaySeconds: number;
    maxRetries: number;
    systemPrompt: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [scheduleType, setScheduleType] = useState('once');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [callDelay, setCallDelay] = useState(3);
  const [maxRetries, setMaxRetries] = useState(2);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('contacts');
  const [submitting, setSubmitting] = useState(false);

  const handleContactsFromCSV = useCallback((parsed: Contact[]) => {
    setContacts(prev => {
      const existingPhones = new Set(prev.map(c => c.phone));
      const newContacts = parsed.filter(c => !existingPhones.has(c.phone));
      return [...prev, ...newContacts];
    });
  }, []);

  const handleParsePhoneList = useCallback(() => {
    if (!phoneInput.trim()) return;
    const parsed = parsePhoneList(phoneInput);
    if (parsed.length > 0) {
      setContacts(prev => {
        const existingPhones = new Set(prev.map(c => c.phone));
        const newContacts = parsed.filter(c => !existingPhones.has(c.phone));
        return [...prev, ...newContacts];
      });
      setPhoneInput('');
      toast.success(`Added ${parsed.length} contacts`);
    } else {
      toast.error('No valid phone numbers found');
    }
  }, [phoneInput]);

  const removeContact = useCallback((index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDay = useCallback((day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (contacts.length === 0) {
      toast.error('Add at least one contact');
      return;
    }

    setSubmitting(true);
    try {
      onSubmit({
        name: name.trim(),
        contactsJson: contacts,
        scheduleType,
        scheduleTime,
        scheduleDays: scheduleType === 'custom' ? selectedDays : [],
        callDelaySeconds: callDelay,
        maxRetries,
        systemPrompt,
      });
      // Reset form
      setName('');
      setContacts([]);
      setPhoneInput('');
      setScheduleType('once');
      setScheduleTime('09:00');
      setSelectedDays([]);
      setCallDelay(3);
      setMaxRetries(2);
      setSystemPrompt('');
      setActiveTab('contacts');
    } finally {
      setSubmitting(false);
    }
  }, [name, contacts, scheduleType, scheduleTime, selectedDays, callDelay, maxRetries, systemPrompt, onSubmit]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setName('');
      setContacts([]);
      setPhoneInput('');
      setScheduleType('once');
      setScheduleTime('09:00');
      setSelectedDays([]);
      setCallDelay(3);
      setMaxRetries(2);
      setSystemPrompt('');
      setActiveTab('contacts');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            Create Campaign
          </DialogTitle>
          <DialogDescription>
            Set up a mass outbound calling campaign with contacts and scheduling
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="contacts" className="flex-1">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Contacts
              {contacts.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{contacts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-2 pr-3">
            <TabsContent value="contacts" className="space-y-4 mt-0">
              {/* CSV Upload */}
              <CSVDropZone onContactsParsed={handleContactsFromCSV} />

              {/* Paste Phone Numbers */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Or paste phone numbers
                </label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Enter one phone per line&#10;Rahul Sharma: 9876543210&#10;+91 9812345678"
                    className="min-h-[80px] text-sm font-mono resize-none"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleParsePhoneList}
                  disabled={!phoneInput.trim()}
                  className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Parse Numbers
                </Button>
              </div>

              {/* Parsed Contacts Preview */}
              {contacts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Contacts ({contacts.length})
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setContacts([])}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 h-7 text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                    {contacts.map((contact, i) => (
                      <motion.div
                        key={`${contact.phone}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                              {contact.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {formatPhone(contact.phone)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeContact(i)}
                          className="text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0 ml-2"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-0">
              {/* Campaign Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Campaign Name *
                </label>
                <Input
                  placeholder="e.g., Follow-up Reminder March"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Schedule Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Schedule Type
                </label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                    <SelectItem value="custom">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-48"
                />
              </div>

              {/* Custom Days */}
              {scheduleType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          selectedDays.includes(day)
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Summary */}
              <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Schedule Summary</span>
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  {SCHEDULE_LABELS[scheduleType]} at {scheduleTime}
                  {scheduleType === 'custom' && selectedDays.length > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {' '}({selectedDays.join(', ')})
                    </span>
                  )}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-0">
              {/* Call Delay */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Delay Between Calls
                  </label>
                  <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {callDelay}s
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={callDelay}
                  onChange={(e) => setCallDelay(Number(e.target.value))}
                  className="w-full h-2 accent-emerald-500 rounded-full"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1s (Fast)</span>
                  <span>10s (Slow)</span>
                </div>
              </div>

              {/* Max Retries */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Max Retries per Contact
                </label>
                <Select value={String(maxRetries)} onValueChange={(v) => setMaxRetries(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Retry</SelectItem>
                    <SelectItem value="1">1 Retry</SelectItem>
                    <SelectItem value="2">2 Retries</SelectItem>
                    <SelectItem value="3">3 Retries</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* System Prompt Override */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Custom AI Prompt (Optional)
                </label>
                <Textarea
                  placeholder="Override the default AI agent prompt for this campaign...&#10;&#10;e.g., Call patients to remind about their upcoming appointments at {clinicName}. Be polite and confirm the date."
                  className="min-h-[100px] text-sm"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Leave empty to use your clinic&apos;s default AI agent configuration
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || contacts.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/30"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Campaign Detail View
// ============================================
function CampaignDetail({
  campaign,
  onBack,
  onUpdate,
}: {
  campaign: Campaign;
  onBack: () => void;
  onUpdate: () => void;
}) {
  const { user } = useAuthStore();
  const [updating, setUpdating] = useState(false);
  const contacts = useMemo(() => parseContacts(campaign.contactsJson), [campaign.contactsJson]);
  const scheduleDays = useMemo(() => parseScheduleDays(campaign.scheduleDays), [campaign.scheduleDays]);
  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const progress = campaign.totalContacts > 0
    ? Math.round((campaign.totalDispatched / campaign.totalContacts) * 100)
    : 0;

  const successRate = campaign.totalDispatched > 0
    ? Math.round((campaign.totalCompleted / campaign.totalDispatched) * 100)
    : 0;

  const handleAction = useCallback(async (action: string) => {
    setUpdating(true);
    try {
      const statusMap: Record<string, string> = {
        start: 'running',
        pause: 'paused',
        resume: 'running',
        complete: 'completed',
      };
      const newStatus = statusMap[action];
      const updateData: Record<string, unknown> = {};
      if (newStatus) updateData.status = newStatus;
      if (action === 'start') updateData.startedAt = new Date().toISOString();

      const res = await fetch(`/api/client/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-clinic-id': user?.clinicId || '',
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success(`Campaign ${action === 'start' ? 'started' : action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'completed'}`);
        onUpdate();
      } else {
        toast.error('Action failed');
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setUpdating(false);
    }
  }, [campaign.id, user?.clinicId, onUpdate]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{campaign.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
                statusConfig.bg, statusConfig.color, statusConfig.border
              )}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Created {format(new Date(campaign.createdAt), 'dd MMM yyyy')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(campaign.status === 'draft' || campaign.status === 'active') && (
            <Button
              size="sm"
              onClick={() => handleAction('start')}
              disabled={updating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
              Start
            </Button>
          )}
          {campaign.status === 'running' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('pause')}
                disabled={updating}
                className="border-amber-200 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4 mr-1.5" />}
                Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('complete')}
                disabled={updating}
                className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Complete
              </Button>
            </>
          )}
          {campaign.status === 'paused' && (
            <Button
              size="sm"
              onClick={() => handleAction('resume')}
              disabled={updating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Contacts', value: campaign.totalContacts, icon: Users, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
          { label: 'Dispatched', value: campaign.totalDispatched, icon: PhoneCall, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Completed', value: campaign.totalCompleted, icon: CheckCircle, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' },
          { label: 'Failed', value: campaign.totalFailed, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
          { label: 'Booked', value: campaign.totalBooked, icon: CalendarCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-3.5 h-3.5', stat.color)} />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Progress */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Campaign Progress</span>
            </div>
            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-teal-500" />
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>{campaign.totalDispatched} of {campaign.totalContacts} dispatched</span>
            <span>{successRate}% success rate</span>
          </div>
        </CardContent>
      </Card>

      {/* Schedule & Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Type</span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{SCHEDULE_LABELS[campaign.scheduleType]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Time</span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{campaign.scheduleTime}</span>
              </div>
              {scheduleDays.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Days</span>
                  <div className="flex gap-1">
                    {scheduleDays.map(d => (
                      <Badge key={d} variant="secondary" className="text-[10px] h-5 px-1.5">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Call Delay</span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{campaign.callDelaySeconds}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Max Retries</span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{campaign.maxRetries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Duration</span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{formatDuration(campaign.totalDuration)}</span>
              </div>
              {campaign.startedAt && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Started</span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">{format(new Date(campaign.startedAt), 'dd MMM, HH:mm')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Prompt */}
      {campaign.systemPrompt && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Custom AI Prompt</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 whitespace-pre-wrap">
              {campaign.systemPrompt}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Contacts ({contacts.length})
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                {campaign.totalCompleted} completed
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md">
                <XCircle className="w-3 h-3 inline mr-1" />
                {campaign.totalFailed} failed
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">#</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Name</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Phone</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {contacts.map((contact, i) => (
                  <tr key={`${contact.phone}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-4 text-xs text-slate-400">{i + 1}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-900 dark:text-white">{contact.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">{formatPhone(contact.phone)}</td>
                    <td className="py-2 px-4 text-xs text-slate-400">{contact.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// Main Campaign Manager Component
// ============================================
export default function CampaignManager() {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!user?.clinicId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/client/campaigns', {
        headers: { 'x-clinic-id': user.clinicId },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [user?.clinicId]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreateCampaign = useCallback(async (data: {
    name: string;
    contactsJson: Contact[];
    scheduleType: string;
    scheduleTime: string;
    scheduleDays: string[];
    callDelaySeconds: number;
    maxRetries: number;
    systemPrompt: string;
  }) => {
    try {
      const res = await fetch('/api/client/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clinic-id': user?.clinicId || '',
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success('Campaign created successfully');
        setCreateDialogOpen(false);
        fetchCampaigns();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create campaign');
      }
    } catch {
      toast.error('Failed to create campaign');
    }
  }, [user?.clinicId, fetchCampaigns]);

  const handleDeleteCampaign = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/client/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'x-clinic-id': user?.clinicId || '' },
      });
      if (res.ok) {
        toast.success('Campaign deleted');
        fetchCampaigns();
      } else {
        toast.error('Failed to delete campaign');
      }
    } catch {
      toast.error('Failed to delete campaign');
    } finally {
      setDeleting(null);
    }
  }, [user?.clinicId, fetchCampaigns]);

  const openDetail = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('detail');
  }, []);

  const backToList = useCallback(() => {
    setSelectedCampaign(null);
    setViewMode('list');
  }, []);

  // Detail View
  if (viewMode === 'detail' && selectedCampaign) {
    return (
      <div>
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={backToList}
          onUpdate={async () => {
            await fetchCampaigns();
            if (selectedCampaign) {
              const res = await fetch(`/api/client/campaigns/${selectedCampaign.id}`, {
                headers: { 'x-clinic-id': user?.clinicId || '' },
              });
              if (res.ok) {
                const data = await res.json();
                setSelectedCampaign(data.campaign);
              }
            }
          }}
        />
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        variants={itemAnim}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            Campaign Manager
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create and manage mass outbound calling campaigns
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/30"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Campaign
        </Button>
      </motion.div>

      {/* Summary Stats */}
      {!loading && campaigns.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(() => {
            const totalContacts = campaigns.reduce((sum, c) => sum + c.totalContacts, 0);
            const activeCampaigns = campaigns.filter(c => ['active', 'running'].includes(c.status)).length;
            const totalDispatched = campaigns.reduce((sum, c) => sum + c.totalDispatched, 0);
            const totalBooked = campaigns.reduce((sum, c) => sum + c.totalBooked, 0);
            const stats = [
              { label: 'Total Contacts', value: totalContacts, icon: Users, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
              { label: 'Active Campaigns', value: activeCampaigns, icon: Megaphone, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              { label: 'Calls Dispatched', value: totalDispatched, icon: PhoneCall, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' },
              { label: 'Appointments Booked', value: totalBooked, icon: CalendarCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            ];

            return stats.map((stat, i) => (
              <motion.div key={stat.label} variants={itemAnim}>
                <div className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', stat.bg)}>
                      <stat.icon className={cn('w-5 h-5', stat.color)} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{stat.label}</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ));
          })()}
        </motion.div>
      )}

      {/* Campaign List */}
      <motion.div variants={itemAnim} initial="hidden" animate="show">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="py-20"
              >
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
                      <Megaphone className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700">
                      <PhoneCall className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center animate-float-pulse">
                      <Users className="w-3 h-3 text-emerald-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    No Campaigns Yet
                  </h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-sm text-center leading-relaxed">
                    Create your first outbound calling campaign to reach patients at scale with AI-powered voice calls
                  </p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-200/50"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Campaign
                  </Button>
                  <div className="mt-6 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      CSV Upload
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Smart Scheduling
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Live Tracking
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Campaign Cards */
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaigns.map((campaign, i) => {
                  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;
                  const progress = campaign.totalContacts > 0
                    ? Math.round((campaign.totalDispatched / campaign.totalContacts) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => openDetail(campaign)}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                        statusConfig.bg
                      )}>
                        <StatusIcon className={cn('w-5 h-5', statusConfig.color)} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {campaign.name}
                          </h3>
                          {statusConfig.animate && (
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {campaign.totalContacts} contacts
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {SCHEDULE_LABELS[campaign.scheduleType]} at {campaign.scheduleTime}
                          </span>
                          <span className="hidden sm:flex items-center gap-1">
                            {format(new Date(campaign.createdAt), 'dd MMM yyyy')}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'completed') && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 max-w-[200px] overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'hidden sm:inline-flex flex-shrink-0',
                          statusConfig.border, statusConfig.bg, statusConfig.color
                        )}
                      >
                        {statusConfig.label}
                      </Badge>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(campaign); }}>
                            <ChevronRight className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {(campaign.status === 'draft' || campaign.status === 'active') && (
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await fetch(`/api/client/campaigns/${campaign.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-clinic-id': user?.clinicId || '',
                                    },
                                    body: JSON.stringify({ status: 'running', startedAt: new Date().toISOString() }),
                                  });
                                  toast.success('Campaign started');
                                  fetchCampaigns();
                                } catch { toast.error('Failed to start'); }
                              }}
                            >
                              <Play className="w-4 h-4 mr-2 text-emerald-500" />
                              Start
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'running' && (
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await fetch(`/api/client/campaigns/${campaign.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-clinic-id': user?.clinicId || '',
                                    },
                                    body: JSON.stringify({ status: 'paused' }),
                                  });
                                  toast.success('Campaign paused');
                                  fetchCampaigns();
                                } catch { toast.error('Failed to pause'); }
                              }}
                            >
                              <Pause className="w-4 h-4 mr-2 text-amber-500" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'paused' && (
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await fetch(`/api/client/campaigns/${campaign.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-clinic-id': user?.clinicId || '',
                                    },
                                    body: JSON.stringify({ status: 'running' }),
                                  });
                                  toast.success('Campaign resumed');
                                  fetchCampaigns();
                                } catch { toast.error('Failed to resume'); }
                              }}
                            >
                              <Play className="w-4 h-4 mr-2 text-emerald-500" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteCampaign(campaign.id);
                            }}
                            className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
                          >
                            {deleting === campaign.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Chevron */}
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors flex-shrink-0" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCampaign}
      />
    </div>
  );
}
