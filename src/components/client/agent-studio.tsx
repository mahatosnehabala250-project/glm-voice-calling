'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Sparkles, CalendarPlus, Shield, Play,
  Bot, CheckCircle2, Plus, Trash2, Mic, Volume2, Send,
  MessageCircle, Phone, Clock, AlertTriangle, Lightbulb,
  RotateCcw, Save, Tag, X, User, Globe, Languages,
  Heart, Stethoscope, HandMetal, Timer, PhoneForwarded,
  Settings2, MessageSquare, Brain, SaveAll, Loader2,
  ChevronRight, Info, Rocket, Search, ChevronDown,
  Link, FileText, Pencil, Eye, ArrowUpDown, Upload, BarChart3,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ────────────────────────────────────────────────
interface AgentConfigData {
  id?: string;
  clinicId?: string;
  agentName: string;
  agentPersona: string;
  greetingMessage: string;
  farewellMessage: string;
  language: string;
  voiceProvider: string;
  voiceName: string;
  voiceGender: string;
  voiceSpeed: string;
  speakingRate: number | null;
  maxCallDuration: number;
  transferOnFail: boolean;
  transferNumber: string;
  escalationPrompt: string;
  autoBookSlot: boolean;
  bookingSlotDuration: number;
  bookingLeadDays: number;
  bufferMinutes: number;
  maxBookingsPerDay: number;
  autoConfirm: boolean;
  requireConfirmation: boolean;
  faqJson: string | null;
  servicesJson: string | null;
  clinicDescription: string | null;
  specializations: string | null;
  specialNotes: string | null;
  escalationEnabled: boolean;
  escalationAfter: number;
  escalationKeywords: string | null;
  escalationNumber: string | null;
  sentimentThreshold: string;
  askForFeedback: boolean;
  collectPatientInfo: boolean;
  agentStatus: string;
  isActive: boolean;
  isConfigured: boolean;
}

interface FAQItem { q: string; a: string; }
interface ChatMessage { role: 'user' | 'ai'; text: string; }

// ─── Animation variants ───────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ─── Persona options ──────────────────────────────────────
const PERSONAS = [
  { id: 'professional', label: 'Professional', icon: User, desc: 'Formal & precise', color: 'emerald' },
  { id: 'friendly', label: 'Friendly', icon: Heart, desc: 'Warm & conversational', color: 'amber' },
  { id: 'clinical', label: 'Clinical', icon: Stethoscope, desc: 'Medical & clinical', color: 'teal' },
  { id: 'warm', label: 'Warm', icon: HandMetal, desc: 'Empathetic & caring', color: 'rose' },
] as const;

const LANGUAGES = [
  { id: 'hinglish', label: 'Hinglish', flag: '🇮🇳' },
  { id: 'english', label: 'English', flag: '🇬🇧' },
  { id: 'hindi', label: 'Hindi', flag: '🇮🇳' },
] as const;

const VOICE_SPEEDS = [
  { id: 'slow', label: 'Slow', value: 0.8 },
  { id: 'normal', label: 'Normal', value: 1.0 },
  { id: 'fast', label: 'Fast', value: 1.3 },
] as const;

// ─── Default config ───────────────────────────────────────
const DEFAULT_CONFIG: AgentConfigData = {
  agentName: 'VoiceAI Assistant',
  agentPersona: 'professional',
  greetingMessage: 'Hello! Welcome to {clinicName}. How can I help you today?',
  farewellMessage: 'Thank you for calling {clinicName}. Have a great day!',
  language: 'hinglish',
  voiceProvider: 'gemini',
  voiceName: '',
  voiceGender: 'female',
  voiceSpeed: 'normal',
  speakingRate: 1.0,
  maxCallDuration: 300,
  transferOnFail: true,
  transferNumber: '',
  escalationPrompt: "I'll connect you with our staff. Please hold.",
  autoBookSlot: true,
  bookingSlotDuration: 30,
  bookingLeadDays: 7,
  bufferMinutes: 15,
  maxBookingsPerDay: 50,
  autoConfirm: true,
  requireConfirmation: true,
  faqJson: null,
  servicesJson: null,
  clinicDescription: null,
  specializations: null,
  specialNotes: null,
  escalationEnabled: true,
  escalationAfter: 120,
  escalationKeywords: null,
  escalationNumber: null,
  sentimentThreshold: 'negative',
  askForFeedback: true,
  collectPatientInfo: true,
  agentStatus: 'draft',
  isActive: true,
  isConfigured: false,
};

