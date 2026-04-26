import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WATemplate {
  id: string;
  name: string;
  description: string;
  body: string;
  category: 'appointment' | 'reminder' | 'notification' | 'greeting';
  variables: string[];
  usageCount: number;
  enabled: boolean;
}

interface WASentMessage {
  id: string;
  recipient: string;      // masked phone
  phone: string;          // full phone
  recipientName: string;
  templateType: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: string;
  scheduledAt?: string;
  messagePreview: string;
  clinicName: string;
}

interface WAAnalytics {
  messagesSentToday: number;
  messagesSentTodayTrend: number;   // +/- percentage
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  weeklyVolume: { day: string; count: number }[];
}

// ─── Mock Templates ───────────────────────────────────────────────────────────

const TEMPLATES: WATemplate[] = [
  {
    id: 'tpl-appointment-confirmation',
    name: 'Appointment Confirmation',
    description: 'Sent when a new appointment is booked successfully',
    body: 'Hello {patient_name}! ✅\n\nYour appointment has been confirmed:\n📅 Date: {date}\n🕐 Time: {time}\n👨‍⚕️ Doctor: {doctor_name}\n📍 {clinic_address}\n\nPlease arrive 10 minutes early. Reply HELP for assistance.',
    category: 'appointment',
    variables: ['patient_name', 'date', 'time', 'doctor_name', 'clinic_address'],
    usageCount: 1247,
    enabled: true,
  },
  {
    id: 'tpl-appointment-reminder',
    name: 'Appointment Reminder',
    description: 'Sent 24 hours before the scheduled appointment',
    body: 'Hi {patient_name}, 👋\n\nGentle reminder about your appointment tomorrow:\n📅 {date} at {time}\n👨‍⚕️ {doctor_name}\n\nReply RESCHEDULE to change or CANCEL to cancel.',
    category: 'reminder',
    variables: ['patient_name', 'date', 'time', 'doctor_name'],
    usageCount: 1089,
    enabled: true,
  },
  {
    id: 'tpl-reschedule-confirmation',
    name: 'Reschedule Confirmation',
    description: 'Sent when an appointment is rescheduled',
    body: 'Hello {patient_name},\n\nYour appointment has been rescheduled:\n📅 New Date: {new_date}\n🕐 New Time: {new_time}\n👨‍⚕️ {doctor_name}\n\nIf this doesn\'t work, please call us at {clinic_phone}.',
    category: 'appointment',
    variables: ['patient_name', 'new_date', 'new_time', 'doctor_name', 'clinic_phone'],
    usageCount: 234,
    enabled: true,
  },
  {
    id: 'tpl-cancellation-notice',
    name: 'Cancellation Notice',
    description: 'Sent when an appointment is cancelled',
    body: 'Hello {patient_name},\n\nWe\'re sorry to inform you that your appointment on {date} at {time} with {doctor_name} has been cancelled.\n\nWould you like to reschedule? Reply BOOK to book a new slot or call us at {clinic_phone}.',
    category: 'notification',
    variables: ['patient_name', 'date', 'time', 'doctor_name', 'clinic_phone'],
    usageCount: 156,
    enabled: true,
  },
  {
    id: 'tpl-followup-reminder',
    name: 'Follow-up Reminder',
    description: 'Sent 3 days after a visit for follow-up care',
    body: 'Hello {patient_name},\n\nWe hope you\'re doing well after your visit on {visit_date}! 🌟\n\nHow are you feeling? Is there any improvement?\n\nIf you need a follow-up consultation, reply BOOK or call us at {clinic_phone}.\n\nYour health matters to us! 💚',
    category: 'reminder',
    variables: ['patient_name', 'visit_date', 'clinic_phone'],
    usageCount: 678,
    enabled: true,
  },
  {
    id: 'tpl-payment-receipt',
    name: 'Payment Receipt',
    description: 'Sent after successful payment for a visit',
    body: 'Hello {patient_name},\n\n✅ Payment received successfully!\n\n💰 Amount: ₹{amount}\n📅 Date: {date}\n👨‍⚕️ Doctor: {doctor_name}\n💳 Payment Mode: {payment_mode}\n\nReceipt No: {receipt_number}\n\nThank you for choosing us! 🙏',
    category: 'notification',
    variables: ['patient_name', 'amount', 'date', 'doctor_name', 'payment_mode', 'receipt_number'],
    usageCount: 945,
    enabled: true,
  },
  {
    id: 'tpl-welcome-message',
    name: 'Welcome Message',
    description: 'Sent to new patients after first booking',
    body: 'Welcome to {clinic_name}! 🎉\n\nHello {patient_name}, thank you for choosing us for your healthcare needs.\n\nYour first appointment is booked:\n📅 {date} at {time}\n👨‍⚕️ {doctor_name}\n📍 {clinic_address}\n\nWe look forward to serving you! For any queries, call us at {clinic_phone}.',
    category: 'greeting',
    variables: ['clinic_name', 'patient_name', 'date', 'time', 'doctor_name', 'clinic_address', 'clinic_phone'],
    usageCount: 312,
    enabled: true,
  },
  {
    id: 'tpl-festival-greeting',
    name: 'Festival Greeting',
    description: 'Sent during festivals (Diwali, Holi, etc.)',
    body: '🎉 Happy {festival_name} from {clinic_name}! 🎉\n\nDear {patient_name},\n\nWishing you and your family a very happy {festival_name}! May this festival bring joy, health, and prosperity.\n\nStay healthy and keep smiling! 😊\n\n— Team {clinic_name}',
    category: 'greeting',
    variables: ['festival_name', 'clinic_name', 'patient_name'],
    usageCount: 567,
    enabled: true,
  },
];

