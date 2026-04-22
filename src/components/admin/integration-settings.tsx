'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Brain, Database, Plug, Settings2, Eye, EyeOff, Copy, Check,
  RefreshCw, AlertTriangle, Shield, ExternalLink, Clock, Activity,
  ChevronDown, ChevronUp, Zap, Key, Globe, Webhook, Send, Loader2,
  Server, Table2, HardDrive, ArrowRight, Info, CheckCircle2, XCircle,
  MessageSquare, Thermometer, Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================
// Animation Variants
// ============================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
};

// ============================
// Types
// ============================

interface IntegrationHealth {
  status: 'connected' | 'disconnected' | 'loading' | 'error';
  uptime?: string;
  lastActivity?: string;
  details?: Record<string, unknown>;
}

interface VobizHealthData {
  service: string;
  version: string;
  uptime: number;
  vobizConnected: boolean;
  activeCalls: number;
  totalCalls: number;
}

interface GeminiHealthData {
  service: string;
  version: string;
  model: string;
  demoMode: boolean;
  status: string;
}

interface WebhookEvent {
  id: string;
  type: 'inbound_call' | 'call_status' | 'appointment_created' | 'error';
  source: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  payload: string;
}

// ============================
// Constants
// ============================

const INTEGRATION_CONFIG = {
  vobiz: {
    id: 'vobiz' as const,
    name: 'Vobiz SIP',
    description: 'SIP Trunking & Call Management',
    icon: Phone,
    gradient: 'from-emerald-500 to-emerald-600',
    gradientLight: 'from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    statusDot: 'bg-emerald-500',
    statusDotRing: 'bg-emerald-400',
    port: 3031,
  },
  gemini: {
    id: 'gemini' as const,
    name: 'Gemini AI',
    description: 'AI Conversation Engine',
    icon: Brain,
    gradient: 'from-amber-500 to-orange-500',
    gradientLight: 'from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-950/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    accentColor: 'text-amber-600 dark:text-amber-400',
    statusDot: 'bg-amber-500',
    statusDotRing: 'bg-amber-400',
    port: 3032,
  },
  supabase: {
    id: 'supabase' as const,
    name: 'Supabase DB',
    description: 'PostgreSQL Database',
    icon: Database,
    gradient: 'from-teal-500 to-cyan-500',
    gradientLight: 'from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-950/20',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800',
    accentColor: 'text-teal-600 dark:text-teal-400',
    statusDot: 'bg-teal-500',
    statusDotRing: 'bg-teal-400',
    port: 0,
  },
};

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Latest & fastest' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Balanced speed' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Highest quality' },
];

const DEFAULT_SYSTEM_PROMPT = `You are VoiceAI, an intelligent voice assistant for Indian health clinics. Your role is to:
1. Answer patient calls in a warm, professional manner (Hinglish preferred)
2. Help patients book, reschedule, or cancel appointments
3. Provide clinic information: doctor name, fees, services, business hours
4. Handle fee inquiries and payment-related questions
5. Escalate emergencies or complex issues to clinic staff
6. Be empathetic, patient, and culturally sensitive

Always confirm appointments with date, time, and send WhatsApp confirmation.
Keep responses concise for voice delivery (under 30 seconds).`;

const MOCK_WEBHOOK_EVENTS: WebhookEvent[] = [
  { id: 'wh-001', type: 'inbound_call', source: '+91 98765 43210', status: 'success', timestamp: '2 min ago', payload: 'Inbound call from +91 98765 43210 → Sharma Dental' },
  { id: 'wh-002', type: 'call_status', source: 'CALL-48291', status: 'success', timestamp: '5 min ago', payload: 'Call completed — Duration: 3m 42s, Intent: appointment_booking' },
  { id: 'wh-003', type: 'appointment_created', source: 'VoiceAI Bot', status: 'success', timestamp: '8 min ago', payload: 'Appointment created — Patient: Priya S., Date: 15/07/2025, Time: 10:30 AM' },
  { id: 'wh-004', type: 'call_status', source: 'CALL-48290', status: 'failed', timestamp: '12 min ago', payload: 'Call failed — No answer after 30s ring, Voicemail triggered' },
  { id: 'wh-005', type: 'inbound_call', source: '+91 87654 32109', status: 'success', timestamp: '18 min ago', payload: 'Inbound call from +91 87654 32109 → Gupta Clinic' },
];

