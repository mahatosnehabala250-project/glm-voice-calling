'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronRight, ExternalLink, Phone, Server,
  Key, FileCode, Globe, Shield, Zap, AlertTriangle, CheckCircle2,
  Copy, RefreshCw, ArrowRight, Radio, Bot, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface GuideStep {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: string[];
  codeBlock?: string;
  tips?: string[];
}

const SETUP_STEPS: GuideStep[] = [
  {
    id: 'signup',
    title: 'Step 1: Create Vobiz Account',
    icon: Globe,
    description: 'Sign up for a Vobiz account to access the SIP trunking platform.',
    steps: [
      'Visit the Vobiz registration page at https://www.vobiz.ai',
      'Create your account with email and phone verification',
      'You\'ll receive ₹25 in free credit to explore the platform',
      'Navigate to the Console dashboard after sign-up',
    ],
    tips: ['Keep your Auth ID and Auth Token safe — you\'ll need them for API calls'],
    codeBlock: `// Your credentials are available in the Vobiz Console
// Go to Settings → API Keys
Auth ID: MA_GU1ZOXC3
Auth Token: your_auth_token_here`,
  },
  {
    id: 'buy-number',
    title: 'Step 2: Purchase a Phone Number (DID)',
    icon: Phone,
    description: 'Buy a virtual phone number that patients will call to reach the AI agent.',
    steps: [
      'Go to the "DID" section in the Vobiz Console',
      'Filter numbers by region (e.g., India → +91)',
      'Select a number and complete the purchase',
      'Each clinic needs its own unique phone number',
    ],
    tips: [
      'Choose numbers with easy-to-remember patterns for branding',
      'Vobiz supports numbers from multiple countries',
      'Monthly rental charges apply for each DID',
    ],
  },
  {
    id: 'sip-trunk',
    title: 'Step 3: Create SIP Trunk',
    icon: Server,
    description: 'Create a SIP trunk that connects Vobiz to your AI infrastructure.',
    steps: [
      'Go to "SIP Trunks" in the Console',
      'Create an Outbound Trunk (for making calls)',
      'Create an Inbound Trunk and link your DID number',
      'Vobiz auto-generates a SIP domain: trk_xxx.sip.vobiz.ai',
      'Create Credentials (username/password) for trunk authentication',
    ],
    tips: [
      'You can create multiple credentials per trunk',
      'IP ACL is recommended for production security',
      'Each clinic gets its own SIP trunk for isolation',
    ],
  },
  {
    id: 'credentials',
    title: 'Step 4: Configure Authentication',
    icon: Key,
    description: 'Set up secure authentication for SIP trunk access.',
    steps: [
      'Go to your SIP Trunk → Credentials tab',
      'Click "Create Credential"',
      'Save the generated SIP username and password',
      'Optionally add IP ACL rules to restrict by IP address',
    ],
    tips: [
      'Passwords are hashed and never returned after creation — save them immediately!',
      'Combine username/password with IP ACL for maximum security',
    ],
    codeBlock: `// SIP Authentication Example
// These are set in the Vobiz Console
SIP Domain: trk_abc123.sip.vobiz.ai
SIP Username: sip_user_12345
SIP Password: your_secure_password`,
  },
  {
    id: 'xml-app',
    title: 'Step 5: Create XML Application',
    icon: FileCode,
    description: 'Create a Voice XML application to define call flow behavior.',
    steps: [
      'Go to "Voice" → "Applications" in Console',
      'Click "Create Application"',
      'Set the Answer URL to your webhook endpoint',
      'Set the Hangup URL for call-ended callbacks',
      'Assign your purchased DID number to this application',
    ],
    tips: [
      'The Answer URL receives call events in real-time',
      'Use our XML Builder tool to generate webhook code quickly',
      'You can set up fallback URLs for reliability',
    ],
    codeBlock: `<!-- VoiceXML: Call Flow Example -->
<Response>
  <GetDigits action="https://your-server.com/menu" 
            numDigits="1" timeout="10"/>
  <Speak>Vobiz</Speak>
</Response>

<!-- Webhook Handler (Node.js/Express) -->
app.post('/webhook/answer', (req, res) => {
  const from = req.body.From;
  const to = req.body.To;
  
  // Connect to your AI agent here
  res.set('Content-Type', 'text/xml');
  res.send(\`<Response>
    <Speak>Welcome! Connecting to AI agent...</Speak>
    <Dial>your_ai_endpoint</Dial>
  </Response>\`);
});`,
  },
  {
    id: 'webhooks',
    title: 'Step 6: Configure Webhooks & Callbacks',
    icon: Radio,
    description: 'Set up webhook endpoints to receive real-time call event notifications.',
    steps: [
      'In your XML Application settings, configure callback URLs',
      'Main Webhook URL: receives all call events',
      'Answer URL: called when call is answered',
      'Hangup URL: called when call ends (includes duration, cost)',
      'Set up HMAC signature verification for security',
    ],
    tips: [
      'Always use HTTPS URLs for webhooks',
      'Respond within 3 seconds to avoid timeouts',
      'Implement idempotent handlers for retry safety',
      'Vobiz retries failed callbacks up to 3 times',
    ],
    codeBlock: `// Webhook Signature Verification
const crypto = require('crypto');

function verifyVobizSignature(req, secret) {
  const signature = req.headers['x-vobiz-signature'];
  const timestamp = req.headers['x-vobiz-timestamp'];
  
  // Check timestamp is recent (within 5 min)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;
  
  // Verify HMAC-SHA256
  const payload = timestamp + '.' + JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expected;
}`,
  },
  {
    id: 'ai-connect',
    title: 'Step 7: Connect AI Agent',
    icon: Bot,
    description: 'Route call audio to your AI agent (Gemini Live API, VAPI, etc.).',
    steps: [
      'Choose your AI platform: Gemini Live, VAPI, Retell AI, or ElevenLabs',
      'Point your SIP trunk\'s destination to the AI platform\'s SIP endpoint',
      'Configure the AI agent\'s system prompt for your clinic',
      'Test the full call flow: Patient → Vobiz → SIP → AI Agent',
    ],
    tips: [
      'SIP is recommended over WebSockets for native transfer support',
      'Gemini Live API is ideal for real-time voice conversations',
      'Vobiz supports direct integration with VAPI, Retell AI, ElevenLabs',
      'For Go backend: receive RTP audio → stream to Gemini Live API → return audio',
    ],
  },
  {
    id: 'test',
    title: 'Step 8: Test & Deploy',
    icon: Zap,
    description: 'Test the complete call flow and deploy to production.',
    steps: [
      'Make a test call to your Vobiz number',
      'Verify the AI agent answers and responds correctly',
      'Check SIP Call Logs in Vobiz Console for troubleshooting',
      'Monitor callback delivery and response times',
      'Set up monitoring and alerting for production',
    ],
    tips: [
      'Use webhook.site for quick webhook testing during development',
      'Check "SIP Call Logs" for detailed troubleshooting info',
      'Monitor "Voice Call Logs" for high-level call history',
    ],
  },
];

