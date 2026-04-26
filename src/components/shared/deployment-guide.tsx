'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  Gauge,
  Wifi,
  WifiOff,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Terminal,
  Globe,
  Shield,
  Zap,
  Boxes,
  Container,
  Database,
  Phone,
  Brain,
  Radio,
  Headphones,
  GitBranch,
  Copy,
  Check,
  Clock,
  Settings,
  Cpu,
  HardDrive,
  Network,
  Layers,
  Workflow,
  MessageSquare,
  Key,
  Crown,
  Rocket,
  Star,
  Lightbulb,
  MonitorSmartphone,
} from 'lucide-react';

/* ============================================================
   Types & Data
   ============================================================ */

type Verdict = 'recommended' | 'not_suitable' | 'limited';

interface PlatformData {
  id: string;
  name: string;
  emoji: string;
  verdict: Verdict;
  verdictLabel: string;
  tagline: string;
  cost: string;
  costDetail: string;
  setupDifficulty: 'Easy' | 'Medium' | 'Hard';
  websocketSupport: boolean;
  longRunning: boolean;
  multiService: boolean;
  pros: string[];
  cons: string[];
  bestFor: string;
  colorClass: string;
  borderColorClass: string;
  bgColorClass: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
}

const platforms: PlatformData[] = [
  {
    id: 'vercel',
    name: 'Vercel',
    emoji: '▲',
    verdict: 'not_suitable',
    verdictLabel: 'NOT SUITABLE',
    tagline: 'Serverless-only, built for frontend',
    cost: '$0-20/mo',
    costDetail: 'Free tier exists but cannot run most services',
    setupDifficulty: 'Easy',
    websocketSupport: false,
    longRunning: false,
    multiService: false,
    pros: [
      'Zero-config Next.js deployments',
      'Global edge network',
      'Preview deployments for every PR',
    ],
    cons: [
      'Serverless only — no persistent processes',
      '10-second execution timeout',
      'No WebSocket servers',
      'Cannot run Vobiz, Gemini AI, WS Bridge, or Orchestrator',
    ],
    bestFor: 'Frontend-only apps, static sites, landing pages',
    colorClass: 'text-rose-500',
    borderColorClass: 'border-rose-500/30',
    bgColorClass: 'bg-rose-500/5',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
    iconBg: 'bg-rose-500/10',
  },
  {
    id: 'railway',
    name: 'Railway',
    emoji: '🚂',
    verdict: 'recommended',
    verdictLabel: 'RECOMMENDED — Quick Start',
    tagline: 'Best for quick start & Indian developers',
    cost: '$35-50/mo',
    costDetail: '~$5-10/service/mo × 6 services — INR billing available',
    setupDifficulty: 'Easy',
    websocketSupport: true,
    longRunning: true,
    multiService: true,
    pros: [
      'Auto-discovers services from repo structure',
      'Native WebSocket & long-running process support',
      'Built-in Supabase integration',
      'Easy environment variable management',
      'GitHub auto-deploy on every push',
      'INR billing available for Indian developers',
    ],
    cons: [
      'Costs add up with many services',
      'Less control over infrastructure',
      'Vendor lock-in',
    ],
    bestFor: 'Startups, quick MVPs, teams without DevOps',
    colorClass: 'text-emerald-500',
    borderColorClass: 'border-emerald-500/30',
    bgColorClass: 'bg-emerald-500/5',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    iconBg: 'bg-emerald-500/10',
  },
  {
    id: 'coolify',
    name: 'Coolify on VPS',
    emoji: '🟢',
    verdict: 'recommended',
    verdictLabel: 'RECOMMENDED — Long-term',
    tagline: 'Self-hosted PaaS, best value for India',
    cost: '₹500-1500/mo',
    costDetail: 'VPS only (~$6-18/mo TOTAL for everything)',
    setupDifficulty: 'Medium',
    websocketSupport: true,
    longRunning: true,
    multiService: true,
    pros: [
      'Open-source Heroku alternative',
      'Run ALL services on ONE VPS',
      'Full infrastructure control',
      'Docker-native deployment',
      'Best cost for Indian market (Hostinger, Contabo)',
      'Self-hosted — no vendor lock-in',
    ],
    cons: [
      'Requires initial VPS setup',
      'You manage your own server',
      'Manual SSL/TLS configuration',
      'Scaling limited to single VPS resources',
    ],
    bestFor: 'Cost-conscious teams, Indian market, long-term projects',
    colorClass: 'text-emerald-500',
    borderColorClass: 'border-emerald-500/30',
    bgColorClass: 'bg-emerald-500/5',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    iconBg: 'bg-emerald-500/10',
  },
  {
    id: 'aws',
    name: 'AWS',
    emoji: '☁️',
    verdict: 'recommended',
    verdictLabel: 'Enterprise Scale',
    tagline: 'Most powerful, most complex',
    cost: '$30-100+/mo',
    costDetail: 'EC2/ECS/EKS — costs scale with usage',
    setupDifficulty: 'Hard',
    websocketSupport: true,
    longRunning: true,
    multiService: true,
    pros: [
      'EC2, ECS, EKS deployment options',
      'Unlimited scalability',
      'Global infrastructure',
      'Managed services (RDS, ElastiCache)',
      'Enterprise security & compliance',
    ],
    cons: [
      'Very complex setup',
      'Needs dedicated DevOps expertise',
      'Can get expensive quickly',
      'Steep learning curve',
    ],
    bestFor: 'Enterprise, high-scale production, teams with DevOps',
    colorClass: 'text-slate-400',
    borderColorClass: 'border-slate-500/30',
    bgColorClass: 'bg-slate-500/5',
    badgeBg: 'bg-slate-700',
    badgeText: 'text-white',
    iconBg: 'bg-slate-500/10',
  },
  {
    id: 'hostinger',
    name: 'Hostinger',
    emoji: '🟡',
    verdict: 'limited',
    verdictLabel: 'LIMITED',
    tagline: 'Budget option with caveats',
    cost: '₹500-2000/mo',
    costDetail: 'VPS plans only — shared hosting will NOT work',
    setupDifficulty: 'Medium',
    websocketSupport: true,
    longRunning: true,
    multiService: true,
    pros: [
      'Very affordable VPS options',
      'Indian data centers available',
      'Good for simple setups',
    ],
    cons: [
      'Shared hosting: Cannot run microservices at all',
      'VPS: Works with Docker but manual setup required',
      'Limited resources on cheap plans',
      'No built-in CI/CD',
    ],
    bestFor: 'Budget projects, developers comfortable with manual setup',
    colorClass: 'text-amber-500',
    borderColorClass: 'border-amber-500/30',
    bgColorClass: 'bg-amber-500/5',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
    iconBg: 'bg-amber-500/10',
  },
];

