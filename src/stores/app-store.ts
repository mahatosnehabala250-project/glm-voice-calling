import { create } from 'zustand';

export type AdminPage = 'overview' | 'clinics' | 'provisioning' | 'billing' | 'analytics' | 'agent-setup' | 'ai-performance' | 'integrations' | 'live-calls' | 'notifications' | 'reports' | 'vobiz-guide' | 'vobiz-numbers' | 'agent-analytics' | 'call-center' | 'integration';
export type ClientPage = 'overview' | 'appointments' | 'calls' | 'settings' | 'team' | 'analytics' | 'schedule' | 'ai-chat' | 'agent-studio' | 'doctor-portal' | 'whatsapp' | 'call-setup' | 'call-flow';

interface AppState {
  // Admin navigation
  adminPage: AdminPage;
  setAdminPage: (page: AdminPage) => void;

  // Client navigation
  clientPage: ClientPage;
  setClientPage: (page: ClientPage) => void;

  // Global UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Notifications panel
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Help center
  helpCenterOpen: boolean;
  setHelpCenterOpen: (open: boolean) => void;
  toggleHelpCenter: () => void;

  // Live call simulation
  isLiveCall: boolean;
  liveCallCaller?: string;
  startLiveCall: (caller: string) => void;
  endLiveCall: () => void;

  // WebSocket connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  adminPage: 'overview',
  setAdminPage: (page) => set({ adminPage: page }),

  clientPage: 'overview',
  setClientPage: (page) => set({ clientPage: page }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  helpCenterOpen: false,
  setHelpCenterOpen: (open) => set({ helpCenterOpen: open }),
  toggleHelpCenter: () => set((s) => ({ helpCenterOpen: !s.helpCenterOpen })),

  isLiveCall: false,
  liveCallCaller: undefined,
  startLiveCall: (caller) => set({ isLiveCall: true, liveCallCaller: caller }),
  endLiveCall: () => set({ isLiveCall: false, liveCallCaller: undefined }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
