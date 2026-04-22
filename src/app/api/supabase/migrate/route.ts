import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// POST /api/supabase/migrate - Run SQL migration on Supabase
export async function POST(req: NextRequest) {
  try {
    const { serviceRoleKey, supabaseUrl } = await req.json();

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL and Service Role Key are required' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Read the SQL migration file
    const sqlPath = join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
    let sql: string;
    try {
      sql = readFileSync(sqlPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: 'Migration file not found: supabase/migrations/001_initial_schema.sql' },
        { status: 500 }
      );
    }

    // Execute SQL via Supabase RPC (sql function)
    // We need to split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    const results: Array<{ statement: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    // Try executing via the SQL endpoint
    for (const statement of statements) {
      try {
        // Use Supabase's pg endpoint for raw SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ sql_query: statement }),
        });

        if (response.ok) {
          successCount++;
          results.push({ statement: statement.substring(0, 80), success: true });
        } else {
          const errText = await response.text();
          // Some errors are expected (like "already exists")
          if (errText.includes('already exists') || errText.includes('duplicate')) {
            successCount++;
            results.push({ statement: statement.substring(0, 80), success: true });
          } else {
            errorCount++;
            results.push({ 
              statement: statement.substring(0, 80), 
              success: false, 
              error: errText.substring(0, 200) 
            });
          }
        }
      } catch (err) {
        errorCount++;
        results.push({ 
          statement: statement.substring(0, 80), 
          success: false, 
          error: (err as Error).message 
        });
      }
    }

    // Also try the direct SQL API endpoint
    const sqlApiUrl = supabaseUrl.replace('.supabase.co', '.supabase.co');

    return NextResponse.json({
      success: errorCount === 0,
      totalStatements: statements.length,
      successCount,
      errorCount,
      results: results.slice(0, 20), // Return first 20 results
      message: errorCount === 0 
        ? `Migration successful! All ${successCount} statements executed.` 
        : `Migration completed with ${errorCount} errors. Check results for details.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/supabase/migrate - Get migration status
export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    return NextResponse.json({
      configured: !!(url && (serviceKey || anonKey)),
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
      provider: url ? 'postgresql (Supabase)' : 'sqlite (local)',
      migrationFile: 'supabase/migrations/001_initial_schema.sql',
      tables: [
        'users', 'clinics', 'calls', 'appointments', 
        'notifications', 'agent_configs', 'analytics_snapshots'
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
