'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Shield, Bot,
  Stethoscope, HeartPulse, Activity, Pill, Syringe, Heart,
  Building2, PhoneCall, Clock, Quote, ShieldCheck, Cross,
  Building, MapPin, User, CheckCircle2, ArrowLeft, ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry',
];

// Focused input wrapper with gradient bottom border
function FocusedInput({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = true,
  icon: Icon,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  icon: React.ElementType;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-700 dark:text-slate-300">{label}</Label>
      <div className="relative">
        <motion.span
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
          animate={{ x: isFocused ? 2 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Icon
            className="w-4 h-4 transition-colors duration-200"
            style={{ color: isFocused ? '#10b981' : undefined }}
          />
        </motion.span>
        <Input
          id={id}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-visible:ring-emerald-500/20 focus-visible:ring-2 transition-all duration-300',
            isPassword && 'pr-10'
          )}
          required={required}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {/* Gradient bottom border on focus */}
        <motion.div
          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isFocused ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ transformOrigin: 'left' }}
        />
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({ currentStep, totalSteps = 3 }: { currentStep: number; totalSteps?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={stepNum} className="flex items-center gap-2">
            <motion.div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                isActive && 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30',
                isCompleted && 'bg-emerald-500 text-white',
                !isActive && !isCompleted && 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              )}
              animate={isActive ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                stepNum
              )}
            </motion.div>
            {stepNum < totalSteps && (
              <div className={cn(
                'w-8 h-0.5 rounded-full transition-all duration-300',
                isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===================== SIGN IN FORM =====================
function SignInForm({ onLogin }: { onLogin: () => void }) {
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
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sign in to your account</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email input with focus icon animation + gradient bottom border */}
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-slate-700 dark:text-slate-300">Email</Label>
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
              id="login-email"
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

        {/* Password input with focus icon animation + gradient bottom border */}
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-slate-700 dark:text-slate-300">Password</Label>
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
              id="login-password"
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

        {/* Loading button with shimmer effect */}
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
    </>
  );
}

// ===================== SIGN UP FORM =====================
function SignUpForm({ onRegister }: { onRegister: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Step 1 fields
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Step 2 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(1);

  const goToNext = useCallback(() => {
    setDirection(1);
    if (step < 3) {
      setStep(step + 1);
    }
  }, [step]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  const handleStep1Next = () => {
    setRegisterError('');
    if (!clinicName.trim() || !doctorName.trim() || !phone.trim() || !city.trim() || !state) {
      setRegisterError('Please fill in all required fields.');
      return;
    }
    if (!/^\+91\d{10}$/.test(phone.trim())) {
      setRegisterError('Phone number must be in +91XXXXXXXXXX format.');
      return;
    }
    goToNext();
  };

  const handleStep2Submit = async () => {
    setRegisterError('');
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setRegisterError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setRegisterError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setRegisterError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: clinicName.trim(),
          doctorName: doctorName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          state,
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Auto-login: directly set user in zustand store
      useAuthStore.setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Move to success step
      setDirection(1);
      setStep(3);

      toast.success('Welcome to VoiceAI!');

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        onRegister();
      }, 2000);
    } catch {
      setRegisterError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="text-center mb-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create your account</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Get started with VoiceAI in minutes</p>
      </div>

      <StepIndicator currentStep={step} />

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1: Clinic Information */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-4"
            >
              <FocusedInput
                id="clinic-name"
                label="Clinic Name"
                placeholder="e.g. Sharma Dental Clinic"
                value={clinicName}
                onChange={setClinicName}
                icon={Building}
              />
              <FocusedInput
                id="doctor-name"
                label="Doctor's Name"
                placeholder="e.g. Dr. Rajesh Sharma"
                value={doctorName}
                onChange={setDoctorName}
                icon={User}
              />
              <FocusedInput
                id="phone-number"
                label="Phone Number"
                placeholder="+919876543210"
                value={phone}
                onChange={setPhone}
                icon={Phone}
              />
              <FocusedInput
                id="city"
                label="City"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={setCity}
                icon={MapPin}
              />

              {/* State select */}
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">State</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </span>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="w-full pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-emerald-500/20 focus:ring-2 transition-all duration-300 h-10">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <AnimatePresence>
                {registerError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2"
                  >
                    {registerError}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  type="button"
                  onClick={handleStep1Next}
                  className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 h-11 font-medium transition-all duration-300"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: Account Setup */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="space-y-4"
            >
              <FocusedInput
                id="reg-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
                icon={Mail}
              />
              <FocusedInput
                id="reg-password"
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={setPassword}
                icon={Lock}
              />
              <FocusedInput
                id="reg-confirm-password"
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                icon={Lock}
              />

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i < getPasswordStrength(password) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {password.length < 6
                      ? 'Too short (min. 6 characters)'
                      : getPasswordStrength(password) === 1
                        ? 'Weak password'
                        : getPasswordStrength(password) === 2
                          ? 'Good password'
                          : 'Strong password'}
                  </p>
                </div>
              )}

              <AnimatePresence>
                {registerError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2"
                  >
                    {registerError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPrev}
                    className="h-11 font-medium px-5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                  </Button>
                </motion.div>
                <motion.div whileHover={!isSubmitting ? { scale: 1.01 } : {}} whileTap={!isSubmitting ? { scale: 0.99 } : {}} className="flex-1">
                  <Button
                    type="button"
                    onClick={handleStep2Submit}
                    disabled={isSubmitting}
                    className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 h-11 font-medium transition-all duration-300"
                  >
                    {isSubmitting && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    {isSubmitting ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col items-center justify-center py-6"
            >
              {/* Animated checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <div className="relative">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"
                    animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 20px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.h3
                className="text-xl font-bold text-slate-900 dark:text-white mt-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Welcome to VoiceAI! 🎉
              </motion.h3>

              <motion.p
                className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Your clinic has been set up with a <span className="font-medium text-emerald-600 dark:text-emerald-400">14-day free trial</span>. Redirecting to your dashboard...
              </motion.p>

              <motion.div
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// Password strength calculator
function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password) || /\d/.test(password)) strength++;
  return strength;
}

// ===================== MAIN LOGIN PAGE =====================
export default function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState('signin');

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

      {/* Subtle CSS dot grid pattern background */}
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
        {/* Logo with slow rotation (20s) and breathing glow */}
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

        {/* Login/Signup Card with animated gradient border */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="border-gradient">
            <Card className="border-0 shadow-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl card-shine shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.05),0_20px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.2),0_20px_40px_-12px_rgba(0,0,0,0.4)]">
              <CardContent className="p-6">
                {/* Tab Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 mb-5">
                  {[
                    { key: 'signin', label: 'Sign In' },
                    { key: 'signup', label: 'Sign Up' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300',
                        activeTab === tab.key
                          ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'signin' ? (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SignInForm onLogin={onLogin} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SignUpForm onRegister={onLogin} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Demo Account Cards - only show on Sign In tab */}
        <AnimatePresence>
          {activeTab === 'signin' && (
            <motion.div
              className="mt-6 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs text-center text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Quick Demo Access</p>

              {/* Admin card */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="rounded-xl transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]"
              >
                <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-[length:200%_100%] animate-gradient-shift">
                  <Card
                    className="border-0 bg-white dark:bg-slate-800 cursor-pointer card-shine"
                    onClick={() => {
                      useAuthStore.getState().login('admin@voiceai.in', 'admin123')
                        .then(() => {
                          toast.success('Welcome to VoiceAI!');
                          onLogin();
                        })
                        .catch(() => toast.error('Demo login failed. Please try again.'));
                    }}
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

              {/* Clinic card */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="rounded-xl transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]"
              >
                <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-[length:200%_100%] animate-gradient-shift">
                  <Card
                    className="border-0 bg-white dark:bg-slate-800 cursor-pointer card-shine"
                    onClick={() => {
                      useAuthStore.getState().login('receptionist@sharma-dental.in', 'clinic123')
                        .then(() => {
                          toast.success('Welcome to VoiceAI!');
                          onLogin();
                        })
                        .catch(() => toast.error('Demo login failed. Please try again.'));
                    }}
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
          )}
        </AnimatePresence>

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

        {/* Bottom section - Trusted by 500+ clinics across India badge */}
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


