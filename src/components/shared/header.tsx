'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Bell, Moon, Sun, Phone, X, Search,
  User, HelpCircle, Command, ChevronDown, LogOut, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const { adminPage, clientPage, isLiveCall, liveCallCaller, endLiveCall, showNotifications, setShowNotifications } = useAppStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const role = user?.role || 'client';
  const clinicId = user?.clinicId || '';

  // --- Connection Status Banner State ---
  const [geminiOffline, setGeminiOffline] = useState(false);
  const [vobizOffline, setVobizOffline] = useState(false);
  const [dismissedGemini, setDismissedGemini] = useState(false);
  const [dismissedVobiz, setDismissedVobiz] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const healthCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click-outside handler for profile dropdown
  // Uses 'click' (not 'mousedown') so that button onClick handlers fire first
  // during the bubbling phase, preventing race conditions with dropdown close.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [profileOpen]);

  // --- Service Health Monitoring ---
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const [geminiRes, vobizRes] = await Promise.all([
          fetch('/api/gemini?action=health', { signal: AbortSignal.timeout(5000) }).catch(() => null),
          fetch('/api/vobiz?action=health', { signal: AbortSignal.timeout(5000) }).catch(() => null),
        ]);

        const geminiUp = geminiRes && geminiRes.ok;
        const vobizUp = vobizRes && vobizRes.ok;

        // Check sessionStorage for dismissals
        const dismissedGeminiSession = sessionStorage.getItem('dismissed-gemini-offline');
        const dismissedVobizSession = sessionStorage.getItem('dismissed-vobiz-offline');

        if (!geminiUp) {
          setGeminiOffline(true);
          if (!dismissedGeminiSession) setDismissedGemini(false);
        } else {
          // Service came back - reset dismissal after 5 minutes
          if (dismissedGeminiSession) {
            const dismissedAt = parseInt(dismissedGeminiSession, 10);
            if (Date.now() - dismissedAt > 5 * 60 * 1000) {
              sessionStorage.removeItem('dismissed-gemini-offline');
              setDismissedGemini(false);
            }
          }
          setGeminiOffline(false);
        }

        if (!vobizUp) {
          setVobizOffline(true);
          if (!dismissedVobizSession) setDismissedVobiz(false);
        } else {
          if (dismissedVobizSession) {
            const dismissedAt = parseInt(dismissedVobizSession, 10);
            if (Date.now() - dismissedAt > 5 * 60 * 1000) {
              sessionStorage.removeItem('dismissed-vobiz-offline');
              setDismissedVobiz(false);
            }
          }
          setVobizOffline(false);
        }
      } catch {
        // Health check itself failed, assume services may be offline
      }
      setBannerVisible(true);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss handlers
  const dismissGeminiBanner = () => {
    setDismissedGemini(true);
    sessionStorage.setItem('dismissed-gemini-offline', Date.now().toString());
    // Auto-hide after 5 minutes
    healthCheckTimerRef.current = setTimeout(() => {
      setDismissedGemini(false);
      sessionStorage.removeItem('dismissed-gemini-offline');
    }, 5 * 60 * 1000);
  };

  const dismissVobizBanner = () => {
    setDismissedVobiz(true);
    sessionStorage.setItem('dismissed-vobiz-offline', Date.now().toString());
    healthCheckTimerRef.current = setTimeout(() => {
      setDismissedVobiz(false);
      sessionStorage.removeItem('dismissed-vobiz-offline');
    }, 5 * 60 * 1000);
  };

  // Fetch client notifications
  useEffect(() => {
    if (role !== 'client' || !clinicId) return;
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/client/notifications', {
          headers: { 'x-clinic-id': clinicId },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silently fail
      }
    };

    fetchNotifications();
    return () => { cancelled = true; };
  }, [role, clinicId]);

  // Fetch admin notifications
  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;

    const fetchAdminNotifications = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (res.ok && !cancelled) {
          const data = await res.json();
          setAdminNotifications(data.notifications || []);
          setAdminUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silently fail
      }
    };

    fetchAdminNotifications();
    return () => { cancelled = true; };
  }, [role]);

  const markAllRead = async () => {
    try {
      await fetch('/api/client/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': clinicId },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const markAllAdminRead = () => {
    setAdminNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setAdminUnreadCount(0);
  };

  const pageTitles: Record<string, string> = {
    // Admin pages
    overview: role === 'admin' ? 'Platform Overview' : 'Dashboard',
    clinics: 'Clinic Management',
    provisioning: 'SIP Provisioning',
    billing: 'Billing',
    analytics: role === 'admin' ? 'Analytics' : 'Analytics',
    'ai-performance': 'AI Insights',
    'live-calls': 'Live Calls',
    'agent-setup': 'Agent Setup',
    integrations: 'Integrations',
    notifications: 'Notifications',
    reports: 'Reports',
    'vobiz-guide': 'Vobiz Guide',
    'agent-analytics': 'Agent Analytics',
    // Client pages
    appointments: 'Appointments',
    schedule: 'Weekly Schedule',
    calls: 'Call Logs',
    settings: 'Settings',
    team: 'Team Members',
    'ai-chat': 'AI Chat',
    'agent-studio': 'Agent Studio',
    'doctor-portal': 'Doctor Portal',
    whatsapp: 'WhatsApp',
  };

  const currentPage = role === 'admin' ? adminPage : clientPage;
  const title = pageTitles[currentPage] || currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, ' ');

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const logout = useAuthStore((s) => s.logout);

  const handleNavigateSettings = useCallback(() => {
    if (role === 'admin') {
      useAppStore.getState().setAdminPage('overview');
    } else {
      useAppStore.getState().setClientPage('settings');
    }
    setProfileOpen(false);
  }, [role]);

  const handleThemeToggle = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    setProfileOpen(false);
  }, [resolvedTheme, setTheme]);

  const handleSignOut = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    logout();
    setProfileOpen(false);
  }, [logout]);

  const dropdownVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } },
  };

  const notifIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅';
      case 'escalation': return '🚨';
      case 'missed_call': return '📞';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const adminNotifIcon = (type: string) => {
    switch (type) {
      case 'system': return '🚀';
      case 'alert': return '⚠️';
      case 'billing': return '💰';
      default: return '🔔';
    }
  };

  const formatDistanceAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const adminNotifTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'alert': return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'billing': return 'bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/50 dark:border-slate-800/50 glass-card flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9 text-slate-500"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Page Title */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        {role === 'client' && user?.clinicName && (
          <Badge variant="secondary" className="hidden sm:inline-flex text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
            {user.clinicName}
          </Badge>
        )}
      </div>

      {/* Expandable Search Bar */}
      <div className="flex-1 flex justify-center max-w-md ml-auto lg:ml-0">
        <motion.div
          className={cn(
            'relative flex items-center rounded-lg border transition-all duration-300 overflow-hidden',
            searchFocused
              ? 'w-full border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 shadow-sm shadow-emerald-500/10'
              : searchQuery
                ? 'w-full border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60'
                : 'w-48 border-transparent bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Search className={cn(
            'w-4 h-4 flex-shrink-0 transition-colors duration-200',
            searchFocused ? 'text-emerald-500' : 'text-slate-400'
          )} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => { if (!searchQuery) setSearchFocused(false); }}
            className={cn(
              'flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'text-slate-900 dark:text-white',
              searchFocused || searchQuery ? 'px-3 py-2' : 'px-3 py-2'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
              className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        {/* Live Call Indicator (client only) */}
        <AnimatePresence>
          {isLiveCall && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1.5"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hidden sm:inline">
                Live: {liveCallCaller}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-emerald-600 hover:text-rose-600 hover:bg-rose-50"
                onClick={endLiveCall}
              >
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications (admin only) */}
        {role === 'admin' && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 relative"
              onClick={() => setShowAdminNotifications(!showAdminNotifications)}
            >
              <Bell className="w-4 h-4" />
              {adminUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-badge-pulse">
                  {adminUnreadCount > 9 ? '9+' : adminUnreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {showAdminNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-[360px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">System Notifications</h3>
                      {adminUnreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {adminUnreadCount}
                        </span>
                      )}
                    </div>
                    {adminUnreadCount > 0 && (
                      <button
                        onClick={markAllAdminRead}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    {adminNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {adminNotifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              'px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative',
                              !n.isRead && 'bg-emerald-50/30 dark:bg-emerald-900/10'
                            )}
                          >
                            {!n.isRead && (
                              <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r" />
                            )}
                            <div className="flex items-start gap-3">
                              <span className="text-base mt-0.5 flex-shrink-0">{adminNotifIcon(n.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</p>
                                  {!n.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={cn(
                                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                    adminNotifTypeColor(n.type)
                                  )}>
                                    {n.type.charAt(0).toUpperCase() + n.type.slice(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {formatDistanceAgo(n.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                      className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
                      onClick={() => setShowAdminNotifications(false)}
                    >
                      View All Notifications →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Notifications (client only) */}
        {role === 'client' && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-badge-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              'px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer',
                              !n.isRead && 'bg-emerald-50/50 dark:bg-emerald-900/10'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-sm mt-0.5">{notifIcon(n.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                  {format(new Date(n.createdAt), 'dd MMM yyyy, h:mm a')}
                                </p>
                              </div>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={cn(
              'flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 transition-all duration-200',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              profileOpen && 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200',
              profileOpen && 'rotate-180'
            )} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50"
              >
                {/* User Profile Section */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {user?.email || 'user@voiceai.in'}
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'mt-1 text-[10px] font-medium',
                          role === 'admin'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        )}
                      >
                        {role === 'admin' ? 'Admin' : 'Clinic Staff'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-700" />

                {/* Menu Items */}
                <div className="py-1.5">
                  <button
                    onClick={handleNavigateSettings}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    onClick={handleThemeToggle}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200"
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                    <span className="flex-1 text-left">Theme Toggle</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  <button
                    onClick={() => { setProfileOpen(false); useAppStore.getState().setHelpCenterOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Support</span>
                    <kbd className="ml-auto inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Ctrl+H
                    </kbd>
                  </button>

                  <button
                    onClick={() => { setProfileOpen(false); useAppStore.getState().setCommandPaletteOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200"
                  >
                    <Command className="w-4 h-4" />
                    <span className="flex-1 text-left">Keyboard Shortcuts</span>
                    <div className="flex items-center gap-1">
                      <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Ctrl+K
                      </kbd>
                      <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Ctrl+N
                      </kbd>
                    </div>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-700" />

                {/* Sign Out */}
                <div className="py-1.5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </header>
      {/* Connection Status Banner */}
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-center gap-4 px-4 py-2">
                {geminiOffline && !dismissedGemini && (
                  <div className="flex items-center gap-2 text-sm">
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300 font-medium">
                      Gemini AI service is offline. AI features may be limited.
                    </span>
                    <button
                      onClick={dismissGeminiBanner}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {vobizOffline && !dismissedVobiz && (
                  <div className="flex items-center gap-2 text-sm">
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300 font-medium">
                      SIP service is offline. Call features may be limited.
                    </span>
                    <button
                      onClick={dismissVobizBanner}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
