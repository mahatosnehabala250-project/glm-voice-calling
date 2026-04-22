'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Bot, Server, Wifi, Brain, Workflow, Database, MessageCircle,
  Play, Pause, RotateCcw, ChevronRight, ArrowRight, Shield, Clock,
  Languages, PhoneForwarded, UserCheck, CalendarCheck, AlertTriangle,
  DollarSign, CalendarX, Building2, Stethoscope, Eye, Heart, Bone,
  Sparkles, Mic, Volume2, Lock, BarChart3, FileText, CheckCircle2,
  ArrowDownRight, Globe, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════
   DATA CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const clinics = [
  {
    id: 'clinic_abc123',
    name: 'Sharma Dental Clinic',
    doctor: 'Dr. Rajesh Sharma',
    city: 'Mumbai',
    phone: '+919876543210',
    services: ['Dental Checkup', 'Root Canal', 'Braces', 'Teeth Whitening'],
    fees: '₹500 - ₹5000',
    hours: '09:00 - 18:00',
    days: 'Mon - Fri',
    language: 'Hinglish',
    color: 'emerald',
    icon: Stethoscope,
  },
  {
    id: 'clinic_def456',
    name: 'Agarwal Eye Hospital',
    doctor: 'Dr. Priya Agarwal',
    city: 'Delhi',
    phone: '+919876543211',
    services: ['Eye Checkup', 'Lasik Surgery', 'Cataract', 'Glasses'],
    fees: '₹300 - ₹40000',
    hours: '09:00 - 20:00',
    days: 'Mon - Sat',
    language: 'Hindi',
    color: 'teal',
    icon: Eye,
  },
  {
    id: 'clinic_ghi789',
    name: 'Kumar Orthopaedic',
    doctor: 'Dr. Amit Kumar',
    city: 'Jaipur',
    phone: '+919876543212',
    services: ['Joint Pain', 'Fracture', 'Knee Replacement', 'Physiotherapy'],
    fees: '₹600 - ₹80000',
    hours: '10:00 - 19:00',
    days: 'Mon - Sat',
    language: 'English',
    color: 'cyan',
    icon: Bone,
  },
  {
    id: 'clinic_jkl012',
    name: 'Patel Skin Clinic',
    doctor: 'Dr. Neha Patel',
    city: 'Pune',
    phone: '+919876543213',
    services: ['Skin Checkup', 'Acne Treatment', 'Hair Loss', 'Laser'],
    fees: '₹400 - ₹15000',
    hours: '09:00 - 18:00',
    days: 'Mon - Fri',
    language: 'Hinglish',
    color: 'green',
    icon: Sparkles,
  },
  {
    id: 'clinic_mno345',
    name: 'Gupta Heart Center',
    doctor: 'Dr. Vikram Gupta',
    city: 'Chennai',
    phone: '+919876543214',
    services: ['Heart Checkup', 'ECG', 'Echo', 'Angioplasty'],
    fees: '₹800 - ₹200000',
    hours: '08:00 - 20:00',
    days: 'Mon - Sat',
    language: 'Tamil/Hindi',
    color: 'lime',
    icon: Heart,
  },
];

const architectureNodes = [
  { id: 'patient', label: 'Patient Phone', icon: Phone, port: '', desc: 'Patient ka phone call', color: 'from-slate-600 to-slate-700 dark:from-slate-400 dark:to-slate-500' },
  { id: 'sip', label: 'Vobiz SIP', icon: Server, port: ':3031', desc: 'SIP Trunk Service', color: 'from-emerald-500 to-emerald-600' },
  { id: 'ws', label: 'WS Bridge', icon: Wifi, port: ':3033', desc: 'WebSocket Bridge', color: 'from-teal-500 to-teal-600' },
  { id: 'ai', label: 'Gemini AI', icon: Brain, port: ':3032', desc: 'AI Voice Engine', color: 'from-amber-500 to-orange-500' },
  { id: 'n8n', label: 'n8n Workflow', icon: Workflow, port: '', desc: 'Automation Engine', color: 'from-rose-500 to-rose-600' },
  { id: 'db', label: 'Supabase DB', icon: Database, port: '', desc: 'Data Storage', color: 'from-violet-600 to-purple-600' },
  { id: 'wa', label: 'WhatsApp', icon: MessageCircle, port: '', desc: 'Patient Notification', color: 'from-green-500 to-green-600' },
];

