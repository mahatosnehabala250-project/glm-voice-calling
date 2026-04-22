'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  Search,
  LayoutDashboard,
  Building2,
  BarChart3,
  Brain,
  CreditCard,
  Calendar,
  Phone,
  Settings,
  Users,
  Moon,
  Sun,
  Bell,
  LogOut,
  Server,
  Command,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  shortcut?: string;
  category: 'navigation' | 'actions' | 'admin';
  action: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  admin: 'Admin',
};

export default function CommandPalette() {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();
  const { setAdminPage, setClientPage, setShowNotifications, setHelpCenterOpen, commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const { resolvedTheme, setTheme } = useTheme();

  const role = user?.role || 'client';
  const open = commandPaletteOpen;
  const setOpen = setCommandPaletteOpen;

  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [];

    if (role === 'admin') {
      nav.push(
        {
          id: 'nav-overview',
          icon: LayoutDashboard,
          label: 'Go to Overview',
          description: 'Platform overview with system health and stats',
          shortcut: 'G O',
          category: 'navigation',
          action: () => { setAdminPage('overview'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-clinics',
          icon: Building2,
          label: 'Go to Clinics',
          description: 'Manage registered clinics and their status',
          shortcut: 'G C',
          category: 'navigation',
          action: () => { setAdminPage('clinics'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-analytics',
          icon: BarChart3,
          label: 'Go to Analytics',
          description: 'Detailed analytics with charts and trends',
          shortcut: 'G A',
          category: 'navigation',
          action: () => { setAdminPage('analytics'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-ai-performance',
          icon: Brain,
          label: 'Go to AI Insights',
          description: 'AI performance KPIs, charts, and health monitoring',
          shortcut: 'G I',
          category: 'navigation',
          action: () => { setAdminPage('ai-performance'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-billing',
          icon: CreditCard,
          label: 'Go to Billing',
          description: 'Billing plans, invoices, and MRR tracking',
          shortcut: 'G B',
          category: 'navigation',
          action: () => { setAdminPage('billing'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-provisioning',
          icon: Server,
          label: 'Go to Provisioning',
          description: 'SIP number management and assignment',
          shortcut: 'G P',
          category: 'admin',
          action: () => { setAdminPage('provisioning'); setCommandPaletteOpen(false); },
        },
      );
    } else {
      nav.push(
        {
          id: 'nav-overview',
          icon: LayoutDashboard,
          label: 'Go to Overview',
          description: 'Dashboard with today\'s summary and quick actions',
          shortcut: 'G O',
          category: 'navigation',
          action: () => { setClientPage('overview'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-appointments',
          icon: Calendar,
          label: 'Go to Appointments',
          description: 'Manage appointments, confirm, cancel bookings',
          shortcut: 'G A',
          category: 'navigation',
          action: () => { setClientPage('appointments'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-calls',
          icon: Phone,
          label: 'Go to Call Logs',
          description: 'View call history with transcripts and AI insights',
          shortcut: 'G C',
          category: 'navigation',
          action: () => { setClientPage('calls'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-settings',
          icon: Settings,
          label: 'Go to Settings',
          description: 'Clinic profile, AI config, and business hours',
          shortcut: 'G S',
          category: 'navigation',
          action: () => { setClientPage('settings'); setCommandPaletteOpen(false); },
        },
        {
          id: 'nav-team',
          icon: Users,
          label: 'Go to Team',
          description: 'Manage team members, roles, and permissions',
          shortcut: 'G T',
          category: 'navigation',
          action: () => { setClientPage('team'); setCommandPaletteOpen(false); },
        },
      );
    }

    const actions: CommandItem[] = [
      {
        id: 'open-help-center',
        icon: HelpCircle,
        label: 'Open Help Center',
        description: 'Search help articles, FAQ, and contact support',
        shortcut: 'Ctrl+H',
        category: 'actions',
        action: () => {
          setHelpCenterOpen(true);
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'toggle-theme',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        label: 'Toggle Theme',
        description: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`,
        shortcut: 'Ctrl+D',
        category: 'actions',
        action: () => {
          setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'toggle-notifications',
        icon: Bell,
        label: 'Toggle Notifications',
        description: 'Open or close the notification panel',
        shortcut: 'Ctrl+N',
        category: 'actions',
        action: () => {
          setShowNotifications(!useAppStore.getState().showNotifications);
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'sign-out',
        icon: LogOut,
        label: 'Sign Out',
        description: 'Sign out of your current session',
        shortcut: '',
        category: 'actions',
        action: () => {
          logout();
          setCommandPaletteOpen(false);
        },
      },
    ];

    // Admin-only: View All Clinics, View Provisioning (already in nav, but add explicit actions)
    if (role === 'admin') {
      actions.unshift(
        {
          id: 'view-all-clinics',
          icon: Building2,
          label: 'View All Clinics',
          description: 'See all registered clinics at a glance',
          shortcut: '',
          category: 'admin',
          action: () => { setAdminPage('clinics'); setCommandPaletteOpen(false); },
        },
        {
          id: 'view-provisioning',
          icon: Server,
          label: 'View Provisioning',
          description: 'SIP number pool and assignments',
          shortcut: '',
          category: 'admin',
          action: () => { setAdminPage('provisioning'); setCommandPaletteOpen(false); },
        },
      );
    }

    return [...nav, ...actions];
  }, [role, resolvedTheme, setAdminPage, setClientPage, setTheme, setShowNotifications, setHelpCenterOpen, setCommandPaletteOpen, logout]);

  // Filter commands based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase().trim();
    const terms = lowerQuery.split(/\s+/);

    return commands.filter((cmd) => {
      const searchText = `${cmd.label} ${cmd.description}`.toLowerCase();
      return terms.every((term) => searchText.includes(term));
    });
  }, [commands, query]);

  // Group filtered commands
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    const order = ['navigation', 'admin', 'actions'];

    for (const cmd of filtered) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    }

    return order
      .filter((cat) => groups[cat] && groups[cat].length > 0)
      .map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        items: groups[cat],
      }));
  }, [filtered]);

  // Reset active index when filtered results change
  // (handled in onChange handler and on dialog open)

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to let the Dialog render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setQuery('');
        setActiveIndex(0);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const total = filtered.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % total);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + total) % total);
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[activeIndex]) {
            filtered[activeIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setCommandPaletteOpen(false);
          break;
      }
    },
    [filtered, activeIndex, setCommandPaletteOpen],
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-command-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Build flat index offset for grouped items
  const getFlatIndex = (groupIdx: number, itemIdx: number) => {
    let offset = 0;
    for (let i = 0; i < groupIdx; i++) {
      offset += grouped[i].items.length;
    }
    return offset + itemIdx;
  };

  const isEmpty = filtered.length === 0 && query.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden rounded-2xl border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl max-w-lg sm:max-w-lg"
        onKeyDown={handleKeyDown}
        // Prevent Radix from stealing focus from our input
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Visually hidden for accessibility */}
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">Search and execute commands quickly</DialogDescription>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto px-2 py-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500"
              >
                <Search className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No commands found</p>
                <p className="text-xs mt-1 opacity-70">Try a different search term</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="space-y-1"
              >
                {grouped.map((group) => (
                  <div key={group.category}>
                    {/* Group Header */}
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.label}
                    </div>

                    {/* Group Items */}
                    {group.items.map((cmd, itemIdx) => {
                      const flatIdx = getFlatIndex(
                        grouped.indexOf(group),
                        itemIdx,
                      );
                      const isActive = flatIdx === activeIndex;
                      const Icon = cmd.icon;

                      return (
                        <button
                          key={cmd.id}
                          data-command-index={flatIdx}
                          onClick={() => cmd.action()}
                          onMouseEnter={() => setActiveIndex(flatIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                          )}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors duration-150',
                              isActive
                                ? 'bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Label + Description */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-medium truncate',
                              isActive
                                ? 'text-emerald-900 dark:text-emerald-100'
                                : 'text-slate-900 dark:text-white',
                            )}>
                              {cmd.label}
                            </p>
                            <p className={cn(
                              'text-xs truncate mt-0.5',
                              isActive
                                ? 'text-emerald-600/70 dark:text-emerald-400/70'
                                : 'text-slate-500 dark:text-slate-400',
                            )}>
                              {cmd.description}
                            </p>
                          </div>

                          {/* Keyboard Shortcut Hint */}
                          {cmd.shortcut && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {cmd.shortcut.split(' ').map((key, i) => (
                                <span key={i}>
                                  <kbd
                                    className={cn(
                                      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono',
                                      isActive
                                        ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-100/50 dark:bg-emerald-800/20 text-emerald-600 dark:text-emerald-400'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
                                    )}
                                  >
                                    {key}
                                  </kbd>
                                  {i < cmd.shortcut.split(' ').length - 1 && (
                                    <span className="mx-0.5 text-[10px] text-slate-300 dark:text-slate-600" />
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-mono">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-mono">↵</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-mono">esc</kbd>
              <span>Close</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
            <Command className="w-3 h-3" />
            <span>VoiceAI</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
