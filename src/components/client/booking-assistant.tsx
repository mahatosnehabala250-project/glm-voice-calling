'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, Send, Clock, Phone, AlertTriangle, CalendarCheck,
  MessageCircleHeart, User, RotateCcw, Sparkles, IndianRupee,
  Stethoscope, Zap, CheckCircle, ChevronRight, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface BookingState {
  step: 'idle' | 'select-day' | 'select-time' | 'select-service' | 'confirmed';
  selectedDate: string;
  selectedTime: string;
  selectedService: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CLINIC_NAME = 'Sharma Dental Clinic';
const DOCTOR_NAME = 'Dr. Rajesh Sharma';
const DOCTOR_SPECIALIZATION = 'BDS, MDS - Prosthodontics';
const DOCTOR_EXPERIENCE = '15+ years';
const EMERGENCY_LINE = '+91-98765-12345';
const CONSULTATION_FEE = '₹500';

const SERVICES = [
  'Dental Checkup',
  'Root Canal',
  'Teeth Cleaning',
  'Braces Consultation',
  'Denture Fitting',
  'Whitening',
];

const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

const QUICK_REPLIES = [
  { label: 'Book Appointment', emoji: '📅', icon: CalendarCheck },
  { label: 'Check Availability', emoji: '🕐', icon: Clock },
  { label: 'Fee Inquiry', emoji: '💰', icon: IndianRupee },
  { label: 'Doctor Details', emoji: '👨‍⚕️', icon: Stethoscope },
  { label: 'Emergency', emoji: '🚨', icon: AlertTriangle },
];

const DAY_OPTIONS = ['Today', 'Tomorrow', 'Day After Tomorrow'];

function getDayLabel(option: string): string {
  const today = new Date();
  if (option === 'Today') return today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  if (option === 'Tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  const d = new Date(today);
  d.setDate(d.getDate() + 2);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── AI Response Engine ──────────────────────────────────────────────────────

function generateAIResponse(userText: string): { text: string; action?: string } {
  const lower = userText.toLowerCase().trim();

  // Emergency detection
  if (lower.match(/emergency|bleeding|chest pain|severe|urgent|immediate|critical|unbearable/)) {
    return {
      text: `🚨 **EMERGENCY PROTOCOL ACTIVATED!**\n\nAapki madad zaroori hai! Please humara emergency number immediately call karein:\n\n📞 **${EMERGENCY_LINE}**\n\nDr. ${DOCTOR_NAME} ko bhi inform kar diya jayega. Please phone rakhein aur clinic aa jayein!`,
      action: 'emergency',
    };
  }

  // Thank you / farewell
  if (lower.match(/thank|thanks|dhanyavaad|shukriya|bye|goodbye|alvida|okay fine|ok bye/)) {
    return {
      text: `Aapka dhanyavaad! 🙏 ${CLINIC_NAME} mein aapka swagat hai. Koi bhi zaroorat ho toh yahan message karein. Aapki tabiyat khush raho! 🌟`,
    };
  }

  // Fee inquiry
  if (lower.match(/fee|cost|charge|price|rate|kitna|paisa|rupee|payment|paise/)) {
    return {
      text: `💰 **Fee Structure - ${CLINIC_NAME}:**\n\n• General Consultation: **₹500**\n• Dental Checkup: **₹300**\n• Root Canal (RCT): **₹3,000 - ₹8,000**\n• Teeth Cleaning: **₹800**\n• Braces: **₹25,000 - ₹50,000**\n• Whitening: **₹5,000 - ₹12,000**\n• Denture Fitting: **₹8,000 - ₹15,000**\n\n*Note: Exact cost treatment ke baad pata chalega. Insurance bhi accept karte hain!* 🏥`,
      action: 'fee',
    };
  }

  // Doctor info
  if (lower.match(/doctor|dr\.|specialist|experience|qualification|dentist/)) {
    return {
      text: `👨‍⚕️ **Doctor Information:**\n\n**${DOCTOR_NAME}**\n📋 ${DOCTOR_SPECIALIZATION}\n⏳ Experience: ${DOCTOR_EXPERIENCE}\n🏥 ${CLINIC_NAME}\n📞 ${EMERGENCY_LINE}\n\nDr. Sharma ji ne 10,000+ successful treatments kiye hain. Patient satisfaction 4.9/5 hai! ⭐`,
      action: 'doctor',
    };
  }

  // Availability / timing
  if (lower.match(/available|availability|timing|hours|open|close|when|schedule|slot/)) {
    return {
      text: `🕐 **${CLINIC_NAME} - Timings:**\n\n📅 **Monday - Saturday:**\n   Morning: 9:00 AM - 1:00 PM\n   Evening: 2:00 PM - 7:00 PM\n\n📅 **Sunday:** Closed\n\n✅ Available slots dikhane ke liye **"Book Appointment"** click karein! Abhi book karne mein **₹100 discount** bhi milega! 🎉`,
      action: 'availability',
    };
  }

  // Booking keywords
  if (lower.match(/book|appointment|schedule|reserve|booked|karna|book karo|appointment chahiye/)) {
    return {
      text: 'Bilkul! Appointment booking start karte hain! 📅',
      action: 'start-booking',
    };
  }

  // Greeting
  if (lower.match(/hi|hello|hey|hii|namaste|namaskar|good morning|good afternoon|good evening|sat sri akal/)) {
    return {
      text: `Namaste ji! 🙏 ${CLINIC_NAME} mein aapka swagat hai! Main hoon ${CLINIC_NAME} ki AI assistant.\n\nMain aapki kaise madad kar sakta hoon? Aap:\n\n📅 Appointment book kar sakte hain\n💰 Fees check kar sakte hain\n👨‍⚕️ Doctor ke baare mein jaan sakte hain\n🕐 Availability dekh sakte hain\n\nBas bataiye kya chahiye! 😊`,
    };
  }

  // Default response
  return {
    text: `Main samajh gaya! Aapki query ke liye, main chahanta hoon ki:\n\n1. **Book Appointment** - Fast booking with confirmed slots\n2. **Fee Inquiry** - Complete fee structure\n3. **Doctor Details** - Dr. ${DOCTOR_NAME} ke baare mein\n4. **Check Availability** - Today's open slots\n\nYa directly apna sawaal type karein! Main Hinglish mein samajh sakta hoon 😊`,
  };
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      <span className="text-[10px] text-slate-400 mr-1">Booking Bot typing</span>
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400/80"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400/80"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400/80"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface BookingAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

let msgIdCounter = 0;
function nextId() {
  return `msg-${++msgIdCounter}`;
}

export default function BookingAssistant({ open, onOpenChange }: BookingAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState>({
    step: 'idle', selectedDate: '', selectedTime: '', selectedService: '',
  });
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [responseCount, setResponseCount] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isAutoTyping, setIsAutoTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, typedText, scrollToBottom]);

  // Auto-type effect for last AI message
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'ai' && !lastMsg.isTyping && lastMsg.text !== typedText) {
      setIsAutoTyping(true);
      setTypedText('');
      let idx = 0;
      const text = lastMsg.text;
      const typeChar = () => {
        if (idx < text.length) {
          setTypedText(text.slice(0, idx + 1));
          idx++;
          typingTimerRef.current = setTimeout(typeChar, 15 + Math.random() * 10);
        } else {
          setIsAutoTyping(false);
        }
      };
      typingTimerRef.current = setTimeout(typeChar, 200);
    }
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [messages.length]);

  // Initialize conversation
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting: ChatMessage = {
        id: nextId(),
        role: 'ai',
        text: `Namaste! 🙏 Main hoon ${CLINIC_NAME} ki AI assistant. Kaise madad kar sakta hoon aaj?\n\nAap appointment book karna chahte hain, fees jaanna chahte hain, ya doctor ke baare mein kuch poochna hai? Bas type karein ya neeche option chunein! 😊`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [open]);

  const addAIMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: nextId(),
      role: 'ai',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setResponseCount(prev => prev + 1);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: nextId(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const simulateTypingAndRespond = useCallback((responseText: string, delay: number = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addAIMessage(responseText);
    }, delay);
  }, [addAIMessage]);

  const handleBookingFlow = useCallback((action: string) => {
    if (action === 'start-booking') {
      setBookingState(prev => ({ ...prev, step: 'select-day' }));
      setShowQuickReplies(false);
      setTimeout(() => {
        simulateTypingAndRespond(
          'Bilkul! Kis din aapko appointment chahiye? Neeche se din choose karein:',
          800
        );
      }, 300);
    }
  }, [simulateTypingAndRespond]);

  const handleDaySelect = useCallback((dayOption: string) => {
    const dayLabel = getDayLabel(dayOption);
    addUserMessage(dayLabel);
    setBookingState(prev => ({ ...prev, selectedDate: dayLabel, step: 'select-time' }));

    setTimeout(() => {
      simulateTypingAndRespond(
        `Accha! **${dayLabel}** ke liye slot dekhte hain... ✨\n\nNeeche se time slot choose karein:`,
        900
      );
    }, 400);
  }, [addUserMessage, simulateTypingAndRespond]);

  const handleTimeSelect = useCallback((time: string) => {
    addUserMessage(time);
    setBookingState(prev => ({ ...prev, selectedTime: time, step: 'select-service' }));

    setTimeout(() => {
      simulateTypingAndRespond(
        `**${time}** slot select ho gaya! ✅\n\nAb bataiye, kaunsi service chahiye?`,
        800
      );
    }, 400);
  }, [addUserMessage, simulateTypingAndRespond]);

  const handleServiceSelect = useCallback((service: string) => {
    addUserMessage(service);
    const { selectedDate, selectedTime } = bookingState;

    setBookingState(prev => ({ ...prev, selectedService: service, step: 'confirmed' }));

    const confirmationText = `Perfect! ✅ Appointment book kar diya hai!\n\n📅 **Date:** ${selectedDate}\n🕐 **Time:** ${selectedTime}\n🦷 **Service:** ${service}\n👨‍⚕️ **Doctor:** ${DOCTOR_NAME}\n🏥 **Clinic:** ${CLINIC_NAME}\n\nWhatsApp confirmation bhi bhej diya hai! 📱✨\n\nPlease 10 minutes pehle aana. Koi aur sawaal ho toh poochein! 😊`;

    setTimeout(() => {
      simulateTypingAndRespond(confirmationText, 1200);
    }, 400);

    // Show quick replies again after confirmation
    setTimeout(() => {
      setShowQuickReplies(true);
    }, 3000);
  }, [addUserMessage, bookingState, simulateTypingAndRespond]);

  const handleUserInput = useCallback((text: string) => {
    if (!text.trim()) return;

    addUserMessage(text);
    setInputValue('');

    // Check if in booking flow
    if (bookingState.step === 'select-day') return;
    if (bookingState.step === 'select-time') return;
    if (bookingState.step === 'select-service') return;

    // Show quick replies after each exchange
    setShowQuickReplies(true);

    // Get AI response
    const response = generateAIResponse(text);

    // Handle booking action
    if (response.action === 'start-booking') {
      handleBookingFlow('start-booking');
      return;
    }

    setTimeout(() => {
      simulateTypingAndRespond(response.text, 800 + Math.random() * 700);
    }, 300);
  }, [addUserMessage, bookingState.step, simulateTypingAndRespond, handleBookingFlow]);

  const handleQuickReply = useCallback((label: string) => {
    addUserMessage(label);
    setShowQuickReplies(false);

    if (label === 'Book Appointment') {
      handleBookingFlow('start-booking');
      return;
    }

    const response = generateAIResponse(label);
    setTimeout(() => {
      simulateTypingAndRespond(response.text, 800 + Math.random() * 500);
    }, 300);

    // Show quick replies again after a delay
    setTimeout(() => {
      setShowQuickReplies(true);
    }, 2500);
  }, [addUserMessage, handleBookingFlow, simulateTypingAndRespond]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setBookingState({ step: 'idle', selectedDate: '', selectedTime: '', selectedService: '' });
    setShowQuickReplies(true);
    setResponseCount(0);
    setTypedText('');
    setIsAutoTyping(false);
    setIsTyping(false);
    // Reinitialize
    setTimeout(() => {
      const greeting: ChatMessage = {
        id: nextId(),
        role: 'ai',
        text: `Namaste! 🙏 Main hoon ${CLINIC_NAME} ki AI assistant. Kaise madad kar sakta hoon aaj?\n\nAap appointment book karna chahte hain, fees jaanna chahte hain, ya doctor ke baare mein kuch poochna hai? Bas type karein ya neeche option chunein! 😊`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }, 300);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput(inputValue);
    }
  };

  // Get display text for AI messages (auto-type effect)
  const getDisplayText = (msg: ChatMessage, idx: number) => {
    if (msg.role !== 'ai') return msg.text;
    const lastAiIdx = messages.length - 1;
    // Find the index of the last AI message
    let lastAiMsgIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'ai') { lastAiMsgIdx = i; break; }
    }
    if (idx === lastAiMsgIdx && isAutoTyping) {
      return typedText;
    }
    return msg.text;
  };

  // Render interactive flow options
  const renderFlowOptions = () => {
    if (isTyping || isAutoTyping) return null;

    return (
      <AnimatePresence mode="wait">
        {bookingState.step === 'select-day' && (
          <motion.div
            key="day-selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex gap-2 flex-wrap px-4 pb-3"
          >
            {DAY_OPTIONS.map((day) => (
              <Button
                key={day}
                size="sm"
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-500/50 text-xs rounded-full"
                onClick={() => handleDaySelect(day)}
              >
                <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                {day}
              </Button>
            ))}
          </motion.div>
        )}

        {bookingState.step === 'select-time' && (
          <motion.div
            key="time-selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="px-4 pb-3"
          >
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_SLOTS.map((time) => (
                <Button
                  key={time}
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-500/50 text-[11px] rounded-lg h-9"
                  onClick={() => handleTimeSelect(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {bookingState.step === 'select-service' && (
          <motion.div
            key="service-selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex gap-2 flex-wrap px-4 pb-3"
          >
            {SERVICES.map((service) => (
              <Button
                key={service}
                size="sm"
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-500/50 text-xs rounded-full"
                onClick={() => handleServiceSelect(service)}
              >
                {service}
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Simple markdown-like rendering for AI messages
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Bold text
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <span key={j} className="font-bold text-emerald-300">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <span key={j} className="italic text-slate-400">{part.slice(1, -1)}</span>;
        }
        return <span key={j}>{part}</span>;
      });
      return (
        <span key={i}>
          {rendered}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 bg-slate-950 border-slate-800/50 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <MessageCircleHeart className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-300 border-2 border-emerald-600" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-white text-base font-bold flex items-center gap-2">
                Booking Assistant
                <Badge className="bg-white/20 text-white border-0 text-[10px] px-1.5 py-0">
                  AI
                </Badge>
              </SheetTitle>
              <SheetDescription className="text-emerald-100 text-xs">
                {CLINIC_NAME} &bull; Always online
              </SheetDescription>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 py-4 space-y-4">
            {/* Messages */}
            {messages.map((msg, idx) => {
              const displayText = getDisplayText(msg, idx);
              const isLastAi = msg.role === 'ai' && idx === messages.length - 1;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {/* Bot avatar */}
                  {msg.role === 'ai' && (
                    <div className="shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'ai'
                        ? 'bg-slate-800/90 text-slate-200 rounded-tl-md border border-slate-700/50'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-md shadow-lg shadow-emerald-500/20',
                    )}
                  >
                    {/* Sender label */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {msg.role === 'ai' ? (
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <User className="w-3 h-3 text-white/60" />
                      )}
                      <span className="text-[10px] font-semibold text-slate-400">
                        {msg.role === 'ai' ? 'Booking Bot' : 'You'}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-auto">
                        {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>

                    {/* Message content */}
                    <div className="text-[13px]">
                      {msg.role === 'ai' ? renderMessageText(displayText) : displayText}
                    </div>
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 justify-start"
              >
                <div className="shrink-0 mt-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl rounded-tl-md px-4 py-3">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}

            {/* Booking flow options */}
            {renderFlowOptions()}
          </div>
        </div>

        {/* Quick Replies */}
        {showQuickReplies && !isTyping && bookingState.step === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-slate-800/50 px-4 py-2.5 bg-slate-900/50"
          >
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_REPLIES.map((reply) => {
                const Icon = reply.icon;
                return (
                  <button
                    key={reply.label}
                    onClick={() => handleQuickReply(reply.label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700/50 bg-slate-800/50 hover:bg-emerald-500/15 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {reply.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Booking Summary Card */}
        {bookingState.step === 'confirmed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-emerald-500/20 px-4 py-3 bg-emerald-950/30"
          >
            <div className="bg-emerald-900/30 border border-emerald-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-400">Booking Confirmed</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="text-slate-200 font-medium">{bookingState.selectedDate}</p>
                </div>
                <div>
                  <span className="text-slate-500">Time</span>
                  <p className="text-slate-200 font-medium">{bookingState.selectedTime}</p>
                </div>
                <div>
                  <span className="text-slate-500">Service</span>
                  <p className="text-slate-200 font-medium">{bookingState.selectedService}</p>
                </div>
                <div>
                  <span className="text-slate-500">WhatsApp</span>
                  <p className="text-emerald-400 font-medium flex items-center gap-1">
                    Sent <CheckCircle className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-800/50 bg-slate-900/80 px-4 py-3 shrink-0">
          {/* Input row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isTyping}
                className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
              />
            </div>
            <Button
              size="icon"
              onClick={() => handleUserInput(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400 bg-amber-500/5">
                <Zap className="w-2.5 h-2.5 mr-1" />
                Demo Mode
              </Badge>
              <span className="text-[10px] text-slate-600">
                {responseCount} responses
              </span>
            </div>
            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              Powered by <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Gemini AI
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
