'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, RotateCcw, CheckCircle, MessageSquare, Smartphone, Send, Sparkles, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface AiChatSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  role: 'ai' | 'caller';
  text: string;
  responseTime?: number;
}

const CONVERSATION: ChatMessage[] = [
  { role: 'ai', text: 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha hoon, Dr. Rajesh Sharma ki clinic se. Kaise madad kar sakti hoon aapki?' },
  { role: 'caller', text: 'Hi, I want to book an appointment for a dental checkup.' },
  { role: 'ai', text: 'Zaroor! Kya aap koi specific date preference rakhte hain? Kal ya parso?' },
  { role: 'caller', text: 'Tomorrow morning if possible' },
  { role: 'ai', text: 'Tomorrow 10:30 AM kaisa rahega? Woh slot available hai.' },
  { role: 'caller', text: 'Perfect, 10:30 works.' },
  { role: 'ai', text: 'Done! Main aapka appointment 10:30 AM kal ke liye book kar diya hai. Aapka naam aur phone number bataiye confirmation ke liye?' },
  { role: 'caller', text: 'Rahul Kumar, 9876543210' },
  { role: 'ai', text: 'Thank you Rahul ji! Aapko WhatsApp par confirmation bhej di jayegi. Kya aur kuch?' },
  { role: 'caller', text: "No that's it, thanks!" },
  { role: 'ai', text: 'Dhanyavaad! Kal milte hain. Aapki tabiyat khush raho!' },
];

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-1">
      <motion.span
        className="w-2 h-2 rounded-full bg-emerald-400/70"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-2 h-2 rounded-full bg-emerald-400/70"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span
        className="w-2 h-2 rounded-full bg-emerald-400/70"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  );
}

