'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Filter,
  Inbox,
  ChevronRight,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';

/* ============================================================
   Types
   ============================================================ */
type NotifType = 'info' | 'alert' | 'error' | 'success';

type FilterTab = 'all' | 'unread' | 'alerts';

interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  icon?: LucideIcon;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ============================================================
   Sample Notification Data
   ============================================================ */
const sampleNotifications: NotificationItem[] = [
  {
    id: 'n1',
    type: 'success',
    title: 'Appointment Confirmed',
    description: 'Patient Rajesh Kumar booked a General Checkup for tomorrow at 10:30 AM.',
    time: '2 min ago',
    isUnread: true,
    icon: CheckCircle,
  },
  {
    id: 'n2',
    type: 'alert',
    title: 'Missed Call Detected',
    description: 'A patient called but hung up before the AI could answer. Consider following up.',
    time: '15 min ago',
    isUnread: true,
    icon: AlertTriangle,
  },
  {
    id: 'n3',
    type: 'info',
    title: 'New Feature Available',
    description: 'WhatsApp auto-confirmation is now enabled for your clinic. View settings.',
    time: '1 hour ago',
    isUnread: true,
    icon: Info,
  },
  {
    id: 'n4',
    type: 'success',
    title: 'Monthly Report Ready',
    description: 'Your clinic handled 147 calls this month with a 92% booking rate.',
    time: '3 hours ago',
    isUnread: false,
    icon: CheckCircle,
  },
  {
    id: 'n5',
    type: 'error',
    title: 'Escalation to Staff',
    description: 'Patient Sunita requested to speak with a doctor. Call was transferred.',
    time: '5 hours ago',
    isUnread: false,
    icon: AlertTriangle,
  },
  {
    id: 'n6',
    type: 'info',
    title: 'System Update Scheduled',
    description: 'Maintenance window: Sunday 2:00–4:00 AM IST. No service disruption expected.',
    time: '1 day ago',
    isUnread: false,
    icon: Bell,
  },
];

/* ============================================================
   Type-specific styles
   ============================================================ */
const typeConfig: Record<
  NotifType,
  { border: string; iconBg: string; iconColor: string; label: string }
> = {
  info: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Info',
  },
  alert: {
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'Alert',
  },
  error: {
    border: 'border-l-rose-500',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    label: 'Error',
  },
  success: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Success',
  },
};

/* ============================================================
   Animation Variants
   ============================================================ */
const panelVariants = {
  hidden: { opacity: 0, x: 20, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.19, 1, 0.22, 1] },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.96,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.04, ease: 'easeOut' },
  }),
};

/* ============================================================
   Notifications Panel Component
   ============================================================ */
export default function NotificationsPanel({
  isOpen,
  onClose,
}: NotificationsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(sampleNotifications);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isUnread).length,
    [notifications],
  );

  const alertCount = useMemo(
    () => notifications.filter((n) => n.type === 'alert' || n.type === 'error').length,
    [notifications],
  );

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => n.isUnread);
      case 'alerts':
        return notifications.filter(
          (n) => n.type === 'alert' || n.type === 'error',
        );
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  // Mark all as read
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  }, []);

  // Mark individual as read on click
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n)),
    );
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Escape to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const filterTabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'alerts', label: 'Alerts', count: alertCount },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-16 z-50 w-full sm:w-[400px] h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 dark:from-emerald-950/10 dark:to-teal-950/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                {unreadCount > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] font-bold bg-rose-500 text-white border-0 rounded-full">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    onClick={markAllRead}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex-shrink-0">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    activeFilter === tab.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300',
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold',
                        activeFilter === tab.id
                          ? 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {filteredNotifications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <Inbox className="w-8 h-8 opacity-30" />
                    </div>
                    <p className="text-sm font-medium">No notifications</p>
                    <p className="text-xs mt-1 opacity-70">
                      {activeFilter === 'unread'
                        ? 'All caught up!'
                        : activeFilter === 'alerts'
                          ? 'No alerts to show'
                          : 'You\'re all up to date'}
                    </p>
                  </motion.div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredNotifications.map((notif, idx) => {
                      const Icon = notif.icon || Bell;
                      const config = typeConfig[notif.type];

                      return (
                        <motion.button
                          key={notif.id}
                          custom={idx}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          onClick={() => markAsRead(notif.id)}
                          className={cn(
                            'w-full text-left px-4 py-3.5 border-l-[3px] transition-all duration-200 group',
                            config.border,
                            notif.isUnread
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                              : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                                config.iconBg,
                              )}
                            >
                              <Icon
                                className={cn('w-4 h-4', config.iconColor)}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p
                                  className={cn(
                                    'text-sm truncate',
                                    notif.isUnread
                                      ? 'font-semibold text-slate-900 dark:text-white'
                                      : 'font-medium text-slate-700 dark:text-slate-300',
                                  )}
                                >
                                  {notif.title}
                                </p>
                                {notif.isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {notif.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span
                                  className={cn(
                                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                                    config.iconBg,
                                    config.iconColor,
                                  )}
                                >
                                  {config.label}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {notif.time}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors duration-200 py-1"
                onClick={onClose}
              >
                View All Notifications
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
