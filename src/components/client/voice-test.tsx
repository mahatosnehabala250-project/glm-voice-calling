'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mic, MicOff, Send, Bot, Volume2, Clock, PhoneOff,
  User, Settings, Loader2, CheckCircle2, AlertCircle, Play,
  MessageSquare, Sparkles, ArrowRight, RotateCcw, Signal, Wifi, Battery,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

/* ============================================================
   Types
   ============================================================ */
interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
  loading?: boolean;
}

type CallState = 'idle' | 'ringing' | 'connected' | 'ended';
type Language = 'hinglish' | 'english' | 'hindi';
type VoiceGender = 'female' | 'male';

const VOICE_CONFIG: Record<VoiceGender, { name: string; icon: typeof User; label: string }> = {
  female: { name: 'Priya', icon: User, label: 'Female' },
  male: { name: 'Amit', icon: User, label: 'Male' },
};

const LANGUAGE_NAMES: Record<Language, string> = {
  hinglish: 'Hinglish',
  english: 'English',
  hindi: 'Hindi',
};

const GREETINGS: Record<Language, Record<VoiceGender, string>> = {
  hinglish: {
    female: 'Namaste! Main Priya bol rahi hoon, aapki AI receptionist. Aaj main aapki kaise madad kar sakti hoon?',
    male: 'Namaste! Main Amit bol raha hoon, aapka AI receptionist. Aaj main aapki kaise madad kar sakta hoon?',
  },
  english: {
    female: 'Hello! This is Priya, your AI receptionist. How may I help you today?',
    male: 'Hello! This is Amit, your AI receptionist. How may I help you today?',
  },
  hindi: {
    female: 'नमस्ते! मैं प्रिया बोल रही हूँ, आपकी AI रिसेप्शनिस्ट। आज मैं आपकी कैसे मदद कर सकती हूँ?',
    male: 'नमस्ते! मैं अमित बोल रहा हूँ, आपका AI रिसेप्शनिस्ट। आज मैं आपकी कैसे मदद कर सकता हूँ?',
  },
};

const DEMO_RESPONSES: Record<Language, string[]> = {
  hinglish: [
    'Ji bilkul! Aapka appointment book karne ke liye, mujhe aapka naam aur preferred date chahiye. Kaunsa date suit karega aapko?',
    'Bahut accha! Humare paas Dr. ke liye slots available hain. Subah 10 baje ya dopahar 2 baje — kaunsa time aapko theek lagega?',
    'Consultation fee ₹500 hai. Kya aap appointment confirm karna chahte hain?',
    'Ji haan, main samajh gayi. Agar aapko aur kuch puchna ho toh batayein, warna main appointment note kar leti hoon.',
    'Aapka dhanyavaad! Appointment confirm ho gaya hai. WhatsApp par details bhi bhej diye jaayenge. Alvida!',
  ],
  english: [
    'Of course! To book an appointment, I\'ll need your name and preferred date. What date works best for you?',
    'Great! We have slots available at 10 AM or 2 PM. Which time would you prefer?',
    'The consultation fee is ₹500. Would you like to confirm the appointment?',
    'I understand. If you have any other questions, feel free to ask. Otherwise, I can go ahead and book it for you.',
    'Thank you! Your appointment has been confirmed. You\'ll receive the details via WhatsApp. Goodbye!',
  ],
  hindi: [
    'जी बिल्कुल! अपॉइंटमेंट बुक करने के लिए, मुझे आपका नाम और पसंदीदा तारीख चाहिए। कौन सी तारीख आपको सूट करेगी?',
    'बहुत अच्छा! हमारे पास स्लॉट उपलब्ध हैं — सुबह 10 बजे या दोपहर 2 बजे। कौन सा समय आपको ठीक लगेगा?',
    'कंसल्टेशन फीस ₹500 है। क्या आप अपॉइंटमेंट कन्फर्म करना चाहते हैं?',
    'जी हाँ, मैं समझ गई। अगर आपको कोई और सवाल हो तो बताइए।',
    'आपका धन्यवाद! अपॉइंटमेंट कन्फर्म हो गया है। WhatsApp पर डिटेल्स भेज दिए जाएंगे। अलविदा!',
  ],
};