export default function AiChatSimulator({ open, onOpenChange }: AiChatSimulatorProps) {
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [isLiveTyping, setIsLiveTyping] = useState(false);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const liveInputRef = useRef<HTMLInputElement>(null);

  // --- Demo mode logic ---
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startConversation = useCallback(() => {
    clearTimer();
    setVisibleMessages([]);
    setIsComplete(false);
    setIsTyping(true);
    setShowSummary(false);

    let index = 0;
    const addNext = () => {
      if (index < CONVERSATION.length) {
        setIsTyping(true);
        timerRef.current = setTimeout(() => {
          setVisibleMessages((prev) => [...prev, CONVERSATION[index]]);
          setIsTyping(false);
          index++;
          timerRef.current = setTimeout(addNext, (2000 / speed));
        }, (1500 / speed));
      } else {
        setIsComplete(true);
        setIsTyping(false);
        timerRef.current = setTimeout(() => setShowSummary(true), 800 / speed);
      }
    };

    timerRef.current = setTimeout(addNext, 500 / speed);
  }, [speed, clearTimer]);

  useEffect(() => {
    if (open && mode === 'demo') {
      startConversation();
    } else {
      clearTimer();
      setVisibleMessages([]);
      setIsComplete(false);
      setIsTyping(false);
      setShowSummary(false);
    }
    return clearTimer;
  }, [open, mode, startConversation, clearTimer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages, isTyping]);

  // --- Live mode scroll ---
  useEffect(() => {
    if (liveScrollRef.current) {
      liveScrollRef.current.scrollTop = liveScrollRef.current.scrollHeight;
    }
  }, [liveMessages, isLiveTyping]);

  // --- Live AI chat ---
  const handleSendLiveMessage = useCallback(async () => {
    const msg = liveInput.trim();
    if (!msg || isLiveTyping) return;

    setLiveInput('');
    setLiveMessages(prev => [...prev, { role: 'caller', text: msg }]);
    setIsLiveTyping(true);
    setLastResponseTime(null);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/gemini?action=chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          clinicContext: {
            clinicName: user?.clinicName || 'Sharma Dental',
            doctorName: user?.name || 'Dr. Sharma',
          },
        }),
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setLastResponseTime(elapsed);

      if (data.success && data.response) {
        setLiveMessages(prev => [...prev, { role: 'ai', text: data.response, responseTime: elapsed }]);
      } else {
        setLiveMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I could not process your request. Please try again.', responseTime: elapsed }]);
      }
    } catch {
      const elapsed = Date.now() - startTime;
      setLastResponseTime(elapsed);
      setLiveMessages(prev => [...prev, { role: 'ai', text: 'Network error. Please check your connection and try again.', responseTime: elapsed }]);
    }
    setIsLiveTyping(false);
  }, [liveInput, isLiveTyping, user]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendLiveMessage();
    }
  }, [handleSendLiveMessage]);

  // Reset live messages when switching modes
  useEffect(() => {
    setLiveMessages([]);
    setIsLiveTyping(false);
    setLastResponseTime(null);
    setLiveInput('');
  }, [mode]);

  // Focus input when opening in live mode
  useEffect(() => {
    if (open && mode === 'live') {
      setTimeout(() => liveInputRef.current?.focus(), 300);
    }
  }, [open, mode]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const modeLabel = mode === 'demo' ? 'Demo Mode' : 'Live Mode';
  const modeDescription = mode === 'demo'
    ? 'Watch how our AI handles a real patient call automatically'
    : 'Chat directly with the Gemini AI voice agent in real-time';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Dialog header */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-white text-lg">
                <Smartphone className="w-5 h-5" />
                AI Voice Agent
              </DialogTitle>
              {/* Mode toggle */}
              <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full p-0.5 border border-white/20">
                <button
                  onClick={() => setMode('demo')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
                    mode === 'demo'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Demo
                  </span>
                </button>
                <button
                  onClick={() => setMode('live')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
                    mode === 'live'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Live
                  </span>
                </button>
              </div>
            </div>
            <DialogDescription className="text-emerald-100">
              {modeDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Phone-like interface */}
        <div className="bg-slate-950 p-1 rounded-b-2xl overflow-hidden">
          {/* Phone status bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-slate-400 font-mono">9:41 AM</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">
                {mode === 'demo' ? 'Live Call' : 'AI Chat'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Speed controls - only in demo mode */}
              {mode === 'demo' && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold transition-colors',
                        speed === s
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
              {/* Response time badge - only in live mode */}
              {mode === 'live' && lastResponseTime !== null && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5">
                  {lastResponseTime}ms
                </Badge>
              )}
            </div>
          </div>

          {/* Demo Mode Chat */}
          {mode === 'demo' && (
            <div ref={scrollRef} className="h-[420px] overflow-y-auto px-4 py-4 space-y-3">
              {visibleMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn('flex', msg.role === 'caller' ? 'justify-start' : 'justify-end')}
                >
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    msg.role === 'caller'
                      ? 'bg-slate-800 text-slate-200 rounded-bl-md'
                      : 'bg-emerald-600 text-white rounded-br-md'
                  )}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.role === 'caller' ? (
                        <User className="w-3 h-3 opacity-60" />
                      ) : (
                        <Bot className="w-3 h-3 opacity-60" />
                      )}
                      <span className="text-[10px] font-medium opacity-60">
                        {msg.role === 'caller' ? 'Rahul Kumar' : 'Rekha (AI)'}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && !isComplete && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-end"
                >
                  <div className="bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3 h-3 opacity-60" />
                      <span className="text-[10px] font-medium opacity-60">Rekha (AI)</span>
                    </div>
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Live Mode Chat */}
          {mode === 'live' && (
            <div className="flex flex-col h-[420px]">
              <div ref={liveScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {/* Welcome message */}
                {liveMessages.length === 0 && !isLiveTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center"
                  >
                    <div className="bg-slate-800/50 text-slate-400 rounded-2xl px-4 py-3 text-center max-w-[80%]">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">Gemini AI Voice Agent</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {user?.clinicName
                          ? `Ask me anything about ${user.clinicName}! I can help with appointments, services, timings, and more.`
                          : 'Ask me anything about this clinic! I can help with appointments, services, timings, and more.'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {liveMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn('flex', msg.role === 'caller' ? 'justify-start' : 'justify-end')}
                  >
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 relative',
                      msg.role === 'caller'
                        ? 'bg-slate-800 text-slate-200 rounded-bl-md'
                        : 'bg-emerald-600 text-white rounded-br-md'
                    )}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.role === 'caller' ? (
                          <User className="w-3 h-3 opacity-60" />
                        ) : (
                          <Bot className="w-3 h-3 opacity-60" />
                        )}
                        <span className="text-[10px] font-medium opacity-60">
                          {msg.role === 'caller' ? (user?.name || 'You') : 'Gemini AI'}
                        </span>
                        {msg.responseTime && (
                          <span className="text-[9px] opacity-40 ml-auto">{msg.responseTime}ms</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}

                {/* Live typing indicator */}
                {isLiveTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-end"
                  >
                    <div className="bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 opacity-60" />
                        <span className="text-[10px] font-medium opacity-60">Gemini AI</span>
                      </div>
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Live input */}
              <div className="px-4 pb-3 pt-2 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                  <input
                    ref={liveInputRef}
                    type="text"
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isLiveTyping}
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendLiveMessage}
                    disabled={isLiveTyping || !liveInput.trim()}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
                      liveInput.trim() && !isLiveTyping
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-800 text-slate-500'
                    )}
                  >
                    {isLiveTyping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Summary card - Demo mode only */}
          {mode === 'demo' && showSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="px-4 pb-4"
            >
              <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Booking Confirmed</p>
                    <p className="text-[10px] text-emerald-500/70">Appointment booked via AI voice agent</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Patient</p>
                    <p className="text-white font-medium">Rahul Kumar</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Phone</p>
                    <p className="text-white font-medium">+91-98765-43210</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Date</p>
                    <p className="text-white font-medium">{tomorrowStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Time</p>
                    <p className="text-white font-medium">10:30 AM</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Service</p>
                    <p className="text-white font-medium">Dental Checkup</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">WhatsApp</p>
                    <p className="text-emerald-400 font-medium flex items-center gap-1">
                      Sent <CheckCircle className="w-3 h-3" />
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Bottom actions */}
          <div className="px-4 pb-4">
            {(isComplete || (mode === 'live' && liveMessages.length > 0)) && (
              <div className="flex gap-3">
                {mode === 'demo' && (
                  <Button
                    onClick={startConversation}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restart Demo
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