const COMMON_ERRORS = [
  { code: 'NORMAL_CLEARING', desc: 'Normal call ended — one party hung up', severity: 'info' },
  { code: 'USER_BUSY', desc: 'Called party is busy', severity: 'warning' },
  { code: 'NO_ANSWER', desc: 'No answer within timeout period', severity: 'warning' },
  { code: '401 Unauthorized', desc: 'Invalid SIP credentials', severity: 'error' },
  { code: '403 Forbidden', desc: 'Geographic or number restriction', severity: 'error' },
  { code: 'MEDIA_TIMEOUT', desc: 'No RTP audio received (firewall issue)', severity: 'error' },
  { code: 'PROTOCOL_ERROR', desc: 'Malformed SIP message', severity: 'error' },
];

const API_REFERENCE = [
  { endpoint: '/api/v1/account/{auth_id}', method: 'GET', desc: 'Get account details & balance' },
  { endpoint: '/api/v1/account/{auth_id}/trunks', method: 'POST', desc: 'Create a SIP trunk' },
  { endpoint: '/api/v1/account/{auth_id}/credentials', method: 'POST', desc: 'Create trunk credentials' },
  { endpoint: '/api/v1/account/{auth_id}/applications', method: 'POST', desc: 'Create XML application' },
  { endpoint: '/api/v1/account/{auth_id}/calls', method: 'POST', desc: 'Make an outbound call' },
  { endpoint: '/api/v1/account/{auth_id}/numbers', method: 'GET', desc: 'List phone numbers' },
  { endpoint: '/api/v1/account/{auth_id}/recordings', method: 'GET', desc: 'List call recordings' },
  { endpoint: '/api/v1/account/{auth_id}/cdr', method: 'GET', desc: 'Call detail records' },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function VobizGuide() {
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set(['signup']));

  const toggleStep = (id: string) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.1),transparent)]" />
          <CardHeader className="relative text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Vobiz Integration Guide</CardTitle>
                  <CardDescription className="text-emerald-100">
                    Step-by-step setup instructions for connecting Vobiz SIP trunking to your AI voice agents
                  </CardDescription>
                </div>
              </div>
              <a
                href="https://www.docs.vobiz.ai/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/20 hover:text-white">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Vobiz Docs
                </Button>
              </a>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Architecture Overview */}
      <motion.div variants={item}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Architecture Overview</h3>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { label: 'Patient Calls', icon: Phone, color: 'text-blue-500' },
              { label: 'Vobiz Number', icon: Server, color: 'text-emerald-500' },
              { label: 'SIP Trunk', icon: Radio, color: 'text-amber-500' },
              { label: 'XML App / WebSocket', icon: FileCode, color: 'text-violet-500' },
              { label: 'AI Agent (Gemini)', icon: Bot, color: 'text-emerald-400' },
              { label: 'Appointment Booked', icon: CheckCircle2, color: 'text-teal-500' },
            ].map((step, idx) => (
              <span key={step.label} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <step.icon className={cn('w-3.5 h-3.5', step.color)} />
                  <span className="text-xs font-medium">{step.label}</span>
                </div>
                {idx < 5 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                )}
              </span>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Setup Steps */}
      <motion.div variants={item} className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Setup Steps</h3>
        {SETUP_STEPS.map((step) => {
          const isOpen = openSteps.has(step.id);
          const Icon = step.icon;
          return (
            <Card key={step.id} className="overflow-hidden">
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    isOpen ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'
                  )}>
                    <Icon className={cn('w-4 h-4', isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.description}</p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-4 space-y-4">
                  <Separator />
                  <ol className="space-y-2 ml-5">
                    {step.steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  {step.codeBlock && (
                    <div className="relative">
                      <div className="absolute right-2 top-2 z-10">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(step.codeBlock)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="bg-slate-900 dark:bg-slate-950 text-emerald-100 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                        <code>{step.codeBlock}</code>
                      </pre>
                    </div>
                  )}
                  {step.tips && step.tips.length > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Tips</span>
                      </div>
                      <ul className="space-y-1 ml-5">
                        {step.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-amber-600/80 dark:text-amber-400/80">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </motion.div>

      {/* API Reference */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <CardTitle className="text-base">Vobiz API Reference</CardTitle>
                <CardDescription>Base URL: https://api.vobiz.ai/api/v1</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500">Endpoint</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500">Method</th>
                    <th className="text-left py-2 text-xs font-medium text-slate-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {API_REFERENCE.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-2 pr-4">
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-400">
                          {row.endpoint}
                        </code>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={row.method === 'GET' ? 'secondary' : 'default'} className={cn(
                          'text-[10px] font-mono',
                          row.method === 'POST' && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        )}>
                          {row.method}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-slate-600 dark:text-slate-400">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Troubleshooting */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <CardTitle className="text-base">Troubleshooting</CardTitle>
                <CardDescription>Common SIP error codes and their solutions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {COMMON_ERRORS.map((err, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <Badge variant={err.severity === 'error' ? 'destructive' : err.severity === 'warning' ? 'outline' : 'secondary'} className="font-mono text-[10px]">
                    {err.code}
                  </Badge>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{err.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-4 text-center">
              <p className="text-xs text-slate-500">For detailed documentation, visit</p>
              <a
                href="https://www.docs.vobiz.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium mt-1"
              >
                https://www.docs.vobiz.ai/
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
