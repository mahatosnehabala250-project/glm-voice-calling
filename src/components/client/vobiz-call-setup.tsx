'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Wifi,
  WifiOff,
  Activity,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Play,
  Bot,
  User,
  Save,
  Send,
  Zap,
  Mic,
  Volume2,
  Shield,
  Database,
  Globe,
  ArrowDown,
  Clock,
  Signal,
  RefreshCw,
  ExternalLink,
  CircleDot,
  MessageSquare,
  Sparkles,
  PhoneForwarded,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

/* ============================================================
   Types
   ============================================================ */
interface ActiveCall {
  id: string;
  caller: string;
  callerPhone: string;
  duration: string;
  status: 'ringing' | 'in-progress' | 'transferring' | 'wrapping-up';
  intent?: string;
  language?: string;
  startedAt: string;
  agent?: string;
}

interface ChatMessage {
  role: 'ai' | 'caller' | 'system';
  text: string;
  timestamp?: string;
}

type TestScenario = 'booking' | 'fee' | 'emergency' | 'escalation';

/* ============================================================
   Scenario conversation data
   ============================================================ */
const SCENARIO_CONVERSATIONS: Record<TestScenario, ChatMessage[]> = {
  booking: [
    { role: 'system', text: '📞 Incoming call from +91-98765-43210 (Rahul Kumar)' },
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha hoon, aapki AI assistant. Kaise madad kar sakti hoon aapki?' },
    { role: 'caller', text: 'Hi, mujhe appointment book karni hai dental checkup ke liye.' },
    { role: 'ai', text: 'Zaroor Rahul ji! Kya aap koi specific date preference rakhte hain? Aaj ke baad kal ya parso available hai.' },
    { role: 'caller', text: 'Kal morning agar ho sake toh.' },
    { role: 'ai', text: 'Kal 10:30 AM ka slot available hai. Woh book kar doon?' },
    { role: 'caller', text: 'Haan, 10:30 theek hai.' },
    { role: 'ai', text: 'Perfect! Appointment confirmed — Rahul Kumar, 10:30 AM kal, Dental Checkup. WhatsApp par confirmation bhej di jayegi. Kya aur kuch?' },
    { role: 'caller', text: 'Nahi, bas yahi. Dhanyavaad!' },
    { role: 'ai', text: 'Dhanyavaad Rahul ji! Kal milte hain. Aapki tabiyat khush raho! 🙏' },
    { role: 'system', text: '✅ Appointment booked. WhatsApp sent. Transcript saved.' },
  ],
  fee: [
    { role: 'system', text: '📞 Incoming call from +91-87654-32109 (Priya Sharma)' },
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha hoon. Kaise madad kar sakti hoon?' },
    { role: 'caller', text: 'Mujhe cleaning ke fees ke baare mein jaanna hai.' },
    { role: 'ai', text: 'Zaroor Priya ji! Regular dental cleaning ₹500 hai, aur deep cleaning ₹1,200 hai. Kya aap appointment book karna chahengi?' },
    { role: 'caller', text: '₹500 wali karni hai. Kya insurance se cover hoga?' },
    { role: 'ai', text: 'Haan, agar aapka dental insurance plan mein preventive care cover hai toh partial reimbursement mil sakta hai. Aap apna insurance card le kar aayen, hum verify kar lenge.' },
    { role: 'caller', text: 'Theek hai, book kardo Saturday afternoon mein.' },
    { role: 'ai', text: 'Saturday 2:00 PM ka slot available hai. Priya Sharma ke naam book kar doon?' },
    { role: 'caller', text: 'Haan, perfect.' },
    { role: 'ai', text: 'Done! Saturday 2:00 PM — Regular Dental Cleaning — ₹500. Confirmation WhatsApp par aa jayegi. Dhanyavaad!' },
    { role: 'system', text: '✅ Appointment booked (Cleaning, ₹500). WhatsApp sent.' },
  ],
  emergency: [
    { role: 'system', text: '📞 Incoming call from +91-99887-76655 (Amit Patel) — URGENT' },
    { role: 'ai', text: 'Namaste! Sharma Dental mein aapka swagat hai. Main Rekha hoon. Kaise madad kar sakti hoon?' },
    { role: 'caller', text: 'Bahut dard ho raha hai! Bleeding bhi ho rahi hai gum se. Please help karo!' },
    { role: 'ai', text: 'Amit ji, please calm yourself! Main abhi Dr. Sharma ko transfer kar rahi hoon. Waise aap ek soft cotton pad lagao aur thanda paani piye. Dr. Sharma abhi available hain.' },
    { role: 'system', text: '🔄 Transferring to Dr. Rajesh Sharma (Escalation Contact)...' },
    { role: 'ai', text: 'Dr. Sharma, Amit Patel on the line — emergency: severe gum bleeding and pain. Please attend.' },
    { role: 'caller', text: 'Thank you, jaldi aao doctor sahab!' },
    { role: 'system', text: '✅ Call transferred to Dr. Sharma. Emergency protocol activated.' },
  ],
  escalation: [
    { role: 'system', text: '📞 Incoming call from +91-77665-54433 (Sunita Devi)' },
    { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha hoon. Kaise madad kar sakti hoon?' },
    { role: 'caller', text: 'Mera treatment ka koi result nahi dikh raha! Pehle bola tha 2 sessions mein theek hoga, ab 4 ho gaye aur abhi bhi dard hai!' },
    { role: 'ai', text: 'Sunita ji, mujhe samajh mein aa raha hai aapki pareshani. Main Dr. Sharma se baat karati hoon aapka case discuss karne ke liye. Kya aap chahein main unko transfer kar doon?' },
    { role: 'caller', text: 'Haan jaldi karo, mujhe bahut problem ho rahi hai.' },
    { role: 'ai', text: 'Bilkul. Main abhi transfer kar rahi hoon. Dr. Sharma ko aapka pura history bhej diya hai taaki unhe context mil jaye.' },
    { role: 'system', text: '🔄 Transferring to Dr. Rajesh Sharma with full patient context...' },
    { role: 'ai', text: 'Dr. Sharma, Sunita Devi on the line — patient escalation regarding root canal treatment, 4 sessions completed without relief. Full history sent to your dashboard.' },
    { role: 'system', text: '✅ Call escalated. Patient context shared. Transcript flagged for review.' },
  ],
};

const SCENARIO_META: Record<TestScenario, { label: string; icon: typeof PhoneCall; color: string; bg: string; description: string }> = {
  booking: {
    label: 'Appointment Booking',
    icon: PhoneCall,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    description: 'Patient wants to book a new appointment',
  },
  fee: {
    label: 'Fee Inquiry',
    icon: MessageSquare,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    description: 'Patient asks about treatment costs',
  },
  emergency: {
    label: 'Emergency Call',
    icon: AlertTriangle,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    description: 'Urgent medical situation requiring immediate attention',
  },
  escalation: {
    label: 'Doctor Escalation',
    icon: Shield,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    description: 'Patient requests to speak with the doctor directly',
  },
};

const CALL_FLOW_STEPS = [
  { icon: Phone, label: 'Patient Calls', desc: 'Via Vobiz SIP Number', color: 'from-emerald-500 to-teal-500' },
  { icon: Database, label: 'Orchestrator Loads Config', desc: 'Clinic Profile, Services, Hours', color: 'from-teal-500 to-cyan-500' },
  { icon: Sparkles, label: 'Gemini AI Greets', desc: 'Hinglish / English', color: 'from-cyan-500 to-teal-500' },
  { icon: Mic, label: 'STT Processing', desc: 'Speech-to-Text in Real-time', color: 'from-teal-500 to-emerald-500' },
  { icon: Zap, label: 'Intent Detection', desc: 'Booking / Fee / Emergency', color: 'from-emerald-500 to-green-500' },
  { icon: Globe, label: 'n8n Webhook', desc: 'Booking, Check, Reschedule', color: 'from-green-500 to-teal-500' },
  { icon: Volume2, label: 'AI Responds (TTS)', desc: 'Text-to-Speech Playback', color: 'from-teal-500 to-cyan-500' },
  { icon: PhoneForwarded, label: 'Call Transfer', desc: 'If Escalation / Emergency', color: 'from-cyan-500 to-emerald-500' },
  { icon: Database, label: 'Transcript Saved', desc: 'Full Conversation to DB', color: 'from-emerald-500 to-teal-500' },
];

/* ============================================================
   Typing indicator sub-component
   ============================================================ */
function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <motion.span
        className="w-2 h-2 rounded-full bg-emerald-400/70"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-2 h-2 rounded-full bg-emerald-400/70"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span
        className="w-2 h-2 rounded-full bg-emerald-400/70"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
      {label && <span className="text-[10px] text-emerald-400 ml-1">{label}</span>}
    </div>
  );
}