const callFlowSteps = [
  {
    step: 1,
    title: 'Patient Call Kare',
    hinglish: 'Patient clinic ka Vobiz number call karta hai (e.g., +9198765xxxxx)',
    detail: 'Jab koi patient Sharma Dental ka number +919876543210 call karega, toh call Vobiz SIP service tak pahunchega.',
    activeNode: 'patient',
    conversation: null,
  },
  {
    step: 2,
    title: 'SIP Service Receive Kare',
    hinglish: 'Vobiz SIP Service (Port 3031) call ko receive karta hai',
    detail: 'SIP trunk call ko accept karta hai aur WebSocket bridge ko notify karta hai ki naya call aaya hai.',
    activeNode: 'sip',
    conversation: null,
  },
  {
    step: 3,
    title: 'WebSocket Bridge Connect',
    hinglish: 'WebSocket Bridge (Port 3033) SIP ↔ Gemini AI connect karta hai',
    detail: 'Real-time audio stream WebSocket ke through AI engine tak jaata hai. Ye bridge dono sides ke beech bidirectional communication handle karta hai.',
    activeNode: 'ws',
    conversation: null,
  },
  {
    step: 4,
    title: 'AI Call Answer Kare',
    hinglish: 'Gemini AI (Port 3032) call answer karta hai - clinic ki language mein baat karta hai',
    detail: 'AI configured greeting bolta hai. Agar Sharma Dental hai toh Hinglish mein baat karega.',
    activeNode: 'ai',
    conversation: {
      ai: 'Namaste! Dr. Sharma Dental mein aapka swagat hai. Main Rekha bol rahi hoon, Dr. Sharma ki assistant. Kaise madad kar sakti hoon?',
    },
  },
  {
    step: 5,
    title: 'Patient Apni Need Bataye',
    hinglish: 'Patient apna problem batata hai - AI intent detect karta hai',
    detail: 'AI patient ki baat sunke samajhta hai ki wo kya chahta hai - Appointment booking, Fee inquiry, Reschedule, ya Emergency.',
    activeNode: 'ai',
    conversation: {
      ai: 'Namaste! Dr. Sharma Dental mein aapka swagat hai...',
      patient: 'Mujhe dental checkup ke liye appointment chahiye kal ke liye.',
      ai2: 'Bilkul! Aapka naam aur phone number bata dijiye.',
    },
  },
  {
    step: 6,
    title: 'AI n8n Workflow Trigger Kare',
    hinglish: 'AI patient ka intent detect karke n8n workflow trigger karta hai',
    detail: 'BOOKING → n8n slot check karega → appointment book karega → Supabase mein save karega. FEE INQUIRY → fees bata dega. EMERGENCY → call transfer karega.',
    activeNode: 'n8n',
    conversation: {
      ai: 'Theek hai, main ab available slots check kar rahi hoon...',
      patient: 'Haan, 3 baje ke baad koi slot hai?',
      ai2: 'Haan! Kal 3:30 PM ek slot available hai. Main book kar doon?',
    },
  },
  {
    step: 7,
    title: 'WhatsApp Confirmation',
    hinglish: 'Patient ko WhatsApp par confirmation message aata hai',
    detail: 'Date, time, clinic name, doctor name - sab details WhatsApp par patient ko mil jaati hain.',
    activeNode: 'wa',
    conversation: null,
  },
  {
    step: 8,
    title: 'Call Log & Transcript Save',
    hinglish: 'Pura call log + transcript Supabase database mein save hota hai',
    detail: 'Clinic dashboard par ye data dikhta hai - call duration, transcript, patient info, booking status sab kuch.',
    activeNode: 'db',
    conversation: null,
  },
];