interface ServiceNode {
  id: string;
  name: string;
  port: number;
  tech: string;
  purpose: string;
  emoji: string;
  color: string;
}

const services: ServiceNode[] = [
  {
    id: 'nextjs',
    name: 'Next.js App',
    port: 3000,
    tech: 'Next.js 16 + Bun',
    purpose: 'Main web app (frontend + 30+ API routes)',
    emoji: '🌐',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'vobiz',
    name: 'Vobiz SIP Service',
    port: 3031,
    tech: 'Bun HTTP',
    purpose: 'SIP trunking integration',
    emoji: '📞',
    color: 'from-cyan-500 to-sky-600',
  },
  {
    id: 'gemini',
    name: 'Gemini AI Service',
    port: 3032,
    tech: 'Bun HTTP',
    purpose: 'AI chat, transcription, sentiment, summary',
    emoji: '🧠',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'wsbridge',
    name: 'WebSocket Bridge',
    port: 3033,
    tech: 'Node.js WS',
    purpose: 'Real-time audio bridge (Vobiz ↔ Gemini)',
    emoji: '📡',
    color: 'from-orange-500 to-amber-600',
  },
  {
    id: 'simulator',
    name: 'Call Simulator',
    port: 3004,
    tech: 'Socket.IO',
    purpose: 'Test call simulator',
    emoji: '🎧',
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'orchestrator',
    name: 'Call Orchestrator',
    port: 3035,
    tech: 'Bun HTTP',
    purpose: 'Call flow orchestration (THE BRAIN)',
    emoji: '⚙️',
    color: 'from-emerald-600 to-green-700',
  },
];

