'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLiveCalls } from '@/hooks/use-live-calls';

import LoginPage from '@/components/auth/login-page';
import Sidebar from '@/components/shared/sidebar';
import Header from '@/components/shared/header';
import CommandPalette from '@/components/shared/command-palette';
import HelpCenter from '@/components/shared/help-center';
import EnhancedOnboarding from '@/components/client/enhanced-onboarding';
import FeedbackWidget from '@/components/shared/feedback-widget';

import AdminOverview from '@/components/admin/admin-overview';
import AdminClinics from '@/components/admin/admin-clinics';
import AdminProvisioning from '@/components/admin/admin-provisioning';
import AdminBilling from '@/components/admin/admin-billing';
import AdminAnalytics from '@/components/admin/admin-analytics';
import AdminAgentSetup from '@/components/admin/admin-agent-setup';
import AIPerformance from '@/components/admin/ai-performance';
import IntegrationSettings from '@/components/admin/integration-settings';
import LiveCallMonitor from '@/components/admin/live-call-monitor';
import CallCenterDashboard from '@/components/admin/call-center';
import NotificationCenter from '@/components/admin/notification-center';
import AdminReports from '@/components/admin/reports';
import VobizGuide from '@/components/admin/vobiz-guide';
import AgentAnalyticsDashboard from '@/components/admin/agent-analytics';
import VobizNumbers from '@/components/admin/vobiz-numbers';

import ClientOverview from '@/components/client/client-overview';
import ClientAppointments from '@/components/client/client-appointments';
import ClientCalls from '@/components/client/client-calls';
import ClientSettings from '@/components/client/client-settings';
import AIChatAssistant from '@/components/client/ai-chat-assistant';
import BookingAssistant from '@/components/client/booking-assistant';
import TeamMembers from '@/components/client/team-members';
import ClientAnalytics from '@/components/client/client-analytics';
import WeeklySchedule from '@/components/client/weekly-schedule';
import DoctorPortal from '@/components/client/doctor-portal';
import WhatsAppCenter from '@/components/client/whatsapp-center';
import AgentStudio from '@/components/client/agent-studio';
import NotificationsWidget from '@/components/client/notifications-widget';

import {
  Bot,
  ExternalLink,
  LayoutDashboard,
  Building2,
  Server,
  CreditCard,
  BarChart3,
  Calendar,
  CalendarDays,
  Phone,
  Settings,
  RefreshCw,
  FileText,
  LifeBuoy,
  Activity,
  Brain,
  Users,
  MessageSquare,
  PhoneCall,
  Bell,
  Stethoscope,
  FileBarChart,
  MessageCircle,
  Sparkles,
  BookOpen,
  PhoneForwarded,
  Headphones,
  MessageCircleHeart,
} from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/* ============================================================
   Enhanced Loading Skeleton
   ============================================================ */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Bot icon with emerald glow */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center loading-glow">
            <Bot className="w-8 h-8 text-white" />
          </div>
          {/* Outer pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Typing text */}
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading VoiceAI</span>
          <span className="flex items-center gap-0.5 ml-0.5">
            <span className="loading-dot w-1 h-1 rounded-full bg-emerald-500" />
            <span className="loading-dot w-1 h-1 rounded-full bg-emerald-500" />
            <span className="loading-dot w-1 h-1 rounded-full bg-emerald-500" />
          </span>
        </motion.div>

        {/* Skeleton bars */}
        <motion.div
          className="flex flex-col gap-3 w-64"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="animate-shimmer-skeleton h-3 rounded-md w-full" />
          <div className="animate-shimmer-skeleton h-3 rounded-md w-4/5" />
          <div className="animate-shimmer-skeleton h-3 rounded-md w-3/5" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   Enhanced Footer Component
   ============================================================ */
const apiStatusItems = [
  { label: 'API Server', status: 'Operational', uptime: '99.98%' },
  { label: 'Gemini AI', status: 'Operational', uptime: '99.95%' },
  { label: 'SIP Trunk', status: 'Operational', uptime: '99.92%' },
];

const footerLinks = [
  { label: 'Documentation', icon: FileText },
  { label: 'Support', icon: LifeBuoy },
  { label: 'Status', icon: Activity },
];