// ─── Chat simulator scenarios ─────────────────────────────
const SCENARIOS = [
  { id: 'booking', label: 'Booking', icon: CalendarPlus },
  { id: 'faq', label: 'FAQ', icon: Lightbulb },
  { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
  { id: 'escalation', label: 'Escalation', icon: Phone },
];

const scenarioResponses: Record<string, ChatMessage[]> = {
  booking: [
    { role: 'ai', text: 'Namaste! Welcome to our clinic. How can I help you today?' },
    { role: 'user', text: 'I want to book an appointment for a dental checkup.' },
    { role: 'ai', text: 'Of course! When would you like to visit? We have slots tomorrow between 10 AM and 5 PM.' },
    { role: 'user', text: 'Tomorrow at 11 AM would be great.' },
    { role: 'ai', text: "Perfect! I've booked your appointment for tomorrow at 11 AM. You'll receive a confirmation on WhatsApp." },
  ],
  faq: [
    { role: 'ai', text: 'Namaste! Welcome. How may I assist you?' },
    { role: 'user', text: 'What are your consultation charges?' },
    { role: 'ai', text: 'Our consultation fee is ₹500. Would you like to book an appointment?' },
  ],
  emergency: [
    { role: 'ai', text: 'Namaste! Welcome to our clinic. How can I help you today?' },
    { role: 'user', text: "I have severe pain in my tooth, it's an emergency!" },
    { role: 'ai', text: 'I understand this is urgent. Let me connect you to our doctor immediately. Please hold on.' },
    { role: 'ai', text: '⚠️ Escalating call to human agent...' },
  ],
  escalation: [
    { role: 'ai', text: 'Hello! Thank you for calling. How may I help you?' },
    { role: 'user', text: 'I need to speak to the manager, this is regarding a complaint.' },
    { role: 'ai', text: "I'm sorry to hear that. Transferring your call to our manager now." },
    { role: 'ai', text: '📞 Connecting to escalation number...' },
  ],
};

// ─── Component ────────────────────────────────────────────
export default function AgentStudio() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId || '';

  const [config, setConfig] = useState<AgentConfigData>(DEFAULT_CONFIG);
  const [serverConfig, setServerConfig] = useState<AgentConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived state
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState('');
  const [escKeywords, setEscKeywords] = useState<string[]>([]);
  const [escKeywordInput, setEscKeywordInput] = useState('');

  // Chat simulator
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatActive, setChatActive] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);

  // Knowledge tab: FAQ management
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  // Deploy tab
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // ─── Fetch config on mount ─────────────────────────────
  useEffect(() => {
    if (!clinicId) return;
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/client/agent-config', {
          headers: { 'x-clinic-id': clinicId },
        });
        const data = await res.json();
        if (data.config) {
          const c = data.config;
          const loaded: AgentConfigData = {
            id: c.id,
            clinicId: c.clinicId,
            agentName: c.agentName || DEFAULT_CONFIG.agentName,
            agentPersona: c.agentPersona || DEFAULT_CONFIG.agentPersona,
            greetingMessage: c.greetingMessage || DEFAULT_CONFIG.greetingMessage,
            farewellMessage: c.farewellMessage || DEFAULT_CONFIG.farewellMessage,
            language: c.language || DEFAULT_CONFIG.language,
            voiceProvider: c.voiceProvider || DEFAULT_CONFIG.voiceProvider,
            voiceName: c.voiceName || '',
            voiceGender: c.voiceGender || DEFAULT_CONFIG.voiceGender,
            voiceSpeed: c.voiceSpeed || DEFAULT_CONFIG.voiceSpeed,
            speakingRate: c.speakingRate ?? DEFAULT_CONFIG.speakingRate,
            maxCallDuration: c.maxCallDuration || DEFAULT_CONFIG.maxCallDuration,
            transferOnFail: c.transferOnFail ?? DEFAULT_CONFIG.transferOnFail,
            transferNumber: c.transferNumber || '',
            escalationPrompt: c.escalationPrompt || DEFAULT_CONFIG.escalationPrompt,
            autoBookSlot: c.autoBookSlot ?? DEFAULT_CONFIG.autoBookSlot,
            bookingSlotDuration: c.bookingSlotDuration || DEFAULT_CONFIG.bookingSlotDuration,
            bookingLeadDays: c.bookingLeadDays || DEFAULT_CONFIG.bookingLeadDays,
            bufferMinutes: c.bufferMinutes ?? DEFAULT_CONFIG.bufferMinutes,
            maxBookingsPerDay: c.maxBookingsPerDay || DEFAULT_CONFIG.maxBookingsPerDay,
            autoConfirm: c.autoConfirm ?? DEFAULT_CONFIG.autoConfirm,
            requireConfirmation: c.requireConfirmation ?? DEFAULT_CONFIG.requireConfirmation,
            faqJson: c.faqJson,
            servicesJson: c.servicesJson,
            clinicDescription: c.clinicDescription,
            specializations: c.specializations,
            specialNotes: c.specialNotes,
            escalationEnabled: c.escalationEnabled ?? DEFAULT_CONFIG.escalationEnabled,
            escalationAfter: c.escalationAfter || DEFAULT_CONFIG.escalationAfter,
            escalationKeywords: c.escalationKeywords,
            escalationNumber: c.escalationNumber || '',
            sentimentThreshold: c.sentimentThreshold || DEFAULT_CONFIG.sentimentThreshold,
            askForFeedback: c.askForFeedback ?? DEFAULT_CONFIG.askForFeedback,
            collectPatientInfo: c.collectPatientInfo ?? DEFAULT_CONFIG.collectPatientInfo,
            agentStatus: c.agentStatus || DEFAULT_CONFIG.agentStatus,
            isActive: c.isActive ?? DEFAULT_CONFIG.isActive,
            isConfigured: c.isConfigured ?? DEFAULT_CONFIG.isConfigured,
          };
          setConfig(loaded);
          setServerConfig(loaded);
          setFaqs(c.faqJson ? JSON.parse(c.faqJson) : []);
          setServices(c.servicesJson ? JSON.parse(c.servicesJson) : []);
          setSpecializations(c.specializations ? JSON.parse(c.specializations) : []);
          setEscKeywords(c.escalationKeywords ? c.escalationKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []);
        }
      } catch (err) {
        console.error('Failed to fetch agent config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [clinicId]);

  // ─── Track unsaved changes ─────────────────────────────
  useEffect(() => {
    if (!serverConfig) return;
    const changed = JSON.stringify(config) !== JSON.stringify(serverConfig);
    setHasUnsaved(changed);
  }, [config, serverConfig]);

  // ─── Auto-save with debounce ───────────────────────────
  const autoSave = useCallback((newConfig: AgentConfigData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!clinicId) return;
      setSaving(true);
      try {
        const payload = {
          ...newConfig,
          faqJson: JSON.stringify(faqs),
          servicesJson: JSON.stringify(services),
          specializations: JSON.stringify(specializations),
          escalationKeywords: escKeywords.join(', '),
        };
        const res = await fetch('/api/client/agent-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-clinic-id': clinicId },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setServerConfig(data.config);
          setHasUnsaved(false);
          toast.success('Configuration saved', { duration: 1500 });
        }
      } catch {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [clinicId, faqs, services, specializations, escKeywords]);

  // ─── Update helpers ────────────────────────────────────
  const updateField = useCallback(<K extends keyof AgentConfigData>(key: K, value: AgentConfigData[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      autoSave(next);
      return next;
    });
  }, [autoSave]);

  // ─── FAQ helpers ───────────────────────────────────────
  const addFaq = () => setFaqs((p) => [...p, { q: '', a: '' }]);
  const removeFaq = (idx: number) => setFaqs((p) => p.filter((_, i) => i !== idx));
  const updateFaq = (idx: number, field: 'q' | 'a', value: string) => {
    setFaqs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      autoSave(config);
      return next;
    });
  };

  // ─── Service tag helpers ───────────────────────────────
  const addService = () => {
    const val = serviceInput.trim();
    if (val && !services.includes(val)) {
      setServices((p) => [...p, val]);
      setServiceInput('');
      autoSave(config);
    }
  };
  const removeService = (s: string) => {
    setServices((p) => p.filter((x) => x !== s));
    autoSave(config);
  };

  // ─── Specialization helpers ────────────────────────────
  const addSpec = () => {
    const val = specInput.trim();
    if (val && !specializations.includes(val)) {
      setSpecializations((p) => [...p, val]);
      setSpecInput('');
      autoSave(config);
    }
  };
  const removeSpec = (s: string) => {
    setSpecializations((p) => p.filter((x) => x !== s));
    autoSave(config);
  };

  // ─── Escalation keyword helpers ────────────────────────
  const addEscKeyword = () => {
    const val = escKeywordInput.trim().toLowerCase();
    if (val && !escKeywords.includes(val)) {
      setEscKeywords((p) => [...p, val]);
      setEscKeywordInput('');
      autoSave(config);
    }
  };
  const removeEscKeyword = (k: string) => {
    setEscKeywords((p) => p.filter((x) => x !== k));
    autoSave(config);
  };

  // ─── Chat simulator ────────────────────────────────────
  const startScenario = useCallback((scenarioId: string) => {
    setCurrentScenario(scenarioId);
    setChatActive(true);
    setChatMessages([]);
    const messages = scenarioResponses[scenarioId] || [];
    let idx = 0;
    const addNext = () => {
      if (idx >= messages.length) { setChatActive(false); return; }
      setChatMessages((prev) => [...prev, messages[idx]]);
      idx++;
      setTimeout(addNext, 1200 + Math.random() * 800);
    };
    setTimeout(addNext, 600);
  }, []);

  // ─── Progress ──────────────────────────────────────────
  const progress = useMemo(() => {
    let completed = 0;
    const total = 6;
    if (config.agentName && config.agentName !== 'VoiceAI Assistant') completed++;
    if (config.voiceGender) completed++;
    if (config.maxCallDuration > 0) completed++;
    if (config.autoBookSlot) completed++;
    if (faqs.length > 0 || config.clinicDescription) completed++;
    if (config.sentimentThreshold) completed++;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  }, [config, faqs.length]);

  // ─── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-shimmer-skeleton h-8 w-64 rounded-lg" />
      </div>
    );
  }

  const personaInfo = PERSONAS.find((p) => p.id === config.agentPersona) || PERSONAS[0];
  const langInfo = LANGUAGES.find((l) => l.id === config.language) || LANGUAGES[0];
  const speedInfo = VOICE_SPEEDS.find((s) => s.id === config.voiceSpeed) || VOICE_SPEEDS[1];

  const statusColor = config.agentStatus === 'active'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : config.agentStatus === 'testing'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent)]" />
          <CardHeader className="relative text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">AI Agent Studio</CardTitle>
                  <CardDescription className="text-emerald-100">
                    Customize your AI voice agent&apos;s personality, knowledge &amp; behavior
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsaved && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 animate-pulse">
                    <Save className="w-3 h-3 mr-1" />
                    Unsaved changes
                  </Badge>
                )}
                {saving && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Saving...
                  </Badge>
                )}
                {config.isConfigured && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
                {config.agentStatus && (
                  <Badge className={cn(statusColor, 'text-sm px-3 py-1')}>
                    {config.agentStatus === 'active' && '● '}
                    {config.agentStatus.charAt(0).toUpperCase() + config.agentStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* ─── Progress Bar ────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Config Strength</span>
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full transition-all',
                progress.percent >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                progress.percent >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                'bg-gradient-to-r from-rose-500 to-orange-400'
              )}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span className={cn(
            'text-xs font-bold min-w-[2rem] text-right',
            progress.percent >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
            progress.percent >= 50 ? 'text-amber-600 dark:text-amber-400' :
            'text-rose-600 dark:text-rose-400'
          )}>{progress.percent}%</span>
        </div>
      </motion.div>

      {/* ─── Tabbed Interface ────────────────────────────── */}
      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-900 p-1">
            <TabsTrigger value="identity" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Identity</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="call-handling" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Call</span>
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <CalendarPlus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Booking</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Behavior</span>
            </TabsTrigger>
            <TabsTrigger value="deploy" className="flex-1 min-w-[90px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5">
              <Rocket className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Deploy</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── IDENTITY TAB ────────────────────────────── */}
          <TabsContent value="identity">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {/* Agent Name */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Agent Name</CardTitle>
                        <CardDescription>Give your AI agent a name patients will remember</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="e.g., Dr. Sehgal ki Assistant"
                      value={config.agentName}
                      onChange={(e) => updateField('agentName', e.target.value)}
                      className="max-w-md"
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Persona Selector */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Persona</CardTitle>
                        <CardDescription>Choose how your AI agent interacts with callers</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {PERSONAS.map((p) => {
                        const Icon = p.icon;
                        const isActive = config.agentPersona === p.id;
                        return (
                          <motion.button
                            key={p.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateField('agentPersona', p.id)}
                            className={cn(
                              'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer',
                              isActive
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            )}
                          >
                            {isActive && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                            )}
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={cn(
                              'text-sm font-medium',
                              isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                            )}>{p.label}</span>
                            <span className="text-xs text-slate-400">{p.desc}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Language */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <Languages className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Language</CardTitle>
                        <CardDescription>Primary language for conversations</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 max-w-lg">
                      {LANGUAGES.map((l) => {
                        const isActive = config.language === l.id;
                        return (
                          <motion.button
                            key={l.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateField('language', l.id)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer',
                              isActive
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            )}
                          >
                            <span className="text-2xl">{l.flag}</span>
                            <span className={cn(
                              'text-sm font-medium',
                              isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                            )}>{l.label}</span>
                            {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          </motion.button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Greeting & Farewell */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Messages</CardTitle>
                        <CardDescription>Customize greeting and farewell messages. Use {'{clinicName}'} as a placeholder.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Greeting Message</Label>
                      <Textarea
                        value={config.greetingMessage}
                        onChange={(e) => updateField('greetingMessage', e.target.value)}
                        rows={3}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Farewell Message</Label>
                      <Textarea
                        value={config.farewellMessage}
                        onChange={(e) => updateField('farewellMessage', e.target.value)}
                        rows={2}
                        className="mt-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ─── VOICE TAB ───────────────────────────────── */}
          <TabsContent value="voice">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Voice Configuration</CardTitle>
                        <CardDescription>Configure how your AI sounds on calls</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Voice Settings */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs">Voice Provider</Label>
                          <Select value={config.voiceProvider} onValueChange={(v) => updateField('voiceProvider', v)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini">Gemini (Google)</SelectItem>
                              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                              <SelectItem value="openai">OpenAI TTS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Voice Name</Label>
                            <Input
                              placeholder="e.g., Rekha"
                              value={config.voiceName}
                              onChange={(e) => updateField('voiceName', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Gender</Label>
                            <div className="flex gap-2 mt-1">
                              {(['female', 'male'] as const).map((g) => (
                                <button
                                  key={g}
                                  onClick={() => updateField('voiceGender', g)}
                                  className={cn(
                                    'flex-1 py-2 rounded-lg text-xs font-medium border transition-all',
                                    config.voiceGender === g
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                  )}
                                >
                                  {g === 'female' ? '♀ Female' : '♂ Male'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Speed */}
                        <div>
                          <Label className="text-xs">Speed</Label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {VOICE_SPEEDS.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => updateField('voiceSpeed', s.id)}
                                className={cn(
                                  'py-2 rounded-lg text-xs font-medium border transition-all',
                                  config.voiceSpeed === s.id
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                )}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                          <Slider
                            min={0.5} max={2.0} step={0.1}
                            value={[config.speakingRate ?? speedInfo.value]}
                            onValueChange={([v]) => updateField('speakingRate', v)}
                            className="mt-3"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Slow</span><span>Normal</span><span>Fast</span>
                          </div>
                        </div>
                      </div>

                      {/* Voice Preview */}
                      <div>
                        <Label className="text-xs mb-2 block">Voice Preview</Label>
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(16,185,129,0.12),transparent)]" />
                          <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Mic className="w-6 h-6 text-emerald-400" />
                              </div>
                              <div>
                                <p className="font-medium">{config.agentName}</p>
                                <p className="text-xs text-slate-400">
                                  {config.voiceProvider} • {config.voiceGender} • {speedInfo.label}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-lg bg-white/10 p-4 mb-3">
                              <p className="text-sm italic text-emerald-100 leading-relaxed">
                                &ldquo;{config.greetingMessage}&rdquo;
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> {(config.speakingRate ?? speedInfo.value).toFixed(1)}x</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~3s response</span>
                              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                {personaInfo.label} • {langInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ─── CALL HANDLING TAB ───────────────────────── */}
          <TabsContent value="call-handling">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <Timer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Call Duration</CardTitle>
                        <CardDescription>Maximum call length before auto-wrap</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Max Duration: {config.maxCallDuration}s ({Math.floor(config.maxCallDuration / 60)}m {config.maxCallDuration % 60}s)</Label>
                      </div>
                      <Slider
                        min={60} max={600} step={30}
                        value={[config.maxCallDuration]}
                        onValueChange={([v]) => updateField('maxCallDuration', v)}
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>1 min</span><span>5 min</span><span>10 min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <PhoneForwarded className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Transfer on Failure</CardTitle>
                        <CardDescription>Transfer calls to a human when AI cannot handle</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <div>
                        <p className="text-sm font-medium">Enable Transfer on Failure</p>
                        <p className="text-xs text-slate-500">Forward to human when AI can&apos;t resolve</p>
                      </div>
                      <Switch checked={config.transferOnFail} onCheckedChange={(v) => updateField('transferOnFail', v)} />
                    </div>
                    {config.transferOnFail && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Transfer Number</Label>
                          <Input
                            placeholder="+91XXXXXXXXXX"
                            value={config.transferNumber}
                            onChange={(e) => updateField('transferNumber', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Escalation Prompt</Label>
                          <Textarea
                            value={config.escalationPrompt}
                            onChange={(e) => updateField('escalationPrompt', e.target.value)}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Escalation Rules</CardTitle>
                        <CardDescription>When and how your AI escalates to humans</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <div>
                        <p className="text-sm font-medium">Enable Escalation</p>
                        <p className="text-xs text-slate-500">Transfer to human when conditions are met</p>
                      </div>
                      <Switch checked={config.escalationEnabled} onCheckedChange={(v) => updateField('escalationEnabled', v)} />
                    </div>
                    {config.escalationEnabled && (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Escalation After (seconds)</Label>
                            <Input
                              type="number" min={30} max={600}
                              value={config.escalationAfter}
                              onChange={(e) => updateField('escalationAfter', parseInt(e.target.value) || 120)}
                              className="mt-1"
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">Offer transfer after this time</p>
                          </div>
                          <div>
                            <Label className="text-xs">Escalation Number</Label>
                            <Input
                              placeholder="+91XXXXXXXXXX"
                              value={config.escalationNumber}
                              onChange={(e) => updateField('escalationNumber', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Escalation Keywords</Label>
                          <div className="flex gap-2 mt-1 mb-2">
                            <Input
                              placeholder="Add keyword (e.g., emergency)"
                              value={escKeywordInput}
                              onChange={(e) => setEscKeywordInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEscKeyword())}
                              className="flex-1"
                            />
                            <Button variant="outline" size="icon" onClick={addEscKeyword}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {escKeywords.map((k) => (
                              <Badge key={k} variant="secondary" className="gap-1 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => removeEscKeyword(k)}>
                                <AlertTriangle className="w-3 h-3" />
                                {k}
                                <X className="w-3 h-3" />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ─── BOOKING TAB ─────────────────────────────── */}
          <TabsContent value="booking">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <CalendarPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Booking Flow</CardTitle>
                        <CardDescription>Configure how your AI handles appointment bookings</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Auto Book Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                      <div>
                        <p className="text-sm font-medium">Auto-Book Slots</p>
                        <p className="text-xs text-slate-500">AI automatically books available appointments</p>
                      </div>
                      <Switch checked={config.autoBookSlot} onCheckedChange={(v) => updateField('autoBookSlot', v)} />
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs">Slot Duration</Label>
                        <Select value={String(config.bookingSlotDuration)} onValueChange={(v) => updateField('bookingSlotDuration', parseInt(v))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[15, 20, 30, 45, 60].map((m) => (
                              <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Lead Days</Label>
                        <Input
                          type="number" min={1} max={90}
                          value={config.bookingLeadDays}
                          onChange={(e) => updateField('bookingLeadDays', parseInt(e.target.value) || 7)}
                          className="mt-1"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">days ahead to book</p>
                      </div>
                      <div>
                        <Label className="text-xs">Buffer Minutes</Label>
                        <Input
                          type="number" min={0} max={60}
                          value={config.bufferMinutes}
                          onChange={(e) => updateField('bufferMinutes', parseInt(e.target.value) || 15)}
                          className="mt-1"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">between appointments</p>
                      </div>
                      <div>
                        <Label className="text-xs">Max Bookings/Day</Label>
                        <Input
                          type="number" min={1} max={200}
                          value={config.maxBookingsPerDay}
                          onChange={(e) => updateField('maxBookingsPerDay', parseInt(e.target.value) || 50)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div>
                          <p className="text-sm font-medium">Auto-Confirm</p>
                          <p className="text-xs text-slate-500">Confirm bookings automatically</p>
                        </div>
                        <Switch checked={config.autoConfirm} onCheckedChange={(v) => updateField('autoConfirm', v)} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div>
                          <p className="text-sm font-medium">Require Confirmation</p>
                          <p className="text-xs text-slate-500">Ask patient to confirm booking</p>
                        </div>
                        <Switch checked={config.requireConfirmation} onCheckedChange={(v) => updateField('requireConfirmation', v)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ─── KNOWLEDGE BASE TAB (Enhanced) ───────────── */}
          <TabsContent value="knowledge">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {/* FAQ Management Section */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base gradient-text-emerald">
                            FAQ Management
                            <Badge variant="secondary" className="ml-2 text-[10px]">{faqs.length} FAQs</Badge>
                          </CardTitle>
                          <CardDescription>Common questions your AI should answer</CardDescription>
                        </div>
                      </div>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={addFaq}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Search & Filter */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search FAQs by keyword..."
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* FAQ List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      <AnimatePresence mode="popLayout">
                        {(() => {
                          const filtered = faqs.filter((faq) => {
                            if (!faqSearch) return true;
                            const q = faqSearch.toLowerCase();
                            return faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
                          });
                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-8 text-sm text-slate-400">
                                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                {faqSearch
                                  ? 'No FAQs match your search.'
                                  : 'No FAQs yet. Add your first FAQ or import from text.'}
                              </div>
                            );
                          }
                          return filtered.map((faq) => {
                            const realIdx = faqs.indexOf(faq);
                            const isExpanded = expandedFaq === realIdx;
                            return (
                              <motion.div
                                key={realIdx}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                                className="rounded-lg border bg-slate-50 dark:bg-slate-900/50 overflow-hidden hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
                              >
                                {/* Expandable header */}
                                <button
                                  className="w-full flex items-start justify-between p-3 gap-2 text-left"
                                  onClick={() => setExpandedFaq(isExpanded ? null : realIdx)}
                                >
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Q{realIdx + 1}</Badge>
                                    <span className={cn(
                                      'text-sm font-medium truncate',
                                      faq.q ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'
                                    )}>
                                      {faq.q || 'Untitled question'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    </motion.div>
                                  </div>
                                </button>

                                {/* Expanded content */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-3 pb-3 space-y-2">
                                        <div>
                                          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Question</Label>
                                          <Textarea
                                            value={faq.q}
                                            onChange={(e) => updateFaq(realIdx, 'q', e.target.value)}
                                            placeholder="e.g., What are your consultation charges?"
                                            rows={2}
                                            className="mt-1 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Answer</Label>
                                          <Textarea
                                            value={faq.a}
                                            onChange={(e) => updateFaq(realIdx, 'a', e.target.value)}
                                            placeholder="e.g., Our consultation fee is ₹500."
                                            rows={2}
                                            className="mt-1 text-sm"
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 h-7 text-xs"
                                            onClick={(e) => { e.stopPropagation(); removeFaq(realIdx); }}
                                          >
                                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                                          </Button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          });
                        })()}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Import Section */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Import FAQs</CardTitle>
                        <CardDescription>Bulk import questions and answers</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Import toggle */}
                    <div className="flex gap-2">
                      <Button
                        variant={showImportUrl ? 'outline' : 'default'}
                        size="sm"
                        className={!showImportUrl ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                        onClick={() => setShowImportUrl(false)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> From Text
                      </Button>
                      <Button
                        variant={showImportUrl ? 'default' : 'outline'}
                        size="sm"
                        className={showImportUrl ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                        onClick={() => setShowImportUrl(true)}
                      >
                        <Link className="w-3.5 h-3.5 mr-1" /> From URL
                      </Button>
                    </div>

                    {showImportUrl ? (
                      /* Import from URL (mock) */
                      <div className="space-y-3">
                        <div className="relative">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="https://example.com/faq-page"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Button
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          size="sm"
                          disabled={importing || !importUrl}
                          onClick={async () => {
                            setImporting(true);
                            toast.info('URL import is coming soon! Use text import for now.');
                            setImporting(false);
                          }}
                        >
                          {importing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                          Import from URL
                        </Button>
                      </div>
                    ) : (
                      /* Import from text */
                      <div className="space-y-3">
                        <Textarea
                          placeholder={'Q: What are your consultation charges?\nA: Our consultation fee is ₹500.\n\nQ: Do you accept insurance?\nA: Yes, we accept all major insurance plans.'}
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          rows={6}
                          className="text-sm font-mono"
                        />
                        <div className="flex items-center gap-3">
                          <Button
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            size="sm"
                            disabled={importing || !importText.trim()}
                            onClick={async () => {
                              if (!clinicId) return;
                              setImporting(true);
                              try {
                                const res = await fetch('/api/client/knowledge-base/import', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'x-clinic-id': clinicId },
                                  body: JSON.stringify({ text: importText }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  const imported = data.imported || data.faqs || [];
                                  setImportCount(imported.length || imported);
                                  setFaqs((prev) => [...prev, ...imported]);
                                  setImportText('');
                                  autoSave(config);
                                  toast.success(`Successfully imported ${imported.length || imported} FAQs!`, { duration: 3000 });
                                } else {
                                  toast.error('Failed to import FAQs');
                                }
                              } catch {
                                toast.error('Import failed. Check your format.');
                              } finally {
                                setImporting(false);
                              }
                            }}
                          >
                            {importing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                            Import FAQs
                          </Button>
                          {importCount !== null && (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {importCount} imported
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Clinic Description + Specializations + Special Notes — 2-col layout with AI Preview */}
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  {/* Clinic Description */}
                  <motion.div variants={item}>
                    <Card className="glass-card-hover">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base gradient-text-emerald">Clinic Description</CardTitle>
                            <CardDescription>Detailed description your AI will use as context</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Describe your clinic, services, doctors, and what makes you special..."
                          value={config.clinicDescription || ''}
                          onChange={(e) => updateField('clinicDescription', e.target.value)}
                          rows={4}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Specializations */}
                  <motion.div variants={item}>
                    <Card className="glass-card-hover">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Stethoscope className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base gradient-text-emerald">Specializations</CardTitle>
                            <CardDescription>Comma-separated list of specializations</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="e.g., General Dentistry, Orthodontics, Root Canal, Teeth Whitening"
                          value={specializations.join(', ')}
                          onChange={(e) => {
                            const vals = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                            setSpecializations(vals);
                            autoSave(config);
                          }}
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {specializations.map((s) => (
                            <Badge key={s} variant="secondary" className="gap-1 text-xs">
                              {s}
                              <button onClick={() => removeSpec(s)} className="hover:text-rose-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Special Notes */}
                  <motion.div variants={item}>
                    <Card className="glass-card-hover">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Info className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base gradient-text-emerald">Special Notes</CardTitle>
                            <CardDescription>Free-form instructions for the AI agent</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="e.g., We are closed on national holidays. For emergencies after hours, direct patients to City Hospital..."
                          value={config.specialNotes || ''}
                          onChange={(e) => updateField('specialNotes', e.target.value)}
                          rows={3}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* AI Preview Panel */}
                <motion.div variants={item} className="lg:col-span-1">
                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden sticky top-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent)]" />
                    <CardHeader className="relative">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-emerald-300">AI Knowledge Preview</CardTitle>
                          <CardDescription className="text-slate-400 text-xs">How your AI uses this data</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                      {/* FAQ counter */}
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-medium text-slate-300">Knowledge Base</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-400">{faqs.length} FAQs</p>
                        <p className="text-[10px] text-slate-500">
                          {faqs.length === 0
                            ? 'Add FAQs so the AI can answer patient questions'
                            : `The AI knows ${faqs.length} FAQ${faqs.length > 1 ? 's' : ''} about your clinic`}
                        </p>
                      </div>

                      {/* Context items */}
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Context</p>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={cn('w-1.5 h-1.5 rounded-full', config.clinicDescription ? 'bg-emerald-400' : 'bg-slate-600')} />
                          <span className="text-slate-300">Clinic Description</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={cn('w-1.5 h-1.5 rounded-full', specializations.length > 0 ? 'bg-emerald-400' : 'bg-slate-600')} />
                          <span className="text-slate-300">{specializations.length} Specializations</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={cn('w-1.5 h-1.5 rounded-full', config.specialNotes ? 'bg-emerald-400' : 'bg-slate-600')} />
                          <span className="text-slate-300">Special Notes</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={cn('w-1.5 h-1.5 rounded-full', services.length > 0 ? 'bg-emerald-400' : 'bg-slate-600')} />
                          <span className="text-slate-300">{services.length} Services</span>
                        </div>
                      </div>

                      {/* Sample conversation preview */}
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Sample Conversation</p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                              <MessageCircle className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              &quot;{faqs.length > 0 ? faqs[0].q : 'What are your charges?'}&quot;
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                              <Bot className="w-2.5 h-2.5 text-emerald-400" />
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {faqs.length > 0 && faqs[0].a
                                ? `"${faqs[0].a.length > 80 ? faqs[0].a.slice(0, 80) + '...' : faqs[0].a}"`
                                : 'Configure FAQs above to see AI responses here.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </TabsContent>

          {/* ─── BEHAVIOR TAB ────────────────────────────── */}
          <TabsContent value="behavior">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">AI Behavior</CardTitle>
                        <CardDescription>Fine-tune how your AI reacts and interacts</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Sentiment Threshold */}
                    <div>
                      <Label className="text-sm font-medium">Sentiment Threshold</Label>
                      <p className="text-xs text-slate-500 mb-2">When to escalate based on caller sentiment</p>
                      <div className="grid grid-cols-2 gap-3 max-w-xs">
                        {(['negative', 'neutral'] as const).map((t) => (
                          <motion.button
                            key={t}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateField('sentimentThreshold', t)}
                            className={cn(
                              'flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer',
                              config.sentimentThreshold === t
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            <div className={cn(
                              'w-3 h-3 rounded-full',
                              t === 'negative' ? 'bg-rose-500' : 'bg-amber-500'
                            )} />
                            <span className={cn(
                              'text-sm font-medium',
                              config.sentimentThreshold === t
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            )}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {config.sentimentThreshold === 'negative'
                          ? 'Escalate only when caller sounds angry or upset'
                          : 'Escalate when caller sounds even slightly dissatisfied'}
                      </p>
                    </div>

                    <Separator />

                    {/* Toggle Grid */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Ask for Feedback</p>
                            <p className="text-xs text-slate-500">Request feedback after call</p>
                          </div>
                        </div>
                        <Switch checked={config.askForFeedback} onCheckedChange={(v) => updateField('askForFeedback', v)} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Collect Patient Info</p>
                            <p className="text-xs text-slate-500">Ask for name/phone before booking</p>
                          </div>
                        </div>
                        <Switch checked={config.collectPatientInfo} onCheckedChange={(v) => updateField('collectPatientInfo', v)} />
                      </div>
                    </div>

                    <Separator />

                    {/* Active / Configured status */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Settings2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Agent Active</p>
                            <p className="text-xs text-slate-500">Enable AI agent for calls</p>
                          </div>
                        </div>
                        <Switch checked={config.isActive} onCheckedChange={(v) => updateField('isActive', v)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ─── DEPLOY TAB ─────────────────────────────── */}
          <TabsContent value="deploy">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {/* Status & Quick Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <motion.div variants={item} className="md:col-span-1">
                  <Card className="glass-card-hover h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Rocket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base gradient-text-emerald">Agent Status</CardTitle>
                          <CardDescription>Current deployment state</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-3">
                      <div className={cn(
                        'w-20 h-20 rounded-full flex items-center justify-center border-4',
                        config.agentStatus === 'active'
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                          : config.agentStatus === 'testing'
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-300 bg-slate-50 dark:bg-slate-900/50'
                      )}>
                        {config.agentStatus === 'active' ? (
                          <Rocket className="w-8 h-8 text-emerald-500" />
                        ) : config.agentStatus === 'testing' ? (
                          <Play className="w-8 h-8 text-amber-500" />
                        ) : (
                          <Settings2 className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <Badge className={cn(
                        'text-sm px-4 py-1.5',
                        config.agentStatus === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : config.agentStatus === 'testing'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      )}>
                        {config.agentStatus === 'active' && '● '}
                        {config.agentStatus.charAt(0).toUpperCase() + config.agentStatus.slice(1)}
                      </Badge>
                      <p className="text-xs text-slate-500 text-center">
                        {config.agentStatus === 'active'
                          ? 'Your agent is live and handling calls'
                          : config.agentStatus === 'testing'
                            ? 'Agent is in testing mode — limited calls'
                            : 'Configure your agent and deploy to go live'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Quick Stats */}
                <motion.div variants={item} className="md:col-span-2">
                  <Card className="glass-card-hover h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base gradient-text-emerald">Quick Stats</CardTitle>
                          <CardDescription>Agent performance overview</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <Phone className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">127</p>
                          <p className="text-xs text-slate-500">Total Calls</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <CalendarPlus className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">84</p>
                          <p className="text-xs text-slate-500">Total Bookings</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">2:15</p>
                          <p className="text-xs text-slate-500">Avg Duration</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Configuration Checklist */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Configuration Checklist</CardTitle>
                        <CardDescription>Verify all settings before deploying</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { label: 'Agent Name configured', done: config.agentName && config.agentName !== 'VoiceAI Assistant', icon: Bot },
                        { label: 'Voice settings configured', done: !!config.voiceGender, icon: Mic },
                        { label: 'Greeting message set', done: !!config.greetingMessage && config.greetingMessage !== DEFAULT_CONFIG.greetingMessage, icon: MessageSquare },
                        { label: 'Booking rules configured', done: config.autoBookSlot, icon: CalendarPlus },
                        { label: 'FAQs loaded', done: faqs.length > 0, icon: Lightbulb },
                        { label: 'Escalation rules set', done: config.escalationEnabled && !!config.escalationNumber, icon: AlertTriangle },
                      ].map((check) => {
                        const Icon = check.icon;
                        return (
                          <motion.div
                            key={check.label}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border transition-all',
                              check.done
                                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                              check.done
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-slate-100 dark:bg-slate-800'
                            )}>
                              {check.done
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                : <Icon className="w-4 h-4 text-slate-400" />}
                            </div>
                            <span className={cn(
                              'text-sm',
                              check.done
                                ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-slate-500'
                            )}>
                              {check.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Deploy / Test Actions */}
              <motion.div variants={item}>
                <Card className="glass-card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base gradient-text-emerald">Deploy &amp; Test</CardTitle>
                        <CardDescription>Take your agent live or test it first</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Deploy / Activate Button */}
                      <AlertDialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
                        <Button
                          size="lg"
                          className={cn(
                            'flex-1 text-white font-semibold py-6 shadow-lg',
                            config.agentStatus === 'active'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
                          )}
                          onClick={() => setDeployDialogOpen(true)}
                          disabled={deploying}
                        >
                          {deploying ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : config.agentStatus === 'active' ? (
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                          ) : (
                            <Rocket className="w-5 h-5 mr-2" />
                          )}
                          {config.agentStatus === 'active'
                            ? 'Agent is Live'
                            : config.agentStatus === 'testing'
                              ? 'Activate for Production'
                              : 'Deploy to Testing'}
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {config.agentStatus === 'testing' ? 'Activate Agent' : 'Deploy Agent'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {config.agentStatus === 'testing'
                                ? 'This will make your AI agent live for all incoming calls. Patients will interact with the AI instead of hearing a busy tone. Are you sure?'
                                : 'This will deploy your agent to testing mode. Only test calls will be routed to the agent. You can activate for production later.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={async () => {
                                setDeploying(true);
                                const nextStatus = config.agentStatus === 'testing' ? 'active' : 'testing';
                                try {
                                  await updateField('agentStatus', nextStatus);
                                  toast.success(
                                    nextStatus === 'active'
                                      ? '🎉 Agent is now LIVE and handling calls!'
                                      : '🚀 Agent deployed to testing mode!',
                                    { duration: 4000 }
                                  );
                                } finally {
                                  setDeploying(false);
                                  setDeployDialogOpen(false);
                                }
                              }}
                            >
                              {config.agentStatus === 'testing' ? 'Yes, Activate' : 'Deploy Now'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Test Agent Button */}
                      <Button
                        variant="outline"
                        size="lg"
                        className="py-6 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                        onClick={() => {
                          setActiveTab('identity');
                          // Scroll to the chat simulator section below
                          setTimeout(() => {
                            const el = document.querySelector('[data-chat-simulator]');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }, 200);
                        }}
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Test Agent
                      </Button>
                    </div>

                    {/* Deployment timeline */}
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">Deployment Flow</p>
                      <div className="flex items-center gap-2">
                        {['draft', 'testing', 'active'].map((status, idx) => {
                          const isActive = config.agentStatus === status;
                          const isPast = ['draft', 'testing', 'active'].indexOf(config.agentStatus) > idx;
                          return (
                            <div key={status} className="flex items-center gap-2 flex-1">
                              <div className="flex flex-col items-center gap-1 flex-1">
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold',
                                  isActive
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : isPast
                                      ? 'border-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-400'
                                )}>
                                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className={cn(
                                  'text-[10px] font-medium',
                                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                )}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                              </div>
                              {idx < 2 && (
                                <div className={cn(
                                  'h-0.5 flex-1 max-w-[60px] -mx-1',
                                  isPast ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700'
                                )} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ─── LIVE TEST SECTION (always visible) ──────────── */}
      <motion.div variants={item} data-chat-simulator>
        <Card className="glass-card-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base gradient-text-emerald">Live Preview &amp; Test</CardTitle>
                <CardDescription>Simulate how your AI agent responds in different scenarios</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((sc) => (
                <Button
                  key={sc.id}
                  variant="outline"
                  size="sm"
                  className={cn(
                    currentScenario === sc.id && 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
                    chatActive && currentScenario !== sc.id && 'opacity-50'
                  )}
                  disabled={chatActive}
                  onClick={() => startScenario(sc.id)}
                >
                  <sc.icon className="w-3.5 h-3.5 mr-1.5" />
                  {sc.label}
                </Button>
              ))}
              {chatActive && (
                <Button variant="outline" size="sm" onClick={() => { setChatActive(false); setChatMessages([]); setCurrentScenario(null); }}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                </Button>
              )}
            </div>

            {/* Chat Simulator */}
            <div className="phone-frame bg-slate-900 p-1">
              <div className="rounded-[20px] bg-slate-800 p-1">
                <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-slate-400">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-1.5 rounded-full bg-emerald-500" />
                    <div className="w-2 h-1.5 rounded-full bg-slate-600" />
                    <div className="w-2 h-1.5 rounded-full bg-slate-600" />
                    <div className="w-4 h-1.5 rounded-full bg-slate-600" />
                  </div>
                </div>
                <div className="min-h-[280px] max-h-[380px] overflow-y-auto">
                  {chatMessages.length === 0 && !chatActive && (
                    <div className="flex flex-col items-center justify-center h-56 text-slate-500">
                      <Bot className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-sm">Select a scenario to test your AI agent</p>
                    </div>
                  )}
                  <div className="space-y-3 p-2">
                    {chatMessages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2.5',
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-slate-700 text-slate-100 rounded-bl-md'
                        )}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {msg.role === 'ai' ? <Bot className="w-3 h-3 text-emerald-400" /> : <MessageCircle className="w-3 h-3 text-slate-400" />}
                            <span className="text-[10px] text-slate-400">{msg.role === 'ai' ? config.agentName : 'Patient'}</span>
                          </div>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </motion.div>
                    ))}
                    {chatActive && (
                      <div className="flex justify-start">
                        <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Free input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a test message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatInput.trim()) {
                    setChatMessages((prev) => [...prev, { role: 'user', text: chatInput }]);
                    setTimeout(() => {
                      setChatMessages((prev) => [...prev, {
                        role: 'ai',
                        text: `Thank you for your message. As ${config.agentName}, I'd be happy to help. Let me assist you with that.`,
                      }]);
                    }, 800);
                    setChatInput('');
                  }
                }}
              />
              <Button variant="outline" onClick={() => {
                if (chatInput.trim()) {
                  setChatMessages((prev) => [...prev, { role: 'user', text: chatInput }]);
                  setTimeout(() => {
                    setChatMessages((prev) => [...prev, {
                      role: 'ai',
                      text: `Thank you for your message. As ${config.agentName}, I'd be happy to help.`,
                    }]);
                  }, 800);
                  setChatInput('');
                }
              }}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Manual Save Button ──────────────────────────── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-end gap-2">
          {hasUnsaved && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              You have unsaved changes (auto-save is active)
            </span>
          )}
          <Button
            onClick={async () => {
              if (!clinicId) return;
              setSaving(true);
              try {
                const payload = {
                  ...config,
                  faqJson: JSON.stringify(faqs),
                  servicesJson: JSON.stringify(services),
                  specializations: JSON.stringify(specializations),
                  escalationKeywords: escKeywords.join(', '),
                };
                const res = await fetch('/api/client/agent-config', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'x-clinic-id': clinicId },
                  body: JSON.stringify(payload),
                });
                if (res.ok) {
                  const data = await res.json();
                  setServerConfig(data.config);
                  setHasUnsaved(false);
                  toast.success('Configuration saved successfully!');
                }
              } catch {
                toast.error('Failed to save');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !hasUnsaved}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <SaveAll className="w-4 h-4 mr-1.5" />}
            Save Configuration
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
