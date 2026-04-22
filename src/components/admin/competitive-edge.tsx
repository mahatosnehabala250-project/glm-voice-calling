'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sword, CheckCircle2, XCircle, MinusCircle,
  IndianRupee, TrendingUp, Calculator, Star, Quote,
  Users, Globe, Stethoscope, CalendarCheck, MessageSquare,
  Bot, Building2, Sparkles, Phone, BarChart3, FileText,
  ShieldCheck, Zap, Crown, CreditCard, ArrowRight,
  Languages, MessageCircle, UserCog, Mic, AlertTriangle,
  Layers, Code, Tag, CircleDollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ── Animation Variants ─────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ── Feature Comparison Data ────────────────────────────────────────────────────

type FeatureStatus = 'yes' | 'no' | 'partial';

interface Feature {
  name: string;
  voiceai: FeatureStatus;
  vaaniai: FeatureStatus;
  ivr: FeatureStatus;
}

const FEATURES: Feature[] = [
  { name: 'AI Voice Agent', voiceai: 'yes', vaaniai: 'yes', ivr: 'no' },
  { name: 'Multi-Language Support (8+ Indian languages)', voiceai: 'yes', vaaniai: 'partial', ivr: 'partial' },
  { name: 'Patient CRM', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'Appointment Management', voiceai: 'yes', vaaniai: 'partial', ivr: 'no' },
  { name: 'WhatsApp Integration', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'Doctor Portal', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'Team Management', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'Real-time Analytics', voiceai: 'yes', vaaniai: 'partial', ivr: 'no' },
  { name: 'Custom AI Persona', voiceai: 'yes', vaaniai: 'partial', ivr: 'no' },
  { name: 'Call Recording & Transcript', voiceai: 'yes', vaaniai: 'yes', ivr: 'partial' },
  { name: 'Emergency Detection', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'Multi-Clinic Support', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'White Label', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
  { name: 'API Access', voiceai: 'yes', vaaniai: 'yes', ivr: 'no' },
  { name: 'Monthly Pricing', voiceai: 'yes', vaaniai: 'no', ivr: 'no' },
];

function StatusIcon({ status }: { status: FeatureStatus }) {
  if (status === 'yes') {
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />;
  }
  if (status === 'partial') {
    return <MinusCircle className="w-5 h-5 text-amber-500 mx-auto" />;
  }
  return <XCircle className="w-5 h-5 text-rose-400 mx-auto" />;
}

// ── Pricing Data ───────────────────────────────────────────────────────────────

interface Plan {
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  style: 'starter' | 'pro' | 'enterprise' | 'competitor' | 'ivr';
}

const PRICING_PLANS: Plan[] = [
  {
    name: 'VoiceAI Starter',
    price: '₹2,999',
    period: '/month',
    features: ['200 AI calls/month', '2 Languages', 'Basic Analytics', 'Email Support', '1 Clinic'],
    style: 'starter',
  },
  {
    name: 'VoiceAI Pro',
    price: '₹4,999',
    period: '/month',
    features: ['1,000 AI calls/month', '8+ Languages', 'Full Analytics', 'Priority Support', 'Patient CRM', 'WhatsApp Integration', 'Doctor Portal', 'Multi-Clinic (up to 5)'],
    popular: true,
    style: 'pro',
  },
  {
    name: 'VoiceAI Enterprise',
    price: '₹9,999',
    period: '/month',
    features: ['Unlimited AI calls', '8+ Languages + Custom', 'Advanced Analytics', 'Dedicated Support', 'White Label', 'API Access', 'Custom Integrations', 'Unlimited Clinics'],
    style: 'enterprise',
  },
  {
    name: 'VaaniAI',
    price: '₹6,500',
    period: '/month per channel',
    features: ['AI Voice Agent', 'Basic Recording', 'Limited Languages (2-3)', 'No CRM', 'No Doctor Portal', 'No WhatsApp', 'Per-channel pricing'],
    style: 'competitor',
  },
  {
    name: 'Generic IVR',
    price: '₹15,000+',
    period: 'setup + ₹5,000/mo',
    features: ['Pre-recorded menus', 'Basic call routing', 'No AI', 'No Analytics', 'No CRM', 'High setup cost', 'Annual contracts typical'],
    style: 'ivr',
  },
];

const PLAN_STYLE_MAP: Record<Plan['style'], { bg: string; border: string; headerBg: string; headerText: string; iconBg: string; iconText: string; badge: string }> = {
  starter: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    headerBg: 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900',
    headerText: 'text-slate-700 dark:text-slate-300',
    iconBg: 'bg-slate-200 dark:bg-slate-700',
    iconText: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  },
  pro: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-emerald-300 dark:border-emerald-700',
    headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
  enterprise: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-amber-300 dark:border-amber-700',
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    headerText: 'text-white',
    iconBg: 'bg-white/20',
    iconText: 'text-white',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  competitor: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-700',
    headerBg: 'bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800',
    headerText: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-300 dark:bg-slate-600',
    iconText: 'text-slate-500 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500',
  },
  ivr: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-rose-200 dark:border-rose-900',
    headerBg: 'bg-gradient-to-r from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-900/20',
    headerText: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconText: 'text-rose-500 dark:text-rose-400',
    badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  },
};

