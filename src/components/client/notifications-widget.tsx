'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CalendarCheck,
  AlertTriangle,
  Phone,
  Settings,
  CheckCheck,
  Mail,
  Inbox,
  Clock,
  X,
  Check,
  Eye,
  Trash2,
  RefreshCw,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, startOfDay } from 'date-fns';
import { useAuthStore } from '@/stores/auth-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ---------- Types ----------

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: string | null;
  createdAt: string;
}

interface NotifStats {
  unread: number;
  todayBookings: number;
  pendingEscalations: number;
}

type CategoryFilter = 'all' | 'appointments' | 'calls' | 'system' | 'alerts';

// ---------- Constants ----------

const REFRESH_INTERVAL = 15_000; // 15 seconds
const TOAST_WINDOW_MS = 120_000; // 2 minutes
const UPDATE_INDICATOR_MS = 1500; // Brief "Updating..." flash

// Map notification types to categories
const TYPE_TO_CATEGORY: Record<string, CategoryFilter> = {
  booking: 'appointments',
  missed_call: 'calls',
  escalation: 'alerts',
  system: 'system',
};

const TYPE_CONFIG: Record<
  string,
  {
    icon: typeof CalendarCheck;
    color: string;
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    label: string;
    darkBg: string;
    darkBorder: string;
    darkBadgeBg: string;
    darkBadgeText: string;
    leftBorder: string;
  }
> = {
  booking: {
    icon: CalendarCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    label: 'Booking',
    darkBg: 'dark:bg-emerald-900/20',
    darkBorder: 'dark:border-emerald-800',
    darkBadgeBg: 'dark:bg-emerald-900/30',
    darkBadgeText: 'dark:text-emerald-400',
    leftBorder: 'border-l-emerald-500',
  },
  escalation: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    label: 'Escalation',
    darkBg: 'dark:bg-amber-900/20',
    darkBorder: 'dark:border-amber-800',
    darkBadgeBg: 'dark:bg-amber-900/30',
    darkBadgeText: 'dark:text-amber-400',
    leftBorder: 'border-l-amber-500',
  },
  missed_call: {
    icon: Phone,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    label: 'Missed Call',
    darkBg: 'dark:bg-rose-900/20',
    darkBorder: 'dark:border-rose-800',
    darkBadgeBg: 'dark:bg-rose-900/30',
    darkBadgeText: 'dark:text-rose-400',
    leftBorder: 'border-l-rose-500',
  },
  system: {
    icon: Settings,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    label: 'System',
    darkBg: 'dark:bg-slate-800',
    darkBorder: 'dark:border-slate-700',
    darkBadgeBg: 'dark:bg-slate-700/50',
    darkBadgeText: 'dark:text-slate-400',
    leftBorder: 'border-l-slate-400',
  },
};

