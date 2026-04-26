import { NextRequest, NextResponse } from 'next/server';

// BYOK configuration stored in environment variables / DB settings
// This endpoint lets clinics configure their own API keys

const BYOK_CONFIG = [
  { key: 'GEMINI_API_KEY', label: 'Google Gemini API Key', description: 'For AI voice agent chat, STT, sentiment analysis', icon: 'brain', category: 'AI', placeholder: 'AIzaSy...' },
  { key: 'VOBIZ_AUTH_ID', label: 'Vobiz Auth ID', description: 'SIP trunking authentication ID', icon: 'phone', category: 'Telephony', placeholder: 'MA_xxxx' },
  { key: 'VOBIZ_AUTH_TOKEN', label: 'Vobiz Auth Token', description: 'SIP trunking authentication token', icon: 'phone', category: 'Telephony', placeholder: 'your-token' },
  { key: 'VOBIZ_MOBILE_NO', label: 'Vobiz Phone Number', description: 'Your assigned Vobiz phone number', icon: 'phone', category: 'Telephony', placeholder: '+919XXXXXXXXX' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', description: 'Supabase project URL', icon: 'database', category: 'Database', placeholder: 'https://your-project.supabase.co' },
  { key: 'N8N_WEBHOOK_BASE', label: 'n8n Webhook Base URL', description: 'n8n workflow automation base URL', icon: 'workflow', category: 'Automation', placeholder: 'https://n8n.yourdomain.com' },
  { key: 'WHATSAPP_API_KEY', label: 'WhatsApp API Key', description: 'MSG91 or Twilio WhatsApp API key', icon: 'message', category: 'Messaging', placeholder: 'your-whatsapp-key' },
  { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', description: 'For SMS confirmations and calls', icon: 'message', category: 'Messaging', placeholder: 'ACxxxxxxxxx' },
  { key: 'LIVEKIT_API_KEY', label: 'LiveKit API Key', description: 'Real-time voice infrastructure (LiveKit Cloud)', icon: 'radio', category: 'Voice', placeholder: 'APIxxxxxxxxx' },
  { key: 'LIVEKIT_URL', label: 'LiveKit Server URL', description: 'LiveKit WebSocket URL', icon: 'radio', category: 'Voice', placeholder: 'wss://your-project.livekit.cloud' },
];

// GET /api/client/byok - Get all BYOK config with masked values
export async function GET(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  const config = BYOK_CONFIG.map(item => {
    const value = process.env[item.key] || '';
    const configured = !!value;
    // Mask the value for display
    const masked = value.length > 8
      ? value.substring(0, 4) + '•'.repeat(value.length - 8) + value.substring(value.length - 4)
      : value.length > 0 ? '•'.repeat(value.length) : '';

    return {
      key: item.key,
      label: item.label,
      description: item.description,
      icon: item.icon,
      category: item.category,
      placeholder: item.placeholder,
      value: masked,
      configured,
    };
  });

  return NextResponse.json({ config });
}

// POST /api/client/byok - Save BYOK settings (validate but don't actually persist to env)
export async function POST(req: NextRequest) {
  const clinicId = req.headers.get('x-clinic-id');
  if (!clinicId) return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });

  const body = await req.json();

  // In production, these would be saved to a secure settings store per clinic
  // For now, we validate the format and return success
  const validations: Record<string, boolean> = {};

  for (const item of BYOK_CONFIG) {
    const val = body[item.key];
    if (val && val.trim()) {
      validations[item.key] = true; // Basic validation passed
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Settings validated successfully. In production, these would be encrypted and stored per-tenant.',
    validated: Object.keys(validations).length,
  });
}
