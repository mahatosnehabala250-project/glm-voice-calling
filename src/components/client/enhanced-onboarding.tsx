'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  UserCheck,
  Brain,
  PhoneCall,
  PartyPopper,
  Settings,
  Globe,
  Sparkles,
  ArrowRight,
  SkipForward,
  X,
  CheckCircle2,
  Bot,
} from 'lucide-react';

/* ============================================================
   Constants & Types
   ============================================================ */
const ONBOARDING_COMPLETE_KEY = 'voiceai-onboarding-complete';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

/* ============================================================
   Confetti Particle Component
   ============================================================ */
interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

function ConfettiExplosion() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 0.5,
      size: 4 + Math.random() * 6,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: [0, 120, 250],
            x: [0, (Math.random() - 0.5) * 80],
            opacity: [1, 1, 0],
            rotate: [0, Math.random() * 360],
            scale: [1, 1.2, 0.5],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   Step Content Components
   ============================================================ */
function Step1Content({ onComplete, profileCompleteness }: { onComplete: () => void; profileCompleteness: number }) {
  const { setClientPage } = useAppStore();

  const handleGoToSettings = () => {
    setClientPage('settings');
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Profile completeness circular indicator */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(#10b981 ${profileCompleteness * 3.6}deg, hsl(var(--muted)) ${profileCompleteness * 3.6}deg)`,
            }}
          >
            <div className="w-22 h-22 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <span className={cn(
                  'text-3xl font-bold',
                  profileCompleteness >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                  profileCompleteness >= 50 ? 'text-amber-600 dark:text-amber-400' :
                  'text-rose-600 dark:text-rose-400'
                )}>
                  {profileCompleteness}%
                </span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Complete</p>
              </div>
            </div>
          </div>
          {/* Floating icon */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <UserCheck className="w-5 h-5 text-white" />
          </motion.div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Complete Your Clinic Profile
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Fill in your clinic details to help the AI agent provide personalized service to your patients.
          {profileCompleteness < 100 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {' '}{100 - profileCompleteness}% more to complete.
            </span>
          )}
          {profileCompleteness === 100 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {' '}Your profile is complete!
            </span>
          )}
        </p>
      </div>

      <Button
        onClick={handleGoToSettings}
        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium"
      >
        <Settings className="w-4 h-4 mr-2" />
        {profileCompleteness < 100 ? 'Go to Settings' : 'Review Settings'}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}