const intents = [
  {
    name: 'Booking',
    icon: CalendarCheck,
    color: 'emerald',
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 dark:border-emerald-400/20',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-500',
    flow: 'n8n available slots check karta hai → appointment book hota hai → Supabase mein save → WhatsApp confirmation bhejta hai',
    example: '"Mujhe appointment chahiye" → ✅ Slot mila → Book ho gaya',
  },
  {
    name: 'Fee Inquiry',
    icon: DollarSign,
    color: 'amber',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 dark:border-amber-400/20',
    textClass: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-500',
    flow: 'n8n fees lookup karta hai → AI patient ko fees bata deta hai → agar booking chahiye toh aage badhta hai',
    example: '"Checkup kitne ka hai?" → "₹500 hai doctor sahab ka" → Book kare?',
  },
  {
    name: 'Emergency',
    icon: AlertTriangle,
    color: 'rose',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 dark:border-rose-400/20',
    textClass: 'text-rose-700 dark:text-rose-400',
    iconBg: 'bg-rose-500',
    flow: 'AI turant detect karta hai emergency → n8n call transfer karta hai clinic ke escalation number par → doctor directly baat karta hai',
    example: '"Bahut dard ho raha hai!" → 🚨 Emergency detect → Call transferred to doctor',
  },
  {
    name: 'Reschedule',
    icon: CalendarX,
    color: 'orange',
    bgClass: 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/30 dark:border-orange-400/20',
    textClass: 'text-orange-700 dark:text-orange-400',
    iconBg: 'bg-orange-500',
    flow: 'n8n purani appointment dhoondhta hai → available dates dikhata hai → naya date confirm karta hai → WhatsApp update',
    example: '"Mera appointment kal cancel karna hai" → Available dates dikhao → Reschedule done',
  },
];

const dataFlowItems = [
  { label: 'Incoming Call', icon: Phone, data: 'From: +919988776655 | To: +919876543210', color: 'text-emerald-600' },
  { label: 'AI Processing', icon: Brain, data: 'Intent: BOOKING | Language: Hinglish | Confidence: 96%', color: 'text-amber-600' },
  { label: 'Patient Info', icon: UserCheck, data: 'Name: Ravi Kumar | Phone: +919988776655', color: 'text-teal-600' },
  { label: 'Appointment', icon: CalendarCheck, data: 'Date: 25 Jan | Time: 3:30 PM | Doctor: Dr. Sharma', color: 'text-emerald-600' },
  { label: 'Storage', icon: Database, data: 'clinic_abc123 | appointments table | status: confirmed', color: 'text-violet-600' },
  { label: 'Notification', icon: MessageCircle, data: 'WhatsApp sent to +919988776655 | Template: booking_confirm', color: 'text-green-600' },
];

/* ═══════════════════════════════════════════════════════════════
   ANIMATION HELPERS
   ═══════════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: ARCHITECTURE OVERVIEW
   ═══════════════════════════════════════════════════════════════ */

