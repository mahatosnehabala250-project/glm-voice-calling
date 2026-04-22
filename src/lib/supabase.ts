import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// SERVER-SIDE SUPABASE CLIENT
// ============================================
// This client uses the service role key for admin operations
// (bypasses Row Level Security). Use only in API routes.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _serverClient: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Get the server-side Supabase client (uses service role key)
 * For admin operations that bypass RLS
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  if (!_adminClient) {
    _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _adminClient;
}

/**
 * Get the server-side Supabase client (uses anon key)
 * Respects Row Level Security policies
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_serverClient) {
    _serverClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _serverClient;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  details?: {
    url: string;
    hasServiceKey: boolean;
    hasAnonKey: boolean;
  };
}> {
  const url = supabaseUrl;
  const hasServiceKey = !!supabaseServiceKey;
  const hasAnonKey = !!supabaseAnonKey;

  if (!url || (!hasServiceKey && !hasAnonKey)) {
    return {
      connected: false,
      error: 'Supabase URL and at least one key (service role or anon) are required',
      details: { url, hasServiceKey, hasAnonKey },
    };
  }

  try {
    const client = getSupabaseAdmin() || getSupabaseServer();
    if (!client) {
      return {
        connected: false,
        error: 'Failed to create Supabase client',
        details: { url, hasServiceKey, hasAnonKey },
      };
    }

    // Try a simple query to test connection
    const { error } = await client.from('clinics').select('id').limit(1);
    if (error) {
      // Table might not exist yet - that's ok for initial setup
      if (error.code === '42P01') {
        return {
          connected: true,
          details: { url: maskUrl(url), hasServiceKey, hasAnonKey },
        };
      }
      return {
        connected: false,
        error: error.message,
        details: { url: maskUrl(url), hasServiceKey, hasAnonKey },
      };
    }

    return {
      connected: true,
      details: { url: maskUrl(url), hasServiceKey, hasAnonKey },
    };
  } catch (err) {
    return {
      connected: false,
      error: (err as Error).message,
      details: { url: maskUrl(url), hasServiceKey, hasAnonKey },
    };
  }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return '***';
  }
}

// ============================================
// SUPABASE TABLE TYPE DEFINITIONS
// ============================================
// These types mirror the Prisma schema for type-safe Supabase queries

export interface SupabaseUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  clinic_id: string | null;
  phone: string | null;
  avatar: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClinic {
  id: string;
  name: string;
  doctor_name: string;
  slug: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  sip_number: string | null;
  sip_id: string | null;
  escalation_number: string | null;
  business_hours: string;
  business_days: string;
  services: string;
  consultation_fee: string | null;
  status: string;
  plan_type: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  whatsapp_number: string | null;
  ai_system_prompt: string | null;
  greeting_message: string | null;
  language: string;
  total_calls: number;
  total_bookings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCall {
  id: string;
  clinic_id: string;
  call_sid: string | null;
  caller_phone: string;
  caller_name: string | null;
  caller_location: string | null;
  status: string;
  direction: string;
  duration: number;
  started_at: string;
  ended_at: string | null;
  answered_at: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  tags: string | null;
  intent: string | null;
  transfer_reason: string | null;
  transferred_to: string | null;
  audio_url: string | null;
  appointment_id: string | null;
  created_at: string;
}

export interface SupabaseAppointment {
  id: string;
  clinic_id: string;
  call_id: string | null;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  date: string;
  time: string;
  reason: string | null;
  notes: string | null;
  status: string;
  booked_via: string;
  consultation_fee: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseNotification {
  id: string;
  clinic_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: string | null;
  created_at: string;
}

export interface SupabaseAnalyticsSnapshot {
  id: string;
  metric_type: string;
  metric_date: string;
  metric_value: number;
  clinic_id: string | null;
  created_at: string;
}

export interface SupabaseAgentConfig {
  id: string;
  clinic_id: string;
  agent_name: string;
  agent_persona: string;
  greeting_message: string;
  farewell_message: string;
  language: string;
  voice_provider: string;
  voice_id: string | null;
  voice_name: string | null;
  voice_gender: string;
  voice_speed: string;
  speaking_rate: number | null;
  max_call_duration: number;
  transfer_on_fail: boolean;
  transfer_number: string | null;
  escalation_prompt: string;
  auto_book_slot: boolean;
  booking_slot_duration: number;
  booking_lead_days: number;
  buffer_minutes: number;
  max_bookings_per_day: number;
  auto_confirm: boolean;
  require_confirmation: boolean;
  faq_json: string | null;
  services_json: string | null;
  clinic_description: string | null;
  specializations: string | null;
  special_notes: string | null;
  escalation_enabled: boolean;
  escalation_after: number;
  escalation_keywords: string | null;
  escalation_number: string | null;
  sentiment_threshold: string;
  ask_for_feedback: boolean;
  collect_patient_info: boolean;
  vobiz_phone_number: string | null;
  vobiz_trunk_id: string | null;
  vobiz_trunk_domain: string | null;
  vobiz_credential_id: string | null;
  vobiz_credential_user: string | null;
  vobiz_app_id: string | null;
  vobiz_app_url: string | null;
  webhook_url: string | null;
  answer_url: string | null;
  hangup_url: string | null;
  fallback_url: string | null;
  webhook_secret: string | null;
  callback_events: string | null;
  calendar_provider: string;
  calendar_api_key: string | null;
  calendar_webhook_url: string | null;
  calendar_id: string | null;
  calendar_sync_enabled: boolean;
  agent_status: string;
  is_active: boolean;
  is_configured: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  test_notes: string | null;
  total_agent_calls: number;
  total_agent_bookings: number;
  avg_conversation_time: number;
  created_at: string;
  updated_at: string;
}

// Database types map
export type DatabaseTable = 
  | 'users' 
  | 'clinics' 
  | 'calls' 
  | 'appointments' 
  | 'notifications' 
  | 'analytics_snapshots'
  | 'agent_configs';
