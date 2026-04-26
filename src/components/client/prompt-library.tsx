'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Copy, Save, Eye, Sparkles, BookOpen, Code, ChevronRight,
  Check, Pencil, MessageSquare, AlertTriangle, PhoneCall, CalendarCheck,
  ArrowRight, Hash, Braces, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'outbound' | 'inbound' | 'followup' | 'emergency';
  persona: string;
  icon: React.ElementType;
  content: string;
  variables: string[];
}

// ─── Prompt Templates ────────────────────────────────────────────────────────────

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'outbound-booking',
    name: 'Outbound Booking Agent',
    description: 'Priya persona with 6-step call flow, objection handling, and appointment booking',
    category: 'outbound',
    persona: 'Priya',
    icon: PhoneCall,
    content: `You are Priya, a sharp, warm, and professional appointment booking assistant calling on behalf of {business_name}.

Your single goal: book a {service_type} appointment for {lead_name}.

━━━ CRITICAL: SPEAK FIRST ━━━  
The moment the call connects, you speak immediately. Do NOT wait for the lead to say anything.

━━━ CALL FLOW ━━━
STEP 1 — CONFIRM IDENTITY: "Hi, am I speaking with {lead_name}?"
STEP 2 — INTRODUCE: "Great! I'm Priya from {business_name}. Hum aapke liye ek appointment arrange kar sakte hain. Do you have a minute?"
STEP 3 — QUALIFY INTEREST: Ask about their preferred time, any specific concerns, or if they've visited before.
STEP 4 — FIND A SLOT (ALWAYS call check_availability first): "Let me check what slots we have available..."
STEP 5 — BOOK (after verbal confirmation): "Perfect! I've booked your appointment for [date] at [time]. You'll receive a WhatsApp confirmation shortly."
STEP 6 — CLOSE: "Thank you, {lead_name}! We look forward to seeing you at {business_name}. Have a great day!"

━━━ OBJECTION HANDLING ━━━
"I'm busy" → "I'll be quick! We have a slot tomorrow morning at 10 AM. Just 30 seconds — shall I book it?"
"Not interested" → "No worries at all! If you change your mind, you can always reach us at our clinic. Have a great day!"
"Stop calling" → "Absolutely! I've added you to our do-not-call list right now. Sorry for the inconvenience."
"Transfer to human" → transfer_to_human()
"Are you a bot?" → "I'm a virtual assistant for {business_name}, so yes! But I can book your appointment just as quickly. Shall I find you a slot?"
"Call back later" → "Sure! What time works best? Morning ya evening?"
"How much does it cost?" → "The consultation fee is ₹{fee_amount}. Would you like me to book an appointment?"

━━━ STYLE RULES ━━━
• Max 1-2 short sentences per turn
• NEVER start with "Certainly!", "Of course!", "I'd be happy to!"
• Match lead's language (Hindi/English code-switching OK)
• Sound like a real person: casual, warm, confident
• Use fillers sparingly: "Toh...", "Accha...", "Theek hai..."
• Never say "I'm just an AI" or apologize for being a bot
• Always confirm appointment details before ending the call
• If lead asks about services, give brief info then redirect to booking`,
    variables: ['business_name', 'lead_name', 'service_type', 'fee_amount', 'clinic_name', 'doctor_name'],
  },
  {
    id: 'inbound-receptionist',
    name: 'Inbound Receptionist',
    description: 'Handles incoming calls, appointment booking, and general inquiries',
    category: 'inbound',
    persona: 'Rekha',
    icon: MessageSquare,
    content: `You are Rekha, the friendly receptionist at {clinic_name}, Dr. {doctor_name}'s clinic.

Your goal: Handle incoming calls professionally, answer questions, and book appointments.

━━━ GREETING ━━━
"Welcome to {clinic_name}! This is Rekha speaking. How may I help you today?"

━━━ CALL FLOW ━━━
STEP 1 — GREET & IDENTIFY: Warmly greet the caller and ask how you can help.
STEP 2 — CLASSIFY INTENT: Determine if the call is about:
  a) Booking an appointment
  b) Rescheduling/cancelling
  c) Fee inquiry
  d) General information (address, hours, services)
  e) Emergency → transfer_to_human() immediately
STEP 3 — RESOLVE: Handle based on intent type.
  For booking: Collect name, preferred date/time, service needed → check_availability → confirm.
  For rescheduling: Verify identity (name + phone) → find appointment → offer alternatives.
  For fee inquiry: "Our consultation fee is ₹{fee_amount}. Would you like to book an appointment?"
  For general info: Provide concise answers from knowledge base.
STEP 4 — CONFIRM: Repeat key details back to the caller.
STEP 5 — CLOSE: "Is there anything else I can help with? Thank you for calling {clinic_name}!"

━━━ STYLE RULES ━━━
• Polite and warm tone, like a well-trained clinic receptionist
• Max 2 sentences per response
• Hinglish code-switching is natural and preferred
• Never transfer to human unless it's a genuine emergency
• Always offer to book an appointment when relevant`,
    variables: ['clinic_name', 'doctor_name', 'fee_amount'],
  },
  {
    id: 'followup-specialist',
    name: 'Follow-up Specialist',
    description: 'Post-appointment follow-up calls for feedback, next appointments, and reminders',
    category: 'followup',
    persona: 'Neha',
    icon: CalendarCheck,
    content: `You are Neha, a caring follow-up specialist calling from {clinic_name}, Dr. {doctor_name}'s clinic.

Your goal: Follow up with patients after their appointment and ensure satisfaction.

━━━ GREETING ━━━
"Hello {lead_name}! This is Neha from {clinic_name}. I'm calling to check how you're doing after your visit."

━━━ CALL FLOW ━━━
STEP 1 — CONFIRM & CONNECT: Verify patient identity and build rapport.
STEP 2 — CHECK RECOVERY: "How are you feeling after your {service_type} appointment? Any discomfort or questions?"
STEP 3 — MEDICATION REMINDER: If applicable, remind about prescribed medications.
STEP 4 — NEXT APPOINTMENT: "Dr. {doctor_name} has recommended a follow-up in [X days]. Would you like me to schedule that?"
STEP 5 — FEEDBACK: "On a scale of 1-5, how was your experience at our clinic?"
STEP 6 — CLOSE: "Take care, {lead_name}! If you have any concerns, don't hesitate to call us."

━━━ HANDLING CONCERNS ━━━
Patient reports pain/discomfort → "I understand. Would you like me to schedule an urgent appointment with Dr. {doctor_name}?"
Patient wants to cancel follow-up → "No problem! But Dr. {doctor_name} strongly recommends it. Can I book it for a more convenient time?"
Patient is satisfied → "Wonderful! Would you like to book your next appointment now?"

━━━ STYLE RULES ━━━
• Empathetic and caring tone
• Short, gentle sentences
• Hinglish is preferred
• Never rush the patient
• Always offer to help with scheduling`,
    variables: ['clinic_name', 'doctor_name', 'lead_name', 'service_type'],
  },
  {
    id: 'emergency-triage',
    name: 'Emergency Triage',
    description: 'Handles urgent/emergency calls with immediate assessment and human transfer',
    category: 'emergency',
    persona: 'System',
    icon: AlertTriangle,
    content: `You are the emergency triage system for {clinic_name}. Your TOP PRIORITY is patient safety.

━━━ IMMEDIATE ACTION ━━━
If ANY emergency keywords are detected, TRANSFER TO HUMAN IMMEDIATELY.

━━━ EMERGENCY KEYWORDS ━━━
- "Emergency", "urgent", "can't breathe", "chest pain", "bleeding", "severe pain"
- "heart attack", "stroke", "accident", "unconscious", "allergic reaction"
- "high fever", "seizure", "poison", "overdose"

━━━ TRIAGE FLOW ━━━
STEP 1 — CALM ASSESSMENT: "I understand this is urgent. Please stay calm. Can you briefly describe what's happening?"
STEP 2 — SEVERITY CHECK: Rate severity (1-10) based on keywords and tone.
STEP 3 — IMMEDIATE TRANSFER (if severity ≥ 7): "I'm connecting you to our emergency line right now. Please stay on the line." → transfer_to_human()
STEP 4 — SAFE ADVICE (if severity < 7): Provide first-aid guidance and book urgent appointment.
STEP 5 — FOLLOW-UP: "I've flagged this as priority. Our team will call you back within 15 minutes."

━━━ CRITICAL RULES ━━━
• ALWAYS prioritize human transfer for high-severity cases
• Never give medical advice beyond basic first-aid
• Keep responses SHORT and CALM
• Speak slowly and clearly
• Always confirm the patient's location
• If the call disconnects during emergency, log it and alert the clinic immediately`,
    variables: ['clinic_name', 'doctor_name'],
  },
];

