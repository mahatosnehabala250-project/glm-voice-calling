'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Bot, Phone, CalendarCheck, MessageSquare, Monitor, Megaphone,
  BarChart3, Plug, Settings, Rocket, TrendingUp,
  PhoneCall, Building2, Clock, ShieldCheck, ArrowRight, CheckCircle2,
  Star, Stethoscope, HeartPulse, Activity, Pill, Syringe, Heart,
  Play, ChevronDown, Menu, X, Sparkles, Zap, Globe, IndianRupee,
  Users, HeadphonesIcon, MessageCircle, Mail, MapPin, ArrowUp, HelpCircle,
  Twitter, Linkedin, Youtube, Instagram, Send, User, Mic, PhoneIncoming, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onGetStarted: () => void;
}

// ─── Floating Medical Icons ───────────────────────────────────────────────────

const FLOATING_ICONS = [
  { Icon: Stethoscope, x: '5%', y: '18%', size: 22, delay: 0 },
  { Icon: HeartPulse, x: '92%', y: '15%', size: 26, delay: 2 },
  { Icon: Activity, x: '88%', y: '70%', size: 20, delay: 4 },
  { Icon: Pill, x: '8%', y: '65%', size: 18, delay: 1 },
  { Icon: Syringe, x: '95%', y: '42%', size: 16, delay: 3 },
  { Icon: Heart, x: '3%', y: '42%', size: 24, delay: 5 },
  { Icon: HeartPulse, x: '15%', y: '85%', size: 20, delay: 6 },
  { Icon: Stethoscope, x: '80%', y: '88%', size: 18, delay: 7 },
];

// ─── Animated counter component ───────────────────────────────────────────────

function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, inView]);

  return (
    <span ref={ref}>
      {prefix}{displayed.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

// ─── Section wrapper with scroll reveal ───────────────────────────────────────

function Section({
  id,
  children,
  className,
  dark = false,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        className,
        dark && 'bg-slate-900 dark:bg-slate-950'
      )}
    >
      {children}
    </motion.section>
  );
}

// ─── Data Constants ───────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

const FAQS = [
  {
    q: 'VoiceAI kaise kaam karta hai?',
    a: 'VoiceAI aapke clinic ke phone number se connect hota hai. Jab patient call karta hai, hamara AI receptionist call uthata hai, appointment book karta hai, aur WhatsApp pe confirmation bhejta hai. Poora process automated hai — aapko kuch karna nahi padta!',
  },
  {
    q: 'Kya mujhe koi technical setup karna padega?',
    a: 'Bilkul nahi! Hamari team setup kar degi. Aapko sirf apna clinic ka phone number dena hai aur basic details fill karni hai. Poora process 30 minutes mein hota hai.',
  },
  {
    q: 'Kya VoiceAI Hindi/Hinglish mein baat kar sakta hai?',
    a: 'Haan! VoiceAI Hindi, English aur Hinglish teeno mein naturally baat kar sakta hai. Patient jo bhi language use kare, AI samajh jayega aur respond karega.',
  },
  {
    q: 'Agar AI koi complex query handle na kare toh?',
    a: 'VoiceAI mein automatic escalation hai. Agar patient emergency mein ho ya complex sawal pooche, toh AI turant aapke staff ko call transfer kar deta hai. Koi call miss nahi hogi!',
  },
  {
    q: 'Pricing plans mein kya kya included hai?',
    a: 'Saare plans mein AI phone answering, appointment booking, WhatsApp confirmation aur analytics dashboard included hai. Higher plans mein zyada calls, campaigns aur priority support milta hai.',
  },
  {
    q: 'Kya main free trial le sakta hoon?',
    a: 'Haan! 14 din ka free trial hai. Credit card ki zarurat nahi. Trial ke baad aap chaho toh plan upgrade kar sakte hain ya cancel bhi kar sakte hain.',
  },
];

