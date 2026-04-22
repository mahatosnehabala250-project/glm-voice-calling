import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase';
import { getDatabaseProvider } from '@/lib/db';

// GET /api/supabase/setup - Get complete Supabase setup status and actionable steps
export async function GET(req: NextRequest) {
  const provider = getDatabaseProvider();
  const supabaseReady = isSupabaseConfigured();
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check tables via Supabase REST API
  let tablesStatus: Record<string, boolean> = {};
  if (supabaseReady) {
    const client = getSupabaseAdmin() || getSupabaseServer();
    if (client) {
      const tables = ['users', 'clinics', 'calls', 'appointments', 'notifications', 'agent_configs', 'analytics_snapshots'];
      for (const table of tables) {
        try {
          const { error } = await client.from(table).select('id').limit(1);
          tablesStatus[table] = !error || error.code === 'PGRST116';
        } catch {
          tablesStatus[table] = false;
        }
      }
    }
  }

  const tablesCreated = Object.values(tablesStatus).filter(Boolean).length;
  const totalTables = 7;
  const allTablesCreated = tablesCreated === totalTables;

  return NextResponse.json({
    provider,
    providerLabel: provider === 'postgresql' ? 'PostgreSQL (Supabase)' : 'SQLite (Local)',
    supabaseConfigured: supabaseReady,
    hasServiceKey,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    projectRef: process.env.NEXT_PUBLIC_SUPABASE_URL 
      ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0] 
      : null,
    tablesStatus,
    tablesCreated,
    totalTables,
    allTablesCreated,
    tablesPercent: Math.round((tablesCreated / totalTables) * 100),
    steps: [
      {
        step: 1,
        title: 'Create Supabase Project',
        description: 'Project created',
        completed: supabaseReady,
        action: null,
      },
      {
        step: 2,
        title: 'Run SQL Migration',
        description: allTablesCreated 
          ? `All ${tablesCreated} tables created` 
          : `${tablesCreated}/${totalTables} tables. Run migration SQL in SQL Editor`,
        completed: allTablesCreated,
        action: allTablesCreated ? null : 'https://supabase.com/dashboard/project/qgybxpteqzhcvlgdfxbn/sql',
      },
      {
        step: 3,
        title: 'Set Service Role Key',
        description: hasServiceKey 
          ? 'Service role key set' 
          : 'Add SUPABASE_SERVICE_ROLE_KEY to .env',
        completed: hasServiceKey,
        action: hasServiceKey ? null : 'https://supabase.com/dashboard/project/qgybxpteqzhcvlgdfxbn/settings/api',
      },
      {
        step: 4,
        title: 'Switch to PostgreSQL',
        description: provider === 'postgresql' 
          ? 'Using PostgreSQL' 
          : 'Set DATABASE_URL and change schema provider',
        completed: provider === 'postgresql',
        action: null,
      },
    ],
    status: allTablesCreated && supabaseReady ? 'production_ready' : supabaseReady ? 'needs_migration' : 'needs_config',
    statusLabel: allTablesCreated && supabaseReady 
      ? 'Production Ready' 
      : supabaseReady 
        ? 'Needs Migration' 
        : 'Needs Configuration',
    dashboardUrl: 'https://supabase.com/dashboard/project/qgybxpteqzhcvlgdfxbn',
    sqlEditorUrl: 'https://supabase.com/dashboard/project/qgybxpteqzhcvlgdfxbn/sql',
    tableEditorUrl: 'https://supabase.com/dashboard/project/qgybxpteqzhcvlgdfxbn/editor',
    settingsUrl: 'https://supabase.com/dashboard/project/qgybxpteqzhcvlgdfxbn/settings/api',
  });
}