interface Connection {
  from: string;
  to: string;
  label: string;
  type: 'http' | 'ws' | 'event';
}

const connections: Connection[] = [
  { from: 'nextjs', to: 'vobiz', label: 'HTTP', type: 'http' },
  { from: 'nextjs', to: 'gemini', label: 'HTTP', type: 'http' },
  { from: 'nextjs', to: 'orchestrator', label: 'HTTP', type: 'http' },
  { from: 'vobiz', to: 'wsbridge', label: 'Audio Stream', type: 'ws' },
  { from: 'gemini', to: 'wsbridge', label: 'AI Stream', type: 'ws' },
  { from: 'wsbridge', to: 'orchestrator', label: 'Events', type: 'event' },
  { from: 'simulator', to: 'wsbridge', label: 'Test Calls', type: 'ws' },
  { from: 'orchestrator', to: 'vobiz', label: 'Commands', type: 'http' },
  { from: 'orchestrator', to: 'gemini', label: 'Prompts', type: 'http' },
];

/* ============================================================
   Sub-components
   ============================================================ */

function VerdictBadge({ platform }: { platform: PlatformData }) {
  const Icon =
    platform.verdict === 'recommended'
      ? CheckCircle2
      : platform.verdict === 'not_suitable'
        ? XCircle
        : AlertTriangle;

  return (
    <Badge
      className={cn(
        'gap-1.5 px-2.5 py-1 text-xs font-semibold',
        platform.badgeBg,
        platform.badgeText
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {platform.verdictLabel}
    </Badge>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const config = {
    Easy: { color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dots: 1 },
    Medium: { color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', dots: 2 },
    Hard: { color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20', dots: 3 },
  };
  const c = config[level as keyof typeof config] || config.Easy;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        c.color
      )}
    >
      <Gauge className="w-3 h-3" />
      {level}
      <span className="flex gap-0.5 ml-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              i <= c.dots ? 'bg-current opacity-80' : 'bg-current opacity-20'
            )}
          />
        ))}
      </span>
    </span>
  );
}

function CheckItem({ text, positive = true }: { text: string; positive?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {positive ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
      )}
      <span className="text-slate-600 dark:text-slate-400">{text}</span>
    </li>
  );
}

