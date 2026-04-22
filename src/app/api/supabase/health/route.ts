import { NextRequest, NextResponse } from 'next/server';
import { testSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/supabase/health - Check Supabase connection status
export async function GET(req: NextRequest) {
  try {
    const configured = isSupabaseConfigured();
    
    if (!configured) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and keys to .env',
        database: 'sqlite',
        configured: false,
      });
    }

    const result = await testSupabaseConnection();

    return NextResponse.json({
      status: result.connected ? 'connected' : 'error',
      message: result.connected 
        ? 'Supabase is connected and ready' 
        : `Supabase connection failed: ${result.error}`,
      database: result.connected ? 'supabase_postgresql' : 'sqlite_fallback',
      configured: true,
      ...result.details,
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check Supabase status',
      error: (err as Error).message,
      database: 'sqlite_fallback',
      configured: false,
    }, { status: 500 });
  }
}

// POST /api/supabase/test - Test Supabase connection with provided credentials
export async function POST(req: NextRequest) {
  try {
    const { url, anonKey, serviceKey } = await req.json();

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'URL and Anon Key are required' },
        { status: 400 }
      );
    }

    // Test with provided credentials
    const { createClient } = await import('@supabase/supabase-js');
    
    const testClient = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try to connect
    const { error } = await testClient.from('clinics').select('id').limit(1);

    if (error && error.code !== '42P01') {
      // 42P01 = table doesn't exist (ok for fresh setup)
      return NextResponse.json({
        connected: false,
        error: error.message,
        errorCode: error.code,
      });
    }

    // Test realtime
    const { error: rtError } = await testClient
      .channel('test-connection')
      .subscribe();

    return NextResponse.json({
      connected: true,
      realtime: !rtError,
      message: error?.code === '42P01' 
        ? 'Connected! Tables not created yet. Run the migration SQL.' 
        : 'Connected and tables found!',
    });
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: (err as Error).message,
    }, { status: 500 });
  }
}
