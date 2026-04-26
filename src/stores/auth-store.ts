import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  clinicId?: string;
  clinicName?: string;
  phone?: string;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'voiceai-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      // Validate persisted state on hydration:
      // If isAuthenticated is true but user is null/missing, the session is stale — reset it.
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.isAuthenticated && !state.user) {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
          }
          // Also validate that the user object has required fields
          if (state.isAuthenticated && state.user) {
            if (!state.user.id || !state.user.email || !state.user.name || !state.user.role) {
              state.user = null;
              state.isAuthenticated = false;
              state.error = null;
            }
          }
        }
      },
    }
  )
);
