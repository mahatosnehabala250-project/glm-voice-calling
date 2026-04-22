'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Rocket, Wrench, Bug, ArrowRight, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/stores/app-store';

// ─── Changelog Data ────────────────────────────────────────────────────────────

type EntryType = 'feature' | 'improvement' | 'fix';

interface ChangelogEntry {
  version: string;
  date: string;
  type: EntryType;
  title: string;
  description: string;
}

const changelog: ChangelogEntry[] = [
  {
    version: 'v1.2.0',
    date: 'Apr 20, 2025',
    type: 'feature',
    title: 'Real-Time System Monitor',
    description: 'Live API, SIP, and call status indicators with automatic health polling every 30 seconds.',
  },
  {
    version: 'v1.2.0',
    date: 'Apr 20, 2025',
    type: 'feature',
    title: 'URL-Based Navigation',
    description: 'Pages are now bookmarkable! Share direct links to any dashboard tab using URL parameters.',
  },
  {
    version: 'v1.1.0',
    date: 'Apr 15, 2025',
    type: 'feature',
    title: 'AI Agent Studio',
    description: 'Full 7-tab agent configurator with identity, voice, booking, knowledge base, and behavior settings.',
  },
  {
    version: 'v1.1.0',
    date: 'Apr 15, 2025',
    type: 'feature',
    title: 'Live Call Monitor',
    description: 'Real-time call tracking with transfer capabilities and simulated active call visualization.',
  },
  {
    version: 'v1.0.0',
    date: 'Apr 10, 2025',
    type: 'feature',
    title: 'Multi-Tenant Dashboard',
    description: 'Complete admin and client dashboards with 15 admin tabs and 11 client tabs.',
  },
  {
    version: 'v1.0.0',
    date: 'Apr 10, 2025',
    type: 'improvement',
    title: 'Enhanced Security',
    description: 'XSS protection in AI chat, HMAC-SHA1 webhook verification, and input sanitization.',
  },
  {
    version: 'v1.0.0',
    date: 'Apr 10, 2025',
    type: 'improvement',
    title: 'Dark Mode',
    description: 'Full dark mode support with glassmorphism sidebar, header, and chart-aware color theming.',
  },
];

// ─── Type Config ───────────────────────────────────────────────────────────────

const typeConfig: Record<EntryType, { label: string; icon: React.ElementType; color: string; bg: string; border: string; darkBg: string; darkColor: string; darkBorder: string }> = {
  feature: {
    label: 'Feature',
    icon: Rocket,
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    darkBg: 'dark:bg-emerald-900/40',
    darkColor: 'dark:text-emerald-300',
    darkBorder: 'dark:border-emerald-700',
  },
  improvement: {
    label: 'Improvement',
    icon: Wrench,
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    darkBg: 'dark:bg-amber-900/40',
    darkColor: 'dark:text-amber-300',
    darkBorder: 'dark:border-amber-700',
  },
  fix: {
    label: 'Fix',
    icon: Bug,
    color: 'text-rose-700',
    bg: 'bg-rose-100',
    border: 'border-rose-300',
    darkBg: 'dark:bg-rose-900/40',
    darkColor: 'dark:text-rose-300',
    darkBorder: 'dark:border-rose-700',
  },
};

// ─── Timeline entry animations ─────────────────────────────────────────────────

const entryVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06 + 0.15, duration: 0.35, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

const sectionHeaderVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08 + 0.1, duration: 0.3, ease: 'easeOut' },
  }),
};

// ─── Group entries by version ──────────────────────────────────────────────────

interface VersionGroup {
  version: string;
  date: string;
  entries: ChangelogEntry[];
  isLatest: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function WhatsNew() {
  const { showWhatsNew, setShowWhatsNew } = useAppStore();

  // Group changelog entries by version, preserving order
  const versionGroups = useMemo(() => {
    const groupMap = new Map<string, { version: string; date: string; entries: ChangelogEntry[] }>();
    for (const entry of changelog) {
      const existing = groupMap.get(entry.version);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groupMap.set(entry.version, { version: entry.version, date: entry.date, entries: [entry] });
      }
    }
    const groups: VersionGroup[] = Array.from(groupMap.values()).map((g, idx) => ({
      ...g,
      isLatest: idx === 0,
    }));
    return groups;
  }, []);

