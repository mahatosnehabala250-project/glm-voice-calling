'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Info, AlertTriangle, IndianRupee, Calendar, AlertCircle,
  CheckCheck, Filter, Inbox, Sparkles, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ============================================================
// Types
// ============================================================

interface NotificationItem {
  id: string;
  type: 'system' | 'alert' | 'billing' | 'booking' | 'escalation';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'system' | 'alert' | 'billing' | 'booking';

// ============================================================
// Constants
// ============================================================

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'system', label: 'System' },
  { key: 'alert', label: 'Alerts' },
  { key: 'billing', label: 'Billing' },
  { key: 'booking', label: 'Booking' },
];

const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}> = {
  system: {
    icon: Info,
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-l-sky-500',
    badgeBg: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
    badgeText: 'System',
    label: 'System',
  },
  alert: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-l-amber-500',
    badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    badgeText: 'Alert',
    label: 'Alert',
  },
  billing: {
    icon: IndianRupee,
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    badgeText: 'Billing',
    label: 'Billing',
  },
  booking: {
    icon: Calendar,
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-l-teal-500',
    badgeBg: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
    badgeText: 'Booking',
    label: 'Booking',
  },
  escalation: {
    icon: AlertCircle,
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-l-rose-500',
    badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
    badgeText: 'Escalation',
    label: 'Escalation',
  },
};

// ============================================================
// Main Component
// ============================================================

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.isRead).length;
    const read = notifications.filter((n) => n.isRead).length;
    return { total, unread, read };
  }, [notifications]);

  // Mark single notification as read
  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Loading state
  if (loading) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </motion.div>
        <motion.div variants={item}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </motion.div>
        <motion.div variants={item}>
          <Skeleton className="h-12 rounded-xl mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            Notification Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage platform alerts, system updates, and activity notifications
          </p>
        </div>
        {stats.unread > 0 && (
          <Button
            onClick={handleMarkAllRead}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
        )}
      </motion.div>

      {/* Notification Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 stat-card-hover overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Notifications</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 stat-card-hover overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Unread</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.unread}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 stat-card-hover overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-400" />
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Read</p>
                <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-1">{stats.read}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <CheckCheck className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 overflow-x-auto">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                activeFilter === filter.key
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {filter.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 px-2">
            <Filter className="w-3 h-3" />
            <span>{filteredNotifications.length} items</span>
          </div>
        </div>
      </motion.div>

      {/* Notification Timeline */}
      <motion.div variants={item}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                Notifications Timeline
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredNotifications.filter((n) => !n.isRead).length} unread
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All caught up!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {activeFilter === 'all'
                      ? 'No notifications to display right now'
                      : `No ${activeFilter} notifications found`}
                  </p>
                  {activeFilter !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-emerald-600 dark:text-emerald-400"
                      onClick={() => setActiveFilter('all')}
                    >
                      View all notifications
                    </Button>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((notif, index) => {
                    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-xl border-l-4 transition-all cursor-pointer',
                          config.borderColor,
                          notif.isRead
                            ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 border-l-4'
                            : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        )}
                      >
                        {/* Icon */}
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bgColor)}>
                          <Icon className={cn('w-5 h-5', config.iconColor)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              'text-sm font-semibold truncate',
                              notif.isRead
                                ? 'text-slate-600 dark:text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            )}>
                              {notif.title}
                            </h4>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.badgeBg)}>
                              {config.label}
                            </Badge>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Read indicator */}
                        {notif.isRead && (
                          <div className="flex-shrink-0 mt-1">
                            <CheckCheck className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
