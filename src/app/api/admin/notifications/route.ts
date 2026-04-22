import { NextResponse } from 'next/server';

// GET /api/admin/notifications
export async function GET() {
  try {
    const now = new Date();

    const notifications = [
      {
        id: '1',
        type: 'system',
        title: 'System Update Deployed',
        message: 'VoiceAI platform updated to v1.2.0 with improved call routing',
        isRead: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        type: 'alert',
        title: 'High Call Volume Detected',
        message: 'Sharma Dental Clinic is experiencing 3x normal call volume',
        isRead: false,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        type: 'billing',
        title: 'Subscription Renewal',
        message: 'Agarwal Eye Hospital Pro plan renews in 3 days',
        isRead: true,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '4',
        type: 'system',
        title: 'New Clinic Registered',
        message: 'Mehta Physiotherapy Center has started a free trial',
        isRead: true,
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '5',
        type: 'alert',
        title: 'SIP Trunk Warning',
        message: 'Mumbai SIP gateway latency increased to 120ms',
        isRead: false,
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '6',
        type: 'system',
        title: 'Weekly Analytics Report',
        message: 'Platform handled 247 calls with 68% booking conversion rate',
        isRead: true,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Admin notifications error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