const SENTIMENT_LABELS: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positive', color: 'text-emerald-500' },
  negative: { label: 'Negative', color: 'text-rose-500' },
  neutral: { label: 'Neutral', color: 'text-amber-500' },
};

/* ============================================================
   Animation Variants
   ============================================================ */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

/* ============================================================
   Waveform Visualization Component
   ============================================================ */
function VoiceWaveform({ active, barCount = 20, className }: { active: boolean; barCount?: number; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-[2px] h-10', className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-emerald-400"
          animate={
            active
              ? {
                  height: [4, Math.random() * 28 + 8, 4],
                  opacity: [0.4, 1, 0.4],
                }
              : { height: 4, opacity: 0.3 }
          }
          transition={
            active
              ? {
                  duration: 0.8 + Math.random() * 0.6,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                  delay: i * 0.04,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

/* ============================================================
   Call Timer Component
   ============================================================ */
function CallTimer({ active, startTime }: { active: boolean; startTime: Date | null }) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!active || !startTime) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => {
      clearInterval(interval);
      setElapsed('00:00');
    };
  }, [active, startTime]);

  return (
    <span className="font-mono text-sm text-slate-300">{elapsed}</span>
  );
}

/* ============================================================
   Main Voice Test Component
   ============================================================ */
export default function VoiceTest() {
  const { user } = useAuthStore();

  // Configuration state
  const [language, setLanguage] = useState<Language>('hinglish');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [demoMode, setDemoMode] = useState(true);

  // Call state
  const [callState, setCallState] = useState<CallState>('idle');
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [callSummary, setCallSummary] = useState<{
    duration: string;
    messageCount: number;
    sentiment: string;
    confidence: number;
  } | null>(null);
  const [backendUsed, setBackendUsed] = useState('demo');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const demoResponseIndex = useRef(0);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when connected
  useEffect(() => {
    if (callState === 'connected') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [callState]);

  // Get greeting for current config
  const getGreeting = useCallback(() => {
    return GREETINGS[language]?.[voiceGender] || GREETINGS.hinglish.female;
  }, [language, voiceGender]);

  // Get demo response
  const getDemoResponse = useCallback((): string => {
    const responses = DEMO_RESPONSES[language];
    const idx = demoResponseIndex.current % responses.length;
    demoResponseIndex.current += 1;
    return responses[idx];
  }, [language]);

  // Start test call
  const startCall = useCallback(() => {
    setCallState('ringing');
    setCallSummary(null);
    setMessages([]);
    demoResponseIndex.current = 0;

    // Simulate ringing
    setTimeout(() => {
      setCallState('connected');
      setCallStartTime(new Date());

      // AI greeting
      const greetingMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: getGreeting(),
        timestamp: new Date(),
      };
      setMessages([greetingMsg]);
    }, 1800);
  }, [getGreeting]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userInput.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserInput('');
    setSending(true);
    setIsTyping(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: userInput.trim(),
          clinicContext: {
            clinicName: 'Test Clinic',
            doctorName: 'Dr. Sharma',
            language: LANGUAGE_NAMES[language],
            services: ['General Consultation', 'Dental Care'],
            fee: '₹500',
          },
        }),
      });

      const data = await res.json();
      const aiText = data.response || getDemoResponse();
      setBackendUsed(data.backend || 'demo');

      // Simulate typing delay
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: aiText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        setSending(false);
      }, 800 + Math.random() * 800);
    } catch {
      // Fallback to demo
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: getDemoResponse(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        setSending(false);
        setBackendUsed('demo-fallback');
      }, 600);
    }
  }, [userInput, sending, language, getDemoResponse]);

  // End call
  const endCall = useCallback(async () => {
    setCallState('ended');

    // Calculate duration
    let duration = '00:00';
    if (callStartTime) {
      const diff = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      duration = `${m}:${s}`;
    }

    // Analyze sentiment of conversation
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    let sentiment = 'neutral';
    let confidence = 0.7;

    if (lastUserMsg) {
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze-sentiment',
            text: lastUserMsg.text,
          }),
        });
        const data = await res.json();
        if (data.sentiment) sentiment = data.sentiment;
        if (data.confidence) confidence = data.confidence;
      } catch {
        // Keep defaults
      }
    }

    setCallSummary({
      duration,
      messageCount: messages.length,
      sentiment,
      confidence: Math.round(confidence * 100),
    });

    toast.success('Test call ended. Summary generated.');
  }, [messages, callStartTime]);

  // Reset
  const resetTest = useCallback(() => {
    setCallState('idle');
    setCallStartTime(null);
    setMessages([]);
    setUserInput('');
    setIsTyping(false);
    setSending(false);
    setCallSummary(null);
  }, []);

  // Quick test messages
  const quickMessages = [
    'Hi, I want to book an appointment',
    'What is the consultation fee?',
    'Do you have slots tomorrow morning?',
    'Thank you, that will be all',
  ];

  const VoiceCfg = VOICE_CONFIG[voiceGender];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Voice Test</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Test your AI voice agent with a simulated call</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Phone Simulator */}
        <motion.div variants={itemAnim} className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-0">
              {/* Phone Frame */}
              <div className="relative mx-auto max-w-[380px] rounded-[2.5rem] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 p-1.5 shadow-2xl">
                {/* Phone outer shell */}
                <div className="rounded-[2rem] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 overflow-hidden min-h-[600px] flex flex-col">

                  {/* Notch + Status Bar */}
                  <div className="relative flex items-center justify-between h-9 bg-slate-900 px-6 flex-shrink-0">
                    {/* Notch */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 w-28 h-6 bg-black rounded-b-2xl flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-slate-800 ring-1 ring-slate-700" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium z-10">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <div className="flex items-center gap-1.5 z-10">
                      <Signal className="w-3 h-3 text-slate-400" />
                      <Wifi className="w-3 h-3 text-slate-400" />
                      <Battery className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Phone Content */}
                  <div className="flex-1 flex flex-col text-white px-4 pb-4 pt-2">
                    <AnimatePresence mode="wait">
                      {/* IDLE STATE */}
                      {callState === 'idle' && (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex-1 flex flex-col items-center justify-center gap-6"
                        >
                          {/* Agent avatar */}
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center ring-4 ring-emerald-500/20">
                              <Bot className="w-10 h-10 text-white" />
                            </div>
                            <motion.div
                              className="absolute -inset-2 rounded-full border-2 border-emerald-400/20"
                              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                          </div>

                          <div className="text-center">
                            <h3 className="text-lg font-semibold">{VoiceCfg.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">AI Voice Agent • {LANGUAGE_NAMES[language]}</p>
                          </div>

                          <VoiceWaveform active={false} barCount={16} />

                          <p className="text-xs text-slate-500 text-center px-8">
                            Configure your test settings and press the button below to start a simulated call
                          </p>

                          {/* Start Call Button */}
                          <motion.button
                            onClick={startCall}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                          >
                            <Phone className="w-7 h-7 text-white" />
                          </motion.button>
                          <span className="text-[10px] text-emerald-400 font-medium">Start Test Call</span>
                        </motion.div>
                      )}

                      {/* RINGING STATE */}
                      {callState === 'ringing' && (
                        <motion.div
                          key="ringing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 flex flex-col items-center justify-center gap-6"
                        >
                          <motion.div
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Phone className="w-10 h-10 text-white" />
                          </motion.div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold">Calling {VoiceCfg.name}...</h3>
                            <p className="text-xs text-slate-400 mt-1">Connecting to AI agent</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-emerald-400"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* CONNECTED STATE */}
                      {callState === 'connected' && (
                        <motion.div
                          key="connected"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex-1 flex flex-col min-h-0"
                        >
                          {/* Call Header */}
                          <div className="flex items-center justify-between mb-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{VoiceCfg.name}</p>
                                <div className="flex items-center gap-1">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                  </span>
                                  <span className="text-[9px] text-emerald-400">Connected</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <CallTimer active={true} startTime={callStartTime} />
                            </div>
                          </div>

                          {/* Waveform */}
                          <VoiceWaveform active={true} barCount={24} className="mb-3 flex-shrink-0" />

                          <Separator className="bg-slate-700/50 flex-shrink-0" />

                          {/* Chat Messages */}
                          <div className="flex-1 overflow-y-auto space-y-3 py-3 min-h-0 max-h-[260px] custom-scroll-thin">
                            {messages.map((msg) => (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.25 }}
                                className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                              >
                                {msg.role === 'ai' && (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Bot className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    'max-w-[80%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed',
                                    msg.role === 'ai'
                                      ? 'bg-slate-700/60 text-slate-200 rounded-tl-sm'
                                      : 'bg-emerald-600/80 text-white rounded-tr-sm'
                                  )}
                                >
                                  {msg.text}
                                  <span className="block text-[8px] text-slate-500 mt-1 text-right">
                                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </span>
                                </div>
                                {msg.role === 'user' && (
                                  <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <User className="w-3 h-3 text-slate-300" />
                                  </div>
                                )}
                              </motion.div>
                            ))}

                            {/* Typing indicator */}
                            {isTyping && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2 items-start"
                              >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-3 h-3 text-white" />
                                </div>
                                <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
                                  <div className="flex items-center gap-1">
                                    {[0, 1, 2].map((i) => (
                                      <motion.span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            <div ref={chatEndRef} />
                          </div>

                          {/* Quick Messages */}
                          <div className="flex gap-1.5 flex-wrap mb-2 flex-shrink-0">
                            {quickMessages.map((qmsg) => (
                              <button
                                key={qmsg}
                                onClick={() => { setUserInput(qmsg); }}
                                className="text-[9px] px-2 py-1 rounded-full bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-emerald-400 transition-colors border border-slate-700/50 whitespace-nowrap"
                              >
                                {qmsg}
                              </button>
                            ))}
                          </div>

                          {/* Input Area */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex-1 relative">
                              <Input
                                ref={inputRef}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Type your message..."
                                className="h-9 bg-slate-700/40 border-slate-700/50 text-white text-xs placeholder:text-slate-500 rounded-full px-4 pr-10 focus-visible:ring-emerald-500/50"
                                disabled={sending}
                              />
                              <button
                                onClick={sendMessage}
                                disabled={sending || !userInput.trim()}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-30 disabled:hover:bg-emerald-500"
                              >
                                {sending ? (
                                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5 text-white" />
                                )}
                              </button>
                            </div>
                            {/* End Call Button */}
                            <motion.button
                              onClick={endCall}
                              className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                            >
                              <PhoneOff className="w-4 h-4 text-white" />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {/* ENDED STATE - Summary */}
                      {callState === 'ended' && callSummary && (
                        <motion.div
                          key="ended"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 flex flex-col items-center justify-center gap-5 p-4"
                        >
                          {/* Checkmark */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          </motion.div>

                          <div className="text-center">
                            <h3 className="text-base font-semibold">Call Ended</h3>
                            <p className="text-xs text-slate-400 mt-1">Test call completed successfully</p>
                          </div>

                          {/* Summary Stats */}
                          <div className="w-full space-y-3">
                            <div className="bg-slate-800/60 rounded-xl p-3 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs text-slate-400">Duration</span>
                                </div>
                                <span className="text-xs font-semibold text-white">{callSummary.duration}</span>
                              </div>
                              <Separator className="bg-slate-700/50" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs text-slate-400">Messages</span>
                                </div>
                                <span className="text-xs font-semibold text-white">{callSummary.messageCount} exchanged</span>
                              </div>
                              <Separator className="bg-slate-700/50" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs text-slate-400">Sentiment</span>
                                </div>
                                <span className={cn('text-xs font-semibold', SENTIMENT_LABELS[callSummary.sentiment]?.color || 'text-amber-500')}>
                                  {callSummary.sentiment.charAt(0).toUpperCase() + callSummary.sentiment.slice(1)} ({callSummary.confidence}%)
                                </span>
                              </div>
                              <Separator className="bg-slate-700/50" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs text-slate-400">Backend</span>
                                </div>
                                <span className="text-xs font-semibold text-white">{backendUsed === 'demo-fallback' ? 'Demo Mode' : backendUsed}</span>
                              </div>
                            </div>

                            {/* Conversation Recap */}
                            <div className="bg-slate-800/40 rounded-xl p-3">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Conversation Recap</p>
                              <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scroll-thin">
                                {messages.map((msg) => (
                                  <div key={msg.id} className="flex gap-1.5">
                                    <span className="text-[9px] mt-0.5">
                                      {msg.role === 'ai' ? '🤖' : '👤'}
                                    </span>
                                    <p className="text-[10px] text-slate-300 line-clamp-1">{msg.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 w-full">
                            <Button
                              variant="outline"
                              onClick={resetTest}
                              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              New Test
                            </Button>
                            <Button
                              onClick={startCall}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full text-xs"
                            >
                              <Phone className="w-3.5 h-3.5 mr-1.5" />
                              Call Again
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Home indicator bar */}
                  <div className="flex justify-center pb-2 flex-shrink-0">
                    <div className="w-28 h-1 rounded-full bg-slate-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Test Configuration Panel */}
        <motion.div variants={itemAnim} className="space-y-6">
          {/* Configuration Card */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                Test Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language Select */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)} disabled={callState === 'connected' || callState === 'ringing'}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-700 text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hinglish">🇮🇳 Hinglish</SelectItem>
                    <SelectItem value="english">🇬🇧 English</SelectItem>
                    <SelectItem value="hindi">🇮🇳 Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Select */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Voice</Label>
                <Select value={voiceGender} onValueChange={(v) => setVoiceGender(v as VoiceGender)} disabled={callState === 'connected' || callState === 'ringing'}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-700 text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">👩 Female (Priya)</SelectItem>
                    <SelectItem value="male">👨 Male (Amit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Demo Mode Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">AI Backend</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDemoMode(true)}
                    className={cn(
                      'p-2.5 rounded-lg border text-center transition-all text-xs',
                      demoMode
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <Sparkles className="w-4 h-4 mx-auto mb-1" />
                    Demo Mode
                  </button>
                  <button
                    onClick={() => setDemoMode(false)}
                    className={cn(
                      'p-2.5 rounded-lg border text-center transition-all text-xs',
                      !demoMode
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <Bot className="w-4 h-4 mx-auto mb-1" />
                    Gemini API
                  </button>
                </div>
              </div>

              <Separator />

              {/* Current Config Summary */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Config</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Agent</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{VoiceCfg.name} ({VoiceCfg.label})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Language</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{LANGUAGE_NAMES[language]}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Backend</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {demoMode ? 'Demo' : 'Gemini AI'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it Works Card */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-500" />
                How it Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Configure', desc: 'Set language, voice, and backend mode' },
                  { step: '2', title: 'Start Call', desc: 'Press the green call button to begin' },
                  { step: '3', title: 'Converse', desc: 'Type messages and get AI responses' },
                  { step: '4', title: 'Review', desc: 'See call summary with sentiment analysis' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.title}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="border-slate-200 dark:border-slate-800 card-gradient-emerald">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pro Tip</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Use the quick message buttons inside the phone to test common scenarios like booking, fee inquiry, and greetings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