function PlatformCard({ platform }: { platform: PlatformData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-300 hover:shadow-lg border',
          platform.borderColorClass,
          platform.verdict === 'not_suitable' && 'opacity-75 hover:opacity-100'
        )}
      >
        {/* Top accent bar */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1',
            platform.verdict === 'recommended' &&
              'bg-gradient-to-r from-emerald-500 to-teal-500',
            platform.verdict === 'not_suitable' &&
              'bg-gradient-to-r from-rose-500 to-red-500',
            platform.verdict === 'limited' &&
              'bg-gradient-to-r from-amber-500 to-orange-500'
          )}
        />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                  platform.iconBg
                )}
              >
                {platform.emoji}
              </div>
              <div>
                <CardTitle className="text-lg">{platform.name}</CardTitle>
                <CardDescription className="mt-0.5">{platform.tagline}</CardDescription>
              </div>
            </div>
            <VerdictBadge platform={platform} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Cost */}
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Cost
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {platform.cost}
              </span>
            </div>

            {/* Setup difficulty */}
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Setup
              </span>
              <DifficultyBadge level={platform.setupDifficulty} />
            </div>

            {/* WebSocket */}
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                WebSocket
              </span>
              {platform.websocketSupport ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  No
                </span>
              )}
            </div>

            {/* Long-running */}
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Long-running
              </span>
              {platform.longRunning ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Yes
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  <XCircle className="w-3.5 h-3.5" />
                  No
                </span>
              )}
            </div>
          </div>

          {/* Cost detail */}
          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 rounded-md px-3 py-2">
            💰 {platform.costDetail}
          </p>

          {/* Best for */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Best for:</span>{' '}
              {platform.bestFor}
            </span>
          </div>

          {/* Expand/collapse details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View details
              </>
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Separator className="my-3" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      ✅ Pros
                    </h4>
                    <ul className="space-y-2">
                      {platform.pros.map((pro, i) => (
                        <CheckItem key={i} text={pro} positive />
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      ❌ Cons
                    </h4>
                    <ul className="space-y-2">
                      {platform.cons.map((con, i) => (
                        <CheckItem key={i} text={con} positive={false} />
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================
   Architecture Diagram
   ============================================================ */

function ArchitectureDiagram() {
  return (
    <div className="w-full">
      <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 overflow-x-auto">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative min-w-[700px]">
          {/* Section: Title */}
          <div className="text-center mb-6">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              VoiceAI Microservices Architecture
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              6 Services • 9 Connections • Real-time Audio Pipeline
            </p>
          </div>

          {/* Row 1: External Services */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-4">
            {[
              { name: 'Gemini AI', emoji: '🧠', detail: 'External' },
              { name: 'Vobiz SIP', emoji: '📞', detail: 'External' },
              { name: 'Supabase', emoji: '🗄️', detail: 'PostgreSQL' },
              { name: 'n8n / WhatsApp', emoji: '🔄', detail: 'Workflows' },
            ].map((ext) => (
              <div
                key={ext.name}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50"
              >
                <span className="text-lg">{ext.emoji}</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {ext.name}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {ext.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Arrow down from external */}
          <div className="flex justify-center mb-4">
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 relative">
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-slate-300 dark:border-t-slate-600" />
            </div>
          </div>

          {/* Row 2: Internal Services */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
            {/* Next.js App */}
            <ServiceNodeCard service={services[0]} highlighted />

            {/* Vobiz SIP Service */}
            <ServiceNodeCard service={services[1]} />

            {/* Gemini AI Service */}
            <ServiceNodeCard service={services[2]} />
          </div>

          {/* Connection arrows between row 2 services */}
          <div className="flex justify-center items-center gap-8 mb-4">
            <div className="flex items-center gap-1">
              <div className="h-px w-8 sm:w-12 bg-emerald-400/50" />
              <ArrowRight className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">:3031</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-px w-8 sm:w-12 bg-emerald-400/50" />
              <ArrowRight className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">:3032</span>
            </div>
          </div>

          {/* Central Hub: WebSocket Bridge */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 animate-pulse" />
              <div className="relative px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20 flex items-center gap-3">
                <Radio className="w-5 h-5" />
                <div>
                  <div className="text-sm font-bold">WebSocket Bridge</div>
                  <div className="text-xs opacity-80">Real-time Audio Hub — Port 3033</div>
                </div>
              </div>
              {/* Connection lines from hub */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-5 bg-orange-400/50" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-px h-5 bg-orange-400/50" />
            </div>
          </div>

          {/* Row 3: Bottom services */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* Call Simulator */}
            <ServiceNodeCard service={services[4]} />

            {/* Call Orchestrator */}
            <div className="relative">
              <ServiceNodeCard service={services[5]} highlighted />
              <div className="absolute -top-2 -right-2 -translate-y-full">
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  THE BRAIN
                </Badge>
              </div>
            </div>

            {/* Empty space for symmetry / info box */}
            <div className="flex items-center justify-center">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-center">
                <Layers className="w-5 h-5 text-slate-400 dark:text-slate-500 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Docker
                  <br />
                  Container
                  <br />
                  Per Service
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {[
              { label: 'HTTP', color: 'bg-emerald-400' },
              { label: 'WebSocket', color: 'bg-orange-400' },
              { label: 'Events', color: 'bg-purple-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn('w-3 h-0.5 rounded-full', item.color)} />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {item.label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Container className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Each service = 1 Docker container
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceNodeCard({
  service,
  highlighted = false,
}: {
  service: ServiceNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative p-3 rounded-xl border transition-all duration-200',
        highlighted
          ? 'border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-800 shadow-md'
          : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-lg shrink-0',
            service.color
          )}
        >
          {service.emoji}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
              {service.name}
            </span>
            {highlighted && (
              <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              :{service.port}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">•</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {service.tech}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
        {service.purpose}
      </p>
    </div>
  );
}

/* ============================================================
   Railway Quick Start
   ============================================================ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          {language}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="text-xs font-mono text-emerald-400 leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}

function RailwayQuickStart() {
  const steps = [
    {
      number: 1,
      title: 'Connect your GitHub repo',
      description:
        'Create a new Railway project and connect your VoiceAI GitHub repository. Railway auto-detects the monorepo structure.',
      icon: GitBranch,
      code: null,
    },
    {
      number: 2,
      title: 'Add services (auto-discovery)',
      description:
        'Railway will auto-discover each service from your Dockerfiles. Add all 6 services:',
      icon: Boxes,
      code: `# Railway will auto-detect these from your repo:
├── Dockerfile.nextjs        → Next.js App (:3000)
├── Dockerfile.vobiz         → Vobiz SIP (:3031)
├── Dockerfile.gemini        → Gemini AI (:3032)
├── Dockerfile.wsbridge      → WS Bridge (:3033)
├── Dockerfile.simulator     → Call Simulator (:3004)
└── Dockerfile.orchestrator  → Orchestrator (:3035)`,
    },
    {
      number: 3,
      title: 'Configure environment variables',
      description:
        'Set up environment variables for each service. Railway supports shared variables and per-service secrets.',
      icon: Key,
      code: `# Example: Shared environment variables
DATABASE_URL=postgresql://...
GEMINI_API_KEY=AIza...
VOBIZ_API_KEY=your-key
VOBIZ_SIP_TRUNK=your-trunk-id

# Example: Per-service variables
NEXTAUTH_SECRET=random-secret
NEXTAUTH_URL=https://your-railway.app`,
    },
    {
      number: 4,
      title: 'Set up Supabase (database)',
      description:
        'Railway has native Supabase integration, or connect your own Supabase project for PostgreSQL.',
      icon: Database,
      code: `# In Railway → New → Database → Supabase
# Or connect your existing Supabase project URL

# .env for Supabase connection
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[pwd]@db.xxx.supabase.co:5432/postgres`,
    },
    {
      number: 5,
      title: 'Configure networking & domains',
      description:
        'Railway assigns each service a unique URL. Set up your custom domain and internal service networking.',
      icon: Globe,
      code: `# Railway auto-assigns internal URLs:
# nextjs-production.up.railway.app
# vobiz-production.up.railway.app
# gemini-production.up.railway.app
# etc.

# Set your custom domain:
railway domain set voiceai.yourdomain.com

# Internal service references (auto-resolved):
VOBIZ_URL=http://vobiz-production:3031
GEMINI_URL=http://gemini-production:3032
WS_BRIDGE_URL=ws://wsbridge-production:3033`,
    },
    {
      number: 6,
      title: 'Deploy & monitor',
      description:
        'Push to GitHub and Railway auto-deploys. Monitor all services from the Railway dashboard.',
      icon: Rocket,
      code: `# Auto-deploy on every push!
git push origin main

# Monitor services:
railway status    # Check all service statuses
railway logs      # View live logs
railway metrics   # See CPU, memory, network`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Get Started in 6 Steps
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Deploy your entire VoiceAI stack to Railway in under 30 minutes.
                Railway handles service discovery, SSL, and auto-scaling for you.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Zap className="w-3 h-3" />
                  ~30 min setup
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <DollarSign className="w-3 h-3" />
                  ~$35-50/mo
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Wifi className="w-3 h-3" />
                  WebSocket ready
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: step.number * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-white">
                      {step.number}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <step.icon className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {step.description}
                    </p>

                    {step.code && (
                      <div className="mt-3">
                        <CodeBlock code={step.code} />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Summary Comparison Table
   ============================================================ */

function ComparisonTable() {
  const metrics = [
    {
      label: 'Monthly Cost',
      icon: DollarSign,
      values: ['$0-20', '$35-50', '₹500-1500', '$30-100+', '₹500-2000'],
    },
    {
      label: 'WebSocket',
      icon: Wifi,
      values: ['❌', '✅', '✅', '✅', '✅'],
    },
    {
      label: 'Long-running',
      icon: Clock,
      values: ['❌', '✅', '✅', '✅', '✅'],
    },
    {
      label: 'Multi-service',
      icon: Boxes,
      values: ['❌', '✅', '✅', '✅', '⚠️'],
    },
    {
      label: 'Setup',
      icon: Gauge,
      values: ['Easy', 'Easy', 'Medium', 'Hard', 'Medium'],
    },
    {
      label: 'DevOps needed',
      icon: Terminal,
      values: ['None', 'None', 'Basic', 'Expert', 'Basic'],
    },
  ];

  const platformNames = ['Vercel', 'Railway', 'Coolify', 'AWS', 'Hostinger'];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-emerald-500" />
          Quick Comparison Matrix
        </CardTitle>
        <CardDescription>Side-by-side feature comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400 text-xs">
                  Feature
                </th>
                {platformNames.map((name, i) => (
                  <th
                    key={name}
                    className={cn(
                      'text-center py-2 px-2 font-medium text-xs',
                      i === 1 && 'text-emerald-600 dark:text-emerald-400',
                      i === 2 && 'text-emerald-600 dark:text-emerald-400',
                      i === 0 && 'text-rose-500',
                      i === 4 && 'text-amber-500',
                      i === 3 && 'text-slate-400'
                    )}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr
                  key={metric.label}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <td className="py-2.5 px-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <metric.icon className="w-3.5 h-3.5" />
                      {metric.label}
                    </span>
                  </td>
                  {metric.values.map((val, i) => (
                    <td
                      key={i}
                      className={cn(
                        'text-center py-2.5 px-2 text-xs font-medium',
                        val === '✅' && 'text-emerald-500',
                        val === '❌' && 'text-rose-500',
                        val === '⚠️' && 'text-amber-500',
                        i === 1 && val !== '✅' && val !== '❌' && 'text-emerald-600 dark:text-emerald-400',
                        i === 2 && val !== '✅' && val !== '❌' && 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Main Component
   ============================================================ */

export default function DeploymentGuide() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-teal-600/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-4">
              <Server className="w-3.5 h-3.5" />
              Deployment Guide
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              VoiceAI{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                Deployment
              </span>{' '}
              Architecture
            </h1>

            <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Comprehensive comparison of deployment platforms for your VoiceAI
              microservices stack. 6 services, 9 connections, one goal — ship it.
            </p>

            {/* Quick stats */}
            <div className="flex items-center justify-center gap-6 mt-6">
              {[
                { label: 'Services', value: '6', icon: Boxes },
                { label: 'Connections', value: '9', icon: Network },
                { label: 'Platforms', value: '5', icon: Globe },
                { label: 'Recommended', value: '3', icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="w-4 h-4 text-emerald-500" />
                  <div className="text-left">
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto flex overflow-x-auto bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger value="overview" className="gap-1.5 whitespace-nowrap">
              <MonitorSmartphone className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5 whitespace-nowrap">
              <Server className="w-4 h-4" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="architecture" className="gap-1.5 whitespace-nowrap">
              <Network className="w-4 h-4" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="quickstart" className="gap-1.5 whitespace-nowrap">
              <Rocket className="w-4 h-4" />
              Quick Start
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick summary */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  title: 'Quick Start',
                  platform: 'Railway',
                  icon: Rocket,
                  description: 'Deploy in 30 minutes. Best for startups & teams without DevOps.',
                  cost: '$35-50/mo',
                  color: 'from-emerald-500 to-teal-600',
                },
                {
                  title: 'Long-term Cost',
                  platform: 'Coolify on VPS',
                  icon: Shield,
                  description: 'Self-hosted, full control. Best for Indian market & budget teams.',
                  cost: '₹500-1500/mo',
                  color: 'from-emerald-600 to-green-700',
                },
                {
                  title: 'Enterprise',
                  platform: 'AWS',
                  icon: Cpu,
                  description: 'Maximum scalability. Best for large-scale production.',
                  cost: '$30-100+/mo',
                  color: 'from-slate-500 to-slate-700',
                },
              ].map((rec) => (
                <motion.div
                  key={rec.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="relative overflow-hidden border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                    <div
                      className={cn(
                        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
                        rec.color
                      )}
                    />
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
                            rec.color
                          )}
                        >
                          <rec.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {rec.title}
                          </h3>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {rec.platform}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {rec.description}
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <DollarSign className="w-3 h-3" />
                        {rec.cost}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Comparison Table */}
            <ComparisonTable />

            {/* Why Vercel doesn't work */}
            <Card className="border-rose-500/20 bg-rose-500/5 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-rose-500 to-red-500" />
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Why Vercel Doesn&apos;t Work
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Vercel is serverless-only with a 10-second timeout. 4 out of 6
                      VoiceAI services require persistent processes or WebSocket connections.
                      Vercel can only host the Next.js frontend — the core of your application
                      (SIP, AI, real-time audio) simply cannot run there.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                        No WebSocket servers
                      </Badge>
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                        10s timeout limit
                      </Badge>
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                        No long-running processes
                      </Badge>
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                        Cannot run 4/6 services
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-4">
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PlatformCard platform={platform} />
              </motion.div>
            ))}
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-6">
            {/* Architecture diagram */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-emerald-500" />
                  Microservices Architecture
                </CardTitle>
                <CardDescription>
                  All 6 VoiceAI services and their connections visualized
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ArchitectureDiagram />
              </CardContent>
            </Card>

            {/* Service details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-500" />
                  Service Details
                </CardTitle>
                <CardDescription>
                  Complete breakdown of all VoiceAI microservices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-lg shrink-0',
                            service.color
                          )}
                        >
                          {service.emoji}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {service.name}
                          </h4>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                            :{service.port}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {service.tech}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {service.purpose}
                          </span>
                        </div>
                      </div>

                      {service.id === 'orchestrator' && (
                        <div className="mt-3 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            ⚡ THE BRAIN — Orchestrates all call flows
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* External integrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-emerald-500" />
                  External Integrations
                </CardTitle>
                <CardDescription>
                  Third-party services that VoiceAI connects to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      name: 'Gemini AI',
                      emoji: '🧠',
                      detail: 'LLM & Transcription',
                    },
                    {
                      name: 'Vobiz SIP',
                      emoji: '📞',
                      detail: 'SIP Trunking',
                    },
                    {
                      name: 'Supabase',
                      emoji: '🗄️',
                      detail: 'PostgreSQL DB',
                    },
                    {
                      name: 'n8n',
                      emoji: '🔄',
                      detail: 'Workflows',
                    },
                    {
                      name: 'WhatsApp',
                      emoji: '💬',
                      detail: 'MSG91 API',
                    },
                    {
                      name: 'NextAuth',
                      emoji: '🔐',
                      detail: 'Authentication',
                    },
                  ].map((ext) => (
                    <div
                      key={ext.name}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-center"
                    >
                      <span className="text-2xl">{ext.emoji}</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-white">
                        {ext.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {ext.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Start Tab */}
          <TabsContent value="quickstart" className="space-y-6">
            <RailwayQuickStart />

            {/* Coolify alternative */}
            <Card className="border-emerald-500/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-600 to-green-600" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center">
                      <Container className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Alternative: Coolify on VPS</CardTitle>
                      <CardDescription>
                        Best long-term cost — everything on one VPS
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    💰 Best Value
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Coolify is an open-source, self-hosted PaaS (Platform as a Service).
                  It gives you a Heroku-like experience on your own VPS. Run all 6 VoiceAI
                  services for the cost of a single VPS.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Recommended VPS Providers (India)
                    </h4>
                    <ul className="space-y-2">
                      {[
                        {
                          name: 'Hostinger VPS',
                          price: '₹499/mo',
                          specs: '2 vCPU, 4GB RAM, 50GB SSD',
                        },
                        {
                          name: 'Contabo VPS',
                          price: '₹550/mo',
                          specs: '4 vCPU, 6GB RAM, 100GB SSD',
                        },
                        {
                          name: 'DigitalOcean',
                          price: '$6/mo',
                          specs: '1 vCPU, 1GB RAM, 25GB SSD',
                        },
                        {
                          name: 'Hetzner',
                          price: '€4/mo',
                          specs: '2 vCPU, 4GB RAM, 40GB SSD',
                        },
                      ].map((vps) => (
                        <li
                          key={vps.name}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                              {vps.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block">
                              {vps.specs}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {vps.price}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Quick Setup
                    </h4>
                    <CodeBlock
                      code={`# 1. Install Coolify on your VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 2. Access Coolify Dashboard
open http://your-vps-ip:8000

# 3. Connect GitHub repo
# 4. Add all 6 services as resources
# 5. Coolify auto-builds Docker containers
# 6. Set environment variables
# 7. Deploy! 🚀

# Total cost: Just your VPS bill!`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Docker Compose reference */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Container className="w-5 h-5 text-emerald-500" />
                  Docker Compose Reference
                </CardTitle>
                <CardDescription>
                  Example docker-compose.yml for local development & Coolify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  language="yaml"
                  code={`version: "3.9"
services:
  # Next.js App - Main web app
  nextjs:
    build:
      context: .
      dockerfile: Dockerfile.nextjs
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=\${DATABASE_URL}
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}

  # Vobiz SIP Service
  vobiz:
    build:
      context: ./services/vobiz
      dockerfile: Dockerfile
    ports:
      - "3031:3031"
    environment:
      - VOBIZ_API_KEY=\${VOBIZ_API_KEY}

  # Gemini AI Service
  gemini:
    build:
      context: ./services/gemini
      dockerfile: Dockerfile
    ports:
      - "3032:3032"
    environment:
      - GEMINI_API_KEY=\${GEMINI_API_KEY}

  # WebSocket Bridge
  wsbridge:
    build:
      context: ./services/ws-bridge
      dockerfile: Dockerfile
    ports:
      - "3033:3033"
    environment:
      - VOBIZ_URL=http://vobiz:3031
      - GEMINI_URL=http://gemini:3032

  # Call Simulator
  simulator:
    build:
      context: ./services/simulator
      dockerfile: Dockerfile
    ports:
      - "3004:3004"

  # Call Orchestrator (THE BRAIN)
  orchestrator:
    build:
      context: ./services/orchestrator
      dockerfile: Dockerfile
    ports:
      - "3035:3035"
    environment:
      - VOBIZ_URL=http://vobiz:3031
      - GEMINI_URL=http://gemini:3032
      - DATABASE_URL=\${DATABASE_URL}`}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
