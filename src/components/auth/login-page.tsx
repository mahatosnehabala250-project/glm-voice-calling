'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Shield, Bot,
  Stethoscope, HeartPulse, Activity, Pill, Syringe, Heart,
  Building2, PhoneCall, Clock, Quote, ShieldCheck, Cross
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: () => void;
}

const FLOATING_ICONS = [
  { Icon: Stethoscope, x: '10%', y: '15%', size: 24, delay: 0 },
  { Icon: HeartPulse, x: '85%', y: '12%', size: 28, delay: 2 },
  { Icon: Activity, x: '75%', y: '75%', size: 22, delay: 4 },
  { Icon: Pill, x: '15%', y: '70%', size: 20, delay: 1 },
  { Icon: Syringe, x: '90%', y: '45%', size: 18, delay: 3 },
  { Icon: Heart, x: '5%', y: '45%', size: 26, delay: 5 },
];

// Animated number component with count-up effect
function AnimatedStat({ value, suffix = '', prefix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 1800;
    const steps = 50;
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
  }, [value]);

  return (
    <span>
      {prefix}{displayed.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

const PLATFORM_STATS = [
  { icon: Building2, value: 500, suffix: '+', label: 'Clinics' },
  { icon: PhoneCall, value: 50000, suffix: '+', label: 'Calls' },
  { icon: Clock, value: 98, suffix: '%', label: 'Uptime' },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      toast.success('Welcome to VoiceAI!');
      onLogin();
    } catch {
      toast.error('Login failed. Please check your credentials.');
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    clearError();
    try {
      await login(demoEmail, demoPass);
      toast.success('Welcome to VoiceAI!');
      onLogin();
    } catch {
      toast.error('Demo login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-stripes">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-white dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900" />

      {/* Dramatic gradient overlay animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-emerald-200/40 via-teal-100/30 to-amber-100/20 dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-amber-900/5"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(52,211,153,0.25) 0%, rgba(20,184,166,0.15) 50%, rgba(251,191,36,0.1) 100%)',
            'linear-gradient(135deg, rgba(20,184,166,0.3) 0%, rgba(52,211,153,0.15) 50%, rgba(251,191,36,0.05) 100%)',
            'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(45,212,191,0.25) 50%, rgba(52,211,153,0.1) 100%)',
            'linear-gradient(135deg, rgba(52,211,153,0.25) 0%, rgba(20,184,166,0.15) 50%, rgba(251,191,36,0.1) 100%)',
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-300/30 dark:bg-emerald-700/10 blur-3xl"
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-teal-300/30 dark:bg-teal-700/10 blur-3xl"
          animate={{ scale: [1.2, 0.9, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-amber-200/20 dark:bg-amber-800/10 blur-3xl"
          animate={{ y: [0, -40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald-200/25 dark:bg-emerald-800/15 blur-2xl"
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
      </div>

      {/* ENHANCEMENT 1: Subtle CSS dot grid pattern background */}
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none" />

      {/* Particle dot grid background (Framer Motion animated dots) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          return (
            <motion.div
              key={`dot-${i}`}
              className="absolute rounded-full bg-emerald-400"
              style={{
                left: `${10 + col * 11}%`,
                top: `${8 + row * 11}%`,
                width: '2px',
                height: '2px',
              }}
              animate={{
                opacity: [0.08, 0.25, 0.08],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + (i % 5) * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i % 8) * 0.3,
              }}
            />
          );
        })}
      </div>

      {/* Floating medical icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FLOATING_ICONS.map(({ Icon, x, y, size, delay }, i) => (
          <motion.div
            key={i}
            className={cn("absolute", i === 0 && "animate-swing")}
            style={{ left: x, top: y }}
            animate={{
              y: [0, -18, 0, 12, 0],
              rotate: [0, 8, -5, 3, 0],
              opacity: [0.15, 0.28, 0.2, 0.3, 0.15],
            }}
            transition={{
              duration: 8 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          >
            <Icon
              className="text-emerald-400 dark:text-emerald-300/30"
              style={{ width: size, height: size }}
            />
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
        {/* ENHANCEMENT 3: Logo with slow rotation (20s) and breathing glow */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative inline-block">
            {/* Glow effect behind logo with breathing animation */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-emerald-400/50 blur-xl animate-breathe"
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 neon-emerald">
              {/* Bot icon with slow rotation animation (20s cycle) */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Bot className="w-9 h-9 text-white" />
              </motion.div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-5 text-gradient-hero">
            Voice<span className="text-emerald-600 dark:text-emerald-400">AI</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            AI-powered receptionist for Indian healthcare
          </p>
        </motion.div>

        {/* ENHANCEMENT 2: Login Card with animated gradient border via .border-gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="border-gradient">
            <Card className="border-0 shadow-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl card-shine shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.05),0_20px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.2),0_20px_40px_-12px_rgba(0,0,0,0.4)]">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sign in to your account</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* ENHANCEMENT 5: Email input with focus icon animation + gradient bottom border */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                    <div className="relative">
                      <motion.span
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                        animate={{ x: isEmailFocused ? 2 : 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <Mail
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: isEmailFocused ? '#10b981' : undefined }}
                        />
                      </motion.span>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                        className="pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-visible:ring-emerald-500/20 focus-visible:ring-2 transition-all duration-300"
                        required
                      />
                      {/* Gradient bottom border on focus */}
                      <motion.div
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isEmailFocused ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </div>
                  </div>

                  {/* ENHANCEMENT 5: Password input with focus icon animation + gradient bottom border */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                    <div className="relative">
                      <motion.span
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                        animate={{ x: isPasswordFocused ? 2 : 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <Lock
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: isPasswordFocused ? '#10b981' : undefined }}
                        />
                      </motion.span>
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        className="pl-10 pr-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-visible:ring-emerald-500/20 focus-visible:ring-2 transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {/* Gradient bottom border on focus */}
                      <motion.div
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isPasswordFocused ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </div>
                  </div>

                  {/* Remember me + Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ENHANCEMENT 6: Loading button with shimmer effect */}
                  <motion.div
                    whileHover={!isLoading ? { scale: 1.01 } : {}}
                    whileTap={!isLoading ? { scale: 0.99 } : {}}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 h-11 font-medium transition-all duration-300"
                    >
                      {/* Shimmer effect while loading */}
                      {isLoading && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                      {isLoading ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>

                {/* Security Badge */}
                <motion.div
                  className="flex items-center justify-center gap-1.5 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      256-bit SSL Encrypted
                    </span>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ENHANCEMENT 4: Demo Account Cards with enhanced hover (scale-105, emerald glow, card-shine) */}
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Quick Demo Access</p>

          {/* Admin card with enhanced hover effects */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="rounded-xl transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]"
          >
            <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-[length:200%_100%] animate-gradient-shift">
              <Card
                className="border-0 bg-white dark:bg-slate-800 cursor-pointer card-shine"
                onClick={() => handleDemoLogin('admin@voiceai.in', 'admin123')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">Super Admin</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">admin@voiceai.in</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Clinic card with enhanced hover effects */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="rounded-xl transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]"
          >
            <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-[length:200%_100%] animate-gradient-shift">
              <Card
                className="border-0 bg-white dark:bg-slate-800 cursor-pointer card-shine"
                onClick={() => handleDemoLogin('receptionist@sharma-dental.in', 'clinic123')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-500/20">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">Demo Clinic</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Sharma Dental Clinic</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0" />
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>

        {/* Platform Stats Bar */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="rounded-xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-lg border border-emerald-100/60 dark:border-emerald-900/30 p-4">
            <div className="flex items-center justify-around">
              {PLATFORM_STATS.map((stat, index) => {
                const StatIcon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-1.5 flex-1 justify-center">
                    {index > 0 && (
                      <div className="absolute h-6 w-px bg-emerald-200/60 dark:bg-emerald-700/30" />
                    )}
                    <StatIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        <AnimatedStat value={stat.value} suffix={stat.suffix} />
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ENHANCEMENT 7: Bottom section - Trusted by 500+ clinics across India badge */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium mb-3">Trusted by 500+ Clinics Across India</p>
          <div className="flex items-center justify-center gap-4">
            {[
              { Icon: Stethoscope, name: 'Apollo' },
              { Icon: HeartPulse, name: 'Fortis' },
              { Icon: Activity, name: 'Max' },
              { Icon: Heart, name: 'AIIMS' },
              { Icon: Cross, name: 'Medanta' },
            ].map((clinic, i) => {
              const ClinicIcon = clinic.Icon;
              return (
                <motion.div
                  key={clinic.name}
                  className="flex flex-col items-center gap-1.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                >
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 shadow-sm flex items-center justify-center">
                    <ClinicIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{clinic.name}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Clinic Testimonial */}
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          <div className="relative pl-4 border-l-2 border-emerald-400/70 dark:border-emerald-500/50">
            <Quote className="w-4 h-4 text-emerald-400 dark:text-emerald-500 mb-1.5 -mt-0.5" />
            <p className="text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed">
              &ldquo;VoiceAI helped us reduce missed calls by 85%. Now every patient gets an instant response.&rdquo;
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              — Dr. Rajesh Sharma
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Sharma Dental Clinic
            </p>
          </div>
        </motion.div>

        {/* Powered by Gemini AI badge */}
        <motion.div
          className="flex justify-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1.5 text-xs font-medium border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 backdrop-blur"
          >
            <motion.div
              className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Powered by Gemini AI
          </Badge>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          &copy; 2025 VoiceAI. Built for Indian healthcare.
        </motion.p>
      </div>
    </div>
  );
}