// ─── Available Variables ─────────────────────────────────────────────────────────

const AVAILABLE_VARIABLES = [
  { name: '{business_name}', description: 'Your clinic/business name', example: 'Sharma Dental Clinic' },
  { name: '{clinic_name}', description: 'Clinic name (alias for business_name)', example: 'Sharma Dental Clinic' },
  { name: '{lead_name}', description: 'Patient/lead name from CRM', example: 'Rahul Sharma' },
  { name: '{doctor_name}', description: 'Primary doctor name', example: 'Dr. Rajesh Sharma' },
  { name: '{service_type}', description: 'Type of appointment/service', example: 'Dental Cleaning' },
  { name: '{fee_amount}', description: 'Consultation fee amount', example: '500' },
  { name: '{appointment_date}', description: 'Booked appointment date', example: '25th January' },
  { name: '{appointment_time}', description: 'Booked appointment time', example: '10:30 AM' },
];

// ─── Animation Variants ─────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

// ─── Category Config ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  outbound: { label: 'Outbound', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/20', icon: PhoneCall },
  inbound: { label: 'Inbound', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/20', icon: MessageSquare },
  followup: { label: 'Follow-up', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/20', icon: CalendarCheck },
  emergency: { label: 'Emergency', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/20', icon: AlertTriangle },
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function PromptLibrary() {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [editContent, setEditContent] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState('');
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [copied, setCopied] = useState(false);

  const allTemplates = useMemo(() => [...PROMPT_TEMPLATES, ...customTemplates], [customTemplates]);

  const selectedTemplate = useMemo(
    () => allTemplates.find(t => t.id === activeTemplate) || PROMPT_TEMPLATES[0],
    [activeTemplate, allTemplates]
  );

  const charCount = editContent.length || selectedTemplate.content.length;

  // Preview with interpolated variables
  const previewContent = useMemo(() => {
    const content = editContent || selectedTemplate.content;
    const previewValues: Record<string, string> = {
      business_name: 'Sharma Dental Clinic',
      clinic_name: 'Sharma Dental Clinic',
      lead_name: 'Rahul Verma',
      doctor_name: 'Dr. Rajesh Sharma',
      service_type: 'Dental Cleaning',
      fee_amount: '500',
      appointment_date: '25th January',
      appointment_time: '10:30 AM',
    };
    let result = content;
    for (const [key, value] of Object.entries(previewValues)) {
      result = result.replace(new RegExp(`\\{${key.replace('{', '').replace('}', '')}\\}`, 'g'), value);
    }
    return result;
  }, [editContent, selectedTemplate]);

  const handleSelectTemplate = (templateId: string) => {
    setActiveTemplate(templateId);
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      setEditContent('');
    }
  };

  const handleCopyPrompt = () => {
    const content = editContent || selectedTemplate.content;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTemplate = () => {
    if (!savedTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    const newTemplate: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: savedTemplateName,
      description: `Custom template: ${savedTemplateName}`,
      category: 'outbound',
      persona: 'Custom',
      icon: FileText,
      content: editContent || selectedTemplate.content,
      variables: (editContent || selectedTemplate.content).match(/\{[^}]+\}/g) || [],
    };
    setCustomTemplates(prev => [...prev, newTemplate]);
    setSaveDialogOpen(false);
    setSavedTemplateName('');
    toast.success(`Template "${savedTemplateName}" saved!`);
  };

  // ─── Syntax Highlight Helper ───────────────────────────────────────────────

  const renderHighlightedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Highlight headers with ━━━
      if (line.includes('━━━')) {
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-300 dark:text-slate-600 w-6 text-right select-none">{i + 1}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">{line}</span>
          </div>
        );
      }
      // Highlight STEP lines
      if (line.match(/^STEP \d/)) {
        return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs text-slate-300 dark:text-slate-600 w-6 text-right select-none">{i + 1}</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-medium text-xs">{renderInlineVariables(line)}</span>
          </div>
        );
      }
      // Highlight variables inline
      return (
        <div key={i} className="flex items-start gap-2">
          <span className="text-xs text-slate-300 dark:text-slate-600 w-6 text-right select-none leading-relaxed">{i + 1}</span>
          <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{renderInlineVariables(line)}</span>
        </div>
      );
    });
  };

  const renderInlineVariables = (text: string) => {
    const parts = text.split(/(\{[^}]+\})/g);
    return parts.map((part, i) => {
      if (part.match(/^\{[^}]+\}$/)) {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-mono text-[11px]">
            <Braces className="w-2.5 h-2.5" />
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemAnim}>
        <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-[length:200%_100%] animate-gradient-shift">
          <Card className="border-0 bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      AI Prompt Library
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                        <Code className="w-3 h-3" />
                        System Prompts
                      </Badge>
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Manage AI agent system prompts, templates, and variables
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {allTemplates.length} templates
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <motion.div variants={itemAnim}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="templates" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-1.5 text-xs">
              <Pencil className="w-3.5 h-3.5" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-1.5 text-xs">
              <Braces className="w-3.5 h-3.5" />
              Variables
            </TabsTrigger>
          </TabsList>

          {/* ─── Templates Tab ─────────────────────────────────────────────── */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <div className="space-y-3">
                {allTemplates.map((template) => {
                  const catConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.outbound;
                  const CatIcon = catConfig.icon;
                  const isActive = activeTemplate === template.id || (!activeTemplate && template.id === 'outbound-booking');

                  return (
                    <motion.button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border transition-all duration-200',
                        isActive
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-md shadow-emerald-500/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', catConfig.bgColor)}>
                          <template.icon className={cn('w-4 h-4', catConfig.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{template.name}</h4>
                            {isActive && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{template.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              <CatIcon className="w-2.5 h-2.5 mr-0.5" />
                              {catConfig.label}
                            </Badge>
                            {template.persona && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                {template.persona}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          'w-4 h-4 flex-shrink-0 mt-1 transition-colors',
                          isActive ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600',
                        )} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Active Template Preview */}
              <div className="lg:col-span-2">
                <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <selectedTemplate.icon className="w-4 h-4 text-emerald-500" />
                        <CardTitle className="text-base">{selectedTemplate.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPrompt}
                          className="h-7 text-[10px] gap-1"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setActiveTab('editor'); setEditContent(selectedTemplate.content); }}
                          className="h-7 text-[10px] gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-4">
                    {/* Prompt with syntax highlighting */}
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                      <pre className="font-sans text-xs leading-relaxed">
                        {renderHighlightedContent(editContent || selectedTemplate.content)}
                      </pre>
                    </div>

                    {/* Variables used */}
                    {selectedTemplate.variables.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Variables:</span>
                        {selectedTemplate.variables.map(v => (
                          <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-mono">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── Editor Tab ────────────────────────────────────────────────── */}
          <TabsContent value="editor" className="mt-4 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-emerald-500" />
                      Prompt Editor
                    </CardTitle>
                    <CardDescription>
                      Editing: {selectedTemplate.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {charCount.toLocaleString()} chars
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} className="h-7 text-[10px] gap-1">
                      <Eye className="w-3 h-3" />
                      Preview
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSaveDialogOpen(true)} className="h-7 text-[10px] gap-1 text-emerald-600 dark:text-emerald-400">
                      <Save className="w-3 h-3" />
                      Save as Template
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editContent || selectedTemplate.content}
                  onChange={e => setEditContent(e.target.value)}
                  className="min-h-[400px] max-h-[600px] font-mono text-xs leading-relaxed border-slate-200 dark:border-slate-700 resize-y custom-scrollbar"
                  placeholder="Write or edit your system prompt here..."
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Insert:</span>
                    {AVAILABLE_VARIABLES.slice(0, 4).map(v => (
                      <button
                        key={v.name}
                        onClick={() => {
                          const content = editContent || selectedTemplate.content;
                          setEditContent(content + ' ' + v.name);
                          toast.success(`Inserted ${v.name}`);
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        +{v.name}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleCopyPrompt}
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Variables Tab ─────────────────────────────────────────────── */}
          <TabsContent value="variables" className="mt-4">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Braces className="w-4 h-4 text-amber-500" />
                  Variable Reference
                </CardTitle>
                <CardDescription>
                  Available variables for interpolation in system prompts. These are replaced with actual values at runtime.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_VARIABLES.map(variable => (
                    <motion.div
                      key={variable.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-3 h-3 text-amber-500" />
                        <code className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {variable.name}
                        </code>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {variable.description}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Example: <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1 rounded">{variable.example}</span>
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Tip:</strong> Variables are automatically interpolated at call time from the clinic settings, lead CRM data, and call context. 
                      You can also use custom variables by wrapping any text in curly braces: <code className="font-mono bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded">{'{custom_var}'}</code>
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500" />
              Interpolated Preview
            </DialogTitle>
            <DialogDescription>
              Preview with sample values substituted for variables
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <pre className="font-sans text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {previewContent}
            </pre>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="flex-1 text-xs">
              Close
            </Button>
            <Button onClick={handleCopyPrompt} className="flex-1 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy Interpolated
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-500" />
              Save as Template
            </DialogTitle>
            <DialogDescription>
              Save your custom prompt as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Template Name</label>
              <input
                value={savedTemplateName}
                onChange={e => setSavedTemplateName(e.target.value)}
                placeholder="e.g., My Custom Booking Agent"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="flex-1 text-xs">
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} className="flex-1 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