function Step2Content({ onComplete }: { onComplete: () => void }) {
  const { setClientPage } = useAppStore();

  const handleGoToSettings = () => {
    setClientPage('settings');
    onComplete();
  };

  const languages = [
    { code: 'hinglish', label: 'Hinglish', agent: 'Rekha', greeting: 'Namaste! Clinic mein aapka swagat hai...' },
    { code: 'english', label: 'English', agent: 'Sarah', greeting: 'Hello! Welcome to the clinic...' },
    { code: 'hindi', label: 'Hindi', agent: 'Priya', greeting: 'नमस्ते! क्लिनिक में आपका स्वागत है...' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-xl shadow-teal-500/30">
            <Brain className="w-12 h-12 text-white" />
          </div>
          <motion.div
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </motion.div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Configure Your AI Agent
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Customize how your AI receptionist greets patients and handles calls.
        </p>
      </div>

      {/* Language preview cards */}
      <div className="grid grid-cols-3 gap-2">
        {languages.map((lang) => (
          <motion.div
            key={lang.code}
            whileHover={{ scale: 1.03, y: -2 }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 text-center space-y-2 cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleGoToSettings}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{lang.label}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Agent: <span className="font-medium text-emerald-600 dark:text-emerald-400">{lang.agent}</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* Greeting preview */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Greeting Preview</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
          &quot;Namaste! Sharma Dental Clinic mein aapka swagat hai. Main Rekha hoon, Dr. Sharma ki clinic se. Kaise madad kar sakti hoon aapki?&quot;
        </p>
      </div>

      <Button
        onClick={handleGoToSettings}
        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium"
      >
        <Settings className="w-4 h-4 mr-2" />
        Configure AI Agent
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}

function Step3Content({ onComplete, onOpenDemo }: { onComplete: () => void; onOpenDemo: () => void }) {
  const handleTryDemo = () => {
    onOpenDemo();
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <PhoneCall className="w-12 h-12 text-white" />
          </div>
          {/* Pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Test Your AI Agent
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          See how VoiceAI handles a real patient call with our interactive demo simulation.
        </p>
      </div>

      {/* Demo preview card */}
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live Simulation</span>
          </div>
          <div className="flex gap-1">
            {['1x', '2x', '3x'].map((s) => (
              <span key={s} className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">{s}</span>
            ))}
          </div>
        </div>
        <div className="bg-slate-950 p-4 space-y-3">
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-emerald-600/20 rounded-2xl rounded-tl-sm px-3 py-2">
              <p className="text-xs text-emerald-200">Namaste! Sharma Dental Clinic mein aapka swagat hai...</p>
            </div>
          </div>
          <div className="flex gap-2 items-start justify-end">
            <div className="bg-slate-800 rounded-2xl rounded-tr-sm px-3 py-2">
              <p className="text-xs text-slate-300">Hi, I want to book an appointment...</p>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleTryDemo}
        className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium"
      >
        <Bot className="w-4 h-4 mr-2" />
        Try AI Demo
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}

function Step4Content({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className="relative space-y-6"
    >
      <ConfettiExplosion />

      <div className="relative z-10 text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <PartyPopper className="w-6 h-6 text-amber-500" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              You&apos;re All Set!
            </h3>
            <PartyPopper className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            Your VoiceAI setup is complete. Your AI agent is ready to start handling calls and booking appointments for your clinic.
          </p>
        </motion.div>

        {/* Quick feature recap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-3 pt-2"
        >
          {[
            { icon: Bot, label: 'AI Agent', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: PhoneCall, label: 'Auto Answer', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
            { icon: Sparkles, label: 'Smart Booking', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="text-center space-y-1.5"
              >
                <div className={cn('w-10 h-10 mx-auto rounded-xl flex items-center justify-center', feature.bg)}>
                  <Icon className={cn('w-5 h-5', feature.color)} />
                </div>
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{feature.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="relative z-10"
      >
        <Button
          onClick={onGoToDashboard}
          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   Main Enhanced Onboarding Component
   ============================================================ */
export default function EnhancedOnboarding() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 1, title: 'Setup Profile', description: 'Complete your clinic profile', icon: UserCheck, completed: false },
    { id: 2, title: 'Configure AI', description: 'Set up your AI agent', icon: Brain, completed: false },
    { id: 3, title: 'Test Call', description: 'Try the AI demo', icon: PhoneCall, completed: false },
    { id: 4, title: 'Go Live', description: 'You\'re all set!', icon: PartyPopper, completed: false },
  ]);

  const { setClientPage } = useAppStore();
  const { user } = useAuthStore();

  // Check if onboarding is needed on mount
  useEffect(() => {
    if (!user || user.role !== 'client') return;
    try {
      const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
      if (!completed) {
        // Show onboarding after a short delay
        const timer = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, [user]);

  const markStepComplete = useCallback((stepId: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s))
    );
  }, []);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch { /* ignore */ }
    setOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    markStepComplete(currentStep + 1);
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, markStepComplete]);

  const handleSkip = useCallback(() => {
    if (currentStep < 3) {
      markStepComplete(currentStep + 1);
      setCurrentStep(3); // Jump to final step
    }
  }, [currentStep, markStepComplete]);

  const handleDontShowAgain = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const handleGoToDashboard = useCallback(() => {
    setClientPage('overview');
    completeOnboarding();
  }, [setClientPage, completeOnboarding]);

  const handleOpenDemo = useCallback(() => {
    // Close onboarding and navigate to overview where the demo button lives
    // The client overview has the AI demo button
    setClientPage('overview');
    setOpen(false);
    // The AI demo will be triggered from client overview
    // For now, mark step complete and go to next
    markStepComplete(3);
  }, [setClientPage, markStepComplete]);

  // Profile completeness - simulated for onboarding
  const profileCompleteness = 65;

  const progressValue = ((currentStep) / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden rounded-2xl border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl max-w-md w-[95vw]"
      >
        {/* Visually hidden for accessibility */}
        <DialogTitle className="sr-only">VoiceAI Onboarding</DialogTitle>
        <DialogDescription className="sr-only">Complete your VoiceAI setup in 4 easy steps</DialogDescription>

        {/* Header with progress */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900">
          {/* Close button */}
          <button
            onClick={handleDontShowAgain}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Don't show again"
          >
            <X className="w-4 h-4" />
          </button>

          {/* VoiceAI logo */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">VoiceAI Setup</span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Step {currentStep + 1} of 4
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round(progressValue)}%
              </span>
            </div>
            <Progress
              value={progressValue}
              className="h-2 bg-slate-200/50 dark:bg-slate-700/50"
            />
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between mt-3">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = step.completed;
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-1"
                >
                  <motion.div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300',
                      isActive && 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30',
                      isCompleted && !isActive && 'bg-emerald-100 dark:bg-emerald-900/30',
                      !isCompleted && !isActive && 'bg-slate-100 dark:bg-slate-800'
                    )}
                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <StepIcon className={cn(
                        'w-4 h-4',
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                      )} />
                    )}
                  </motion.div>
                  <span className={cn(
                    'text-[10px] font-medium transition-colors',
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  )}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-6 min-h-[320px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <Step1Content
                key="step1"
                onComplete={() => markStepComplete(1)}
                profileCompleteness={profileCompleteness}
              />
            )}
            {currentStep === 1 && (
              <Step2Content
                key="step2"
                onComplete={() => markStepComplete(2)}
              />
            )}
            {currentStep === 2 && (
              <Step3Content
                key="step3"
                onComplete={() => markStepComplete(3)}
                onOpenDemo={handleOpenDemo}
              />
            )}
            {currentStep === 3 && (
              <Step4Content
                key="step4"
                onGoToDashboard={handleGoToDashboard}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-5 pt-2 flex items-center justify-between">
          {/* Don't show again */}
          <button
            onClick={handleDontShowAgain}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            Don&apos;t show again
          </button>

          <div className="flex items-center gap-2">
            {/* Skip button - only show on steps 0-2 */}
            {currentStep < 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" />
                Skip
              </Button>
            )}

            {/* Next button - only show on steps 0-2 */}
            {currentStep < 3 && (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs px-4 rounded-lg"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
