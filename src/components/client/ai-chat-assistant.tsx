'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  SendHorizontal,
  Trash2,
  Sparkles,
  CalendarCheck,
  Phone,
  FileText,
  Search,
  RotateCcw,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  User,
  Loader2,
} from 'lucide-react';

/* ============================================================
   Types
   ============================================================ */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ConnectionStatus {
  connected: boolean;
  model?: string;
  demoMode?: boolean;
}

/* ============================================================
   Constants
   ============================================================ */

const QUICK_ACTIONS = [
  {
    id: 'schedule',
    label: "What's my schedule today?",
    icon: CalendarCheck,
    message: "What's my schedule today?",
  },
  {
    id: 'calls',
    label: 'How many calls today?',
    icon: Phone,
    message: 'How many calls did VoiceAI handle today? Give me the stats.',
  },
  {
    id: 'summary',
    label: 'Summarize recent calls',
    icon: FileText,
    message: 'Summarize the most recent calls. What were patients asking about?',
  },
  {
    id: 'lookup',
    label: 'Patient lookup',
    icon: Search,
    message: 'Patient lookup: ',
    placeholder: 'Enter phone number...',
    isLookup: true,
  },
];

const SUGGESTION_MAP: Record<string, string[]> = {
  schedule: [
    'Show tomorrow\'s appointments',
    'Any cancellations today?',
    'Book a new slot',
  ],
  calls: [
    'Show call sentiment analysis',
    'Which calls were escalated?',
    'How\'s the booking rate trending?',
  ],
  summary: [
    'What are common patient concerns?',
    'Show booking conversion stats',
    'Any missed calls to follow up?',
  ],
  lookup: [
    'Show their appointment history',
    'When was their last visit?',
  ],
  general: [
    'How can I improve AI performance?',
    'Show clinic performance report',
    'What services are most booked?',
  ],
};

/* ============================================================
   Mock/Fallback Responses
   ============================================================ */