const STATS = [
  { icon: Building2, value: 500, suffix: '+', label: 'Clinics Onboarded' },
  { icon: PhoneCall, value: 50000, suffix: '+', label: 'Calls Handled' },
  { icon: Clock, value: 98, suffix: '%', label: 'Platform Uptime' },
];

const FEATURES = [
  {
    icon: Phone,
    title: 'AI Phone Answering',
    description: 'Never miss a patient call again. Our AI answers every call 24/7 with natural Hindi-English conversations.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Appointment Booking',
    description: 'Auto-schedule appointments with instant WhatsApp confirmations. No more no-shows or double bookings.',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Hinglish Conversations',
    description: 'Natural conversations in Hindi-English mix, exactly how your patients speak. Feels human, works like magic.',
    gradient: 'from-cyan-500 to-emerald-500',
  },
  {
    icon: Monitor,
    title: 'Doctor Portal',
    description: 'Real-time call monitoring, live transcripts, and actionable insights. Stay in control of every interaction.',
    gradient: 'from-emerald-500 to-green-500',
  },
  {
    icon: Megaphone,
    title: 'Campaign Manager',
    description: 'Mass calling for follow-ups, reminders, and health campaigns. Reach hundreds of patients in minutes.',
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track every call, booking, and revenue metric. Make data-driven decisions for your practice growth.',
    gradient: 'from-green-500 to-teal-500',
  },
];

const STEPS = [
  {
    icon: Plug,
    step: 1,
    title: 'Connect Your Phone Number',
    description: 'SIP integration in under 5 minutes. Forward your existing clinic number or get a new one.',
  },
  {
    icon: Settings,
    step: 2,
    title: 'Configure AI Agent',
    description: 'Customize voice, greeting, services offered, and booking rules. Teach it about your practice.',
  },
  {
    icon: Rocket,
    step: 3,
    title: 'Go Live',
    description: 'AI starts handling calls 24/7. Watch your receptionist work while you focus on patients.',
  },
  {
    icon: TrendingUp,
    step: 4,
    title: 'Track Results',
    description: 'See every call, booking, and missed-opportunity in your analytics dashboard.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '2,999',
    description: 'Perfect for small clinics getting started with AI',
    features: [
      '100 calls per month',
      '1 phone number',
      'Basic AI receptionist',
      'WhatsApp confirmations',
      'Appointment booking',
      'Email support',
    ],
    popular: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '7,999',
    description: 'For growing clinics that want the full power of AI',
    features: [
      '1,000 calls per month',
      '3 phone numbers',
      'Advanced AI with Hinglish',
      'Campaign manager',
      'Analytics dashboard',
      'Doctor portal access',
      'Priority support',
      'Custom greetings',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: '19,999',
    description: 'For hospitals and multi-location practices',
    features: [
      'Unlimited calls',
      'Custom phone numbers',
      'Dedicated support & SLA',
      'Multi-location dashboard',
      'Custom AI training',
      'API access',
      'HIPAA compliance',
      'On-call engineer',
    ],
    popular: false,
    cta: 'Contact Sales',
  },
];

const CHAT_MESSAGES = [
  { sender: 'ai', text: 'Namaste! 🙏 Dr. Sharma Dental Clinic mein aapka swagat hai.', time: '10:30 AM' },
  { sender: 'patient', text: 'Kya aaj 3 baje slot available hai?', time: '10:30 AM' },
  { sender: 'ai', text: 'Haan ji! 3 PM free hai. Book karoon?', time: '10:31 AM' },
  { sender: 'patient', text: 'Haan book kar do, cleaning ke liye.', time: '10:31 AM' },
];

const CITY_NAMES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Lucknow', 'Chandigarh', 'Indore'];

const SOCIAL_ICONS = [
  { icon: Twitter, label: 'Twitter/X' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Instagram, label: 'Instagram' },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Priya Sharma',
    specialty: 'Sharma Dental Clinic',
    city: 'Mumbai',
    rating: 5,
    quote: 'VoiceAI ne meri clinic ki life badal di! Pehle 30-40 missed calls din bhar aate the, ab AI sab handle karta hai. Patient satisfaction 40% badh gaya hai.',
    avatar: 'PS',
  },
  {
    name: 'Dr. Rajesh Patel',
    specialty: 'Patel Eye Hospital',
    city: 'Ahmedabad',
    rating: 5,
    quote: 'We were spending ₹25,000/month on a receptionist who couldn\'t handle peak hours. VoiceAI handles 100+ calls daily at a fraction of the cost. Absolutely brilliant!',
    avatar: 'RP',
  },
  {
    name: 'Dr. Aman Singh',
    specialty: 'Singh Physiotherapy Centre',
    city: 'Delhi',
    rating: 5,
    quote: 'The Hinglish conversations feel so natural that patients don\'t even realize they\'re talking to AI. My no-show rate dropped from 30% to just 5% with WhatsApp reminders.',
    avatar: 'AS',
  },
  {
    name: 'Dr. Meera Krishnan',
    specialty: 'Krishnan Skin Clinic',
    city: 'Chennai',
    rating: 5,
    quote: 'Setup was incredibly easy - just 10 minutes and we were live. The campaign manager feature helped us reach 500+ patients for our skin care camp. Game changer!',
    avatar: 'MK',
  },
];

