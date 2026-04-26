'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import type { ClientPage } from '@/stores/app-store';
import {
  CalendarPlus, PhoneIncoming, Clock, Bell, FileBarChart, Settings,
  Phone, CalendarCheck, Megaphone, Bot, Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
    label: 'Schedule Call',
    icon: Phone,
    gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    navigateTo: 'calls',
  },
  {
    label: 'View Appointments',
    icon: CalendarCheck,
    gradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800',
    navigateTo: 'appointments',
  },
  {
    label: 'Start Campaign',
    icon: Megaphone,
    gradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    navigateTo: 'whatsapp',
  },
  {
    label: 'AI Settings',
    icon: Bot,
    gradient: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800',
    navigateTo: 'agent-studio',
  },
  {
    label: 'New Appointment',
    icon: CalendarPlus,
    gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    navigateTo: 'appointments',
  },
  {
    label: 'Check Availability',
    icon: Clock,
    gradient: 'from-slate-50 to-zinc-50 dark:from-slate-800/50 dark:to-zinc-800/50',
    iconColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    navigateTo: 'schedule',
  },
  {
    label: 'Send Reminder',
    icon: Bell,
    gradient: 'from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-200 dark:border-violet-800',
    navigateTo: 'whatsapp',
  },
  {
    label: 'Generate Report',
    icon: FileBarChart,
    gradient: 'from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-200 dark:border-sky-800',
    navigateTo: 'analytics',
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {actions.map((action, i) => {
          const ActionIcon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(action)}
              className={cn(
                'flex flex-col items-center gap-2 px-4 py-4 rounded-xl border bg-gradient-to-br cursor-pointer shadow-sm',
                'transition-shadow hover:shadow-lg',
                'focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-1',
                action.gradient,
                action.borderColor,
              )}
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-800/60 shadow-sm', action.iconColor)}>
                <ActionIcon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-center leading-tight">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