function getMockResponse(message: string, clinicName: string, doctorName: string): { content: string; suggestions: string[] } {
  const lower = message.toLowerCase();

  if (lower.includes('schedule') || lower.includes('appointment') || lower.includes('today')) {
    const now = new Date();
    const today = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return {
      content: `Here's your schedule for **${today}** at **${clinicName}**:\n\n| Time | Patient | Service | Status |\n|------|---------|---------|--------|\n| 09:00 AM | Ravi Kumar | Dental Checkup | ✅ Confirmed |\n| 10:30 AM | Priya Sharma | Teeth Cleaning | ✅ Confirmed |\n| 12:00 PM | Amit Patel | Root Canal | ⏳ Pending |\n| 03:00 PM | Neha Gupta | Braces Fitting | ✅ Confirmed |\n| 04:30 PM | Suresh Reddy | Consultation | 🆕 New Booking |\n\n**${doctorName}** has **5 appointments** today. The morning is fully booked. You have a **30-min gap** at 11:00 AM for any walk-ins or emergencies.`,
      suggestions: SUGGESTION_MAP.schedule,
    };
  }

  if (lower.includes('call') && (lower.includes('how many') || lower.includes('stat') || lower.includes('handled'))) {
    return {
      content: `Here are today's **call statistics** for **${clinicName}**:\n\n📊 **Call Overview**\n- **Total Calls**: 24\n- **Answered**: 21 (87.5%)\n- **Missed**: 3 (12.5%)\n- **Avg Duration**: 2m 35s\n\n📈 **Booking Performance**\n- **Appointments Booked**: 14\n- **Booking Rate**: 66.7%\n- **WhatsApp Confirmed**: 12/14\n\n💬 **Top Patient Intents**\n1. Appointment Booking (42%)\n2. Fee Inquiry (25%)\n3. General Inquiry (17%)\n4. Rescheduling (10%)\n5. Emergency (6%)\n\n🟢 **Sentiment**: 78% Positive, 15% Neutral, 7% Negative\n\n*VoiceAI is performing **above average** compared to the clinic's 30-day baseline.*`,
      suggestions: SUGGESTION_MAP.calls,
    };
  }

  if (lower.includes('summar') || lower.includes('recent') || lower.includes('transcript')) {
    return {
      content: `Here's a summary of the **5 most recent calls** handled by VoiceAI:\n\n**1. Ravi Kumar** — *09:15 AM, 2m 12s*\n> Called to book a dental checkup. AI offered 3 time slots, patient chose 10:00 AM tomorrow. **WhatsApp confirmation sent.** ✅\n\n**2. Anita Joshi** — *09:45 AM, 1m 48s*\n> Asked about teeth cleaning charges (₹800). AI explained pricing and offered to book. Patient will call back after checking availability. **Follow-up needed.** 📞\n\n**3. Vikram Singh** — *10:20 AM, 3m 05s*\n> Wanted to reschedule appointment from Thursday to Friday. AI moved the booking to 11:00 AM Friday. **Confirmed.** ✅\n\n**4. Meera Nair** — *11:00 AM, 0m 45s*\n> Emergency tooth pain complaint. AI flagged as **escalation** and provided clinic emergency number. **Dr. ${doctorName} was notified.** 🚨\n\n**5. Rajesh Iyer** — *11:30 AM, 1m 55s*\n> General inquiry about braces treatment cost and duration. AI provided detailed info (₹25,000-₹45,000, 12-18 months). **Interested, asked for callback.** 📞`,
      suggestions: SUGGESTION_MAP.summary,
    };
  }

  if (lower.includes('lookup') || lower.includes('patient')) {
    const phoneMatch = message.match(/\d{10}/);
    const phone = phoneMatch ? `+91 ${phoneMatch[0].replace(/(\d{5})(\d{5})/, '$1 $2')}` : '(no phone provided)';
    return {
      content: phoneMatch
        ? `🔍 **Patient Lookup: ${phone}**\n\n**Patient**: Arun Verma\n**Last Visit**: 12/01/2025\n**Total Visits**: 7\n**Outstanding**: ₹0\n\n**Recent History:**\n- 12/01/2025 — Root Canal (Completed) — ₹3,500\n- 15/11/2024 — Filling (Completed) — ₹800\n- 03/10/2024 — Checkup (Completed) — ₹500\n\n**Notes:** Patient is due for a follow-up on the root canal. AI mentioned this in the last call on 05/01/2025.`
        : `🔍 Please provide a **10-digit phone number** for the patient lookup.\n\nExample: \`Patient lookup: 9876543210\``,
      suggestions: phoneMatch ? SUGGESTION_MAP.lookup : ['Try: Patient lookup: 9876543210'],
    };
  }

  if (lower.includes('improve') || lower.includes('performance') || lower.includes('tip')) {
    return {
      content: `Here are **5 tips** to improve VoiceAI performance at **${clinicName}**:\n\n1. **📝 Update Greeting** — Personalize the AI greeting with current seasonal offers or promotions. This increased engagement by 23% for similar clinics.\n\n2. **⏰ Extend Business Hours** — Consider adding evening slots (6-8 PM). Our data shows 18% of calls come after 6 PM.\n\n3. **🔄 Reduce Missed Calls** — Enable auto-callback for missed calls within 5 minutes. Clinics that do this see 40% recovery.\n\n4. **💬 Add Hinglish Responses** — Since most patients speak Hinglish, ensure the AI is configured for Hinglish mode. This improves patient satisfaction by 31%.\n\n5. **📊 Review Weekly Reports** — Check the Analytics tab weekly to track booking conversion trends and identify improvement areas.`,
      suggestions: ['Show clinic performance report', 'How do I configure Hinglish mode?', 'What are the best practices for greetings?'],
    };
  }

  // General fallback
  return {
    content: `Hello! I'm **VoiceAI Assistant**, your intelligent clinic helper. 🤖\n\nI can help you with:\n\n- 📅 **Schedule & Appointments** — View today's schedule, check availability\n- 📞 **Call Analytics** — Call stats, booking rates, sentiment analysis\n- 🔍 **Patient Lookup** — Find patient history by phone number\n- 📋 **Call Summaries** — Get AI-generated summaries of recent calls\n- ⚙️ **Clinic Settings** — Tips to optimize VoiceAI for ${clinicName}\n\nTry asking me something specific, or use the **quick action buttons** below!`,
    suggestions: SUGGESTION_MAP.general,
  };
}

/* ============================================================
   Simple Markdown Renderer (no external dependency)
   ============================================================ */