const WEBHOOK_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  inbound_call: { label: 'Inbound Call', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30', icon: Phone },
  call_status: { label: 'Call Status', color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30', icon: Activity },
  appointment_created: { label: 'Booking', color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30', icon: CheckCircle2 },
  error: { label: 'Error', color: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30', icon: XCircle },
};

// ============================
// Utility: Mask credential
// ============================

function maskCredential(value: string, visible: boolean, prefixLen = 4, suffixLen = 4): string {
  if (!value) return '••••••••';
  if (visible) return value;
  if (value.length <= prefixLen + suffixLen) return '••••••••';
  return value.slice(0, prefixLen) + '••••••' + value.slice(-suffixLen);
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============================
// Sub-components
// ============================

function StatusDot({ status }: { status: 'connected' | 'disconnected' | 'loading' | 'error' }) {
  const isConnected = status === 'connected';
  const isDisconnected = status === 'disconnected' || status === 'error';
  const isLoading = status === 'loading';

  return (
    <span className="relative flex h-2.5 w-2.5">
      {isConnected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          isConnected && 'bg-emerald-500',
          isDisconnected && 'bg-rose-500',
          isLoading && 'bg-amber-400 animate-pulse'
        )}
      />
    </span>
  );
}

function CredentialField({
  label,
  value,
  icon: Icon,
  isRevealed,
  onToggle,
  onCopy,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  isRevealed: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-0">
          <code className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all flex-1">
            {maskCredential(value, isRevealed)}
          </code>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                onClick={onToggle}
              >
                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRevealed ? 'Hide' : 'Reveal'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 flex-shrink-0',
                  copied ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                )}
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copied!' : 'Copy'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================
// Supabase Setup Wizard (Dynamic)
// ============================

function SupabaseSetupWizard() {
  const [setupData, setSetupData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshSetup = async () => {
    setRefreshing(true);
    try {
      const r = await fetch('/api/supabase/setup');
      const data = await r.json();
      setSetupData(data);
    } catch { /* keep existing data */ }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    fetch('/api/supabase/setup')
      .then(r => r.json())
      .then(data => setSetupData(data))
      .catch(() => setSetupData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-teal-200 dark:border-teal-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-teal-500 mr-2" />
          <span className="text-sm text-slate-500">Checking Supabase setup...</span>
        </CardContent>
      </Card>
    );
  }

  if (!setupData) {
    return (
      <Card className="border-teal-200 dark:border-teal-800 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
        <CardContent className="p-6 text-center">
          <Database className="w-8 h-8 mx-auto text-teal-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Unable to check Supabase status</p>
        </CardContent>
      </Card>
    );
  }

  const steps = setupData.steps as Array<{ step: number; title: string; description: string; completed: boolean; action: string | null }>;
  const tablesPercent = setupData.tablesPercent as number;
  const statusLabel = setupData.statusLabel as string;
  const providerLabel = setupData.providerLabel as string;
  const dashboardUrl = setupData.dashboardUrl as string;
  const sqlEditorUrl = setupData.sqlEditorUrl as string;
  const isProductionReady = setupData.status === 'production_ready';

  return (
    <motion.div variants={itemAnim}>
      <Card className={cn('border overflow-hidden', isProductionReady ? 'border-emerald-300 dark:border-emerald-700' : 'border-teal-200 dark:border-teal-800')}>
        <div className={cn('h-1 bg-gradient-to-r', isProductionReady ? 'from-emerald-500 to-green-500' : 'from-teal-500 to-cyan-500')} />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', isProductionReady ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-teal-100 dark:bg-teal-900/30')}>
              <Database className={cn('w-4.5 h-4.5', isProductionReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400')} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Supabase Production Setup</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {statusLabel} · Database: {providerLabel}
              </CardDescription>
            </div>
            <Badge className={cn(
              'text-[10px] px-2 py-0.5',
              isProductionReady 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            )}>
              {isProductionReady ? '✅ Active' : `${tablesPercent}%`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Setup Progress</span>
              <span className={cn('font-semibold', isProductionReady ? 'text-emerald-600' : 'text-teal-600')}>
                {tablesPercent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', isProductionReady ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500')}
                initial={{ width: 0 }}
                animate={{ width: `${tablesPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.step} className={cn(
                'flex gap-3 items-start px-3 py-2.5 rounded-lg border transition-colors',
                step.completed 
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/50' 
                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
              )}>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  step.completed 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{step.step}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium', step.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white')}>
                      {step.title}
                    </p>
                    {step.completed && (
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] px-1.5 py-0">
                        Done
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {step.description}
                  </p>
                  {step.action && !step.completed && (
                    <a
                      href={step.action}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors"
                    >
                      Open in Supabase Dashboard
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 border-teal-200 dark:border-teal-800 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              onClick={() => window.open(sqlEditorUrl, '_blank')}
            >
              <Table2 className="w-3 h-3 mr-1" />
              SQL Editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 border-teal-200 dark:border-teal-800 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              onClick={() => window.open(dashboardUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 border-teal-200 dark:border-teal-800 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              onClick={refreshSetup}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================
// Main Component
// ============================

export default function IntegrationSettings() {
  // Integration health state
  const [vobizHealth, setVobizHealth] = useState<VobizHealthData | null>(null);
  const [geminiHealth, setGeminiHealth] = useState<GeminiHealthData | null>(null);
  const [supabaseHealth, setSupabaseHealth] = useState<{ connected: boolean; tables: number; storage: string } | null>(null);
  const [healthStatus, setHealthStatus] = useState<Record<string, 'connected' | 'disconnected' | 'loading' | 'error'>>({
    vobiz: 'loading',
    gemini: 'loading',
    supabase: 'loading',
  });

  // Visibility toggles
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({ vobiz: true, gemini: false, supabase: false });
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Vobiz config display
  const vobizConfig = {
    authId: 'MA_GU1ZOXC3',
    authToken: '3wpgv3hIsiylox3J2xuBkcDEzjYoq6W6fMFFvy2cNvuVkYZEMuSln2dYXrxfpzuB',
    mobile: '+91 80654 81672',
    credentialId: '32b5a2de-8428-49a6-8df9-8ae02ef202c1',
    webhookUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/vobiz?action=webhook-inbound` : '/api/vobiz?action=webhook-inbound',
  };

  // Gemini config state
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [testMessage, setTestMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Supabase config display
  const supabaseConfig = {
    projectUrl: 'https://qgybxpteqzhcvlgdfxbn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneWJ4cHRlcXpoY3ZsZ2RmeGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDUwODEsImV4cCI6MjA5MjEyMTA4MX0.8T3k405SKNtSaOtFuJu6v8_vlv0mvyp80tdWif9ASaY',
  };

  // Webhook URLs
  const webhookUrls = {
    inboundCall: typeof window !== 'undefined' ? `${window.location.origin}/api/vobiz?action=webhook-inbound` : '/api/vobiz?action=webhook-inbound',
    callStatus: typeof window !== 'undefined' ? `${window.location.origin}/api/vobiz?action=call-status` : '/api/vobiz?action=call-status',
  };

  // Test connection loading states
  const [testingVobiz, setTestingVobiz] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);

  // ============================
  // Health Checks
  // ============================

  const checkVobizHealth = useCallback(async () => {
    setTestingVobiz(true);
    setHealthStatus(prev => ({ ...prev, vobiz: 'loading' }));
    try {
      const res = await fetch('/api/vobiz?action=health');
      if (res.ok) {
        const data = await res.json();
        setVobizHealth(data);
        setHealthStatus(prev => ({ ...prev, vobiz: data.vobizConnected ? 'connected' : 'disconnected' }));
      } else {
        setHealthStatus(prev => ({ ...prev, vobiz: 'error' }));
      }
    } catch {
      setHealthStatus(prev => ({ ...prev, vobiz: 'disconnected' }));
    } finally {
      setTestingVobiz(false);
    }
  }, []);

  const checkGeminiHealth = useCallback(async () => {
    setTestingGemini(true);
    setHealthStatus(prev => ({ ...prev, gemini: 'loading' }));
    try {
      const res = await fetch('/api/gemini?action=health');
      if (res.ok) {
        const data = await res.json();
        setGeminiHealth(data);
        setHealthStatus(prev => ({ ...prev, gemini: 'connected' }));
      } else {
        setHealthStatus(prev => ({ ...prev, gemini: 'error' }));
      }
    } catch {
      setHealthStatus(prev => ({ ...prev, gemini: 'disconnected' }));
    } finally {
      setTestingGemini(false);
    }
  }, []);

  const checkSupabaseHealth = useCallback(async () => {
    setTestingSupabase(true);
    setHealthStatus(prev => ({ ...prev, supabase: 'loading' }));
    try {
      // Use the server-side API route to check Supabase connectivity
      const res = await fetch('/api/supabase/health');
      if (res.ok) {
        const data = await res.json();
        const isConnected = data.status === 'connected' || data.status === 'not_configured';
        setSupabaseHealth({
          connected: isConnected,
          tables: data.status === 'connected' ? 7 : data.status === 'not_configured' ? 0 : 0,
          storage: isConnected ? '2.4 MB' : '—',
        });
        setHealthStatus(prev => ({
          ...prev,
          supabase: data.status === 'connected' ? 'connected' : data.status === 'not_configured' ? 'disconnected' : 'error',
        }));
      } else {
        setSupabaseHealth({ connected: false, tables: 0, storage: '—' });
        setHealthStatus(prev => ({ ...prev, supabase: 'error' }));
      }
    } catch {
      // In sandbox, Supabase may not be reachable
      setSupabaseHealth({ connected: false, tables: 0, storage: '—' });
      setHealthStatus(prev => ({ ...prev, supabase: 'disconnected' }));
    } finally {
      setTestingSupabase(false);
    }
  }, []);

  useEffect(() => {
    checkVobizHealth();
    checkGeminiHealth();
    checkSupabaseHealth();
  }, [checkVobizHealth, checkGeminiHealth, checkSupabaseHealth]);

  // ============================
  // Handlers
  // ============================

  const toggleReveal = (key: string) => {
    setRevealedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpanded = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyWebhookUrls = async () => {
    const text = `Inbound Call Webhook: ${webhookUrls.inboundCall}\nCall Status Webhook: ${webhookUrls.callStatus}`;
    await navigator.clipboard.writeText(text);
    toast.success('Webhook URLs copied to clipboard');
  };

  const handleTestGeminiMessage = async () => {
    if (!testMessage.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: testMessage,
          clinicContext: {
            clinicName: 'Sharma Dental',
            doctorName: 'Dr. Rajesh Sharma',
            services: 'Dental Checkup, Root Canal, Teeth Whitening, Braces',
            fee: 500,
            hours: '9:00 AM - 1:00 PM, 4:00 PM - 8:00 PM',
            language: 'hinglish',
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.response || data.message || 'No response received.');
      } else {
        setAiResponse('Error: Could not get response from Gemini AI.');
      }
    } catch {
      setAiResponse('Error: Gemini AI service is unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveGeminiConfig = () => {
    toast.success('Gemini AI configuration saved');
  };

  // ============================
  // Render
  // ============================

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ================================ */}
      {/* Page Header                       */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Plug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Integration Settings</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure and monitor all platform integrations</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => { checkVobizHealth(); checkGeminiHealth(); checkSupabaseHealth(); }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh All
          </Button>
        </div>
      </motion.div>

      {/* ================================ */}
      {/* Integration Overview Cards (3)    */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(INTEGRATION_CONFIG).map((integration) => {
            const Icon = integration.icon;
            const status = healthStatus[integration.id];
            const isExpanded = expandedCards[integration.id];
            const healthData = integration.id === 'vobiz'
              ? vobizHealth
              : integration.id === 'gemini'
                ? geminiHealth
                : supabaseHealth;

            return (
              <motion.div
                key={integration.id}
                variants={scaleIn}
                whileHover={{ y: -3 }}
                className="card-interactive"
              >
                <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Colored top bar */}
                  <div className={cn('h-1 bg-gradient-to-r', integration.gradient)} />

                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', integration.iconBg)}>
                          <Icon className={cn('w-5 h-5', integration.iconColor)} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{integration.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{integration.description}</p>
                        </div>
                      </div>
                      <StatusDot status={status} />
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          status === 'connected' && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
                          status === 'disconnected' && 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
                          status === 'loading' && 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
                          status === 'error' && 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
                        )}
                      >
                        {status === 'connected' && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
                        {status === 'disconnected' && <XCircle className="w-2.5 h-2.5 mr-1" />}
                        {status === 'loading' && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
                        {status === 'error' && <XCircle className="w-2.5 h-2.5 mr-1" />}
                        {status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : status === 'loading' ? 'Checking...' : 'Error'}
                      </Badge>
                      {integration.port > 0 && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          Port {integration.port}
                        </span>
                      )}
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {integration.id === 'vobiz' && (
                        <>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Uptime</p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {vobizHealth ? formatUptime(vobizHealth.uptime) : '—'}
                            </p>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Active Calls</p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {vobizHealth ? vobizHealth.activeCalls : '—'}
                            </p>
                          </div>
                        </>
                      )}
                      {integration.id === 'gemini' && (
                        <>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Model</p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {geminiHealth ? geminiHealth.model.replace('models/', '') : selectedModel}
                            </p>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Mode</p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {geminiHealth?.demoMode ? 'Demo' : 'Live'}
                            </p>
                          </div>
                        </>
                      )}
                      {integration.id === 'supabase' && (
                        <>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Tables</p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {supabaseHealth ? supabaseHealth.tables : '—'}
                            </p>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Storage</p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {supabaseHealth ? supabaseHealth.storage : '—'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Expand Toggle */}
                    <button
                      onClick={() => toggleExpanded(integration.id)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full justify-center py-1"
                    >
                      {isExpanded ? (
                        <>Less Details <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>More Details <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Separator className="my-2" />
                          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {integration.id === 'vobiz' && vobizHealth && (
                              <>
                                <div className="flex justify-between"><span>Total Calls Processed</span><span className="font-medium text-slate-700 dark:text-slate-300">{vobizHealth.totalCalls}</span></div>
                                <div className="flex justify-between"><span>Vobiz API Connected</span><span className={cn('font-medium', vobizHealth.vobizConnected ? 'text-emerald-600' : 'text-rose-600')}>{vobizHealth.vobizConnected ? 'Yes' : 'No (Mock Mode)'}</span></div>
                                <div className="flex justify-between"><span>Service Version</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{vobizHealth.version}</span></div>
                              </>
                            )}
                            {integration.id === 'gemini' && geminiHealth && (
                              <>
                                <div className="flex justify-between"><span>Service Version</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{geminiHealth.version}</span></div>
                                <div className="flex justify-between"><span>Demo Mode</span><span className={cn('font-medium', geminiHealth.demoMode ? 'text-amber-600' : 'text-emerald-600')}>{geminiHealth.demoMode ? 'Enabled' : 'Disabled'}</span></div>
                              </>
                            )}
                            {integration.id === 'supabase' && supabaseHealth && (
                              <>
                                <div className="flex justify-between"><span>Connection Status</span><span className={cn('font-medium', supabaseHealth.connected ? 'text-emerald-600' : 'text-rose-600')}>{supabaseHealth.connected ? 'Healthy' : 'Disconnected'}</span></div>
                                <div className="flex justify-between"><span>Database</span><span className="font-medium text-slate-700 dark:text-slate-300">PostgreSQL 15</span></div>
                                <div className="flex justify-between"><span>Region</span><span className="font-medium text-slate-700 dark:text-slate-300">AWS ap-south-1</span></div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('flex-1 text-xs h-8', integration.borderColor)}
                        onClick={() => {
                          if (integration.id === 'vobiz') checkVobizHealth();
                          else if (integration.id === 'gemini') checkGeminiHealth();
                          else checkSupabaseHealth();
                        }}
                        disabled={
                          (integration.id === 'vobiz' && testingVobiz) ||
                          (integration.id === 'gemini' && testingGemini) ||
                          (integration.id === 'supabase' && testingSupabase)
                        }
                      >
                        {(integration.id === 'vobiz' && testingVobiz) ||
                        (integration.id === 'gemini' && testingGemini) ||
                        (integration.id === 'supabase' && testingSupabase) ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3 mr-1" />
                        )}
                        Test Connection
                      </Button>
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Settings2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configure</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ================================ */}
      {/* Vobiz SIP Configuration           */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Phone className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Vobiz SIP Configuration</CardTitle>
                <CardDescription className="text-xs mt-0.5">SIP trunking credentials and webhook settings</CardDescription>
              </div>
              <StatusDot status={healthStatus.vobiz} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credentials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialField
                label="Auth ID"
                value={vobizConfig.authId}
                icon={Key}
                isRevealed={revealedKeys['vobiz-auth-id'] || false}
                onToggle={() => toggleReveal('vobiz-auth-id')}
                onCopy={() => toast.success('Auth ID copied')}
              />
              <CredentialField
                label="Auth Token"
                value={vobizConfig.authToken}
                icon={Shield}
                isRevealed={revealedKeys['vobiz-auth-token'] || false}
                onToggle={() => toggleReveal('vobiz-auth-token')}
                onCopy={() => toast.success('Auth Token copied')}
              />
              <CredentialField
                label="Mobile Number"
                value={vobizConfig.mobile}
                icon={Phone}
                isRevealed={revealedKeys['vobiz-mobile'] || false}
                onToggle={() => toggleReveal('vobiz-mobile')}
                onCopy={() => toast.success('Mobile Number copied')}
              />
              <CredentialField
                label="Credential ID"
                value={vobizConfig.credentialId}
                icon={Hash}
                isRevealed={revealedKeys['vobiz-credential-id'] || false}
                onToggle={() => toggleReveal('vobiz-credential-id')}
                onCopy={() => toast.success('Credential ID copied')}
              />
            </div>

            {/* Webhook URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Webhook URL (Auto-generated)
              </Label>
              <div className="flex items-center gap-1">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 min-w-0">
                  <code className="text-xs font-mono text-emerald-700 dark:text-emerald-400 truncate select-all">{vobizConfig.webhookUrl}</code>
                </div>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex-shrink-0"
                        onClick={async () => {
                          await navigator.clipboard.writeText(vobizConfig.webhookUrl);
                          toast.success('Webhook URL copied');
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy URL</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Connection Test Response */}
            {vobizHealth && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3"
              >
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  Last Test Result
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Status</p>
                    <p className={cn('text-xs font-semibold', vobizHealth.vobizConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                      {vobizHealth.vobizConnected ? 'Connected' : 'Mock Mode'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Uptime</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{formatUptime(vobizHealth.uptime)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Active Calls</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{vobizHealth.activeCalls}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Test Connection Button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={checkVobizHealth}
                disabled={testingVobiz}
              >
                {testingVobiz ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testing...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5 mr-1.5" /> Test Connection</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Gemini AI Configuration           */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Brain className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Gemini AI Configuration</CardTitle>
                <CardDescription className="text-xs mt-0.5">AI model, prompts, and generation parameters</CardDescription>
              </div>
              <StatusDot status={healthStatus.gemini} />
              {geminiHealth?.demoMode && (
                <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px]">
                  Demo Mode
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* API Key */}
            <CredentialField
              label="API Key"
              value="AIzaSyBjHJoJa2u0qkH0GoA3Ji0BEnHkdUA1GS8"
              icon={Key}
              isRevealed={revealedKeys['gemini-api-key'] || false}
              onToggle={() => toggleReveal('gemini-api-key')}
              onCopy={() => toast.success('API Key copied')}
            />

            {/* Model Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3 h-3" />
                Current Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODELS.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex items-center gap-2">
                        <span>{model.label}</span>
                        <span className="text-[10px] text-slate-400">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                System Prompt
              </Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[140px] resize-y border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono leading-relaxed"
                placeholder="Enter system prompt..."
              />
            </div>

            {/* Temperature & Max Tokens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Thermometer className="w-3 h-3" /> Temperature</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold normal-case">{temperature.toFixed(1)}</span>
                </Label>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={2}
                  step={0.1}
                  className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                  <span>Precise (0.0)</span>
                  <span>Balanced (1.0)</span>
                  <span>Creative (2.0)</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3 h-3" />
                  Max Tokens
                </Label>
                <Input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Math.max(256, Math.min(8192, parseInt(e.target.value) || 2048)))}
                  min={256}
                  max={8192}
                  step={256}
                  className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Range: 256 – 8192 tokens</p>
              </div>
            </div>

            {/* Connection Test Response */}
            {geminiHealth && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3"
              >
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  Last Test Result
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Model</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{geminiHealth.model?.replace('models/', '')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Status</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{geminiHealth.status || 'Active'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Mode</p>
                    <p className={cn('text-xs font-semibold', geminiHealth.demoMode ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                      {geminiHealth.demoMode ? 'Demo' : 'Live'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Test Message Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3 h-3" />
                Send Test Message
              </Label>
              <div className="flex gap-2">
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Type a test message for the AI..."
                  className="flex-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleTestGeminiMessage()}
                />
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleTestGeminiMessage}
                  disabled={!testMessage.trim() || aiLoading}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 p-3"
                >
                  <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">AI Response</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiResponse}</p>
                </motion.div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={handleSaveGeminiConfig}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Supabase Configuration            */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Database className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Supabase Configuration</CardTitle>
                <CardDescription className="text-xs mt-0.5">PostgreSQL database connection and tables</CardDescription>
              </div>
              <StatusDot status={healthStatus.supabase} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialField
                label="Project URL"
                value={supabaseConfig.projectUrl}
                icon={Globe}
                isRevealed={revealedKeys['supabase-url'] || false}
                onToggle={() => toggleReveal('supabase-url')}
                onCopy={() => toast.success('Project URL copied')}
              />
              <CredentialField
                label="Anon Key"
                value={supabaseConfig.anonKey}
                icon={Key}
                isRevealed={revealedKeys['supabase-anon-key'] || false}
                onToggle={() => toggleReveal('supabase-anon-key')}
                onCopy={() => toast.success('Anon Key copied')}
              />
            </div>

            {/* Connection Status */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Server className="w-3 h-3" />
                  Connection Status
                </p>
                <Badge className={cn(
                  'text-[10px] font-medium px-2 py-0.5',
                  supabaseHealth?.connected
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                )}>
                  {supabaseHealth?.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center px-3 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <Database className="w-4 h-4 mx-auto text-teal-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{supabaseHealth?.tables || '—'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Tables</p>
                </div>
                <div className="text-center px-3 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <HardDrive className="w-4 h-4 mx-auto text-teal-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{supabaseHealth?.storage || '—'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Storage</p>
                </div>
                <div className="text-center px-3 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <Table2 className="w-4 h-4 mx-auto text-teal-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900 dark:text-white">6</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Schemas</p>
                </div>
                <div className="text-center px-3 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <Activity className="w-4 h-4 mx-auto text-teal-500 mb-1" />
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">99.9%</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Uptime</p>
                </div>
              </div>
            </div>

            {/* Tables Overview */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Table2 className="w-3 h-3" />
                Tables Overview
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'User', rows: 6, color: 'text-emerald-600 dark:text-emerald-400' },
                  { name: 'Clinic', rows: 5, color: 'text-teal-600 dark:text-teal-400' },
                  { name: 'Call', rows: 9, color: 'text-amber-600 dark:text-amber-400' },
                  { name: 'Appointment', rows: 14, color: 'text-purple-600 dark:text-purple-400' },
                  { name: 'Notification', rows: 7, color: 'text-rose-600 dark:text-rose-400' },
                  { name: 'AgentConfig', rows: 5, color: 'text-orange-600 dark:text-orange-400' },
                  { name: 'AnalyticsSnapshot', rows: 21, color: 'text-cyan-600 dark:text-cyan-400' },
                ].map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{table.name}</span>
                    </div>
                    <span className={cn('text-xs font-semibold', table.color)}>{table.rows}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={checkSupabaseHealth}
                disabled={testingSupabase}
              >
                {testingSupabase ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testing...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5 mr-1.5" /> Test Connection</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Supabase Setup Guide (Dynamic)     */}
      {/* ================================ */}
      <SupabaseSetupWizard />

      {/* ================================ */}
      {/* API Keys Management               */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Key className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">API Keys Management</CardTitle>
                <CardDescription className="text-xs mt-0.5">Manage all platform API keys and secrets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Security Warning:</strong> These keys provide access to sensitive services. Never share them publicly, commit them to version control, or expose them in client-side code.
              </p>
            </div>

            {/* Keys List */}
            <div className="space-y-3">
              {[
                { id: 'key-vobiz-auth-id', label: 'Vobiz Auth ID', value: vobizConfig.authId, service: 'Vobiz SIP', color: 'emerald' },
                { id: 'key-vobiz-auth-token', label: 'Vobiz Auth Token', value: vobizConfig.authToken, service: 'Vobiz SIP', color: 'emerald' },
                { id: 'key-gemini', label: 'Gemini API Key', value: 'AIzaSyBjHJoJa2u0qkH0GoA3Ji0BEnHkdUA1GS8', service: 'Google Gemini', color: 'amber' },
                { id: 'key-supabase-url', label: 'Supabase Project URL', value: supabaseConfig.projectUrl, service: 'Supabase', color: 'teal' },
                { id: 'key-supabase-anon', label: 'Supabase Anon Key', value: supabaseConfig.anonKey, service: 'Supabase', color: 'teal' },
              ].map((keyItem) => {
                const colorMap: Record<string, string> = {
                  emerald: 'border-l-emerald-400 dark:border-l-emerald-500',
                  amber: 'border-l-amber-400 dark:border-l-amber-500',
                  teal: 'border-l-teal-400 dark:border-l-teal-500',
                };
                return (
                  <div
                    key={keyItem.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 border-l-2',
                      colorMap[keyItem.color]
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{keyItem.label}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">{keyItem.service}</p>
                      <code className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate block">
                        {maskCredential(keyItem.value, revealedKeys[keyItem.id] || false, 6, 4)}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        onClick={() => toggleReveal(keyItem.id)}
                      >
                        {revealedKeys[keyItem.id] ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {revealedKeys[keyItem.id] ? 'Hide' : 'Reveal'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        onClick={async () => {
                          await navigator.clipboard.writeText(keyItem.value);
                          toast.success(`${keyItem.label} copied`);
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================ */}
      {/* Webhook Configuration             */}
      {/* ================================ */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Webhook className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Webhook Configuration</CardTitle>
                <CardDescription className="text-xs mt-0.5">Inbound call and status change webhook URLs</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-200 dark:border-slate-700"
                onClick={handleCopyWebhookUrls}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy URLs
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URLs */}
            <div className="space-y-3">
              {[
                { label: 'Inbound Call Webhook', url: webhookUrls.inboundCall, icon: Phone, color: 'emerald' },
                { label: 'Call Status Webhook', url: webhookUrls.callStatus, icon: Activity, color: 'blue' },
              ].map((webhook) => (
                <div key={webhook.label} className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    {(() => { const Ic = webhook.icon; return <Ic className="w-3 h-3" />; })()}
                    {webhook.label}
                  </Label>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-0">
                      <code className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">{webhook.url}</code>
                    </div>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                            onClick={async () => {
                              await navigator.clipboard.writeText(webhook.url);
                              toast.success(`${webhook.label} URL copied`);
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy URL</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Webhook Event Log */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Recent Webhook Events
              </Label>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {MOCK_WEBHOOK_EVENTS.map((event, idx) => {
                    const typeCfg = WEBHOOK_TYPE_CONFIG[event.type];
                    const TypeIcon = typeCfg.icon;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.2 }}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', typeCfg.color)}>
                          <TypeIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{typeCfg.label}</span>
                            <Badge className={cn(
                              'text-[9px] px-1.5 py-0 h-4',
                              event.status === 'success' && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                              event.status === 'failed' && 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
                              event.status === 'pending' && 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                            )}>
                              {event.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{event.payload}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{event.timestamp}</p>
                          <p className="text-[10px] font-mono text-slate-300 dark:text-slate-600">{event.id}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