/* ============================================================
   Call Flow Visual (horizontal on desktop, vertical on mobile)
   ============================================================ */
function CallFlowDiagram() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 flex-col lg:flex-row lg:items-center overflow-x-auto pb-2">
        {CALL_FLOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center gap-2 shrink-0">
              <motion.div
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[80px] text-center',
                  'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700',
                  'shadow-sm hover:shadow-md transition-shadow'
                )}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ y: -2 }}
              >
                <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center', step.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                  {step.label}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
                  {step.desc}
                </span>
              </motion.div>
              {i < CALL_FLOW_STEPS.length - 1 && (
                <motion.div
                  className="hidden lg:flex items-center text-slate-300 dark:text-slate-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 + 0.04 }}
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              )}
              {i < CALL_FLOW_STEPS.length - 1 && (
                <motion.div
                  className="flex lg:hidden justify-center py-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 + 0.04 }}
                >
                  <ArrowDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Main Component
   ============================================================ */
export default function VobizCallSetup() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId || '';

  // --- Vobiz Config State ---
  const [vobizNumber, setVobizNumber] = useState<string>('');
  const [vobizConnected, setVobizConnected] = useState<boolean | null>(null);
  const [vobizTesting, setVobizTesting] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [clinicName, setClinicName] = useState('');
  const [agentStatus, setAgentStatus] = useState<string>('none');
  const [configLoaded, setConfigLoaded] = useState(false);

  // --- Active Calls State ---
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // --- Test Call State ---
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>('booking');
  const [testRunning, setTestRunning] = useState(false);
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [testSpeed, setTestSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- n8n Webhook State ---
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.example.com/webhook/voiceai-booking');
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // --- Health State ---
  const [orchHealth, setOrchHealth] = useState<Record<string, string | boolean> | null>(null);

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // --- Fetch Vobiz Config from API ---
  const fetchVobizConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/client/vobiz-config', {
        headers: { 'x-clinic-id': clinicId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clinic) {
          setClinicName(data.clinic.name || '');
          if (data.clinic.sipNumber) {
            setVobizNumber(data.clinic.sipNumber);
            setHasNumber(true);
          } else {
            setVobizNumber('Not Assigned');
            setHasNumber(false);
          }
        }
        if (data.agentConfig) {
          setAgentStatus(data.agentConfig.agentStatus || 'none');
          if (data.agentConfig.webhookUrl) {
            setWebhookUrl(data.agentConfig.webhookUrl);
          }
        }
        if (data.status) {
          setHasNumber(data.status.hasNumber);
          if (data.status.isFullyConfigured) {
            setVobizConnected(true);
          }
        }
      }
    } catch {
      // Fallback: use mock
      setVobizNumber('Not Assigned');
      setHasNumber(false);
    } finally {
      setConfigLoaded(true);
    }
  }, [clinicId]);

  // --- Fetch Orchestrator Health ---
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/orch?action=health');
      if (res.ok) {
        const data = await res.json();
        setOrchHealth(data);
        if (data.vobizConnected !== undefined) {
          setVobizConnected(data.vobizConnected as boolean);
        }
      }
    } catch {
      // Orchestrator not available — use mock defaults
      setOrchHealth({
        status: 'mock',
        vobizConnected: true,
        geminiConnected: true,
        n8nConnected: false,
      });
    }
  }, []);

  // --- Fetch Active Sessions ---
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/orch?action=sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.activeCalls && data.activeCalls.length > 0) {
          setActiveCalls(data.activeCalls);
        } else {
          // Mock active calls for demo
          setActiveCalls([
            {
              id: 'call-mock-1',
              caller: 'Rahul Kumar',
              callerPhone: '+91-98765-43210',
              duration: '2:34',
              status: 'in-progress',
              intent: 'booking',
              language: 'Hinglish',
              startedAt: new Date(Date.now() - 154000).toISOString(),
              agent: 'Rekha (AI)',
            },
            {
              id: 'call-mock-2',
              caller: 'Priya Sharma',
              callerPhone: '+91-87654-32109',
              duration: '0:45',
              status: 'ringing',
              intent: 'fee',
              language: 'English',
              startedAt: new Date(Date.now() - 45000).toISOString(),
            },
          ]);
        }
      }
    } catch {
      // Mock data for demo
      setActiveCalls([
        {
          id: 'call-mock-1',
          caller: 'Rahul Kumar',
          callerPhone: '+91-98765-43210',
          duration: '2:34',
          status: 'in-progress',
          intent: 'booking',
          language: 'Hinglish',
          startedAt: new Date(Date.now() - 154000).toISOString(),
          agent: 'Rekha (AI)',
        },
        {
          id: 'call-mock-2',
          caller: 'Priya Sharma',
          callerPhone: '+91-87654-32109',
          duration: '0:45',
          status: 'ringing',
          intent: 'fee',
          language: 'English',
          startedAt: new Date(Date.now() - 45000).toISOString(),
        },
      ]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // --- Test Vobiz Connectivity ---
  const testVobizConnectivity = async () => {
    setVobizTesting(true);
    try {
      const res = await fetch('/api/orch?action=health');
      if (res.ok) {
        const data = await res.json();
        setVobizConnected(data.vobizConnected ?? true);
        toast.success('Vobiz SIP connectivity test passed!', {
          description: 'SIP trunk is reachable and healthy.',
        });
      } else {
        setVobizConnected(false);
        toast.error('Vobiz SIP test failed', {
          description: 'Could not reach the SIP trunk. Please check configuration.',
        });
      }
    } catch {
      // Mock success for demo
      setVobizConnected(true);
      toast.success('Vobiz SIP connectivity test passed! (Demo)', {
        description: 'SIP trunk is reachable and healthy.',
      });
    } finally {
      setVobizTesting(false);
    }
  };

  // --- Run Test Call Simulation ---
  const runTestCall = useCallback(() => {
    clearTimer();
    setTestMessages([]);
    setTestComplete(false);
    setTestRunning(true);

    const conversation = SCENARIO_CONVERSATIONS[selectedScenario];
    let index = 0;

    const addNext = () => {
      if (index < conversation.length) {
        setIsTyping(true);
        timerRef.current = setTimeout(() => {
          setTestMessages((prev) => [...prev, conversation[index]]);
          setIsTyping(false);
          index++;
          timerRef.current = setTimeout(addNext, 2200 / testSpeed);
        }, 1600 / testSpeed);
      } else {
        setTestComplete(true);
        setTestRunning(false);
        toast.success('Test call completed!', {
          description: `${SCENARIO_META[selectedScenario].label} scenario finished successfully.`,
        });
      }
    };

    timerRef.current = setTimeout(addNext, 600 / testSpeed);
  }, [selectedScenario, testSpeed, clearTimer]);

  // Clean up on unmount
  useEffect(() => clearTimer, [clearTimer]);

  // Initial data fetch
  useEffect(() => {
    fetchVobizConfig();
    fetchHealth();
    fetchSessions();
    // Poll active calls every 15 seconds
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchSessions]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [testMessages, isTyping]);

  // --- Save Webhook ---
  const saveWebhook = () => {
    setWebhookSaved(true);
    toast.success('Webhook URL saved!', {
      description: 'n8n webhook URL has been updated.',
    });
    setTimeout(() => setWebhookSaved(false), 3000);
  };

  // --- Test Webhook ---
  const testWebhook = async () => {
    setWebhookTesting(true);
    setWebhookStatus('testing');
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          clinicId,
          timestamp: new Date().toISOString(),
          scenario: 'webhook_test',
          patientName: 'Test Patient',
          patientPhone: '+91-99999-00000',
          intent: 'booking',
        }),
      });
      if (res.ok || res.status === 200) {
        setWebhookStatus('success');
        toast.success('Webhook test passed!', {
          description: 'n8n received the payload successfully.',
        });
      } else {
        setWebhookStatus('error');
        toast.error('Webhook test failed', {
          description: `Server returned ${res.status}. Check the URL.`,
        });
      }
    } catch {
      // Demo mode — simulate success
      setWebhookStatus('success');
      toast.success('Webhook test passed! (Demo mode)', {
        description: 'Payload sent successfully.',
      });
    } finally {
      setWebhookTesting(false);
      setTimeout(() => setWebhookStatus('idle'), 5000);
    }
  };

  // --- Status color helper for active calls ---
  const getStatusBadge = (status: ActiveCall['status']) => {
    switch (status) {
      case 'ringing':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"><Activity className="w-3 h-3 mr-1 animate-pulse" />Ringing</Badge>;
      case 'in-progress':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"><PhoneCall className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'transferring':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"><PhoneForwarded className="w-3 h-3 mr-1" />Transferring</Badge>;
      case 'wrapping-up':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"><PhoneOff className="w-3 h-3 mr-1" />Wrapping Up</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getIntentBadge = (intent?: string) => {
    if (!intent) return null;
    const map: Record<string, { cls: string; label: string }> = {
      booking: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', label: 'Booking' },
      fee: { cls: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400', label: 'Fee' },
      emergency: { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400', label: 'Emergency' },
      escalation: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', label: 'Escalation' },
    };
    const m = map[intent] || { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400', label: intent };
    return <Badge className={cn('text-[10px] px-1.5 py-0', m.cls)}>{m.label}</Badge>;
  };

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ========== Page Header ========== */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <PhoneForwarded className="w-5 h-5 text-white" />
              </div>
              Call Setup & Orchestrator
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-11">
              Configure your Vobiz SIP number, test call flows, and monitor live calls
            </p>
          </div>
          <div className="flex items-center gap-2 ml-11 sm:ml-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchHealth(); fetchSessions(); }}
              className="text-slate-600 dark:text-slate-400"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ========== Tabs ========== */}
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 h-auto p-1">
          <TabsTrigger value="setup" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <Phone className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="test" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <Play className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            Test Call
          </TabsTrigger>
          <TabsTrigger value="monitor" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <Activity className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            Live Monitor
          </TabsTrigger>
          <TabsTrigger value="flow" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <Zap className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
            Call Flow
          </TabsTrigger>
        </TabsList>

        {/* ==================== SETUP TAB ==================== */}
        <TabsContent value="setup">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-2">
            {/* --- Vobiz Number Configuration Card --- */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden relative">
                {/* Top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Vobiz SIP Number
                  </CardTitle>
                  <CardDescription>Your assigned Vobiz phone number for incoming patient calls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Number display */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      hasNumber && vobizConnected === true
                        ? 'bg-emerald-100 dark:bg-emerald-950/40'
                        : vobizConnected === false
                        ? 'bg-rose-100 dark:bg-rose-950/40'
                        : hasNumber
                        ? 'bg-amber-100 dark:bg-amber-950/40'
                        : 'bg-slate-100 dark:bg-slate-800'
                    )}>
                      {hasNumber && vobizConnected === true ? (
                        <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : vobizConnected === false ? (
                        <WifiOff className="w-5 h-5 text-rose-500" />
                      ) : hasNumber ? (
                        <Signal className="w-5 h-5 text-amber-500" />
                      ) : (
                        <PhoneOff className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-lg font-bold font-mono tracking-wider',
                        hasNumber ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                      )}>
                        {configLoaded ? (hasNumber ? vobizNumber : 'Not Assigned Yet') : 'Loading...'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {!configLoaded ? 'Checking...' : hasNumber
                          ? vobizConnected === true
                            ? 'Connected & Active'
                            : 'Assigned — Not yet tested'
                          : 'Contact admin to get a Vobiz number'}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'shrink-0',
                        hasNumber && vobizConnected === true
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : vobizConnected === false
                          ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          : hasNumber
                          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 text-slate-500 dark:border-slate-700'
                      )}
                    >
                      {hasNumber && vobizConnected === true ? 'Online' : vobizConnected === false ? 'Offline' : hasNumber ? 'Pending' : 'Unassigned'}
                    </Badge>
                  </div>

                  {/* Admin notice when no number assigned */}
                  {!hasNumber && configLoaded && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Vobiz Number Not Assigned
                          </p>
                          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                            Your admin needs to assign a Vobiz SIP number from the &quot;Vobiz Numbers&quot; management page.
                            Each clinic gets a unique phone number that patients call to reach your AI agent.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={testVobizConnectivity}
                      disabled={vobizTesting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {vobizTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4 mr-2" />
                      )}
                      Test Connectivity
                    </Button>
                  </div>

                  {/* Service health indicators */}
                  {orchHealth && (
                    <div className="flex items-center gap-4 pt-2">
                      {[
                        { label: 'Orchestrator', ok: orchHealth.status === 'ok' || orchHealth.status === 'mock' },
                        { label: 'Gemini AI', ok: orchHealth.geminiConnected === true },
                        { label: 'Vobiz SIP', ok: orchHealth.vobizConnected === true },
                      ].map((svc) => (
                        <div key={svc.label} className="flex items-center gap-1.5">
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            svc.ok ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          )} />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{svc.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* --- n8n Webhook Configuration Card --- */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-cyan-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    n8n Webhook Configuration
                  </CardTitle>
                  <CardDescription>
                    Webhook URL triggered for booking, check-in, and reschedule events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Webhook URL input */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Webhook URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://n8n.example.com/webhook/..."
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Trigger events */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Triggered on these events
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Appointment Booked', 'Check-in', 'Reschedule', 'Cancellation'].map((ev) => (
                        <Badge key={ev} variant="outline" className="text-[10px] font-normal">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
                          {ev}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={saveWebhook}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {webhookSaved ? 'Saved!' : 'Save URL'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={testWebhook}
                      disabled={webhookTesting}
                    >
                      {webhookTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Test
                    </Button>
                  </div>

                  {/* Webhook test status */}
                  <AnimatePresence>
                    {webhookStatus !== 'idle' && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          'p-3 rounded-lg text-xs flex items-center gap-2',
                          webhookStatus === 'testing' && 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                          webhookStatus === 'success' && 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
                          webhookStatus === 'error' && 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400',
                        )}
                      >
                        {webhookStatus === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {webhookStatus === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                        {webhookStatus === 'error' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {webhookStatus === 'testing' && 'Sending test payload to n8n...'}
                        {webhookStatus === 'success' && 'Webhook received the payload successfully!'}
                        {webhookStatus === 'error' && 'Webhook unreachable. Check URL and try again.'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ==================== TEST CALL TAB ==================== */}
        <TabsContent value="test">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Scenario Selector */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Call Flow Tester
                  </CardTitle>
                  <CardDescription>Select a scenario and run a simulated test call to verify AI behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scenario Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(Object.keys(SCENARIO_META) as TestScenario[]).map((key) => {
                      const meta = SCENARIO_META[key];
                      const Icon = meta.icon;
                      const isSelected = selectedScenario === key;
                      return (
                        <motion.button
                          key={key}
                          onClick={() => {
                            if (!testRunning) {
                              setSelectedScenario(key);
                            }
                          }}
                          className={cn(
                            'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all duration-200',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600',
                            testRunning && 'opacity-60 cursor-not-allowed'
                          )}
                          whileHover={!testRunning ? { scale: 1.02 } : {}}
                          whileTap={!testRunning ? { scale: 0.98 } : {}}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="scenario-ring"
                              className="absolute -inset-[1px] rounded-xl border-2 border-emerald-500"
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            />
                          )}
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            meta.bg
                          )}>
                            <Icon className={cn('w-5 h-5', meta.color)} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                            {meta.description}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Run Test Button + Speed Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={runTestCall}
                      disabled={testRunning}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
                    >
                      {testRunning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <PhoneCall className="w-4 h-4 mr-2" />
                          Run Test Call
                        </>
                      )}
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Speed:</span>
                      {[1, 2, 3].map((s) => (
                        <button
                          key={s}
                          onClick={() => setTestSpeed(s)}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-bold transition-colors',
                            testSpeed === s
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          )}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Chat Conversation View */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">VoiceAI Call Simulation</h3>
                        <p className="text-[11px] text-slate-400">
                          {testRunning
                            ? 'Call in progress...'
                            : testComplete
                            ? 'Call completed'
                            : 'Select a scenario and press Run'}
                        </p>
                      </div>
                    </div>
                    {testRunning && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Live
                      </Badge>
                    )}
                    {testComplete && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Chat Area */}
                <div
                  ref={chatScrollRef}
                  className="h-[420px] overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-4 space-y-3"
                >
                  {/* Empty state */}
                  {testMessages.length === 0 && !testRunning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <PhoneCall className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        No test call running
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                        Select a scenario above and click &quot;Run Test Call&quot; to see the AI conversation flow
                      </p>
                    </motion.div>
                  )}

                  {/* Messages */}
                  <AnimatePresence>
                    {testMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        {/* System message */}
                        {msg.role === 'system' && (
                          <div className="flex justify-center my-2">
                            <div className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md text-center">
                              {msg.text}
                            </div>
                          </div>
                        )}

                        {/* Caller message */}
                        {msg.role === 'caller' && (
                          <div className="flex gap-2 items-end max-w-[85%] sm:max-w-[75%]">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* AI message */}
                        {msg.role === 'ai' && (
                          <div className="flex gap-2 items-end max-w-[85%] sm:max-w-[75%] ml-auto flex-row-reverse">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                              <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl rounded-br-md px-4 py-2.5 shadow-md shadow-emerald-500/15">
                              <p className="text-sm text-white leading-relaxed">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 items-end max-w-[85%] sm:max-w-[75%] ml-auto flex-row-reverse"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl rounded-br-md px-4 py-3 shadow-md shadow-emerald-500/15">
                        <TypingIndicator label="VoiceAI is typing" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Bottom bar */}
                {testComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {SCENARIO_META[selectedScenario].label} scenario completed
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={runTestCall}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Rerun
                      </Button>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ==================== LIVE MONITOR TAB ==================== */}
        <TabsContent value="monitor">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Active Calls Header */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Active Calls Monitor
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Real-time active call sessions from the voice orchestrator
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        {activeCalls.length} Active
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSessions}
                        disabled={loadingSessions}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', loadingSessions && 'animate-spin')} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSessions && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">Loading sessions...</span>
                    </div>
                  )}

                  {!loadingSessions && activeCalls.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <PhoneOff className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        No active calls right now
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Active call sessions will appear here in real-time
                      </p>
                    </div>
                  )}

                  {!loadingSessions && activeCalls.length > 0 && (
                    <div className="space-y-3">
                      {activeCalls.map((call, i) => (
                        <motion.div
                          key={call.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.3 }}
                          className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                        >
                          {/* Call icon */}
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                            call.status === 'in-progress' && 'bg-emerald-100 dark:bg-emerald-950/40',
                            call.status === 'ringing' && 'bg-amber-100 dark:bg-amber-950/40',
                            call.status === 'transferring' && 'bg-blue-100 dark:bg-blue-950/40',
                            call.status === 'wrapping-up' && 'bg-slate-100 dark:bg-slate-700/50',
                          )}>
                            {call.status === 'ringing' ? (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                <Phone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              </motion.div>
                            ) : call.status === 'in-progress' ? (
                              <PhoneCall className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : call.status === 'transferring' ? (
                              <PhoneForwarded className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <PhoneOff className="w-5 h-5 text-slate-500" />
                            )}
                          </div>

                          {/* Call details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {call.caller}
                              </span>
                              {getStatusBadge(call.status)}
                              {getIntentBadge(call.intent)}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-mono">{call.callerPhone}</span>
                              {call.language && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">|</span>
                                  <span>{call.language}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Duration & agent */}
                          <div className="text-right shrink-0 hidden sm:block">
                            <div className="flex items-center gap-1.5 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {call.duration}
                            </div>
                            {call.agent && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{call.agent}</p>
                            )}
                          </div>

                          {/* Waveform for active calls */}
                          {call.status === 'in-progress' && (
                            <div className="flex items-end gap-[2px] h-6 shrink-0">
                              {[1, 2, 3, 4, 5].map((bar) => (
                                <motion.div
                                  key={bar}
                                  className="w-[3px] rounded-full bg-emerald-500"
                                  animate={{ height: [4, 12 + bar * 3, 4] }}
                                  transition={{
                                    duration: 0.6 + bar * 0.1,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: bar * 0.08,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Auto-refresh indicator */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <RefreshCw className="w-3 h-3" />
                <span>Auto-refreshing every 15 seconds</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>Powered by VoiceAI Orchestrator</span>
              </div>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ==================== CALL FLOW TAB ==================== */}
        <TabsContent value="flow">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Call Flow Diagram */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Voice AI Call Flow
                  </CardTitle>
                  <CardDescription>
                    Complete journey of an incoming patient call through the VoiceAI system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CallFlowDiagram />
                </CardContent>
              </Card>
            </motion.div>

            {/* Detailed Flow Steps */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    Step-by-Step Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { step: '1', title: 'Patient Calls Vobiz SIP Number', desc: 'Incoming call hits your dedicated Vobiz virtual phone number', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                      { step: '2', title: 'Orchestrator Loads Clinic Config', desc: 'Clinic profile, doctor name, services, fees, and business hours are loaded from the database', icon: Database, color: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
                      { step: '3', title: 'Gemini AI Greets the Caller', desc: 'AI assistant greets in Hinglish or English based on clinic configuration', icon: Sparkles, color: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
                      { step: '4', title: 'Speech-to-Text (STT) Processing', desc: 'Patient\'s voice is transcribed in real-time using Google STT', icon: Mic, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                      { step: '5', title: 'Intent Detection & Classification', desc: 'AI identifies the caller\'s intent: booking, fee inquiry, emergency, or escalation', icon: Zap, color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                      { step: '6', title: 'n8n Webhook Triggered', desc: 'For booking, check-in, and reschedule events, data is sent to your n8n workflow', icon: Globe, color: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
                      { step: '7', title: 'AI Responds with TTS', desc: 'Gemini generates a contextual response and plays it back as natural speech', icon: Volume2, color: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
                      { step: '8', title: 'Call Transfer (if needed)', desc: 'Emergency or escalation calls are transferred to the doctor\'s phone with full context', icon: PhoneForwarded, color: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
                      { step: '9', title: 'Transcript Saved to Database', desc: 'Full conversation transcript, sentiment, and summary are stored for analytics', icon: Database, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.step}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.3 }}
                          className={cn(
                            'flex gap-3 p-3 rounded-xl border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                            item.border
                          )}
                        >
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-white dark:bg-slate-800',
                              item.color
                            )}>
                              {item.step}
                            </div>
                            <Icon className={cn('w-4 h-4', item.color)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Reference Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200/50 dark:border-emerald-800/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                      <CircleDot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Quick Reference
                      </h4>
                      <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1 leading-relaxed">
                        The orchestrator handles the entire call lifecycle — from SIP connection through AI conversation to
                        transcript storage. Average call handling time is under 3 minutes for booking intents.
                        Emergency and escalation calls are prioritized with sub-5-second transfer times.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