// ── Differentiators Data ───────────────────────────────────────────────────────

interface Differentiator {
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'emerald' | 'teal' | 'amber' | 'rose' | 'violet' | 'cyan';
  competitorNote: string;
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    title: 'Built-in Patient CRM',
    description: 'Complete patient management with history, preferences, appointment tracking, and follow-up reminders — all in one place.',
    icon: Users,
    color: 'emerald',
    competitorNote: 'VaaniAI has no CRM. Patients are just callers.',
  },
  {
    title: 'Doctor Portal',
    description: 'Dedicated portal for doctors to view appointments, patient summaries, call analytics, and manage their schedule on-the-go.',
    icon: Stethoscope,
    color: 'teal',
    competitorNote: 'VaaniAI has no doctor-facing features.',
  },
  {
    title: '8+ Indian Language AI',
    description: 'Natural conversations in Hindi, English, Tamil, Telugu, Bengali, Kannada, Marathi, and Hinglish — powered by Gemini AI.',
    icon: Languages,
    color: 'amber',
    competitorNote: 'VaaniAI supports only 2-3 languages.',
  },
  {
    title: 'WhatsApp Integration',
    description: 'Automated appointment confirmations, reminders, and follow-ups via WhatsApp Business API with read receipts.',
    icon: MessageCircle,
    color: 'rose',
    competitorNote: 'VaaniAI has zero WhatsApp support.',
  },
  {
    title: 'Team Management',
    description: 'Role-based access for receptionists, nurses, and managers. Assign calls, track performance, and collaborate seamlessly.',
    icon: UserCog,
    color: 'violet',
    competitorNote: 'VaaniAI is single-user only.',
  },
  {
    title: 'Custom AI Persona Builder',
    description: 'Design your AI agent\'s personality, greeting style, and tone. Match your clinic\'s brand voice with full customization.',
    icon: Sparkles,
    color: 'cyan',
    competitorNote: 'VaaniAI offers limited persona options.',
  },
];

const DIFF_COLOR_MAP: Record<Differentiator['color'], { bg: string; text: string; iconBg: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-200 dark:border-emerald-800' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-900/40', border: 'border-teal-200 dark:border-teal-800' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-200 dark:border-amber-800' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-200 dark:border-rose-800' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-200 dark:border-violet-800' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-200 dark:border-cyan-800' },
};

// ── Testimonials Data ──────────────────────────────────────────────────────────

