'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import type { ClientPage } from '@/stores/app-store';
import {
  CalendarPlus, PhoneIncoming, Clock, List, Bell, FileBarChart, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  borderColor: string;
  navigateTo: ClientPage | null;
}

const actions: QuickAction[] = [
  {
    label: 'New Appointment',
    icon: CalendarPlus,
    gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    navigateTo: 'appointments',
  },
  {
    label: 'Call Patient',
    icon: PhoneIncoming,
    gradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800',
    navigateTo: 'calls',
  },
  {
    label: 'Check Availability',
    icon: Clock,
    gradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    navigateTo: 'schedule',
  },
  {
    label: 'Send Reminder',
    icon: Bell,
    gradient: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800',
    navigateTo: null,
  },
  {
    label: 'Generate Report',
    icon: FileBarChart,
    gradient: 'from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-200 dark:border-violet-800',
    navigateTo: 'analytics',
  },
  {
    label: 'Settings',
    icon: Settings,
    gradient: 'from-slate-50 to-zinc-50 dark:from-slate-800/50 dark:to-zinc-800/50',
    iconColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    navigateTo: 'settings',
  },
];

export default function QuickActionsPanel() {
  const { setClientPage } = useAppStore();

  const handleClick = (action: QuickAction) => {
    if (action.navigateTo) {
      setClientPage(action.navigateTo);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Horizontal scrollable row on mobile, wrap on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
        {actions.map((action, i) => {
          const ActionIcon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(action)}
              className={cn(
                'flex items-center gap-2.5 px-5 py-3 rounded-full border bg-gradient-to-r cursor-pointer shadow-sm',
                'flex-shrink-0 transition-shadow hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-1',
                action.gradient,
                action.borderColor,
              )}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', action.iconColor)}>
                <ActionIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
