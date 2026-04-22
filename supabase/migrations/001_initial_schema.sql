-- ============================================
-- VOICEAI SAAS PLATFORM - SUPABASE MIGRATION
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- This creates all tables with proper indexes, constraints, and RLS policies
-- Version: 1.0.0
-- ============================================

-- Enable UUID extension for CUID-like IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE SET NULL,
  phone TEXT,
  avatar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 2. CLINICS TABLE (must be created before users for FK)
-- ============================================
CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  
  -- Vobiz SIP Integration
  sip_number TEXT,
  sip_id TEXT,
  escalation_number TEXT,
  
  -- Business Config
  business_hours TEXT NOT NULL DEFAULT '09:00-18:00',
  business_days TEXT NOT NULL DEFAULT 'Mon-Fri',
  services TEXT NOT NULL DEFAULT '[]',
  consultation_fee TEXT,
  
  -- Status & Billing
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'overdue')),
  plan_type TEXT NOT NULL DEFAULT 'starter' CHECK (plan_type IN ('starter', 'pro', 'enterprise')),
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  whatsapp_number TEXT,
  
  -- AI Agent Config
  ai_system_prompt TEXT,
  greeting_message TEXT,
  language TEXT NOT NULL DEFAULT 'hinglish' CHECK (language IN ('hinglish', 'english', 'hindi')),
  
  -- Metadata
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clinics indexes
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(status);
CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics(city);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON clinics(is_active);
CREATE INDEX IF NOT EXISTS idx_clinics_plan_type ON clinics(plan_type);

-- ============================================
-- 3. CALLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  call_sid TEXT,
  
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  caller_location TEXT,
  
  -- Call lifecycle
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'missed', 'completed', 'transferred', 'failed')),
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  duration INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  
  -- AI Interaction
  transcript TEXT,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'angry')),
  tags TEXT,
  intent TEXT CHECK (intent IN ('appointment', 'faq', 'complaint', 'emergency', 'general')),
  
  -- Transfer details
  transfer_reason TEXT,
  transferred_to TEXT,
  
  -- Audio
  audio_url TEXT,
  
  -- Booking reference
  appointment_id TEXT UNIQUE REFERENCES appointments(id) ON DELETE SET NULL
);

-- Calls indexes
CREATE INDEX IF NOT EXISTS idx_calls_clinic_id ON calls(clinic_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);
CREATE INDEX IF NOT EXISTS idx_calls_caller_phone ON calls(caller_phone);
CREATE INDEX IF NOT EXISTS idx_calls_clinic_started ON calls(clinic_id, started_at);

