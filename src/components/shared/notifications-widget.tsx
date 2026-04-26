'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Phone, CalendarCheck, AlertTriangle, Settings, MessageCircle,
  CheckCircle2, UserPlus, CreditCard, Zap, X
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface NotificationItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  iconColor: string;
  iconBg: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    icon: Phone,
    title: 'Missed Call Alert',
    description: 'You missed a call from +91-98765-43210. AI answered but patient hung up.',
    timestamp: '2 minutes ago',
    isRead: false,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
  },
  {
    id: 'n-2',
    icon: CalendarCheck,
    title: 'New Appointment Booked',
    description: 'Priya Sharma booked an appointment for Friday 10:30 AM with Dr. Rajesh.',
    timestamp: '15 minutes ago',
    isRead: false,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    id: 'n-3',
    icon: AlertTriangle,
    title: 'SIP Service Degraded',
    description: 'Vobiz SIP trunk latency increased to 450ms. Calls may be affected.',
    timestamp: '28 minutes ago',
    isRead: false,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'n-4',
    icon: CreditCard,
    title: 'Payment Received',
    description: '₹2,999 payment received for Pro plan subscription renewal.',
    timestamp: '1 hour ago',
    isRead: true,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
  },
  {
    id: 'n-5',
    icon: MessageCircle,
    title: 'WhatsApp Reminder Sent',
    description: 'Appointment reminder sent to 5 patients for tomorrow\'s schedule.',
    timestamp: '2 hours ago',
    isRead: true,
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
];

interface NotificationsWidgetProps {
  onViewAll?: () => void;
}

export default function NotificationsWidget({ onViewAll }: NotificationsWidgetProps) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[320px]">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {notifications.map((notification, i) => {
              const NotifIcon = notification.icon;
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative',
                    !notification.isRead && 'bg-emerald-50/30 dark:bg-emerald-900/10'
                  )}
                  onClick={() => {
                    setNotifications(prev =>
                      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                    );
                  }}
                >
                  {!notification.isRead && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', notification.iconBg)}>
                      <NotifIcon className={cn('w-4 h-4', notification.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{notification.description}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{notification.timestamp}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
            onClick={() => {
              setOpen(false);
              onViewAll?.();
            }}
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