// ─── Mock Sent Messages ───────────────────────────────────────────────────────

const NOW = new Date();
const SENT_MESSAGES: WASentMessage[] = [
  { id: 'msg-001', recipient: '+91 98*** ***10', phone: '+919876543210', recipientName: 'Rajesh Kumar', templateType: 'Appointment Confirmation', status: 'read', sentAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Rajesh Kumar! ✅ Your appointment has been confirmed...', clinicName: 'Sharma Dental Clinic' },
  { id: 'msg-002', recipient: '+91 87*** ***09', phone: '+918765432109', recipientName: 'Priya Sharma', templateType: 'Appointment Reminder', status: 'delivered', sentAt: new Date(NOW.getTime() - 4 * 60 * 60 * 1000).toISOString(), scheduledAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hi Priya Sharma, 👋 Gentle reminder about your appointment...', clinicName: 'Sharma Dental Clinic' },
  { id: 'msg-003', recipient: '+91 76*** ***98', phone: '+917654321098', recipientName: 'Amit Patel', templateType: 'Follow-up Reminder', status: 'read', sentAt: new Date(NOW.getTime() - 8 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Amit Patel, We hope you\'re doing well after your visit...', clinicName: 'Sharma Dental Clinic' },
  { id: 'msg-004', recipient: '+91 65*** ***87', phone: '+916543210987', recipientName: 'Sunita Devi', templateType: 'Payment Receipt', status: 'delivered', sentAt: new Date(NOW.getTime() - 12 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Sunita Devi, ✅ Payment received successfully!...', clinicName: 'Agarwal Eye Hospital' },
  { id: 'msg-005', recipient: '+91 54*** ***76', phone: '+915432109876', recipientName: 'Mohammed Ali', templateType: 'Appointment Confirmation', status: 'failed', sentAt: new Date(NOW.getTime() - 18 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Mohammed Ali! ✅ Your appointment has been confirmed...', clinicName: 'Patel Physiotherapy' },
  { id: 'msg-006', recipient: '+91 43*** ***65', phone: '+914321098765', recipientName: 'Deepa Nair', templateType: 'Welcome Message', status: 'read', sentAt: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Welcome to Agarwal Eye Hospital! 🎉 Hello Deepa Nair...', clinicName: 'Agarwal Eye Hospital' },
  { id: 'msg-007', recipient: '+91 32*** ***54', phone: '+913210987654', recipientName: 'Vikram Singh', templateType: 'Reschedule Confirmation', status: 'sent', sentAt: new Date(NOW.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Vikram Singh, Your appointment has been rescheduled...', clinicName: 'Gupta Skin Clinic' },
  { id: 'msg-008', recipient: '+91 21*** ***43', phone: '+912109876543', recipientName: 'Anjali Gupta', templateType: 'Festival Greeting', status: 'read', sentAt: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: '🎉 Happy Diwali from Sharma Dental Clinic! 🎉...', clinicName: 'Sharma Dental Clinic' },
  { id: 'msg-009', recipient: '+91 99*** ***32', phone: '+919987654321', recipientName: 'Ravi Verma', templateType: 'Cancellation Notice', status: 'delivered', sentAt: new Date(NOW.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Ravi Verma, We\'re sorry to inform you that your appointment...', clinicName: 'Patel Physiotherapy' },
  { id: 'msg-010', recipient: '+91 88*** ***21', phone: '+918876543210', recipientName: 'Kavita Joshi', templateType: 'Appointment Reminder', status: 'read', sentAt: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), scheduledAt: new Date(NOW.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hi Kavita Joshi, 👋 Gentle reminder about your appointment...', clinicName: 'Gupta Skin Clinic' },
  { id: 'msg-011', recipient: '+91 77*** ***10', phone: '+917765432109', recipientName: 'Sanjay Mishra', templateType: 'Follow-up Reminder', status: 'delivered', sentAt: new Date(NOW.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Sanjay Mishra, We hope you\'re doing well after your visit...', clinicName: 'Sharma Dental Clinic' },
  { id: 'msg-012', recipient: '+91 66*** ***99', phone: '+916654321098', recipientName: 'Meera Reddy', templateType: 'Payment Receipt', status: 'sent', sentAt: new Date(NOW.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Meera Reddy, ✅ Payment received successfully!...', clinicName: 'Agarwal Eye Hospital' },
  { id: 'msg-013', recipient: '+91 55*** ***88', phone: '+915543210987', recipientName: 'Arjun Khanna', templateType: 'Appointment Confirmation', status: 'read', sentAt: new Date(NOW.getTime() - 4.5 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hello Arjun Khanna! ✅ Your appointment has been confirmed...', clinicName: 'Patel Physiotherapy' },
  { id: 'msg-014', recipient: '+91 44*** ***77', phone: '+914432109876', recipientName: 'Pooja Thakur', templateType: 'Welcome Message', status: 'delivered', sentAt: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Welcome to Gupta Skin Clinic! 🎉 Hello Pooja Thakur...', clinicName: 'Gupta Skin Clinic' },
  { id: 'msg-015', recipient: '+91 33*** ***66', phone: '+913321098765', recipientName: 'Rohit Deshmukh', templateType: 'Appointment Reminder', status: 'failed', sentAt: new Date(NOW.getTime() - 5.5 * 24 * 60 * 60 * 1000).toISOString(), messagePreview: 'Hi Rohit Deshmukh, 👋 Gentle reminder about your appointment...', clinicName: 'Sharma Dental Clinic' },
];

// ─── Mock Analytics ──────────────────────────────────────────────────────────

function getAnalytics(): WAAnalytics {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = NOW.getDay(); // 0=Sun, 1=Mon
  const todayIdx = today === 0 ? 6 : today - 1;

  const volumes = [18, 24, 21, 32, 28, 15, 0];
  volumes[todayIdx] = 28 + Math.floor(Math.random() * 5);

  return {
    messagesSentToday: volumes[todayIdx],
    messagesSentTodayTrend: 12,
    deliveryRate: 89,
    readRate: 72,
    responseRate: 45,
    weeklyVolume: days.map((day, i) => ({
      day,
      count: volumes[i],
    })),
  };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';

  try {
    if (action === 'templates') {
      return NextResponse.json({ templates: TEMPLATES });
    }

    if (action === 'messages') {
      const status = searchParams.get('status');
      const phone = searchParams.get('phone');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      let filtered = [...SENT_MESSAGES];

      if (status && status !== 'all') {
        filtered = filtered.filter(m => m.status === status);
      }
      if (phone) {
        filtered = filtered.filter(m => m.phone.includes(phone) || m.recipient.includes(phone));
      }
      if (startDate) {
        filtered = filtered.filter(m => new Date(m.sentAt) >= new Date(startDate));
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(m => new Date(m.sentAt) <= end);
      }

      filtered.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

      return NextResponse.json({ messages: filtered, total: filtered.length });
    }

    if (action === 'analytics') {
      return NextResponse.json(getAnalytics());
    }

    // Default: return everything
    return NextResponse.json({
      templates: TEMPLATES,
      messages: SENT_MESSAGES,
      analytics: getAnalytics(),
    });
  } catch (error) {
    console.error('[WhatsApp API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch WhatsApp data' }, { status: 500 });
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'send') {
      const { to, templateId, message, scheduledAt } = body;

      if (!to || !templateId) {
        return NextResponse.json(
          { error: 'Missing required fields: to, templateId' },
          { status: 400 }
        );
      }

      // Mock sending - simulate success
      const isScheduled = !!scheduledAt;
      const newMessage: WASentMessage = {
        id: `msg-${Date.now()}`,
        recipient: to.slice(0, 7) + '*** ***' + to.slice(-2),
        phone: to,
        recipientName: 'Patient',
        templateType: TEMPLATES.find(t => t.id === templateId)?.name || 'Custom Message',
        status: isScheduled ? 'sent' : 'delivered',
        sentAt: new Date().toISOString(),
        scheduledAt: isScheduled ? scheduledAt : undefined,
        messagePreview: message || TEMPLATES.find(t => t.id === templateId)?.body || '',
        clinicName: 'VoiceAI Clinic',
      };

      // Simulate slight delay
      await new Promise(resolve => setTimeout(resolve, 300));

      return NextResponse.json({
        success: true,
        message: isScheduled ? 'Message scheduled successfully' : 'Message sent successfully',
        data: newMessage,
      });
    }

    if (action === 'resend') {
      const { messageId } = body;
      if (!messageId) {
        return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
      }

      const original = SENT_MESSAGES.find(m => m.id === messageId);
      if (!original) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      return NextResponse.json({
        success: true,
        message: 'Message resent successfully',
        data: {
          ...original,
          id: `msg-${Date.now()}`,
          status: 'delivered' as const,
          sentAt: new Date().toISOString(),
        },
      });
    }

    if (action === 'toggle-template') {
      const { templateId, enabled } = body;
      if (!templateId) {
        return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
      }

      const tpl = TEMPLATES.find(t => t.id === templateId);
      if (!tpl) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Template "${tpl.name}" ${enabled ? 'enabled' : 'disabled'}`,
        data: { ...tpl, enabled: enabled ?? !tpl.enabled },
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: send, resend, toggle-template' }, { status: 400 });
  } catch (error) {
    console.error('[WhatsApp API] POST error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
