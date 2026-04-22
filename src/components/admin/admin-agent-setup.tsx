'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Phone, Link2, Calendar, Mic, CalendarCheck, AlertTriangle, Rocket,
  Bot, CheckCircle2, XCircle, Wifi, WifiOff, ArrowRight, Play, Pause,
  RotateCcw, Save, Plus, Trash2, Eye, EyeOff, Copy, ExternalLink,
  Activity, Clock, PhoneCall, PhoneForwarded, RefreshCw, Download, Server,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Clinic {
  id: string;
  name: string;
  doctorName: string;
  city: string;
  status: string;
  phone: string;
}

interface AgentConfig {
  id: string;
  clinicId: string;
  vobizPhoneNumber: string | null;
  vobizTrunkId: string | null;
  vobizTrunkDomain: string | null;
  vobizCredentialId: string | null;
  vobizCredentialUser: string | null;
  vobizAppId: string | null;
  vobizAppUrl: string | null;
  webhookUrl: string | null;
  answerUrl: string | null;
  hangupUrl: string | null;
  fallbackUrl: string | null;
  webhookSecret: string | null;
  callbackEvents: string | null;
  calendarProvider: string;
  calendarApiKey: string | null;
  calendarWebhookUrl: string | null;
  calendarId: string | null;
  calendarSyncEnabled: boolean;
  knowledgeBase: string | null;
  clinicDescription: string | null;
  specializations: string | null;
  faqUrl: string | null;
  voiceProvider: string;
  voiceId: string | null;
  voiceName: string | null;
  speakingRate: number | null;
  voiceGender: string;
  bookingSlotDuration: number;
  bookingBuffer: number;
  maxBookingsPerDay: number;
  bookingLeadDays: number;
  autoConfirm: boolean;
  requireConfirmation: boolean;
  escalationEnabled: boolean;
  escalationAfter: number;
  escalationKeywords: string | null;
  escalationNumber: string | null;
  agentStatus: string;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  testNotes: string | null;
  totalAgentCalls: number;
  totalAgentBookings: number;
  avgConversationTime: number;
  clinic?: Clinic;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  testing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const statusDotColors: Record<string, string> = {
  draft: 'bg-slate-400',
  testing: 'bg-amber-500',
  active: 'bg-emerald-500',
  paused: 'bg-rose-500',
};

const DEFAULT_CONFIG: Partial<AgentConfig> = {
  vobizPhoneNumber: '',
  vobizTrunkId: '',
  vobizTrunkDomain: '',
  vobizCredentialId: '',
  vobizCredentialUser: '',
  vobizAppId: '',
  vobizAppUrl: '',
  webhookUrl: '',
  answerUrl: '',
  hangupUrl: '',
  fallbackUrl: '',
  webhookSecret: '',
  callbackEvents: '["Ring","StartApp","Hangup"]',
  calendarProvider: 'none',
  calendarApiKey: '',
  calendarWebhookUrl: '',
  calendarId: '',
  calendarSyncEnabled: false,
  knowledgeBase: '',
  clinicDescription: '',
  specializations: '',
  faqUrl: '',
  voiceProvider: 'gemini',
  voiceId: '',
  voiceName: '',
  speakingRate: 1.0,
  voiceGender: 'female',
  bookingSlotDuration: 30,
  bookingBuffer: 15,
  maxBookingsPerDay: 50,
  bookingLeadDays: 14,
  autoConfirm: true,
  requireConfirmation: false,
  escalationEnabled: true,
  escalationAfter: 120,
  escalationKeywords: '',
  escalationNumber: '',
  agentStatus: 'draft',
  testNotes: '',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function AdminAgentSetup() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [config, setConfig] = useState<Partial<AgentConfig>>(DEFAULT_CONFIG);
  const [allConfigs, setAllConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testEvents, setTestEvents] = useState<string[]>(['Ring', 'StartApp', 'Hangup']);
  const [activeTab, setActiveTab] = useState('vobiz');

  // Fetch clinics and configs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clinicRes, configRes] = await Promise.all([
          fetch('/api/admin/clinics'),
          fetch('/api/admin/agent-config'),
        ]);
        const clinicData = await clinicRes.json();
        const configData = await configRes.json();

        if (clinicData.clinics) {
          const activeClinics = clinicData.clinics.filter((c: Clinic) => c.status !== 'suspended');
          setClinics(activeClinics);
          if (activeClinics.length > 0 && !selectedClinicId) {
            setSelectedClinicId(activeClinics[0].id);
          }
        }
        if (configData.configs) {
          setAllConfigs(configData.configs);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Load config when clinic changes
  useEffect(() => {
    if (!selectedClinicId) return;
    const existing = allConfigs.find((c) => c.clinicId === selectedClinicId);
    if (existing) {
      setConfig(existing);
      const events = existing.callbackEvents ? JSON.parse(existing.callbackEvents) : ['Ring', 'StartApp', 'Hangup'];
      setTestEvents(events);
    } else {
      setConfig({ ...DEFAULT_CONFIG, clinicId: selectedClinicId });
      setTestEvents(['Ring', 'StartApp', 'Hangup']);
    }
  }, [selectedClinicId, allConfigs]);

  // Status summary
  const statusSummary = useMemo(() => {
    const total = allConfigs.length;
    const active = allConfigs.filter((c) => c.agentStatus === 'active').length;
    const testing = allConfigs.filter((c) => c.agentStatus === 'testing').length;
    const draft = allConfigs.filter((c) => c.agentStatus === 'draft').length;
    return { total, active, testing, draft };
  }, [allConfigs]);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const isNewConfig = !config.id;

  const handleSave = async () => {
    if (!selectedClinicId) return;
    setSaving(true);
    try {
      const saveData = {
        ...config,
        clinicId: selectedClinicId,
        callbackEvents: JSON.stringify(testEvents),
        speakingRate: config.speakingRate ?? 1.0,
      };

      if (isNewConfig) {
        const res = await fetch('/api/admin/agent-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Failed to create config');
          return;
        }
        toast.success('Agent config created successfully');
      } else {
        const res = await fetch(`/api/admin/agent-config/${config.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Failed to update config');
          return;
        }
        toast.success('Agent config saved successfully');
      }

      // Refresh configs
      const configRes = await fetch('/api/admin/agent-config');
      const configData = await configRes.json();
      if (configData.configs) setAllConfigs(configData.configs);
    } catch (err) {
      toast.error('Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEvent = (event: string) => {
    setTestEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-shimmer-skeleton h-8 w-64 rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.12),transparent)]" />
          <CardHeader className="relative text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-white gradient-text-emerald">AI Agent Setup</CardTitle>
                <CardDescription className="text-emerald-100">
                  Configure AI voice agents for each clinic — Vobiz, webhooks, calendar, voice &amp; more
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Status Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: statusSummary.total, icon: Bot, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', glow: 'stat-glow-emerald' },
          { label: 'Active', value: statusSummary.active, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', glow: 'stat-glow-emerald' },
          { label: 'Testing', value: statusSummary.testing, icon: Play, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', glow: 'stat-glow-amber' },
          { label: 'Draft', value: statusSummary.draft, icon: Clock, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50', glow: '' },
        ].map((stat) => (
          <Card key={stat.label} className={cn('p-4 transition-shadow', stat.glow)}>
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Clinic Selector */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 w-full">
                <Label className="text-sm font-medium mb-1.5 block">Select Clinic</Label>
                <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a clinic to configure" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        <span className="flex items-center gap-2">
                          {clinic.name} — {clinic.city}
                          {allConfigs.find((c) => c.clinicId === clinic.id) && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1.5">
                              {allConfigs.find((c) => c.clinicId === clinic.id)?.agentStatus}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {config.agentStatus && (
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', statusDotColors[config.agentStatus] || 'bg-slate-400', config.agentStatus === 'active' && 'pulse-dot')} />
                  <Badge className={cn('capitalize', statusColors[config.agentStatus] || '')}>
                    {config.agentStatus}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabbed Configuration */}
      {selectedClinicId && (
        <motion.div variants={item}>
          {config.agentStatus === 'active' && (
            <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-3 px-4 flex items-center gap-3 text-white animate-slide-up">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">Agent is Live</p>
                <p className="text-xs text-emerald-100">{selectedClinic?.name} agent is actively handling calls</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white pulse-dot" />
                <span className="text-xs font-medium">ACTIVE</span>
              </div>
            </div>
          )}
          <Card className="glass-card-hover">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg gradient-text-emerald">
                    {selectedClinic?.name} — Agent Configuration
                  </CardTitle>
                  <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : isNewConfig ? 'Create Config' : 'Save Changes'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-800 p-1 mb-6">
                  {[
                    { id: 'vobiz', label: 'Vobiz', icon: Phone },
                    { id: 'webhooks', label: 'Webhooks', icon: Link2 },
                    { id: 'calendar', label: 'Calendar', icon: Calendar },
                    { id: 'voice', label: 'AI Voice', icon: Mic },
                    { id: 'booking', label: 'Booking', icon: CalendarCheck },
                    { id: 'escalation', label: 'Escalation', icon: AlertTriangle },
                    { id: 'deploy', label: 'Deploy', icon: Rocket },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 data-[state=active]:dark:data-[state=active]:text-emerald-400 text-xs px-3 py-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Vobiz Integration Tab */}
                <TabsContent value="vobiz" className="space-y-4 mt-0 bg-dot-pattern rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">SIP Trunk Configuration</h3>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs">Vobiz Phone Number (DID)</Label>
                          <Input
                            placeholder="+919876543210"
                            value={config.vobizPhoneNumber || ''}
                            onChange={(e) => updateField('vobizPhoneNumber', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">SIP Trunk ID</Label>
                            <Input
                              placeholder="trk_abc123"
                              value={config.vobizTrunkId || ''}
                              onChange={(e) => updateField('vobizTrunkId', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">SIP Domain</Label>
                            <Input
                              placeholder="trk_abc123.sip.vobiz.ai"
                              value={config.vobizTrunkDomain || ''}
                              onChange={(e) => updateField('vobizTrunkDomain', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Credential ID</Label>
                            <Input
                              placeholder="cred_xyz789"
                              value={config.vobizCredentialId || ''}
                              onChange={(e) => updateField('vobizCredentialId', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Credential User</Label>
                            <Input
                              placeholder="sip_user_123"
                              value={config.vobizCredentialUser || ''}
                              onChange={(e) => updateField('vobizCredentialUser', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">XML Application</h3>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs">Application ID</Label>
                          <Input
                            placeholder="app_voice_ai_001"
                            value={config.vobizAppId || ''}
                            onChange={(e) => updateField('vobizAppId', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Application URL</Label>
                          <Input
                            placeholder="https://api.vobiz.ai/xml/app/..."
                            value={config.vobizAppUrl || ''}
                            onChange={(e) => updateField('vobizAppUrl', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Connection Status */}
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Connection Status</span>
                          {config.vobizPhoneNumber ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 pulse-dot" />
                              Configured
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <WifiOff className="w-3 h-3 mr-1" /> Not Connected
                            </Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info('Test connection not available in demo mode')}>
                          <Play className="w-3.5 h-3.5 mr-1.5" /> Test Connection
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Call Flow Diagram */}
                  <Card className="bg-slate-50 dark:bg-slate-900/50 p-4">
                    <p className="text-xs font-medium text-slate-500 mb-3">CALL FLOW ARCHITECTURE</p>
                    <div className="flex items-center justify-center gap-1 flex-wrap text-xs">
                      {[
                        { label: 'Patient Calls', icon: Phone },
                        { label: 'Vobiz DID', icon: Server },
                        { label: 'SIP Trunk', icon: PhoneForwarded },
                        { label: 'XML App', icon: RefreshCw },
                        { label: 'AI Agent', icon: Bot },
                      ].map((step, idx) => (
                        <span key={step.label} className="flex items-center gap-1">
                          <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-emerald-500 text-[8px] text-white font-bold flex items-center justify-center">{idx + 1}</span>
                            <step.icon className="w-3.5 h-3.5 text-emerald-600" />
                            {step.label}
                          </div>
                          {idx < 4 && (
                            <ArrowRight className="w-4 h-4 text-emerald-400 animate-pulse" style={{ animationDuration: '1.5s', animationDelay: `${idx * 0.3}s` }} />
                          )}
                        </span>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* Webhooks Tab */}
                <TabsContent value="webhooks" className="space-y-4 mt-0 bg-grid-pattern rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Webhook URLs</h3>
                      {[
                        { key: 'webhookUrl', label: 'Main Webhook URL', placeholder: 'https://your-server.com/webhook' },
                        { key: 'answerUrl', label: 'Answer URL (XML)', placeholder: 'https://your-server.com/webhook/answer' },
                        { key: 'hangupUrl', label: 'Hangup URL', placeholder: 'https://your-server.com/webhook/hangup' },
                        { key: 'fallbackUrl', label: 'Fallback URL', placeholder: 'https://your-server.com/webhook/fallback' },
                      ].map((field) => (
                        <div key={field.key}>
                          <Label className="text-xs">{field.label}</Label>
                          <div className="relative mt-1">
                            <Input
                              placeholder={field.placeholder}
                              value={(config[field.key] as string) || ''}
                              onChange={(e) => updateField(field.key, e.target.value)}
                            />
                            {(config[field.key] as string) && (
                              <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                                onClick={() => {
                                  navigator.clipboard.writeText((config[field.key] as string) || '');
                                  toast.success('Copied to clipboard');
                                }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Security &amp; Events</h3>
                      <div>
                        <Label className="text-xs">Webhook Secret (HMAC)</Label>
                        <div className="relative mt-1">
                          <Input
                            type={showSecret ? 'text' : 'password'}
                            placeholder="whsec_abc123..."
                            value={config.webhookSecret || ''}
                            onChange={(e) => updateField('webhookSecret', e.target.value)}
                          />
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-2 block">Callback Events</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Ring', 'StartApp', 'Hangup', 'recording.completed'].map((event) => (
                            <label key={event} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={testEvents.includes(event)}
                                onCheckedChange={() => toggleEvent(event)}
                              />
                              {event}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-medium mb-2">Webhook Testing</p>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info('Webhook testing not available in demo mode')}>
                          <Play className="w-3.5 h-3.5 mr-1.5" /> Send Test Webhook
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Calendar Tab */}
                <TabsContent value="calendar" className="space-y-4 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Calendar Provider</h3>
                      <div>
                        <Label className="text-xs">Provider</Label>
                        <Select value={config.calendarProvider || 'none'} onValueChange={(v) => updateField('calendarProvider', v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="google">Google Calendar</SelectItem>
                            <SelectItem value="calendly">Calendly</SelectItem>
                            <SelectItem value="custom">Custom (Webhook)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {config.calendarProvider !== 'none' && (
                        <>
                          <div>
                            <Label className="text-xs">API Key</Label>
                            <Input
                              type="password"
                              placeholder="Enter API key..."
                              value={config.calendarApiKey || ''}
                              onChange={(e) => updateField('calendarApiKey', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Calendar ID</Label>
                            <Input
                              placeholder="primary / calendar_id"
                              value={config.calendarId || ''}
                              onChange={(e) => updateField('calendarId', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-3">
                      {config.calendarProvider !== 'none' && (
                        <>
                          <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Sync Settings</h3>
                          <div>
                            <Label className="text-xs">Calendar Webhook URL</Label>
                            <Input
                              placeholder="https://your-server.com/calendar/webhook"
                              value={config.calendarWebhookUrl || ''}
                              onChange={(e) => updateField('calendarWebhookUrl', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                            <div>
                              <p className="text-sm font-medium">Sync Enabled</p>
                              <p className="text-xs text-slate-500">Auto-sync appointments with calendar</p>
                            </div>
                            <Switch
                              checked={config.calendarSyncEnabled}
                              onCheckedChange={(v) => updateField('calendarSyncEnabled', v)}
                            />
                          </div>
                          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">Sync Status</span>
                              <Badge className={cn(
                                config.calendarSyncEnabled
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              )}>
                                {config.calendarSyncEnabled ? 'Active' : 'Disabled'}
                              </Badge>
                            </div>
                            {config.calendarSyncEnabled && (
                              <p className="text-[10px] text-slate-400 mt-1">Last sync: {new Date().toLocaleString('en-IN')}</p>
                            )}
                          </div>
                        </>
                      )}
                      {config.calendarProvider === 'none' && (
                        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
                          <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-sm text-slate-500">No calendar provider selected</p>
                          <p className="text-xs text-slate-400 mt-1">Choose a provider to enable appointment sync</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* AI Voice Tab */}
                <TabsContent value="voice" className="space-y-4 mt-0 bg-stripes rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Voice Configuration</h3>
                      <div>
                        <Label className="text-xs">Voice Provider</Label>
                        <Select value={config.voiceProvider || 'gemini'} onValueChange={(v) => updateField('voiceProvider', v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
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
                            placeholder="Rekha / Sarah"
                            value={config.voiceName || ''}
                            onChange={(e) => updateField('voiceName', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Voice ID</Label>
                          <Input
                            placeholder="voice_model_id"
                            value={config.voiceId || ''}
                            onChange={(e) => updateField('voiceId', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Voice Gender</Label>
                        <Select value={config.voiceGender || 'female'} onValueChange={(v) => updateField('voiceGender', v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Speaking Rate: {config.speakingRate?.toFixed(1) || '1.0'}x</Label>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[config.speakingRate ?? 1.0]}
                          onValueChange={([v]) => updateField('speakingRate', v)}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>0.5x (Slow)</span>
                          <span>1.0x (Normal)</span>
                          <span>2.0x (Fast)</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Voice Preview</h3>
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white relative overflow-hidden neon-emerald">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.15),transparent)]" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center animate-breathe">
                              <Mic className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{config.voiceName || 'Default Voice'}</p>
                              <p className="text-xs text-slate-400">{config.voiceProvider} • {config.voiceGender}</p>
                            </div>
                          </div>
                          <div className="rounded-lg bg-white/10 p-4 mb-4">
                            <p className="text-sm italic text-emerald-100">
                              &ldquo;Namaste! Welcome to {selectedClinic?.name || 'our clinic'}. How can I help you today?&rdquo;
                            </p>
                          </div>
                          {/* Voice wave animation */}
                          <div className="flex items-end justify-center gap-1 h-8 mb-3">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="voice-wave-bar w-1 bg-emerald-400 rounded-full" style={{ height: '100%' }} />
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Rate: {config.speakingRate?.toFixed(1) || '1.0'}x
                            </span>
                            <span className="flex items-center gap-1">
                              <Mic className="w-3 h-3" />
                              {config.voiceGender}
                            </span>
                          </div>
                        </div>
                      </Card>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info('Voice preview not available in demo mode')}>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Preview Voice
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Booking Rules Tab */}
                <TabsContent value="booking" className="space-y-4 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Slot Configuration</h3>
                      <div>
                        <Label className="text-xs">Slot Duration (minutes)</Label>
                        <Select value={String(config.bookingSlotDuration || 30)} onValueChange={(v) => updateField('bookingSlotDuration', parseInt(v))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[15, 20, 30, 45, 60].map((m) => (
                              <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Buffer Time (minutes)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={config.bookingBuffer || 15}
                          onChange={(e) => updateField('bookingBuffer', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Time between consecutive appointments</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Limits &amp; Policies</h3>
                      <div>
                        <Label className="text-xs">Max Bookings Per Day</Label>
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          value={config.maxBookingsPerDay || 50}
                          onChange={(e) => updateField('maxBookingsPerDay', parseInt(e.target.value) || 1)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Advance Booking (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={config.bookingLeadDays || 14}
                          onChange={(e) => updateField('bookingLeadDays', parseInt(e.target.value) || 1)}
                          className="mt-1"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">How far ahead patients can book</p>
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <div>
                            <p className="text-sm font-medium">Auto-Confirm</p>
                            <p className="text-xs text-slate-500">Instantly confirm bookings</p>
                          </div>
                          <Switch checked={config.autoConfirm} onCheckedChange={(v) => updateField('autoConfirm', v)} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <div>
                            <p className="text-sm font-medium">Require Confirmation</p>
                            <p className="text-xs text-slate-500">Patient must confirm via link</p>
                          </div>
                          <Switch checked={config.requireConfirmation} onCheckedChange={(v) => updateField('requireConfirmation', v)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Escalation Tab */}
                <TabsContent value="escalation" className="space-y-4 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Escalation Rules</h3>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                        <div>
                          <p className="text-sm font-medium">Enable Escalation</p>
                          <p className="text-xs text-slate-500">Transfer to human when needed</p>
                        </div>
                        <Switch checked={config.escalationEnabled} onCheckedChange={(v) => updateField('escalationEnabled', v)} />
                      </div>
                      <div>
                        <Label className="text-xs">Escalation After (seconds)</Label>
                        <Input
                          type="number"
                          min={30}
                          max={600}
                          value={config.escalationAfter || 120}
                          onChange={(e) => updateField('escalationAfter', parseInt(e.target.value) || 120)}
                          className="mt-1"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Offer human transfer after this time</p>
                      </div>
                      <div>
                        <Label className="text-xs">Transfer Phone Number</Label>
                        <Input
                          placeholder="+919XXXXXXXXX"
                          value={config.escalationNumber || ''}
                          onChange={(e) => updateField('escalationNumber', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Escalation Keywords</h3>
                      <div>
                        <Label className="text-xs">Keywords (comma-separated)</Label>
                        <Textarea
                          placeholder="emergency, pain, bleeding, chest, complaint, manager, doctor"
                          value={config.escalationKeywords || ''}
                          onChange={(e) => updateField('escalationKeywords', e.target.value)}
                          className="mt-1"
                          rows={4}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">AI will offer immediate escalation when these keywords are detected</p>
                      </div>
                      {config.escalationKeywords && (
                        <div className="flex flex-wrap gap-1.5">
                          {config.escalationKeywords.split(',').map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Deploy Tab */}
                <TabsContent value="deploy" className="space-y-4 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Agent Status</h3>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={config.agentStatus || 'draft'} onValueChange={(v) => updateField('agentStatus', v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="testing">Testing</SelectItem>
                            <SelectItem value="active">Active (Production)</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Test Notes</Label>
                        <Textarea
                          placeholder="Notes from testing phase..."
                          value={config.testNotes || ''}
                          onChange={(e) => updateField('testNotes', e.target.value)}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                          onClick={() => {
                            updateField('agentStatus', 'active');
                            toast.success('Agent deployed to production!');
                          }}
                          disabled={config.agentStatus === 'active'}
                        >
                          <Rocket className="w-4 h-4 mr-1.5" /> Deploy to Production
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            updateField('agentStatus', 'draft');
                            toast.info('Agent rolled back to draft');
                          }}
                          disabled={config.agentStatus === 'draft'}
                        >
                          <RotateCcw className="w-4 h-4 mr-1.5" /> Rollback
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Performance Stats</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Total Calls', value: config.totalAgentCalls || 0, icon: PhoneCall },
                          { label: 'Total Bookings', value: config.totalAgentBookings || 0, icon: CalendarCheck },
                          { label: 'Avg Time', value: config.avgConversationTime ? `${Math.floor(config.avgConversationTime / 60)}m ${config.avgConversationTime % 60}s` : '0m 0s', icon: Clock },
                          { label: 'Last Test', value: config.lastTestedAt ? new Date(config.lastTestedAt).toLocaleDateString('en-IN') : 'Never', icon: Activity },
                        ].map((stat) => (
                          <Card key={stat.label} className="p-3">
                            <div className="flex items-center gap-2">
                              <stat.icon className="w-4 h-4 text-emerald-500" />
                              <div>
                                <p className="text-lg font-bold">{stat.value}</p>
                                <p className="text-[10px] text-slate-500">{stat.label}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                      {config.lastTestResult && (
                        <div className={cn(
                          'rounded-lg p-3 flex items-center gap-2 text-sm',
                          config.lastTestResult === 'success'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        )}>
                          {config.lastTestResult === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          Last test: {config.lastTestResult}
                          {config.lastTestedAt && <span className="ml-auto text-xs">on {new Date(config.lastTestedAt).toLocaleDateString('en-IN')}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
