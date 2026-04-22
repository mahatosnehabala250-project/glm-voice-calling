'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// BROWSER-SIDE SUPABASE CLIENT
// ============================================
// This client uses the anon key and respects RLS policies.
// Used in client components for real-time subscriptions, auth, etc.

let _browserClient: SupabaseClient | null = null;

/**
 * Get the browser-side Supabase client singleton
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) return null;

  if (!_browserClient) {
    _browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return _browserClient;
}

/**
 * Check if Supabase is available in the browser
 */
export function isSupabaseAvailable(): boolean {
  return !!getSupabaseBrowser();
}
