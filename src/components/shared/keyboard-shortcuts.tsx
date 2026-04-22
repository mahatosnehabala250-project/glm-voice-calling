'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

interface ShortcutEntry {
  keys: string[];
  label: string;
  description: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  {
    keys: ['Ctrl', 'K'],
    label: 'Open Command Palette',
    description: 'Quick search and execute commands',
  },
  {
    keys: ['?'],
    label: 'Show Keyboard Shortcuts',
    description: 'Display this shortcuts overlay',
  },
  {
    keys: ['Ctrl', 'N'],
    label: 'Toggle Notifications',
    description: 'Open or close notification panel',
  },
  {
    keys: ['Esc'],
    label: 'Close Panels',
    description: 'Dismiss any open overlay or panel',
  },
  {
    keys: ['1-9'],
    label: 'Navigate to Tab',
    description: 'Jump to tab by position number',
  },
  {
    keys: ['Ctrl', '/'],
    label: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 select-none">
      {children}
    </kbd>
  );
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 20,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

export default function KeyboardShortcuts() {
  const { showShortcuts, setShowShortcuts } = useAppStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setShowShortcuts(false);
  }, [setShowShortcuts]);

  // Close on Escape
  useEffect(() => {
    if (!showShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts, close]);

  // Close on click outside the card
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        close();
      }
    },
    [close],
  );

  // Prevent body scroll when open
  useEffect(() => {
    if (showShortcuts) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showShortcuts]);

  return (
    <AnimatePresence>
      {showShortcuts && (
        <motion.div
          ref={overlayRef}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                  <Keyboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quick actions for faster navigation
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
                aria-label="Close keyboard shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts Grid */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SHORTCUTS.map((shortcut) => (
                  <motion.div
                    key={shortcut.label}
                    variants={rowVariants}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-150"
                  >
                    {/* Keys */}
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <Kbd>
                            {key === 'Ctrl' && typeof navigator !== 'undefined' && /Mac|iPhone/.test(navigator.userAgent)
                              ? '⌘'
                              : key}
                          </Kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                              +
                            </span>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Label + Description */}
                    <div className="text-right min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {shortcut.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {shortcut.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                Press{' '}
                <Kbd>Esc</Kbd>{' '}
                or click outside to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
