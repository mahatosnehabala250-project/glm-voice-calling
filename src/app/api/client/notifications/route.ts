import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/client/notifications
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await db.notification.count({
      where: { clinicId, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Notifications error:', err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PUT /api/client/notifications - Mark as read
export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const { id, markAll } = await req.json();

    if (markAll) {
      await db.notification.updateMany({
        where: { clinicId, isRead: false },
        data: { isRead: true },
      });
    } else if (id) {
      await db.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update notification error:', err);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
