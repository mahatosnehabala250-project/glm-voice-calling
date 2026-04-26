'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import LandingPage from '@/components/landing/landing-page';
import LoginPage from '@/components/auth/login-page';
import Sidebar from '@/components/shared/sidebar';
import Header from '@/components/shared/header';

// Admin components
import AdminOverview from '@/components/admin/admin-overview';
import AdminClinics from '@/components/admin/admin-clinics';
import AdminProvisioning from '@/components/admin/admin-provisioning';
import AdminBilling from '@/components/admin/admin-billing';
import AdminAnalytics from '@/components/admin/admin-analytics';

// Client components
import ClientOverview from '@/components/client/client-overview';
import ClientAppointments from '@/components/client/client-appointments';
import ClientCalls from '@/components/client/client-calls';
import ClientSettings from '@/components/client/client-settings';
import ClientTeam from '@/components/client/client-team';
import ClientAnalytics from '@/components/client/client-analytics';
import AppointmentCalendar from '@/components/client/appointment-calendar';
import AiChatAssistant from '@/components/client/ai-chat-assistant';
import AgentStudio from '@/components/client/agent-studio';
import DoctorPortal from '@/components/client/doctor-portal';
import ClientWhatsApp from '@/components/client/whatsapp-center';
import VobizCallSetup from '@/components/client/vobiz-call-setup';
import CallFlowExplorer from '@/components/client/call-flow-explorer';
import VoiceTest from '@/components/client/voice-test';
import CampaignManager from '@/components/client/campaign-manager';
import ByokSettings from '@/components/client/byok-settings';
import PromptLibrary from '@/components/client/prompt-library';
import ContactMemoryPanel from '@/components/client/contact-memory-panel';
import LiveLogsViewer from '@/components/client/live-logs';

import { cn } from '@/lib/utils';

// ─── Footer Component ─────────────────────────────────────────────────────────

function Footer() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="px-4 py-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>API</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Gemini</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>SIP</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>{time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span className="font-mono">{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          <span className="text-slate-300 dark:text-slate-600">v1.2.0</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Admin Page Router ─────────────────────────────────────────────────────────

function AdminDashboard() {
  const { adminPage } = useAppStore();

  const renderPage = () => {
    switch (adminPage) {
      case 'overview': return <AdminOverview />;
      case 'clinics': return <AdminClinics />;
      case 'provisioning': return <AdminProvisioning />;
      case 'billing': return <AdminBilling />;
      case 'analytics': return <AdminAnalytics />;
      default: return <AdminOverview />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={adminPage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Client Page Router ────────────────────────────────────────────────────────

function ClientDashboard() {
  const { clientPage } = useAppStore();

  const renderPage = () => {
    switch (clientPage) {
      case 'overview': return <ClientOverview />;
      case 'appointments': return <ClientAppointments />;
      case 'calls': return <ClientCalls />;
      case 'settings': return <ClientSettings />;
      case 'team': return <ClientTeam />;
      case 'analytics': return <ClientAnalytics />;
      case 'schedule': return <AppointmentCalendar />;
      case 'ai-chat': return <AiChatAssistant />;
      case 'agent-studio': return <AgentStudio />;
      case 'doctor-portal': return <DoctorPortal />;
      case 'whatsapp': return <ClientWhatsApp />;
      case 'call-setup': return <VobizCallSetup />;
      case 'call-flow': return <CallFlowExplorer />;
      case 'voice-test': return <VoiceTest />;
      case 'campaigns': return <CampaignManager />;
      case 'byok': return <ByokSettings />;
      case 'prompts': return <PromptLibrary />;
      case 'contact-memory': return <ContactMemoryPanel />;
      case 'live-logs': return <LiveLogsViewer />;
      default: return <ClientOverview />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={clientPage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [hydrated, setHydrated] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
        </div>
      </div>
    );
  }

  // Show landing page
  if (showLanding && !isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LandingPage onGetStarted={() => setShowLanding(false)} />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show login page
  if (!isAuthenticated || !user) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LoginPage onLogin={() => {}} />
        </motion.div>
      </AnimatePresence>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-300',
        sidebarOpen ? 'lg:ml-0' : 'lg:ml-0',
      )}>
        {/* Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {isAdmin ? <AdminDashboard /> : <ClientDashboard />}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