function SimpleMarkdown({ text }: { text: string }) {
  const html = useMemo(() => {
    let result = text
      // Code blocks (```...```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 my-2 text-xs overflow-x-auto"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>')
      // Blockquote
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-emerald-400 pl-3 my-1 text-slate-600 dark:text-slate-400 italic">$1</blockquote>')
      // Unordered list items
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // Ordered list items
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Table handling (basic)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // separator row
        const isHeader = match.includes('---');
        if (isHeader) return '';
        const cellContent = cells.map(c => `<td class="px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs">${c.trim()}</td>`).join('');
        return `<tr>${cellContent}</tr>`;
      })
      // Line breaks (double newline → paragraph break)
      .replace(/\n\n/g, '</p><p class="mt-2">')
      // Single newlines
      .replace(/\n/g, '<br/>');

    // Wrap table rows
    if (result.includes('<tr>')) {
      result = result.replace(/((?:<tr>.*?<\/tr>\s*)+)/g, '<table class="border-collapse my-2 w-full text-xs">$1</table>');
    }

    return result;
  }, [text]);

  return (
    <div
      className="text-sm leading-relaxed prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

/* ============================================================
   Typing Indicator Component
   ============================================================ */

function TypingIndicator() {
  return (
    <motion.div
      className="flex items-start gap-3 max-w-4xl mx-auto px-4 sm:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.25 }}
    >
      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">VoiceAI is thinking</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 typing-dot" />
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   Connection Status Check
   ============================================================ */

function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const checkHealth = async () => {
      try {
        const res = await fetch('/api/gemini?action=health');
        if (res.ok) {
          const data = await res.json();
          setStatus({
            connected: true,
            model: data.model || 'Unknown',
            demoMode: data.demoMode ?? true,
          });
        } else {
          setStatus({ connected: false });
        }
      } catch {
        setStatus({ connected: false });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

/* ============================================================
   Main AI Chat Assistant Component
   ============================================================ */

export default function AIChatAssistant() {
  const { user } = useAuthStore();
  const connectionStatus = useConnectionStatus();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [showLookupInput, setShowLookupInput] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeShown = useRef(false);

  const clinicName = user?.clinicName || 'VoiceAI Clinic';
  const doctorName = user?.name || 'Doctor';

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Show welcome message on first render
  useEffect(() => {
    if (!welcomeShown.current) {
      welcomeShown.current = true;
      const now = new Date();
      const hour = now.getHours();
      const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `${greeting}! 👋 Welcome to **VoiceAI Assistant**\n\nI'm your AI-powered clinic helper for **${clinicName}**. I can help you with:\n\n- 📅 View today's **schedule** and appointments\n- 📊 Check **call statistics** and performance metrics\n- 🔍 **Look up patients** by phone number\n- 📋 Get **AI summaries** of recent patient calls\n- 💡 Get **optimization tips** for your VoiceAI setup\n\nHow can I help you today?`,
          timestamp: new Date(),
          suggestions: ['Show my schedule', 'Call stats for today', 'Summarize recent calls'],
        },
      ]);
    }
  }, [clinicName]);

  // Generate unique message ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Send message to API
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');
    setShowLookupInput(false);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: messageText.trim(),
          clinicContext: {
            clinicId: user?.clinicId,
            clinicName: clinicName,
            doctorName: doctorName,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        // Use mock fallback on error
        const mockResponse = getMockResponse(messageText, clinicName, doctorName);
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: mockResponse.content,
          timestamp: new Date(),
          suggestions: mockResponse.suggestions,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Determine suggestions based on message content
        const lower = messageText.toLowerCase();
        let suggestions: string[] = SUGGESTION_MAP.general;
        if (lower.includes('schedule') || lower.includes('appointment')) suggestions = SUGGESTION_MAP.schedule;
        else if (lower.includes('call') || lower.includes('stat')) suggestions = SUGGESTION_MAP.calls;
        else if (lower.includes('summar') || lower.includes('recent')) suggestions = SUGGESTION_MAP.summary;
        else if (lower.includes('lookup') || lower.includes('patient')) suggestions = SUGGESTION_MAP.lookup;

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.response || data.message || 'I received your message but have no response to share.',
          timestamp: new Date(),
          suggestions,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch {
      // Network error — use mock fallback
      const mockResponse = getMockResponse(messageText, clinicName, doctorName);
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: mockResponse.content,
        timestamp: new Date(),
        suggestions: mockResponse.suggestions,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isLoading, user?.clinicId, clinicName, doctorName]);

  // Handle send
  const handleSend = useCallback(() => {
    if (showLookupInput && lookupPhone) {
      sendMessage(`Patient lookup: ${lookupPhone}`);
      setLookupPhone('');
    } else if (input.trim()) {
      sendMessage(input);
    }
  }, [input, showLookupInput, lookupPhone, sendMessage]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle quick action
  const handleQuickAction = useCallback((action: typeof QUICK_ACTIONS[number]) => {
    if (action.isLookup) {
      setShowLookupInput(true);
      inputRef.current?.focus();
      return;
    }
    sendMessage(action.message);
  }, [sendMessage]);

  // Handle suggestion click
  const handleSuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  // Clear chat
  const handleClearChat = useCallback(() => {
    setMessages([]);
    welcomeShown.current = false;
    // Re-trigger welcome message
    setTimeout(() => {
      welcomeShown.current = true;
      setMessages([
        {
          id: generateId(),
          role: 'assistant',
          content: `Chat cleared! 🧹 How can I help you with **${clinicName}**?`,
          timestamp: new Date(),
          suggestions: ['Show my schedule', 'Call stats for today', 'Summarize recent calls'],
        },
      ]);
    }, 100);
  }, [clinicName]);

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-10rem)] flex flex-col max-w-4xl mx-auto w-full">
      {/* ===== AI Context Header ===== */}
      <motion.div
        className="flex items-center justify-between px-4 py-3 border border-slate-200/80 dark:border-slate-800/80 rounded-t-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          {/* Bot avatar with glow */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-white text-base">VoiceAI Assistant</h2>
              {/* Gemini Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" />
                Powered by Gemini AI
              </span>
            </div>
            {/* Connection status */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {connectionStatus.connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Connected
                  </span>
                  {connectionStatus.demoMode && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 ml-1">
                      Demo Mode
                    </span>
                  )}
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Offline — using local responses</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clear chat button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearChat}
          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline ml-1.5 text-xs">Clear</span>
        </Button>
      </motion.div>

      {/* ===== Messages Area ===== */}
      <div className="flex-1 border-x border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="py-4 space-y-1">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={cn(
                  'flex items-start gap-3 max-w-4xl mx-auto px-4 sm:px-6',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {/* Avatar */}
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Message bubble */}
                <div className={cn(
                  'flex flex-col max-w-[85%] sm:max-w-[75%]',
                  message.role === 'user' ? 'items-end' : 'items-start',
                )}>
                  {/* Role label */}
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1 px-1">
                    {message.role === 'user' ? 'You' : 'VoiceAI'}
                  </span>

                  {/* Bubble */}
                  <div className={cn(
                    'rounded-2xl px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-sm'
                      : message.role === 'error'
                        ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 rounded-tl-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-sm',
                  )}>
                    {message.role === 'error' ? (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : message.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <SimpleMarkdown text={message.content} />
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    <span className="text-[10px] text-slate-400 dark:text-slate-600">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>

                  {/* Suggested Responses */}
                  {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                    <motion.div
                      className="flex flex-wrap gap-1.5 mt-2 ml-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      {message.suggestions.map((suggestion, si) => (
                        <button
                          key={si}
                          onClick={() => handleSuggestion(suggestion)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <Zap className="w-3 h-3" />
                          {suggestion}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Typing Indicator */}
            <AnimatePresence>
              {isLoading && <TypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* ===== Input Area ===== */}
      <motion.div
        className="border border-slate-200/80 dark:border-slate-800/80 rounded-b-xl bg-white dark:bg-slate-900 backdrop-blur-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Quick Action Buttons */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-200 flex-shrink-0',
                    showLookupInput && action.isLookup
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800/60',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lookup Phone Input (conditional) */}
        <AnimatePresence>
          {showLookupInput && (
            <motion.div
              className="px-4 pb-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">+91</span>
                </div>
                <input
                  type="tel"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Enter 10-digit phone number"
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-emerald-400 dark:focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Input + Send Button */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-emerald-400 dark:focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-400/30 transition-all px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1000))}
              onKeyDown={handleKeyDown}
              placeholder="Ask VoiceAI anything..."
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px]"
              style={{
                height: 'auto',
                overflow: 'hidden',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />

            {/* Character count */}
            {input.length > 0 && (
              <span className={cn(
                'text-[10px] mr-1 mb-0.5',
                input.length > 900 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500',
              )}>
                {input.length}/1000
              </span>
            )}

            {/* Send button */}
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !(showLookupInput && lookupPhone))}
              className={cn(
                'h-8 w-8 rounded-lg flex-shrink-0 transition-all duration-200',
                (input.trim() || (showLookupInput && lookupPhone))
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500',
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SendHorizontal className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Helper text */}
          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1.5 px-1">
            Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">Shift+Enter</kbd> for new line
          </p>
        </div>
      </motion.div>
    </div>
  );
}