// ─── Main Landing Page Component ──────────────────────────────────────────────

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubscribe = useCallback(() => {
    if (email.trim() && email.includes('@')) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  }, [email]);

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* ─── Global Background Effects ──────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Gradient blobs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-200/30 dark:bg-emerald-900/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-teal-200/25 dark:bg-teal-900/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-100/20 dark:bg-emerald-950/10 blur-3xl" />
      </div>

      {/* Floating medical icons (visible in hero section) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FLOATING_ICONS.map(({ Icon, x, y, size, delay }, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: x, top: y }}
            animate={{
              y: [0, -15, 0, 10, 0],
              rotate: [0, 6, -4, 2, 0],
              opacity: [0.08, 0.18, 0.12, 0.2, 0.08],
            }}
            transition={{
              duration: 8 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          >
            <Icon
              className="text-emerald-400 dark:text-emerald-500/20"
              style={{ width: size, height: size }}
            />
          </motion.div>
        ))}
      </div>

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'glass-card border-b border-emerald-100/50 dark:border-emerald-900/30 shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 neon-emerald">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Voice<span className="text-emerald-600 dark:text-emerald-400">AI</span>
              </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={onGetStarted}
                className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 font-medium"
              >
                Sign In
              </Button>
              <Button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 font-medium transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-slate-200/50 dark:border-slate-800/50 glass-card"
            >
              <div className="px-4 py-4 space-y-2">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollToSection(link.href)}
                    className="block w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-2 space-y-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <Button
                    variant="outline"
                    onClick={onGetStarted}
                    className="w-full border-slate-200 dark:border-slate-700"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={onGetStarted}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ─── Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-12 px-4">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-slate-950 dark:via-emerald-950/15 dark:to-slate-950" />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(20,184,166,0.08) 50%, rgba(251,191,36,0.05) 100%)',
              'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(52,211,153,0.08) 50%, rgba(251,191,36,0.03) 100%)',
              'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(45,212,191,0.12) 50%, rgba(52,211,153,0.06) 100%)',
              'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(20,184,166,0.08) 50%, rgba(251,191,36,0.05) 100%)',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Dot pattern */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Hero Text - Left Column */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6"
              >
                <Badge
                  variant="outline"
                  className="px-4 py-1.5 text-sm font-medium border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 backdrop-blur-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Trusted by 500+ Clinics Across India
                </Badge>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6"
              >
                AI Receptionist for
                <br />
                <span className="text-gradient-emerald">Your Clinic</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
              >
                Apke clinic ke har phone call ko AI handle kare — 24/7 appointment booking,
                Hinglish mein baat-cheet, aur WhatsApp confirmations.
                <span className="text-emerald-600 dark:text-emerald-400 font-medium"> Abhi free trial shuru karein!</span>
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    onClick={onGetStarted}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 px-8 h-13 text-base font-semibold transition-all duration-300"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 px-8 h-13 text-base font-medium transition-all duration-300"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch Demo
                  </Button>
                </motion.div>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-10"
              >
                {STATS.map(({ icon: Icon, value, suffix, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                        <AnimatedCounter value={value} suffix={suffix} />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Phone Mockup - Right Column */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="flex justify-center order-last lg:order-none"
            >
              <div className="relative">
                {/* Glow behind phone */}
                <div className="absolute -inset-8 bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-cyan-400/20 rounded-[3rem] blur-2xl" />
                {/* Phone frame */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative w-[260px] sm:w-[300px] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl shadow-emerald-900/20"
                >
                  {/* Phone notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />
                  {/* Phone screen */}
                  <div className="relative bg-gradient-to-b from-emerald-600 to-teal-700 rounded-[2rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-8 pb-2 text-white/80 text-xs">
                      <span>10:30</span>
                      <div className="flex items-center gap-1.5">
                        <PhoneIncoming className="w-3 h-3" />
                        <span className="font-medium text-white">Live Call</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        <Mic className="w-3 h-3" />
                      </div>
                    </div>
                    {/* Clinic name */}
                    <div className="px-4 pb-3 text-center">
                      <p className="text-white/60 text-[10px]">Sharma Dental Clinic</p>
                      <p className="text-white text-sm font-semibold">VoiceAI Receptionist</p>
                    </div>
                    {/* Chat area */}
                    <div className="bg-slate-950/80 rounded-t-2xl px-3 pt-3 pb-4 space-y-2.5 min-h-[320px]">
                      {CHAT_MESSAGES.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + i * 0.3, duration: 0.4 }}
                          className={cn(
                            'flex gap-2',
                            msg.sender === 'ai' ? 'flex-row' : 'flex-row-reverse'
                          )}
                        >
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                            msg.sender === 'ai'
                              ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                              : 'bg-slate-700'
                          )}>
                            {msg.sender === 'ai'
                              ? <Bot className="w-3 h-3 text-white" />
                              : <User className="w-3 h-3 text-slate-300" />
                            }
                          </div>
                          <div className={cn(
                            'max-w-[200px] rounded-2xl px-3 py-2 text-[11px] leading-relaxed',
                            msg.sender === 'ai'
                              ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
                              : 'bg-emerald-600 text-white rounded-tr-sm'
                          )}>
                            {msg.text}
                            <p className={cn(
                              'text-[9px] mt-1',
                              msg.sender === 'ai' ? 'text-slate-500' : 'text-emerald-300'
                            )}>{msg.time}</p>
                          </div>
                        </motion.div>
                      ))}
                      {/* Typing indicator */}
                      <div className="flex items-center gap-2 pl-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((dot) => (
                              <motion.div
                                key={dot}
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        </motion.div>
      </section>

      {/* ─── Social Proof Scrolling Bar ─────────────────────────────────── */}
      <div className="relative z-10 border-y border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...CITY_NAMES, ...CITY_NAMES, ...CITY_NAMES].map((city, i) => (
            <span key={i} className="mx-6 text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              {city}
              <span className="text-emerald-300 dark:text-emerald-600">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── Features Section ───────────────────────────────────────────────── */}
      <Section id="features" className="relative z-10 py-20 sm:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Powerful Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything Your Clinic Needs
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              From AI-powered call handling to advanced analytics — one platform to run your clinic smarter.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── How It Works Section ───────────────────────────────────────────── */}
      <Section id="how-it-works" className="relative z-10 py-20 sm:py-28 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          {/* Section header */}
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
              Simple Setup
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Live in Under 10 Minutes
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Koi technical knowledge nahi chahiye. Follow these 4 simple steps and your AI receptionist is ready.
            </p>
          </div>

          {/* Steps with connecting lines */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {/* Connecting dotted lines (desktop only) */}
            <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] h-0 z-0 pointer-events-none">
              <svg width="100%" height="4" className="overflow-visible">
                <line x1="0" y1="2" x2="100%" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" className="text-emerald-300 dark:text-emerald-700" />
              </svg>
            </div>
            {/* Arrow indicators between steps (desktop only) */}
            {[0, 1, 2].map((i) => (
              <div key={`arrow-${i}`} className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ left: `${(i + 1) * 25}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center shadow-sm">
                  <ArrowRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
            ))}
            {STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Pricing Section ────────────────────────────────────────────────── */}
      <Section id="pricing" className="relative z-10 py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
              <IndianRupee className="w-3.5 h-3.5 mr-1.5" />
              Simple Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Plans That Fit Your Practice
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {PLANS.map((plan, i) => (
              <PricingCard key={plan.name} plan={plan} index={i} onGetStarted={onGetStarted} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Testimonials Section ───────────────────────────────────────────── */}
      <Section id="testimonials" className="relative z-10 py-20 sm:py-28 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          {/* Section header */}
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Doctor Reviews
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Doctors Love VoiceAI
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Hear from real doctors across India who transformed their practice with VoiceAI.
            </p>
          </div>

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <TestimonialCard key={testimonial.name} testimonial={testimonial} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FAQ Section ──────────────────────────────────────────────────── */}
      <Section id="faq" className="relative z-10 py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Aapke mann mein jo bhi sawal hai, hum yahan jawab de rahe hain.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Back to Top Button ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── CTA Section ────────────────────────────────────────────────────── */}
      <Section className="relative z-10 py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-10 sm:p-16 text-center">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-2xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl"
                animate={{ scale: [1.2, 0.9, 1.2] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Particle dots animation */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 rounded-full bg-white/30"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    top: `${10 + Math.random() * 80}%`,
                  }}
                  animate={{
                    y: [0, -20 - Math.random() * 30, 0],
                    opacity: [0, 0.6, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: Math.random() * 3,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Ready to Transform
                  <br />
                  Your Clinic?
                </h2>
                <p className="text-emerald-100 text-lg sm:text-xl mb-8 max-w-xl mx-auto">
                  Start your 14-day free trial. No credit card required. Setup in under 10 minutes.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Button
                      size="lg"
                      onClick={onGetStarted}
                      className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl shadow-black/10 px-8 h-13 text-base font-bold transition-all duration-300"
                    >
                      Start Free Trial
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                  <div className="flex items-center gap-2 text-emerald-100 text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>No credit card required</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 footer-glow">
        <div className="border-t border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900/90 dark:to-slate-950 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
              {/* Brand & Social */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 neon-emerald">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Voice<span className="text-emerald-600 dark:text-emerald-400">AI</span>
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xs">
                  AI-powered voice receptionist built specifically for Indian healthcare clinics. Never miss a patient call again.
                </p>
                {/* Social media icons */}
                <div className="flex items-center gap-2.5">
                  {SOCIAL_ICONS.map(({ icon: SocIcon, label }) => (
                    <a
                      key={label}
                      href="#"
                      aria-label={label}
                      className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 hover:scale-110 hover:shadow-sm"
                    >
                      <SocIcon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Quick Links</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'Pricing', href: '#pricing' },
                    { label: 'FAQ', href: '#faq' },
                    { label: 'Contact', href: '#' },
                  ].map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={() => scrollToSection(link.href)}
                        className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 group"
                      >
                        <span className="w-0 group-hover:w-2 h-px bg-emerald-500 transition-all duration-300" />
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Links */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Company</h4>
                <ul className="space-y-2.5">
                  {['About Us', 'Blog', 'Careers', 'Partners'].map((link) => (
                    <li key={link}>
                      <span className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer inline-flex items-center gap-1.5 group">
                        <span className="w-0 group-hover:w-2 h-px bg-emerald-500 transition-all duration-300" />
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Links */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Legal</h4>
                <ul className="space-y-2.5">
                  {['Privacy Policy', 'Terms of Service', 'Data Security', 'Cookie Policy'].map((link) => (
                    <li key={link}>
                      <span className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer inline-flex items-center gap-1.5 group">
                        <span className="w-0 group-hover:w-2 h-px bg-emerald-500 transition-all duration-300" />
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-900/15 dark:to-teal-900/10 border border-emerald-100/60 dark:border-emerald-800/25">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Stay Updated</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Get product updates and healthcare AI tips delivered to your inbox.</p>
                </div>
                <div className="flex gap-2 sm:w-auto w-full">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                    className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-400 dark:focus:border-emerald-600 sm:w-56"
                  />
                  <Button
                    onClick={handleSubscribe}
                    size="sm"
                    className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm flex-shrink-0"
                  >
                    {subscribed ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {subscribed && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Thanks for subscribing! 🎉</p>
              )}
            </div>

            {/* Bottom bar */}
            <div className="mt-10 pt-6 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  © 2025 VoiceAI. All rights reserved.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Made with ❤️ in India
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Social icons in bottom bar */}
                <div className="flex items-center gap-2.5">
                  {SOCIAL_ICONS.map(({ icon: SocIcon, label }) => (
                    <a
                      key={`bottom-${label}`}
                      href="#"
                      aria-label={label}
                      className="text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                    >
                      <SocIcon className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
                <span className="text-slate-200 dark:text-slate-700">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                  <span className="text-xs text-slate-400 dark:text-slate-500">All systems operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative"
    >
      {/* Hover gradient glow */}
      <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400/0 via-teal-400/0 to-cyan-400/0 group-hover:from-emerald-400/15 group-hover:via-teal-400/10 group-hover:to-cyan-400/15 rounded-2xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
      <Card className="card-interactive group relative border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm h-full">
        <CardContent className="p-6 relative">
          {/* Icon badge in top-right corner */}
          <div className="absolute top-4 right-4">
            <div className={cn(
              'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm opacity-60 group-hover:opacity-100 transition-opacity duration-300',
              feature.gradient
            )}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
            feature.gradient
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {feature.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {feature.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative"
    >
      <Card className="card-interactive border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm h-full">
        <CardContent className="p-6">
          {/* Step number */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20'
            )}>
              {step.step}
            </div>
          </div>

          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {step.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────

function PricingCard({ plan, index, onGetStarted }: { plan: typeof PLANS[0]; index: number; onGetStarted: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        'relative',
        plan.popular && 'md:-mt-4 md:mb-4'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg shadow-emerald-500/30 px-4 py-1">
            Most Popular
          </Badge>
        </div>
      )}

      <Card className={cn(
        'h-full border backdrop-blur-sm',
        plan.popular
          ? 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900/50 shadow-xl shadow-emerald-500/10'
          : 'border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50'
      )}>
        <CardContent className="p-6 lg:p-8">
          {/* Plan name */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            {plan.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            {plan.description}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-6">
            <IndianRupee className="w-5 h-5 text-slate-900 dark:text-white font-semibold" />
            <span className={cn(
              'text-4xl font-bold',
              plan.popular ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
            )}>
              {plan.price}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
          </div>

          {/* Features list */}
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle2 className={cn(
                  'w-4 h-4 mt-0.5 flex-shrink-0',
                  plan.popular ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                )} />
                <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              onClick={onGetStarted}
              className={cn(
                'w-full h-11 font-semibold transition-all duration-300',
                plan.popular
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                  : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
              )}
            >
              {plan.cta}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────

function TestimonialCard({ testimonial, index }: { testimonial: typeof TESTIMONIALS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="card-interactive border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm h-full">
        <CardContent className="p-6">
          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-4">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>

          {/* Quote */}
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-5 italic">
            &ldquo;{testimonial.quote}&rdquo;
          </p>

          {/* Author */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {testimonial.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {testimonial.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {testimonial.specialty}, {testimonial.city}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── FAQ Item (collapsible) ─────────────────────────────────────────────────

function FaqItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-between cursor-pointer p-5 text-left w-full"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white pr-4">
              {faq.q}
            </h3>
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-5 h-5 text-emerald-500 shrink-0" />
            </motion.div>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