function EnhancedFooter({ currentTime }: { currentTime: string }) {
  return (
    <footer className="hidden lg:block mt-auto bg-white dark:bg-slate-900 relative">
      {/* Animated gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] footer-line-pulse"
        style={{
          background: 'linear-gradient(90deg, #10b981, #14b8a6, #0d9488, #14b8a6, #10b981)',
          backgroundSize: '200% 100%',
          animation: 'gradient-shift 4s ease infinite, footer-line-pulse 3s ease-in-out infinite',
        }}
      />

      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Copyright + version + icon */}
          <div className="flex items-center gap-3 text-xs">
            {/* VoiceAI icon */}
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col">
              <p className="text-slate-500 dark:text-slate-400">
                &copy; 2025 VoiceAI
              </p>
              <span className="font-mono text-slate-400 dark:text-slate-500">v1.2.0</span>
            </div>
          </div>

          {/* Center Section: API Status strip */}
          <div className="flex items-center gap-2">
            {apiStatusItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5"
              >
                {/* Green dot with pulse */}
                <span className="relative flex h-2 w-2">
                  <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {item.label}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {item.status}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {item.uptime}
                </span>
              </div>
            ))}
          </div>

          {/* Right Section: Links + Last sync */}
          <div className="flex items-center gap-4">
            {/* Footer links */}
            <div className="flex items-center gap-1">
              {footerLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200 group"
                  >
                    <Icon className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span className="hidden xl:inline">{link.label}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <span className="text-slate-200 dark:text-slate-700">|</span>

            {/* Last sync */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <RefreshCw className="w-3 h-3 text-emerald-500 opacity-70" />
              <span>Last sync: just now</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   Main Page Component
   ============================================================ */
export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { adminPage, clientPage, sidebarOpen, setSidebarOpen } = useAppStore();
  const isMobile = useIsMobile();
  const [authReady, setAuthReady] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const [hapticIndex, setHapticIndex] = useState<string | null>(null);
  const [bookingBotOpen, setBookingBotOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // WebSocket live call simulation (client only)
  useLiveCalls();

  // Scroll to top on page/tab change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [adminPage, clientPage]);

  useEffect(() => {
    // Small delay to let zustand rehydrate from localStorage
    const timer = setTimeout(() => setAuthReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl+N / Cmd+N: Toggle notifications
      if (ctrlOrMeta && e.key === 'n') {
        e.preventDefault();
        const current = useAppStore.getState().showNotifications;
        useAppStore.getState().setShowNotifications(!current);
      }

      // Escape: Close any open panels/dropdowns
      if (e.key === 'Escape') {
        const state = useAppStore.getState();
        if (state.commandPaletteOpen) {
          state.setCommandPaletteOpen(false);
        } else if (state.showNotifications) {
          state.setShowNotifications(false);
        } else if (state.sidebarOpen) {
          // Only close sidebar on mobile
          state.setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update time every second (IST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istTime = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const istDate = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setCurrentTime(`${istDate} • ${istTime} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Loading check for persisted auth state
  if (!authReady || isLoading) {
    return <LoadingSkeleton />;
  }

  // Show login if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage onLogin={() => {}} />;
  }

  const role = user.role;
  const currentPage = role === 'admin' ? adminPage : clientPage;
  const progressKey = `${role}-${currentPage}`;

  const renderPage = () => {
    if (role === 'admin') {
      switch (adminPage) {
        case 'overview': return <AdminOverview />;
        case 'clinics': return <AdminClinics />;
        case 'provisioning': return <AdminProvisioning />;
        case 'billing': return <AdminBilling />;
        case 'analytics': return <AdminAnalytics />;
        case 'agent-setup': return <AdminAgentSetup />;
        case 'ai-performance': return <AIPerformance />;
        case 'live-calls': return <LiveCallMonitor />;
        case 'call-center': return <CallCenterDashboard />;
        case 'integrations': return <IntegrationSettings />;
        case 'notifications': return <NotificationCenter />;
        case 'reports': return <AdminReports />;
        case 'vobiz-guide': return <VobizGuide />;
        case 'vobiz-numbers': return <VobizNumbers />;
        case 'agent-analytics': return <AgentAnalyticsDashboard />;
        default: return <AdminOverview />;
      }
    } else {
      switch (clientPage) {
        case 'overview': return <ClientOverview />;
        case 'appointments': return <ClientAppointments />;
        case 'schedule': return <WeeklySchedule />;
        case 'calls': return <ClientCalls />;
        case 'settings': return <ClientSettings />;
        case 'ai-chat': return <AIChatAssistant />;
        case 'agent-studio': return <AgentStudio />;
        case 'team': return <TeamMembers />;
        case 'analytics': return <ClientAnalytics />;
        case 'doctor-portal': return <DoctorPortal />;
        case 'whatsapp': return <WhatsAppCenter />;
        default: return <ClientOverview />;
      }
    }
  };

  // Mobile bottom nav items
  const adminMobileNav = [
    { id: 'overview' as const, label: 'Home', icon: LayoutDashboard },
    { id: 'clinics' as const, label: 'Clinics', icon: Building2 },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
    { id: 'ai-performance' as const, label: 'AI', icon: Brain },
    { id: 'live-calls' as const, label: 'Calls', icon: PhoneCall },
    { id: 'call-center' as const, label: 'Center', icon: Headphones },
    { id: 'notifications' as const, label: 'Alerts', icon: Bell },
    { id: 'reports' as const, label: 'Reports', icon: FileBarChart },
    { id: 'vobiz-guide' as const, label: 'Vobiz', icon: BookOpen },
    { id: 'vobiz-numbers' as const, label: 'Numbers', icon: PhoneForwarded },
    { id: 'agent-analytics' as const, label: 'Agents', icon: Activity },
  ];
  const clientMobileNav = [
    { id: 'overview' as const, label: 'Home', icon: LayoutDashboard },
    { id: 'ai-chat' as const, label: 'AI Chat', icon: MessageSquare },
    { id: 'agent-studio' as const, label: 'Studio', icon: Sparkles },
    { id: 'appointments' as const, label: 'Appts', icon: Calendar },
    { id: 'schedule' as const, label: 'Schedule', icon: CalendarDays },
    { id: 'calls' as const, label: 'Calls', icon: Phone },
    { id: 'analytics' as const, label: 'Stats', icon: BarChart3 },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'doctor-portal' as const, label: 'Doctor', icon: Stethoscope },
    { id: 'whatsapp' as const, label: 'WA', icon: MessageCircle },
  ];
  const mobileNav = role === 'admin' ? adminMobileNav : clientMobileNav;
  const setCurrentPage = role === 'admin'
    ? (p: string) => {
        useAppStore.getState().setAdminPage(p as 'overview' | 'clinics' | 'provisioning' | 'billing' | 'analytics' | 'agent-setup' | 'ai-performance' | 'live-calls' | 'notifications' | 'reports' | 'integrations' | 'vobiz-guide' | 'vobiz-numbers' | 'agent-analytics' | 'call-center');
        setHapticIndex(p);
        setTimeout(() => setHapticIndex(null), 300);
      }
    : (p: string) => {
        useAppStore.getState().setClientPage(p as 'overview' | 'appointments' | 'calls' | 'settings' | 'team' | 'analytics' | 'schedule' | 'ai-chat' | 'agent-studio' | 'doctor-portal' | 'whatsapp');
        setHapticIndex(p);
        setTimeout(() => setHapticIndex(null), 300);
      };

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-slate-950">
      {/* Page Transition Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[2px]">
        <motion.div
          key={`${role}-${currentPage}`}
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        collapsed={isMobile ? !sidebarOpen : false}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main ref={mainRef} className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${currentPage}`}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Enhanced Footer - Desktop only */}
        <EnhancedFooter currentTime={currentTime} />

        {/* Compact Footer - Mobile only (above bottom nav) */}
        <footer className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 -mb-16 relative z-40">
          {/* Animated gradient top border for mobile too */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px] footer-line-pulse"
            style={{
              background: 'linear-gradient(90deg, #10b981, #14b8a6, #0d9488, #14b8a6, #10b981)',
              backgroundSize: '200% 100%',
              animation: 'gradient-shift 4s ease infinite, footer-line-pulse 3s ease-in-out infinite',
            }}
          />
          {/* Row 1: Copyright + Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Bot className="w-2.5 h-2.5 text-white" />
              </div>
              <span>&copy; 2025 VoiceAI</span>
              <span className="font-mono text-slate-300 dark:text-slate-600">v1.2.0</span>
            </div>
            {/* Compact status indicators */}
            <div className="flex items-center gap-1.5">
              {apiStatusItems.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* Booking Assistant FAB - client role only */}
      {role === 'client' && (
        <>
          <motion.div
            className="fixed bottom-24 lg:bottom-8 right-6 z-40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <motion.button
              onClick={() => setBookingBotOpen(true)}
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:shadow-emerald-500/50 transition-shadow duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
            >
              <MessageCircleHeart className="w-6 h-6" />
              {/* Pulse ring */}
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-emerald-400/50"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Notification dot */}
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-950 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">1</span>
              </span>
            </motion.button>
            {/* Tooltip */}
            <motion.div
              className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.3 }}
            >
              Booking Bot ✨
              <span className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
            </motion.div>
          </motion.div>

          <BookingAssistant
            open={bookingBotOpen}
            onOpenChange={setBookingBotOpen}
          />
        </>
      )}

      {/* Command Palette (global) */}
      <CommandPalette />

      {/* Help Center (global) */}
      <HelpCenter />

      {/* Enhanced Onboarding - only for client role */}
      {role === 'client' && <EnhancedOnboarding />}

      {/* Feedback Widget - only for client role */}
      {role === 'client' && <FeedbackWidget />}

      {/* Client Notification Widget - floating panel */}
      {role === 'client' && <NotificationsWidget />}

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 safe-area-pb">
        <nav className="flex items-center justify-around px-2 h-16">
          {mobileNav.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            const isHaptic = hapticIndex === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                animate={isHaptic ? { scale: [1, 0.85, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
              >
                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -top-px left-3 right-3 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <div className={`relative transition-colors duration-200 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div
                      className="absolute -inset-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 -z-10"
                      layoutId="mobileNavBg"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {/* Notification dot badge on alerts icon */}
                  {item.id === 'notifications' && (
                    <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 ai-badge-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
