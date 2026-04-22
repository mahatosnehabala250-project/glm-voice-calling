import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/audit-log — Retrieve audit log entries
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const actionType = searchParams.get('actionType') || 'all';
    const search = searchParams.get('search') || '';

    // Mock audit data
    const mockActions = [
      { actionType: 'auth', action: 'User Login', description: 'Admin logged in successfully', severity: 'info' },
      { actionType: 'auth', action: 'User Login', description: 'receptionist@sharma-dental.in logged in', severity: 'info' },
      { actionType: 'clinic', action: 'Clinic Created', description: 'New clinic "City Physio Center" registered', severity: 'info' },
      { actionType: 'clinic', action: 'Clinic Suspended', description: 'Clinic "Test Clinic" suspended by admin', severity: 'warning' },
      { actionType: 'billing', action: 'Plan Upgraded', description: 'Sharma Dental upgraded from Starter to Pro', severity: 'info' },
      { actionType: 'billing', action: 'Invoice Generated', description: 'Monthly invoice INV-2026-042 generated', severity: 'info' },
      { actionType: 'billing', action: 'Payment Received', description: '₹4,999 payment received from Agarwal Eye Care', severity: 'success' },
      { actionType: 'billing', action: 'Payment Overdue', description: 'Invoice INV-2026-038 is 7 days overdue', severity: 'warning' },
      { actionType: 'agent', action: 'Agent Config Changed', description: 'AI agent persona updated for Patel Skin Clinic', severity: 'info' },
      { actionType: 'agent', action: 'Agent Deployed', description: 'VoiceAI agent activated for Reddy Orthopedic Center', severity: 'success' },
      { actionType: 'call', action: 'Call Transferred', description: 'Escalation triggered for high-priority call', severity: 'warning' },
      { actionType: 'call', action: 'Call Failed', description: 'Outbound call failed — SIP trunk timeout', severity: 'error' },
      { actionType: 'system', action: 'Service Restart', description: 'Gemini AI service restarted', severity: 'warning' },
      { actionType: 'system', action: 'Health Check', description: 'All systems operational — uptime 99.97%', severity: 'info' },
      { actionType: 'system', action: 'Database Backup', description: 'Daily backup completed successfully', severity: 'success' },
      { actionType: 'user', action: 'Password Changed', description: 'Admin password updated', severity: 'warning' },
      { actionType: 'user', action: 'Team Member Added', description: 'Neha Singh added to Sharma Dental team', severity: 'info' },
      { actionType: 'whatsapp', action: 'Template Sent', description: 'Appointment confirmation sent to +91-98765-43210', severity: 'info' },
      { actionType: 'whatsapp', action: 'Message Failed', description: 'WhatsApp delivery failed — invalid number', severity: 'error' },
      { actionType: 'appointment', action: 'Booking Created', description: 'New appointment booked via AI for Dr. Rajesh Sharma', severity: 'success' },
      { actionType: 'appointment', action: 'Booking Cancelled', description: 'Patient cancelled appointment for 15 Apr 2026', severity: 'info' },
      { actionType: 'security', action: 'Failed Login Attempt', description: 'Multiple failed login attempts from IP 103.x.x.x', severity: 'error' },
      { actionType: 'security', action: 'Session Expired', description: 'User session expired after 24h inactivity', severity: 'info' },
      { actionType: 'integration', action: 'Webhook Received', description: 'Vobiz inbound call webhook processed', severity: 'info' },
      { actionType: 'integration', action: 'API Rate Limit', description: 'Gemini API rate limit approaching (85% used)', severity: 'warning' },
    ];

    const totalEntries = 247;
    const allEntries = Array.from({ length: Math.min(totalEntries, 500) }, (_, i) => {
      const action = mockActions[i % mockActions.length];
      const minutesAgo = i * 37 + Math.floor(Math.random() * 30);
      const users = [
        { name: 'Super Admin', email: 'admin@voiceai.in', role: 'admin' },
        { name: 'Priya Patel', email: 'receptionist@sharma-dental.in', role: 'client' },
        { name: 'System', email: 'system@voiceai.in', role: 'system' },
        { name: 'API Gateway', email: 'gateway@voiceai.in', role: 'system' },
      ];
      const user = users[i % users.length];
      const ip = `103.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      return {
        id: `audit-${String(i + 1).padStart(4, '0')}`,
        timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString(),
        actionType: action.actionType,
        action: action.action,
        description: action.description,
        severity: action.severity,
        user: user.name,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: ip,
      };
    });

    let filtered = allEntries;
    if (actionType !== 'all') {
      filtered = filtered.filter(e => e.actionType === actionType);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const start = (page - 1) * limit;
    const entries = filtered.slice(start, start + limit);

    const stats = {
      total: filtered.length,
      today: filtered.filter(e => {
        const d = new Date(e.timestamp);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
      errors: filtered.filter(e => e.severity === 'error').length,
      warnings: filtered.filter(e => e.severity === 'warning').length,
    };

    return NextResponse.json({ entries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, stats });
  } catch (err) {
    console.error('Audit log error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
