// ============================================
// VoiceAI SaaS - SUPABASE PRISMA SCHEMA
// ============================================
// To switch from SQLite to Supabase (PostgreSQL):
// 1. Install: bun add @prisma/adapter-supabase @supabase/supabase-js
// 2. Replace this file with prisma/schema.prisma
// 3. Run: bunx prisma generate
// 4. Run the migration SQL in Supabase SQL Editor
// 5. Update .env with Supabase credentials
// ============================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")  // Supabase connection string
  directUrl = env("DIRECT_URL")    // Supabase transaction pooler (optional)
}

// NOTE: This is the SAME schema as the current SQLite version.
// PostgreSQL will use TEXT instead of String, but the data types are compatible.
// See supabase/migrations/001_initial_schema.sql for the raw SQL with RLS policies.