function ArchitectureOverview() {
  return (
    <motion.section
      custom={0}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Architecture</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pura system ka diagram — dekho kaise sab connected hai</p>
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="relative">
        {/* Desktop: horizontal layout */}
        <div className="hidden lg:flex items-center gap-2 justify-center">
          {architectureNodes.map((node, i) => {
            const Icon = node.icon;
            return (
              <div key={node.id} className="flex items-center gap-2">
                <motion.div
                  custom={i}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -4, scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="group relative"
                >
                  <div className={cn(
                    'w-28 p-3 rounded-xl bg-gradient-to-br shadow-lg text-center transition-shadow duration-300',
                    'hover:shadow-xl cursor-default',
                    node.color,
                  )}>
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">{node.label}</p>
                    {node.port && (
                      <p className="text-[10px] text-white/70 font-mono mt-0.5">{node.port}</p>
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                      {node.desc}
                    </span>
                  </div>
                </motion.div>
                {i < architectureNodes.length - 1 && (
                  <motion.div
                    custom={i}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: i * 0.1 + 0.5, duration: 0.3 }}
                    className="flex items-center"
                  >
                    <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical/wrapped layout */}
        <div className="lg:hidden grid grid-cols-2 gap-3">
          {architectureNodes.map((node, i) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={node.id}
                custom={i}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.03 }}
                className={cn(
                  'p-3 rounded-xl bg-gradient-to-br text-white shadow-md',
                  node.color,
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">{node.label}</p>
                    {node.port && (
                      <p className="text-[10px] text-white/70 font-mono">{node.port}</p>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-white/80">{node.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: 5 CLINIC SETUP
   ═══════════════════════════════════════════════════════════════ */

function ClinicSetup() {
  const colorMap: Record<string, { border: string; bg: string; badge: string; accent: string }> = {
    emerald: { border: 'border-emerald-300 dark:border-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30', badge: 'bg-emerald-500', accent: 'text-emerald-600 dark:text-emerald-400' },
    teal: { border: 'border-teal-300 dark:border-teal-700', bg: 'bg-teal-50 dark:bg-teal-950/30', badge: 'bg-teal-500', accent: 'text-teal-600 dark:text-teal-400' },
    cyan: { border: 'border-cyan-300 dark:border-cyan-700', bg: 'bg-cyan-50 dark:bg-cyan-950/30', badge: 'bg-cyan-500', accent: 'text-cyan-600 dark:text-cyan-400' },
    green: { border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-950/30', badge: 'bg-green-500', accent: 'text-green-600 dark:text-green-400' },
    lime: { border: 'border-lime-300 dark:border-lime-700', bg: 'bg-lime-50 dark:bg-lime-950/30', badge: 'bg-lime-500', accent: 'text-lime-600 dark:text-lime-400' },
  };

  return (
    <motion.section
      custom={1}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">5 Clinic Setup — Ek Baar Ki Cheez</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Har clinic apna AI Agent configure karta hai — data bilkul alag rehta hai</p>
        </div>
      </div>

      {/* Data Isolation Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Multi-Tenant Data Isolation</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Har clinic ka data bilkul separate hai — koi dusre clinic ka data nahi dekh sakta. Sab clinicId se separated hai.</p>
        </div>
      </div>

      {/* Clinic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {clinics.map((clinic, i) => {
          const Icon = clinic.icon;
          const colors = colorMap[clinic.color] || colorMap.emerald;
          return (
            <motion.div
              key={clinic.id}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'rounded-xl border p-4 space-y-3 transition-all duration-200 cursor-default',
                colors.border, colors.bg,
              )}
            >
              {/* Clinic Header */}
              <div className="flex items-center gap-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.badge)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{clinic.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{clinic.city}</p>
                </div>
              </div>

              {/* Doctor */}
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {clinic.doctor}
              </p>

              {/* Phone */}
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{clinic.phone}</span>
              </div>

              {/* Services */}
              <div className="flex flex-wrap gap-1">
                {clinic.services.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                    {s}
                  </Badge>
                ))}
                {clinic.services.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">+{clinic.services.length - 3}</Badge>
                )}
              </div>

              {/* Config */}
              <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{clinic.hours} | {clinic.days}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Languages className="w-3 h-3" />
                  <span>{clinic.language}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" />
                  <span>{clinic.fees}</span>
                </div>
              </div>

              {/* Clinic ID */}
              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <code className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{clinic.id}</code>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: STEP-BY-STEP CALL FLOW (ANIMATED)
   ═══════════════════════════════════════════════════════════════ */

function StepByStepFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAnimation = useCallback(() => {
    setIsPlaying(true);
    setIsComplete(false);
    setCurrentStep(0);
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(false);
    setCurrentStep(-1);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (isPlaying && currentStep >= 0 && currentStep < callFlowSteps.length) {
      intervalRef.current = setTimeout(() => {
        if (currentStep === callFlowSteps.length - 1) {
          setIsPlaying(false);
          setIsComplete(true);
        } else {
          setCurrentStep((prev) => prev + 1);
        }
      }, 3000);
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isPlaying, currentStep]);

  const progress = callFlowSteps.length > 0 ? ((currentStep + 1) / callFlowSteps.length) * 100 : 0;

  return (
    <motion.section
      custom={2}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <PhoneForwarded className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Call Flow — Step by Step</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Play button dabao aur dekho kaise ek call process hota hai</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <Button onClick={resetAnimation} variant="outline" size="sm" className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Phir Se
            </Button>
          ) : isPlaying ? (
            <Button onClick={pauseAnimation} variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
              <Pause className="w-3.5 h-3.5" /> Ruko
            </Button>
          ) : (
            <Button onClick={startAnimation} size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <Play className="w-3.5 h-3.5" /> Shuru Karo
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Progress</span>
          <span className="font-mono">{Math.max(0, currentStep + 1)} / {callFlowSteps.length} steps</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Step list */}
        <div className="space-y-2">
          {callFlowSteps.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            const isPending = i > currentStep;

            return (
              <motion.div
                key={step.step}
                animate={{
                  opacity: isPending && currentStep === -1 ? 1 : isPending ? 0.4 : 1,
                  x: isActive ? 4 : 0,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'relative flex items-start gap-3 p-3 rounded-xl transition-all duration-300 cursor-pointer',
                  isActive && 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-md shadow-emerald-500/10',
                  isDone && 'opacity-70',
                  isPending && currentStep >= 0 && 'opacity-30',
                )}
                onClick={() => {
                  if (!isPlaying) {
                    setCurrentStep(i);
                    setIsComplete(false);
                  }
                }}
              >
                {/* Step Number */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-300',
                  isActive && 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-110',
                  isDone && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                  isPending && 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
                )}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.step}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold transition-colors',
                    isActive && 'text-emerald-700 dark:text-emerald-400',
                    isDone && 'text-slate-600 dark:text-slate-400',
                    isPending && 'text-slate-500 dark:text-slate-500',
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {step.hinglish}
                  </p>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Right: Detail + Conversation */}
        <AnimatePresence mode="wait">
          {currentStep >= 0 && currentStep < callFlowSteps.length ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card className="border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500 text-white text-xs">
                      Step {callFlowSteps[currentStep].step}
                    </Badge>
                    <CardTitle className="text-base text-slate-900 dark:text-white">
                      {callFlowSteps[currentStep].title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {callFlowSteps[currentStep].detail}
                  </p>

                  {/* Architecture node indicator */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Active Component: <strong className="text-slate-700 dark:text-slate-300">{architectureNodes.find(n => n.id === callFlowSteps[currentStep].activeNode)?.label}</strong></span>
                  </div>
                </CardContent>
              </Card>

              {/* Conversation */}
              {callFlowSteps[currentStep].conversation && (
                <Card className="border-slate-200/60 dark:border-slate-700/40">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Conversation</p>
                    {callFlowSteps[currentStep].conversation!.ai && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl rounded-tl-none px-3 py-2 flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Volume2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">AI Assistant</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {callFlowSteps[currentStep].conversation!.ai}
                          </p>
                        </div>
                      </div>
                    )}
                    {callFlowSteps[currentStep].conversation!.patient && (
                      <div className="flex gap-2 justify-end">
                        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/40 rounded-xl rounded-tr-none px-3 py-2 max-w-[85%]">
                          <div className="flex items-center gap-1 mb-1 justify-end">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Patient</span>
                            <Mic className="w-3 h-3 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {callFlowSteps[currentStep].conversation!.patient}
                          </p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                    )}
                    {callFlowSteps[currentStep].conversation!.ai2 && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl rounded-tl-none px-3 py-2 flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Volume2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">AI Assistant</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {callFlowSteps[currentStep].conversation!.ai2}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Architecture mini-map for this step */}
              <div className="flex items-center gap-1 justify-center flex-wrap">
                {architectureNodes.map((node) => {
                  const isActive = node.id === callFlowSteps[currentStep].activeNode;
                  const isPast = architectureNodes.findIndex(n => n.id === callFlowSteps[currentStep].activeNode) > architectureNodes.findIndex(n => n.id === node.id);
                  const Icon = node.icon;
                  return (
                    <div key={node.id} className="flex items-center gap-0.5">
                      <motion.div
                        animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                          isActive && 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40',
                          isPast && currentStep >= 0 && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                          !isActive && !isPast && 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </motion.div>
                      {node.id !== 'wa' && (
                        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-slate-300 dark:text-slate-600 ml-0.5" />
              </div>
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Call Flow dekhne ke liye Play dabao</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Ya kisi step par click karo details dekhne ke liye</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 4: INTENT DETECTION
   ═══════════════════════════════════════════════════════════════ */

function IntentDetection() {
  return (
    <motion.section
      custom={3}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Intent Detection</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">AI samajhta hai patient kya chahta hai — aur uske hisaab se action leta hai</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {intents.map((intent, i) => {
          const Icon = intent.icon;
          return (
            <motion.div
              key={intent.name}
              custom={i}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -3 }}
              className={cn('rounded-xl border p-4 space-y-3 transition-all duration-200', intent.bgClass)}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', intent.iconBg)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <h3 className={cn('text-sm font-bold', intent.textClass)}>{intent.name}</h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {intent.flow}
              </p>

              <div className={cn('text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40', intent.textClass)}>
                {intent.example}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 5: DATA FLOW DIAGRAM
   ═══════════════════════════════════════════════════════════════ */

function DataFlowDiagram() {
  return (
    <motion.section
      custom={4}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data Flow — Kaise Data Chalta Hai</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ek real example dekho — kaise data process hota hai ek call mein</p>
        </div>
      </div>

      {/* Data Flow Steps */}
      <div className="space-y-2">
        {dataFlowItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/40 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Icon className={cn('w-4 h-4', item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.label}</p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{item.data}</p>
                </div>
              </div>
              {i < dataFlowItems.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDownRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dashboard Features */}
      <Card className="border-emerald-200/60 dark:border-emerald-800/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Dashboard & Reporting Features</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Real-time Call Monitoring', icon: Phone, desc: 'Live calls dekho dashboard par' },
              { label: 'Appointment Management', icon: CalendarCheck, desc: 'Confirm, cancel, reschedule karo' },
              { label: 'AI Performance Analytics', icon: Brain, desc: 'Accuracy, booking rate, satisfaction' },
              { label: 'Revenue Tracking', icon: DollarSign, desc: 'AI se kitni booking hui' },
              { label: 'Call Recordings', icon: Mic, desc: 'Puri call suno aur transcript padho' },
              { label: 'Team Access Control', icon: Lock, desc: 'Doctor, staff ke liye separate login' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.label} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{feature.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */

export default function CallFlowExplorer() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs shadow-md">
            <Phone className="w-3 h-3 mr-1" /> Voice AI
          </Badge>
          <Badge variant="outline" className="text-xs">5 Clinics</Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Call Flow Explorer
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          &quot;5 medical clinic hain aur Voice AI agent call laga raha hai toh process kya hoga?&quot; — 
          Ye page pura flow samjha dega step by step, Hinglish mein! 🇮🇳
        </p>
      </motion.div>

      {/* Section Divider: Phase Labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
      >
        {[
          { label: 'Architecture', icon: Globe },
          { label: 'Clinic Setup', icon: Building2 },
          { label: 'Call Flow', icon: PhoneForwarded },
          { label: 'Intent Detection', icon: Brain },
          { label: 'Data Flow', icon: FileText },
        ].map((phase, i) => {
          const Icon = phase.icon;
          return (
            <div key={phase.label} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {i + 1}. {phase.label}
              </span>
              {i < 4 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1" />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* All Sections */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        <ArchitectureOverview />
        <ClinicSetup />
        <StepByStepFlow />
        <IntentDetection />
        <DataFlowDiagram />
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="text-center py-6"
      >
        <div className="inline-flex items-center gap-2 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200/40 dark:border-emerald-800/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Ab aapko pura call flow samajh aa gaya hoga! 🎉 Agar koi doubt hai toh{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">AI Chat</span> mein poochen.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