-- ============================================
-- 4. APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  call_id TEXT UNIQUE REFERENCES calls(id) ON DELETE SET NULL,
  
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  booked_via TEXT NOT NULL DEFAULT 'ai' CHECK (booked_via IN ('ai', 'manual', 'walk_in')),
  
  -- Revenue tracking
  consultation_fee TEXT,
  
  -- Notification
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_phone ON appointments(patient_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status ON appointments(clinic_id, status);

-- ============================================
-- 5. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking', 'escalation', 'missed_call', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_created ON notifications(clinic_id, created_at);

-- ============================================
-- 6. AGENT_CONFIGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clinic_id TEXT NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- AI Agent Identity
  agent_name TEXT NOT NULL DEFAULT 'VoiceAI Assistant',
  agent_persona TEXT NOT NULL DEFAULT 'professional' CHECK (agent_persona IN ('professional', 'friendly', 'clinical', 'warm')),
  greeting_message TEXT NOT NULL DEFAULT 'Hello! Welcome to {clinicName}. How can I help you today?',
  farewell_message TEXT NOT NULL DEFAULT 'Thank you for calling {clinicName}. Have a great day!',
  language TEXT NOT NULL DEFAULT 'hinglish' CHECK (language IN ('hinglish', 'english', 'hindi')),
  
  -- Voice Configuration
  voice_provider TEXT NOT NULL DEFAULT 'gemini',
  voice_id TEXT,
  voice_name TEXT,
  voice_gender TEXT NOT NULL DEFAULT 'female' CHECK (voice_gender IN ('male', 'female')),
  voice_speed TEXT NOT NULL DEFAULT 'normal' CHECK (voice_speed IN ('slow', 'normal', 'fast')),
  speaking_rate REAL,
  
  -- Call Handling
  max_call_duration INTEGER NOT NULL DEFAULT 300,
  transfer_on_fail BOOLEAN NOT NULL DEFAULT true,
  transfer_number TEXT,
  escalation_prompt TEXT NOT NULL DEFAULT 'I''ll connect you with our staff. Please hold.',
  
  -- Booking Configuration
  auto_book_slot BOOLEAN NOT NULL DEFAULT true,
  booking_slot_duration INTEGER NOT NULL DEFAULT 30,
  booking_lead_days INTEGER NOT NULL DEFAULT 7,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  max_bookings_per_day INTEGER NOT NULL DEFAULT 50,
  auto_confirm BOOLEAN NOT NULL DEFAULT true,
  require_confirmation BOOLEAN NOT NULL DEFAULT true,
  
  -- Knowledge Base
  faq_json TEXT,
  services_json TEXT,
  clinic_description TEXT,
  specializations TEXT,
  special_notes TEXT,
  
  -- Escalation Configuration
  escalation_enabled BOOLEAN NOT NULL DEFAULT true,
  escalation_after INTEGER NOT NULL DEFAULT 120,
  escalation_keywords TEXT,
  escalation_number TEXT,
  
  -- AI Behavior
  sentiment_threshold TEXT NOT NULL DEFAULT 'negative',
  ask_for_feedback BOOLEAN NOT NULL DEFAULT true,
  collect_patient_info BOOLEAN NOT NULL DEFAULT true,
  
  -- Vobiz Integration
  vobiz_phone_number TEXT,
  vobiz_trunk_id TEXT,
  vobiz_trunk_domain TEXT,
  vobiz_credential_id TEXT,
  vobiz_credential_user TEXT,
  vobiz_app_id TEXT,
  vobiz_app_url TEXT,
  
  -- Webhook Configuration
  webhook_url TEXT,
  answer_url TEXT,
  hangup_url TEXT,
  fallback_url TEXT,
  webhook_secret TEXT,
  callback_events TEXT,
  
  -- Calendar Integration
  calendar_provider TEXT NOT NULL DEFAULT 'none',
  calendar_api_key TEXT,
  calendar_webhook_url TEXT,
  calendar_id TEXT,
  calendar_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Agent Status
  agent_status TEXT NOT NULL DEFAULT 'draft' CHECK (agent_status IN ('draft', 'testing', 'active', 'paused', 'archived')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  last_test_result TEXT,
  test_notes TEXT,
  
  -- Performance Stats
  total_agent_calls INTEGER NOT NULL DEFAULT 0,
  total_agent_bookings INTEGER NOT NULL DEFAULT 0,
  avg_conversation_time INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent configs indexes
CREATE INDEX IF NOT EXISTS idx_agent_configs_clinic_id ON agent_configs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_agent_status ON agent_configs(agent_status);

-- ============================================
-- 7. ANALYTICS_SNAPSHOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  metric_type TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metric_type ON analytics_snapshots(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_metric_date ON analytics_snapshots(metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_clinic_id ON analytics_snapshots(clinic_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type_date ON analytics_snapshots(metric_type, metric_date);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access on users" ON users
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role full access on clinics" ON clinics
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role full access on calls" ON calls
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role full access on appointments" ON appointments
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role full access on notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role full access on agent_configs" ON agent_configs
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role full access on analytics_snapshots" ON analytics_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- Anon role: read-only access for public data
CREATE POLICY "Anon read clinics" ON clinics
  FOR SELECT USING (true);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable Realtime for key tables (for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- SEED DATA (OPTIONAL - for demo/testing)
-- ============================================
-- Insert Super Admin
-- NOTE: Password should be bcrypt-hashed. Use: bun -e "const b=require('bcryptjs');b.hash('admin123',10).then(h=>console.log(h))"
INSERT INTO users (id, email, password, name, role, is_active) VALUES
  ('admin-001', 'admin@voiceai.in', '$2a$10$placeholder_hash_change_me', 'Super Admin', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- DONE! 
-- ============================================
-- Next steps:
-- 1. Run: bunx prisma generate (to regenerate types)
-- 2. Update .env with your Supabase credentials:
--    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
--    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
--    DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
-- 3. Run: bunx prisma db push (if using Prisma with PostgreSQL)
-- 4. Or use the Supabase SQL editor to run this migration directly