  // Flat index tracker for animation stagger
  let globalEntryIdx = 0;

  return (
    <Sheet open={showWhatsNew} onOpenChange={setShowWhatsNew}>
      <SheetContent
        side="right"
        className="w-full max-w-md p-0 bg-white dark:bg-slate-950 border-l border-slate-200/50 dark:border-slate-800/50 sm:max-w-md"
      >
        {/* Gradient Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 pt-8 pb-6">
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

          <SheetHeader className="relative z-10 space-y-1 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <SheetTitle className="text-xl font-bold text-white tracking-tight">
                What&apos;s New
              </SheetTitle>
            </div>
            <SheetDescription className="text-emerald-100 text-sm">
              Latest updates, features, and improvements
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Changelog Content */}
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="relative px-6 py-4">
            {versionGroups.map((group, gIdx) => {
              // Calculate starting index for stagger animation
              const groupStartIdx = globalEntryIdx;

              return (
                <div key={group.version} className={gIdx > 0 ? 'mt-6' : ''}>
                  {/* Version Section Header */}
                  <AnimatePresence>
                    {showWhatsNew && (
                      <motion.div
                        custom={gIdx}
                        variants={sectionHeaderVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center gap-3 mb-4"
                      >
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          {group.version}
                        </span>
                        <Separator className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                          {group.date}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Timeline */}
                  <div className="relative">
                    {/* Vertical timeline line */}
                    {group.entries.length > 1 && (
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-slate-100 dark:from-slate-700 dark:via-slate-700 dark:to-slate-800" />
                    )}

                    {/* Entries */}
                    <div className="space-y-3">
                      {group.entries.map((entry, eIdx) => {
                        const config = typeConfig[entry.type];
                        const TypeIcon = config.icon;
                        const entryGlobalIdx = groupStartIdx + eIdx;
                        globalEntryIdx += 1;

                        // Left border color class for each type
                        const borderColors: Record<EntryType, string> = {
                          feature: 'border-l-emerald-400 dark:border-l-emerald-500',
                          improvement: 'border-l-amber-400 dark:border-l-amber-500',
                          fix: 'border-l-rose-400 dark:border-l-rose-500',
                        };

                        return (
                          <AnimatePresence key={`${entry.version}-${entry.title}`}>
                            {showWhatsNew && (
                              <motion.div
                                custom={entryGlobalIdx}
                                variants={entryVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="relative pl-10"
                              >
                                {/* Timeline dot */}
                                <div
                                  className={`absolute left-0 top-5 w-[31px] h-[31px] rounded-full flex items-center justify-center ${config.bg} ${config.darkBg} border ${config.border} ${config.darkBorder} z-10`}
                                >
                                  <TypeIcon className={`w-3.5 h-3.5 ${config.color} ${config.darkColor}`} />
                                </div>

                                {/* Card */}
                                <div
                                  className={`rounded-lg border border-l-[3px] ${borderColors[entry.type]} bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}
                                >
                                  {/* Top row: type badge + date */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.darkBg} ${config.color} ${config.darkColor}`}
                                    >
                                      <TypeIcon className="w-2.5 h-2.5" />
                                      {config.label}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {entry.date}
                                    </span>
                                  </div>

                                  {/* Title */}
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5 leading-snug">
                                    {entry.title}
                                  </h4>

                                  {/* Description */}
                                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {entry.description}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* View Full Changelog Button */}
            <div className="mt-8 mb-4">
              <Separator className="mb-4 bg-slate-200 dark:bg-slate-800" />
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                onClick={() => setShowWhatsNew(false)}
              >
                View Full Changelog
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
