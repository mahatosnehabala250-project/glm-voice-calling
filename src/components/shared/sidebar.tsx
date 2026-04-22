'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Server, CreditCard, BarChart3, Brain, PhoneCall,
  LayoutDashboard as ClientDash, Calendar, Phone, Settings, Users,
  Bot, LogOut, X, ChevronLeft, CalendarDays, MessageSquare, Plug, Sparkles,
  Bell, Stethoscope, FileBarChart, MessageCircle, BookOpen, Activity, PhoneForwarded,
  Headphones
} from 'lucide-react';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore, type AdminPage, type ClientPage } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ─── Types for sectioned navigation ────────────────────────────────────────────

interface NavItem {
  id: AdminPage | ClientPage;
  label: string;
  icon: React.ElementType;
  badge?: 'dot' | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── Badge config ───────────────────────────────────────────────────────────────

const NOTIFICATION_BADGES: Record<string, 'dot' | number> = {
  'notifications': 3,
  'ai-chat': 1,
};

// ─── Admin navigation sections ─────────────────────────────────────────────────

const adminSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'clinics', label: 'Clinics', icon: Building2 },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { id: 'live-calls', label: 'Live Calls', icon: PhoneCall },
      { id: 'call-center', label: 'Call Center', icon: Headphones },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'ai-performance', label: 'AI Insights', icon: Brain },
      { id: 'agent-analytics', label: 'Agent Analytics', icon: Activity },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { id: 'agent-setup', label: 'Agent Setup', icon: Bot },
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'provisioning', label: 'Provisioning', icon: Server },
      { id: 'vobiz-numbers', label: 'Phone Numbers', icon: PhoneForwarded },
      { id: 'vobiz-guide', label: 'Vobiz Guide', icon: BookOpen },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'billing', label: 'Billing', icon: CreditCard },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: NOTIFICATION_BADGES['notifications'] },
    ],
  },
];

// ─── Client navigation sections ────────────────────────────────────────────────

const clientSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'overview', label: 'Overview', icon: ClientDash },
      { id: 'ai-chat', label: 'AI Chat', icon: MessageSquare, badge: NOTIFICATION_BADGES['ai-chat'] },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'schedule', label: 'Schedule', icon: CalendarDays },
      { id: 'calls', label: 'Call Logs', icon: Phone },
    ],
  },
  {
    title: 'AGENT',
    items: [
      { id: 'agent-studio', label: 'Agent Studio', icon: Sparkles },
    ],
  },
  {
    title: 'INSIGHTS',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'team', label: 'Team', icon: Users },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'doctor-portal', label: 'Doctor Portal', icon: Stethoscope },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    ],
  },
];

// ─── Animation variants ────────────────────────────────────────────────────────

const sectionHeaderVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04 + 0.1, duration: 0.3, ease: 'easeOut' },
  }),
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03 + 0.15, duration: 0.25, ease: 'easeOut' },
  }),
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { adminPage, setAdminPage, clientPage, setClientPage, wsConnected } = useAppStore();
  const role = user?.role || 'client';

  const sections = role === 'admin' ? adminSections : clientSections;
  const currentPage = role === 'admin' ? adminPage : clientPage;
  const setPage = role === 'admin'
    ? (p: string) => setAdminPage(p as AdminPage)
    : (p: string) => setClientPage(p as ClientPage);

  const handleLogout = () => {
    logout();
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Pre-compute stagger indices for each section header and nav item
  const staggerMap = useMemo(() => {
    const map: { sectionIdx: number; itemIndices: number[] }[] = [];
    let idx = 0;
    for (const section of sections) {
      map.push({ sectionIdx: idx, itemIndices: section.items.map((_, i) => idx + 1 + i) });
      idx += section.items.length + 1;
    }
    return map;
  }, [sections]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full glass-card border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shadow-lg lg:shadow-none',
          'lg:relative lg:translate-x-0',
        )}
        animate={{ x: collapsed ? -280 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between p-4 h-16 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2.5">
            {/* Logo icon with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-emerald-500/30 blur-md" />
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                Voice<span className="text-emerald-600">AI</span>
              </span>
              {/* PRO badge */}
              <span className="text-[9px] font-bold tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                PRO
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={onToggle}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={onToggle}
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
          {/* LIVE indicator when WebSocket connected (client only) */}
          {role === 'client' && wsConnected && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide">LIVE</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-500 ml-auto">Call Stream</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="nav-content"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                {sections.map((section, sIdx) => {
                  const stagger = staggerMap[sIdx];

                  return (
                    <div key={section.title} className={cn(sIdx > 0 && 'mt-1')}>
                      {/* Separator line */}
                      {sIdx > 0 && (
                        <div className="border-t border-slate-100/60 dark:border-slate-800/50 mx-2" />
                      )}

                      {/* Section header */}
                      <motion.div
                        custom={stagger.sectionIdx}
                        variants={sectionHeaderVariants}
                        className={cn(
                          'px-3 pt-3 pb-1',
                          sIdx === 0 && 'pt-1',
                        )}
                      >
                        <span className="text-[10px] font-semibold tracking-widest text-slate-400 dark:text-slate-600 select-none">
                          {section.title}
                        </span>
                      </motion.div>

                      {/* Nav items in this section */}
                      <div className="space-y-0.5">
                        {section.items.map((item, iIdx) => {
                          const itemGlobalIdx = stagger.itemIndices[iIdx];
                          const isActive = currentPage === item.id;
                          const Icon = item.icon;
                          const badge = item.badge ?? NOTIFICATION_BADGES[item.id];

                          return (
                            <motion.button
                              key={item.id}
                              custom={itemGlobalIdx}
                              variants={navItemVariants}
                              onClick={() => {
                                setPage(item.id);
                                if (window.innerWidth < 1024) onToggle();
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm sidebar-active-border'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white hover:translate-x-1'
                              )}
                            >
                              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-emerald-600 dark:text-emerald-400')} />
                              <span className="flex-1 text-left">{item.label}</span>

                              {/* Badge: numeric count */}
                              {badge && typeof badge === 'number' && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-emerald-500 text-white leading-none">
                                  {badge}
                                </span>
                              )}

                              {/* Badge: dot indicator */}
                              {badge === 'dot' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 glow-emerald flex-shrink-0" />
                              )}

                              {/* Active dot indicator */}
                              {isActive && !badge && (
                                <div className="ml-auto flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-emerald" />
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* User info & Logout */}
        <div className="border-t border-slate-200/50 dark:border-slate-800/50 p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Separator className="my-2" />
          <div className="relative">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
            {/* Version indicator */}
            <span className="absolute bottom-1 right-1 text-[9px] font-medium text-slate-300 dark:text-slate-700 select-none">
              v1.2.0
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