interface Testimonial {
  name: string;
  role: string;
  clinic: string;
  city: string;
  quote: string;
  metric: string;
  metricLabel: string;
  avatar: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Dr. Rajesh Sharma',
    role: 'Dental Surgeon',
    clinic: 'Sharma Dental Clinic',
    city: 'New Delhi',
    quote: 'VoiceAI handles 85% of our calls without any human intervention. Our receptionist now focuses on patient care instead of answering phone calls. The Hinglish AI is incredibly natural — patients often don\'t realize they\'re talking to AI!',
    metric: '85%',
    metricLabel: 'Call automation rate',
    avatar: 'RS',
  },
  {
    name: 'Dr. Priya Mehta',
    role: 'Dermatologist',
    clinic: 'SkinCare Clinic',
    city: 'Mumbai',
    quote: 'We switched from a traditional IVR system that was costing us ₹15,000/month. VoiceAI at ₹4,999/month gives us 10x more features — including WhatsApp reminders that reduced no-shows by 40%. Best ROI we\'ve ever seen.',
    metric: '40%',
    metricLabel: 'No-show reduction',
    avatar: 'PM',
  },
  {
    name: 'Dr. Suresh Reddy',
    role: 'Orthopedic Surgeon',
    clinic: 'Delhi Ortho Center',
    city: 'Hyderabad',
    quote: 'The multi-language support is a game changer for us. Our patients speak Telugu, Hindi, and English. VoiceAI seamlessly handles all three. The Doctor Portal lets me manage my schedule from anywhere.',
    metric: '3x',
    metricLabel: 'Appointment bookings',
    avatar: 'SR',
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CompetitiveEdge() {
  // ROI Calculator State
  const [avgCalls, setAvgCalls] = useState<string>('50');
  const [missedPercent, setMissedPercent] = useState<string>('30');
  const [appointmentValue, setAppointmentValue] = useState<string>('800');

  const roiData = useMemo(() => {
    const calls = parseInt(avgCalls) || 0;
    const missed = parseFloat(missedPercent) || 0;
    const value = parseFloat(appointmentValue) || 0;

    const missedPerDay = calls * (missed / 100);
    const recoveredPerDay = missedPerDay * 0.75; // AI recovers ~75%
    const monthlyRecovered = recoveredPerDay * 30;
    const monthlyRevenue = monthlyRecovered * value;
    const annualRevenue = monthlyRevenue * 12;
    const monthlyCost = 4999; // Pro plan
    const annualCost = monthlyCost * 12;
    const annualSavings = annualRevenue - annualCost;
    const roi = annualCost > 0 ? Math.round((annualSavings / annualCost) * 100) : 0;

    return {
      missedPerDay: Math.round(missedPerDay),
      recoveredPerDay: Math.round(recoveredPerDay * 10) / 10,
      monthlyRecovered: Math.round(monthlyRecovered),
      monthlyRevenue: Math.round(monthlyRevenue),
      annualRevenue: Math.round(annualRevenue),
      annualSavings: Math.round(annualSavings),
      roi,
    };
  }, [avgCalls, missedPercent, appointmentValue]);

  // Count feature totals
  const voiceaiYes = FEATURES.filter(f => f.voiceai === 'yes').length;
  const vaaniaiYes = FEATURES.filter(f => f.vaaniai === 'yes').length;
  const ivrYes = FEATURES.filter(f => f.ivr === 'yes').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── 1. Page Header ─────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-800 dark:via-teal-800 dark:to-emerald-900 p-6 lg:p-8">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
              <Sword className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                Competitive Edge
                <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20 text-xs px-2.5">
                  Internal — Sales Team
                </Badge>
              </h1>
              <p className="text-emerald-100/80 mt-2 text-sm lg:text-base max-w-2xl leading-relaxed">
                Understand VoiceAI&apos;s advantages over VaaniAI and Generic IVR systems. Use this intelligence for client conversations, proposal comparisons, and objection handling.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-center px-4">
                <p className="text-3xl font-bold text-white">{voiceaiYes}/15</p>
                <p className="text-xs text-emerald-200/70 mt-0.5">VoiceAI Features</p>
              </div>
              <Separator orientation="vertical" className="h-12 bg-white/20" />
              <div className="text-center px-4">
                <p className="text-3xl font-bold text-white/50">{vaaniaiYes}/15</p>
                <p className="text-xs text-emerald-200/50 mt-0.5">VaaniAI Features</p>
              </div>
              <Separator orientation="vertical" className="h-12 bg-white/20" />
              <div className="text-center px-4">
                <p className="text-3xl font-bold text-white/30">{ivrYes}/15</p>
                <p className="text-xs text-emerald-200/40 mt-0.5">Generic IVR Features</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Feature Comparison Matrix ────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              Feature Comparison Matrix
            </CardTitle>
            <CardDescription>Side-by-side comparison across all key capabilities</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3.5 px-4 lg:px-6 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 min-w-[220px]">
                      Feature
                    </th>
                    <th className="text-center py-3.5 px-4 lg:px-6 font-semibold bg-emerald-50 dark:bg-emerald-900/20 min-w-[100px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400">VoiceAI</span>
                      </div>
                    </th>
                    <th className="text-center py-3.5 px-4 lg:px-6 font-semibold bg-slate-50 dark:bg-slate-800/50 min-w-[100px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">VaaniAI</span>
                      </div>
                    </th>
                    <th className="text-center py-3.5 px-4 lg:px-6 font-semibold bg-rose-50 dark:bg-rose-900/10 min-w-[100px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        <span className="text-rose-500 dark:text-rose-400">Generic IVR</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feature, i) => (
                    <motion.tr
                      key={feature.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                      className={cn(
                        'border-b border-slate-100 dark:border-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors',
                        i % 2 === 0 && 'bg-slate-50/30 dark:bg-slate-800/20'
                      )}
                    >
                      <td className="py-3 px-4 lg:px-6 text-slate-700 dark:text-slate-300 font-medium">
                        {feature.name}
                      </td>
                      <td className="py-3 px-4 lg:px-6 text-center">
                        <StatusIcon status={feature.voiceai} />
                      </td>
                      <td className="py-3 px-4 lg:px-6 text-center">
                        <StatusIcon status={feature.vaaniai} />
                      </td>
                      <td className="py-3 px-4 lg:px-6 text-center">
                        <StatusIcon status={feature.ivr} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold">
                    <td className="py-3.5 px-4 lg:px-6 text-slate-700 dark:text-slate-300">
                      Total Full Support
                    </td>
                    <td className="py-3.5 px-4 lg:px-6 text-center">
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 font-bold">
                        {voiceaiYes}/15
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 lg:px-6 text-center">
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 font-bold">
                        {vaaniaiYes}/15
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 lg:px-6 text-center">
                      <Badge className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-0 font-bold">
                        {ivrYes}/15
                      </Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 px-4 lg:px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Full Support
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MinusCircle className="w-4 h-4 text-amber-500" /> Partial Support
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <XCircle className="w-4 h-4 text-rose-400" /> Not Available
              </div>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                Last updated: June 2025
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 3. Pricing Comparison ───────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-white" />
            </div>
            Pricing Comparison
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Transparent pricing — no hidden fees, no per-channel surprises
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {PRICING_PLANS.map((plan, i) => {
            const style = PLAN_STYLE_MAP[plan.style];
            const PlanIcon = plan.style === 'pro' ? Zap : plan.style === 'enterprise' ? Crown : plan.style === 'ivr' ? Phone : CreditCard;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className={cn(
                  'relative rounded-xl border overflow-hidden transition-shadow duration-300 hover:shadow-lg',
                  style.bg,
                  style.border,
                  plan.popular && 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10'
                )}
              >
                {/* Popular ribbon */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className={cn('px-4 py-3', style.headerBg)}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', style.iconBg)}>
                      <PlanIcon className={cn('w-3.5 h-3.5', style.iconText)} />
                    </div>
                    <span className={cn('text-xs font-bold', style.headerText)}>{plan.name}</span>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{plan.period}</span>

                  <Separator className="my-3" />

                  <ul className="space-y-1.5">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pricing insight callout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Key Pricing Insight for Sales
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-1 leading-relaxed">
                VoiceAI Pro at ₹4,999/month includes features that VaaniAI doesn&apos;t offer at any price point.
                VaaniAI at ₹6,500/channel can quickly exceed ₹13,000 for just 2 channels with far fewer features.
                Generic IVR requires ₹15,000+ upfront setup cost — making VoiceAI the clear winner for ROI.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── 4. ROI Calculator ───────────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              ROI Calculator
            </CardTitle>
            <CardDescription>Show prospects the revenue impact of switching to VoiceAI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-slate-500" />
                  Input Parameters
                </h3>
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-2">
                    <Label htmlFor="avgCalls" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Average calls per day
                    </Label>
                    <Input
                      id="avgCalls"
                      type="number"
                      min="1"
                      value={avgCalls}
                      onChange={(e) => setAvgCalls(e.target.value)}
                      className="max-w-[200px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="missedPercent" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Missed call percentage (%)
                    </Label>
                    <Input
                      id="missedPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={missedPercent}
                      onChange={(e) => setMissedPercent(e.target.value)}
                      className="max-w-[200px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointmentValue" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Average appointment value (₹)
                    </Label>
                    <Input
                      id="appointmentValue"
                      type="number"
                      min="0"
                      value={appointmentValue}
                      onChange={(e) => setAppointmentValue(e.target.value)}
                      className="max-w-[200px]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Assumptions: AI recovers ~75% of missed calls, VoiceAI Pro plan at ₹4,999/month
                </p>
              </div>

              {/* Outputs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Projected Returns
                </h3>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Calls missed/day</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{roiData.missedPerDay}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Calls recovered/day</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{roiData.recoveredPerDay}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Monthly revenue recovered</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{roiData.monthlyRevenue.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Annual savings</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{roiData.annualSavings.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <Separator className="my-4 bg-emerald-200 dark:bg-emerald-800/50" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Return on Investment</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{roiData.roi}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">First month payback</p>
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-xs mt-1">
                        {roiData.monthlyRevenue > 4999 ? '✓ Yes' : '✗ No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 5. Key Differentiators ──────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            Key Differentiators
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Features that make VoiceAI the clear choice over competitors
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIFFERENTIATORS.map((diff, i) => {
            const colors = DIFF_COLOR_MAP[diff.color];
            const Icon = diff.icon;
            return (
              <motion.div
                key={diff.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className={cn('h-full border transition-shadow duration-300 hover:shadow-lg', colors.border)}>
                  <CardContent className="p-5">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colors.iconBg)}>
                      <Icon className={cn('w-5 h-5', colors.text)} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{diff.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      {diff.description}
                    </p>
                    <div className={cn('text-[11px] font-medium px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5', colors.bg, colors.text)}>
                      <XCircle className="w-3 h-3" />
                      {diff.competitorNote}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 6. Customer Testimonials ────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Quote className="w-4 h-4 text-white" />
            </div>
            Customer Testimonials
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real feedback from Indian healthcare providers using VoiceAI
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card className="h-full border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-5 flex flex-col">
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1 mb-4">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <Separator className="mb-4" />
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{t.avatar}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.clinic}, {t.city}</p>
                    </div>
                  </div>
                  {/* Metric */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{t.metric}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.metricLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Bottom CTA / Sales Tips ─────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="p-5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Quick Objection Handling Tips</h3>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-emerald-700 dark:text-emerald-400/80">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>Price:</strong> &ldquo;VaaniAI charges ₹6,500 per channel — for 2 channels that&apos;s ₹13,000/month with fewer features. VoiceAI Pro gives you everything for ₹4,999.&rdquo;</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>IVR:</strong> &ldquo;Generic IVR requires ₹15,000+ setup cost and has no AI. VoiceAI is ready to go with zero setup fees.&rdquo;</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>Language:</strong> &ldquo;VaaniAI supports 2-3 languages. VoiceAI supports 8+ Indian languages including regional dialects and Hinglish.&rdquo;</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>CRM:</strong> &ldquo;Neither VaaniAI nor IVR has a CRM. VoiceAI includes full patient CRM with history, follow-ups, and WhatsApp reminders.&rdquo;</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
