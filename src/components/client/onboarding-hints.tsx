'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

const HINTS_STORAGE_KEY = 'voiceai-hints-seen';

interface Hint {
  id: string;
  text: string;
  targetPage: 'overview' | 'appointments';
  icon: string;
}

const hints: Hint[] = [
  {
    id: 'hint-keyboard-nav',
    text: 'Use Ctrl+K to quickly navigate between pages',
    targetPage: 'overview',
    icon: '💡',
  },
  {
    id: 'hint-patient-history',
    text: 'Click on patient names to view their full history',
    targetPage: 'appointments',
    icon: '📊',
  },
  {
    id: 'hint-ai-demo',
    text: 'Try the AI Demo to see how VoiceAI handles calls',
    targetPage: 'overview',
    icon: '🤖',
  },
];

const HINT_DISPLAY_DURATION = 8000;
const HINT_INTERVAL = 5000;

function checkHintsSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(HINTS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function OnboardingHints() {
  const [hintsSeen, setHintsSeen] = useState(checkHintsSeen);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const clientPage = useAppStore((s) => s.clientPage);

  // Show first hint after delay (only if hints haven't been seen)
  useEffect(() => {
    if (hintsSeen) return;
    const delay = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    return () => clearTimeout(delay);
  }, [hintsSeen]);

  // Handle hint display cycling and auto-dismiss
  useEffect(() => {
    if (hintsSeen || isDismissed) return;

    const currentHint = hints[currentHintIndex];

    // Check if the current hint's target page matches the active page
    // If not, we skip showing this hint and move to the next one after a short delay
    const isOnTargetPage = clientPage === currentHint.targetPage;

    if (!isOnTargetPage) {
      // Show the hint anyway but it will be visible to guide the user
      // The hint appears regardless of which page they're on
    }

    // Auto-advance to next hint after display duration
    const autoAdvanceTimer = setTimeout(() => {
      if (currentHintIndex < hints.length - 1) {
        // Fade out current, then advance
        setIsVisible(false);
        setTimeout(() => {
          setCurrentHintIndex((prev) => prev + 1);
          setIsVisible(true);
        }, 400);
      } else {
        // All hints shown, mark as complete
        setIsVisible(false);
        setTimeout(() => {
          try {
            localStorage.setItem(HINTS_STORAGE_KEY, 'true');
          } catch { /* ignore */ }
          setHintsSeen(true);
        }, 400);
      }
    }, HINT_DISPLAY_DURATION);

    return () => clearTimeout(autoAdvanceTimer);
  }, [currentHintIndex, hintsSeen, isDismissed, clientPage]);

  const dismissHint = useCallback(() => {
    setIsVisible(false);

    // If there are more hints, advance after a brief pause
    if (currentHintIndex < hints.length - 1) {
      setTimeout(() => {
        setCurrentHintIndex((prev) => prev + 1);
        setIsVisible(true);
      }, 400);
    } else {
      // All dismissed, mark as complete
      setTimeout(() => {
        try {
          localStorage.setItem(HINTS_STORAGE_KEY, 'true');
        } catch { /* ignore */ }
        setHintsSeen(true);
      }, 400);
    }
  }, [currentHintIndex]);

  const dismissAll = useCallback(() => {
    setIsDismissed(true);
    setIsVisible(false);
    try {
      localStorage.setItem(HINTS_STORAGE_KEY, 'true');
    } catch { /* ignore */ }
    setHintsSeen(true);
  }, []);

  if (hintsSeen) return null;

  const currentHint = hints[currentHintIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[60] max-w-sm"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="relative rounded-xl shadow-lg shadow-emerald-500/5 border border-emerald-200/50 dark:border-emerald-800/30 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Emerald left border accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-xl" />

            <div className="flex items-start gap-3 p-4 pl-5">
              {/* Hint icon */}
              <span className="text-xl mt-0.5 shrink-0">{currentHint.icon}</span>

              {/* Hint content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Tip: </span>
                  {currentHint.text}
                </p>
                {/* Progress indicator */}
                <div className="flex items-center gap-1.5 mt-2">
                  {hints.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentHintIndex
                          ? 'w-4 bg-emerald-500'
                          : idx < currentHintIndex
                            ? 'w-1.5 bg-emerald-300 dark:bg-emerald-700'
                            : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                    {currentHintIndex + 1} of {hints.length}
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={dismissHint}
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss hint"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              className="h-0.5 bg-emerald-500/40 rounded-full mx-4 mb-0"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: HINT_DISPLAY_DURATION / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