const CATEGORY_TABS: { value: CategoryFilter; label: string; icon: typeof Bell }[] = [
  { value: 'all', label: 'All', icon: Inbox },
  { value: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { value: 'calls', label: 'Calls', icon: Phone },
  { value: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { value: 'system', label: 'System', icon: Settings },
];

// ---------- Component ----------

export default function NotificationsWidget() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId || '';

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<NotifStats>({
    unread: 0,
    todayBookings: 0,
    pendingEscalations: 0,
  });

  // Track IDs we've already toasted so we don't repeat
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const prevNotifsRef = useRef<NotificationItem[]>([]);
  const initialLoadDoneRef = useRef(false);

  // ---------- Category counts ----------

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: notifications.length,
      appointments: notifications.filter((n) => TYPE_TO_CATEGORY[n.type] === 'appointments').length,
      calls: notifications.filter((n) => TYPE_TO_CATEGORY[n.type] === 'calls').length,
      alerts: notifications.filter((n) => TYPE_TO_CATEGORY[n.type] === 'alerts').length,
      system: notifications.filter((n) => TYPE_TO_CATEGORY[n.type] === 'system').length,
    };
    return counts;
  }, [notifications]);

  // ---------- Fetch notifications ----------

  const fetchNotifications = useCallback(
    async (showUpdating = false) => {
      if (!clinicId) return;
      if (showUpdating) setIsUpdating(true);

      try {
        const res = await fetch('/api/client/notifications', {
          headers: { 'x-clinic-id': clinicId },
        });
        if (!res.ok) return;
        const data = await res.json();
        const notifs: NotificationItem[] = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(data.unreadCount ?? notifs.filter((n) => !n.isRead).length);

        // Compute stats
        const todayStart = startOfDay(new Date()).toISOString();
        setStats({
          unread: notifs.filter((n) => !n.isRead).length,
          todayBookings: notifs.filter(
            (n) => n.type === 'booking' && n.createdAt >= todayStart
          ).length,
          pendingEscalations: notifs.filter(
            (n) => n.type === 'escalation' && !n.isRead
          ).length,
        });

        // Toast for new notifications (only on subsequent fetches)
        if (prevNotifsRef.current.length > 0) {
          const prevIds = new Set(prevNotifsRef.current.map((n) => n.id));
          const newNotifs = notifs.filter(
            (n) => !prevIds.has(n.id) && !toastedIdsRef.current.has(n.id)
          );
          newNotifs.forEach((n) => fireToast(n));
        }
        prevNotifsRef.current = notifs;
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false);
        if (showUpdating) {
          setTimeout(() => setIsUpdating(false), UPDATE_INDICATOR_MS);
        }
      }
    },
    [clinicId]
  );

  // Initial fetch + auto-refresh every 15 seconds
  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => fetchNotifications(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ---------- Toast helper ----------

  const fireToast = useCallback((n: NotificationItem) => {
    const age = Date.now() - new Date(n.createdAt).getTime();
    if (age > TOAST_WINDOW_MS) return;

    toastedIdsRef.current.add(n.id);

    let metadata: Record<string, string> = {};
    try {
      metadata = n.metadata ? JSON.parse(n.metadata) : {};
    } catch {
      // ignore
    }

    switch (n.type) {
      case 'booking': {
        const patientName = metadata.patientName || 'Patient';
        const time = metadata.time || 'a slot';
        toast.success(`New Appointment: ${patientName} booked for ${time}`, {
          icon: <CalendarCheck className="w-4 h-4 text-emerald-600" />,
          duration: 5000,
        });
        break;
      }
      case 'escalation': {
        const caller = metadata.caller || metadata.patientName || 'Caller';
        toast.warning(`Escalation: ${caller} needs attention`, {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          duration: 5000,
        });
        break;
      }
      case 'missed_call': {
        const phone = metadata.phone || metadata.callerPhone || 'Unknown';
        toast.error(`Missed Call from ${phone}`, {
          icon: <Phone className="w-4 h-4 text-rose-600" />,
          duration: 5000,
        });
        break;
      }
      default:
        toast.info(n.title, {
          description: n.message,
          icon: <Settings className="w-4 h-4 text-slate-500" />,
          duration: 4000,
        });
    }
  }, []);

  // ---------- Mark actions ----------

  const markOneRead = useCallback(
    async (n: NotificationItem) => {
      if (n.isRead || !clinicId) return;
      try {
        await fetch('/api/client/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-clinic-id': clinicId,
          },
          body: JSON.stringify({ id: n.id }),
        });
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id ? { ...item, isRead: true } : item
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
      } catch {
        // silent
      }
    },
    [clinicId]
  );

  const toggleRead = useCallback(
    async (n: NotificationItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!clinicId) return;
      try {
        await fetch('/api/client/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-clinic-id': clinicId,
          },
          body: JSON.stringify({ id: n.id }),
        });
        const newReadState = !n.isRead;
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id ? { ...item, isRead: newReadState } : item
          )
        );
        setUnreadCount((c) => (newReadState ? Math.max(0, c - 1) : c + 1));
        setStats((s) => ({
          ...s,
          unread: newReadState ? Math.max(0, s.unread - 1) : s.unread + 1,
        }));
      } catch {
        // silent
      }
    },
    [clinicId]
  );

  const dismissNotification = useCallback(
    async (n: NotificationItem, e: React.MouseEvent) => {
      e.stopPropagation();
      setDismissingIds((prev) => new Set(prev).add(n.id));
      // Brief delay for animation
      await new Promise((resolve) => setTimeout(resolve, 300));
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
      if (!n.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
        setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
      }
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
      toast.success('Notification dismissed', { duration: 2000 });
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!clinicId || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await fetch('/api/client/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clinic-id': clinicId,
        },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setStats((s) => ({ ...s, unread: 0, pendingEscalations: 0 }));
      toast.success('All notifications marked as read', {
        icon: <CheckCheck className="w-4 h-4 text-emerald-600" />,
        duration: 3000,
      });
    } catch {
      // silent
    } finally {
      setIsMarkingAll(false);
    }
  }, [clinicId, unreadCount]);

  // ---------- Filtered notifications ----------

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => TYPE_TO_CATEGORY[n.type] === activeFilter);
  }, [notifications, activeFilter]);

  // ---------- Relative time ----------

  const relativeTime = useCallback((dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  }, []);

  // ---------- Action handler for notification actions ----------

  const handleAction = useCallback(
    (action: string, n: NotificationItem, e: React.MouseEvent) => {
      e.stopPropagation();
      switch (action) {
        case 'confirm':
          markOneRead(n);
          toast.success('Appointment confirmed', {
            icon: <Check className="w-4 h-4 text-emerald-600" />,
            duration: 3000,
          });
          break;
        case 'dismiss':
          dismissNotification(n, e);
          break;
        case 'view':
          markOneRead(n);
          toast.info('Viewing details...', {
            icon: <Eye className="w-4 h-4 text-slate-500" />,
            duration: 2000,
          });
          break;
      }
    },
    [markOneRead, dismissNotification]
  );

  // ---------- Render ----------

  if (!user || user.role !== 'client' || !clinicId) return null;

  return (
    <>
      {/* ===== Floating Notification Button ===== */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
      >
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'hover:from-emerald-600 hover:to-teal-700',
            'active:scale-95 transition-all duration-200',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-emerald-600 dark:focus-visible:ring-offset-slate-900',
            unreadCount > 0 && 'glow-emerald'
          )}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="w-6 h-6 text-white" />

          {/* Animated badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold shadow-sm animate-badge-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Pulse ring when unread */}
          {unreadCount > 0 && (
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />
          )}
        </button>
      </motion.div>

      {/* ===== Notification Panel (Sheet) ===== */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            'w-full sm:max-w-[440px] p-0 gap-0',
            'glass-card'
          )}
        >
          {/* --- Panel Header --- */}
          <SheetHeader className="px-4 sm:px-5 pt-5 pb-0 gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg leading-tight">Notifications</SheetTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    {unreadCount > 0 && (
                      <Badge className="bg-rose-500 text-white hover:bg-rose-600 text-[10px] px-1.5 py-0 min-w-[20px] h-4 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount} unread
                      </Badge>
                    )}
                    {/* Updating indicator */}
                    <AnimatePresence>
                      {isUpdating && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 overflow-hidden whitespace-nowrap"
                        >
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Updating...
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                disabled={unreadCount === 0 || isMarkingAll}
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-xs font-medium gap-1.5 h-8 px-2.5"
              >
                {isMarkingAll ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Clearing...
                  </span>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </>
                )}
              </Button>
            </div>
            <SheetDescription className="text-xs text-muted-foreground sr-only">
              View and manage your clinic notifications
            </SheetDescription>
          </SheetHeader>

          {/* --- Quick Stats --- */}
          <div className="px-4 sm:px-5 pt-4 pb-2">
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Unread"
                value={stats.unread}
                bgLight="bg-emerald-50"
                bgDark="dark:bg-emerald-900/20"
                textColor="text-emerald-700 dark:text-emerald-400"
              />
              <StatCard
                icon={<CalendarCheck className="w-3.5 h-3.5" />}
                label="Today's Bookings"
                value={stats.todayBookings}
                bgLight="bg-amber-50"
                bgDark="dark:bg-amber-900/20"
                textColor="text-amber-700 dark:text-amber-400"
              />
              <StatCard
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                label="Pending"
                value={stats.pendingEscalations}
                bgLight="bg-rose-50"
                bgDark="dark:bg-rose-900/20"
                textColor="text-rose-700 dark:text-rose-400"
              />
            </div>
          </div>

          <Separator className="mx-5" />

          {/* --- Category Filter Tabs with Count Badges --- */}
          <div className="px-4 sm:px-5 py-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_TABS.map((tab) => {
                const TabIcon = tab.icon;
                const count = categoryCounts[tab.value];
                const isActive = activeFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveFilter(tab.value)}
                    className={cn(
                      'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <TabIcon className={cn('w-3 h-3', isActive && 'text-emerald-600 dark:text-emerald-400')} />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                          isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        )}
                      >
                        {count}
                      </span>
                    )}
                    {/* Active indicator emerald underline */}
                    {isActive && (
                      <motion.div
                        layoutId="notifTabIndicator"
                        className="absolute -bottom-1 left-2 right-2 h-0.5 bg-emerald-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- Notification List --- */}
          <div className="px-4 sm:px-5">
            <NotificationList
              notifications={filteredNotifications}
              isLoading={isLoading}
              activeFilter={activeFilter}
              onMarkRead={markOneRead}
              onToggleRead={toggleRead}
              onDismiss={dismissNotification}
              onAction={handleAction}
              relativeTime={relativeTime}
              dismissingIds={dismissingIds}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------- Sub-components ----------

function StatCard({
  icon,
  label,
  value,
  bgLight,
  bgDark,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgLight: string;
  bgDark: string;
  textColor: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-2.5 flex flex-col items-center gap-1 transition-colors',
        bgLight,
        bgDark
      )}
    >
      <div className={cn('flex items-center gap-1', textColor)}>{icon}</div>
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('text-lg font-bold leading-none', textColor)}
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function NotificationList({
  notifications,
  isLoading,
  activeFilter,
  onMarkRead,
  onToggleRead,
  onDismiss,
  onAction,
  relativeTime,
  dismissingIds,
}: {
  notifications: NotificationItem[];
  isLoading: boolean;
  activeFilter: CategoryFilter;
  onMarkRead: (n: NotificationItem) => void;
  onToggleRead: (n: NotificationItem, e: React.MouseEvent) => void;
  onDismiss: (n: NotificationItem, e: React.MouseEvent) => void;
  onAction: (action: string, n: NotificationItem, e: React.MouseEvent) => void;
  relativeTime: (d: string) => string;
  dismissingIds: Set<string>;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 px-1 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        {/* Bell icon with dashed border circle */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-4"
        >
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Bell className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1"
        >
          No notifications yet
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-xs text-muted-foreground"
        >
          {activeFilter === 'all'
            ? "You're all caught up!"
            : `No ${activeFilter} notifications to show.`}
        </motion.p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[calc(100vh-340px)] min-h-0">
      <div className="space-y-2 pb-4">
        <AnimatePresence initial={false}>
          {notifications.map((n, idx) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onMarkRead={onMarkRead}
              onToggleRead={onToggleRead}
              onDismiss={onDismiss}
              onAction={onAction}
              relativeTime={relativeTime}
              index={idx}
              isDismissing={dismissingIds.has(n.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}

function NotificationRow({
  notification: n,
  onMarkRead,
  onToggleRead,
  onDismiss,
  onAction,
  relativeTime,
  index,
  isDismissing,
}: {
  notification: NotificationItem;
  onMarkRead: (n: NotificationItem) => void;
  onToggleRead: (n: NotificationItem, e: React.MouseEvent) => void;
  onDismiss: (n: NotificationItem, e: React.MouseEvent) => void;
  onAction: (action: string, n: NotificationItem, e: React.MouseEvent) => void;
  relativeTime: (d: string) => string;
  index: number;
  isDismissing: boolean;
}) {
  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
  const IconComp = config.icon;

  // Determine if this notification has actions
  const hasActions = n.type === 'booking' || n.type === 'escalation';
  const isConfirmable = n.type === 'booking' && !n.isRead;
  const isDismissible = n.type === 'escalation' && !n.isRead;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={
        isDismissing
          ? { opacity: 0, x: 60, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }
          : { opacity: 1, y: 0, height: 'auto' }
      }
      exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        layout: { duration: 0.25 },
      }}
      onClick={() => onMarkRead(n)}
      className={cn(
        'group relative flex overflow-hidden rounded-xl cursor-pointer',
        'transition-all duration-200',
        'bg-white dark:bg-slate-900 border',
        !n.isRead
          ? 'border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md'
          : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700',
        'hover:bg-slate-50/50 dark:hover:bg-slate-800/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        isDismissing && 'pointer-events-none'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onMarkRead(n);
        }
      }}
      aria-label={`${n.isRead ? 'Read' : 'Unread'} notification: ${n.title}`}
    >
      {/* Color-coded left border */}
      <div
        className={cn(
          'w-1 flex-shrink-0 self-stretch rounded-l-xl',
          config.leftBorder,
          n.isRead && 'opacity-40'
        )}
      />

      <div className="flex-1 min-w-0 p-3 sm:p-3.5">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div
            className={cn(
              'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
              config.bg,
              config.darkBg,
              !n.isRead && 'ring-2 ring-offset-1 dark:ring-offset-slate-900',
              !n.isRead && n.type === 'booking' && 'ring-emerald-300 dark:ring-emerald-700',
              !n.isRead && n.type === 'escalation' && 'ring-amber-300 dark:ring-amber-700',
              !n.isRead && n.type === 'missed_call' && 'ring-rose-300 dark:ring-rose-700',
              !n.isRead && n.type === 'system' && 'ring-slate-300 dark:ring-slate-600',
              n.isRead && 'opacity-60'
            )}
          >
            <IconComp className={cn('w-4 h-4 sm:w-4.5 sm:h-4.5', config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Unread dot indicator */}
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5 animate-pulse" />
                )}
                <p
                  className={cn(
                    'text-sm truncate leading-snug',
                    n.isRead
                      ? 'text-slate-600 dark:text-slate-400 font-normal'
                      : 'text-slate-900 dark:text-white font-semibold'
                  )}
                >
                  {n.title}
                </p>
              </div>

              {/* Action buttons group */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Toggle read button */}
                <button
                  onClick={(e) => onToggleRead(n, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={n.isRead ? 'Mark as unread' : 'Mark as read'}
                  title={n.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {n.isRead ? (
                    <Mail className="w-3 h-3 text-slate-400" />
                  ) : (
                    <Check className="w-3 h-3 text-emerald-500" />
                  )}
                </button>

                {/* Dismiss button */}
                <button
                  onClick={(e) => onDismiss(n, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                </button>
              </div>
            </div>

            {/* Description - truncated to 2 lines */}
            <p
              className={cn(
                'text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed',
                n.isRead && 'opacity-70'
              )}
            >
              {n.message}
            </p>

            {/* Bottom row: badge + timestamp */}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0 h-4 rounded border',
                  config.badgeBg,
                  config.badgeText,
                  config.darkBadgeBg,
                  config.darkBadgeText,
                  config.border,
                  config.darkBorder
                )}
              >
                {config.label}
              </Badge>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {relativeTime(n.createdAt)}
              </span>
            </div>

            {/* Action Buttons for actionable notifications */}
            {hasActions && !n.isRead && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 mt-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {isConfirmable && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-3 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={(e) => onAction('confirm', n, e)}
                    >
                      <Check className="w-3 h-3" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-[11px] font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1"
                      onClick={(e) => onAction('view', n, e)}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                  </>
                )}
                {isDismissible && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-[11px] font-medium border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-1"
                      onClick={(e) => onAction('view', n, e)}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-[11px] font-medium border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 gap-1"
                      onClick={(e) => onAction('dismiss', n, e)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Dismiss
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
