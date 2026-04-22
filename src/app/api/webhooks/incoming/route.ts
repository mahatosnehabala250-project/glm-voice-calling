import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/webhooks/incoming
// Receives webhooks from n8n or external systems.
// Auth: x-webhook-secret header checked against N8N_WEBHOOK_SECRET env var.
export async function POST(req: NextRequest) {
  try {
    // ── Validate webhook secret ──
    const providedSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('[incoming-webhook] N8N_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured on server' },
        { status: 500 }
      );
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.warn('[incoming-webhook] Invalid or missing webhook secret');
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // ── Parse payload ──
    const body = await req.json();
    const { eventType, data } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType is required' },
        { status: 400 }
      );
    }

    console.log(`[incoming-webhook] Received event: ${eventType}`, JSON.stringify(data));

    // ── Handle supported event types ──
    switch (eventType) {
      // ── WhatsApp status update ──
      case 'whatsapp.status': {
        const { appointmentId, status: whatsappStatus, clinicId } = data || {};

        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required for whatsapp.status' },
            { status: 400 }
          );
        }

        const whereClause: Record<string, unknown> = { id: appointmentId };
        if (clinicId) whereClause.clinicId = clinicId;

        const appointment = await db.appointment.findFirst({
          where: whereClause,
        });

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment not found', appointmentId },
            { status: 404 }
          );
        }

        // Map WhatsApp status to appointment notes
        await db.appointment.update({
          where: { id: appointmentId },
          data: {
            notes: appointment.notes
              ? `${appointment.notes}\n[WhatsApp: ${whatsappStatus} at ${new Date().toISOString()}]`
              : `[WhatsApp: ${whatsappStatus} at ${new Date().toISOString()}]`,
          },
        });

        return NextResponse.json({ received: true, event: 'whatsapp.status', appointmentId });
      }

      // ── Payment confirmation ──
      case 'payment.confirm': {
        const { invoiceId, clinicId, amount, transactionId } = data || {};

        if (!invoiceId) {
          return NextResponse.json(
            { error: 'invoiceId is required for payment.confirm' },
            { status: 400 }
          );
        }

        const whereClause: Record<string, unknown> = { invoiceNumber: invoiceId };
        if (clinicId) whereClause.clinicId = clinicId;

        const invoice = await db.invoice.findFirst({
          where: whereClause,
        });

        if (!invoice) {
          return NextResponse.json(
            { error: 'Invoice not found', invoiceId },
            { status: 404 }
          );
        }

        const updateData: Record<string, unknown> = {
          status: 'paid',
          paidAt: new Date(),
        };

        // If amount is provided, use it
        if (amount !== undefined) {
          updateData.paidAmount = amount;
        } else {
          updateData.paidAmount = invoice.totalAmount;
        }

        await db.invoice.update({
          where: { id: invoice.id },
          data: updateData,
        });

        // Create a notification for the clinic
        await db.notification.create({
          data: {
            clinicId: invoice.clinicId,
            type: 'payment',
            title: 'Payment Received',
            message: `Payment of ₹${(updateData.paidAmount as number / 100).toFixed(2)} received for ${invoice.invoiceNumber}${transactionId ? ` (TXN: ${transactionId})` : ''}`,
          },
        });

        return NextResponse.json({ received: true, event: 'payment.confirm', invoiceId, status: 'paid' });
      }

      // ── Appointment cancellation ──
      case 'appointment.cancel': {
        const { appointmentId, clinicId, reason: cancelReason } = data || {};

        if (!appointmentId) {
          return NextResponse.json(
            { error: 'appointmentId is required for appointment.cancel' },
            { status: 400 }
          );
        }

        const whereClause: Record<string, unknown> = { id: appointmentId };
        if (clinicId) whereClause.clinicId = clinicId;

        const appointment = await db.appointment.findFirst({
          where: whereClause,
        });

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment not found', appointmentId },
            { status: 404 }
          );
        }

        const updateData: Record<string, unknown> = { status: 'cancelled' };
        if (cancelReason) {
          updateData.notes = appointment.notes
            ? `${appointment.notes}\n[Cancelled via webhook: ${cancelReason}]`
            : `[Cancelled via webhook: ${cancelReason}]`;
        }

        await db.appointment.update({
          where: { id: appointmentId },
          data: updateData,
        });

        return NextResponse.json({ received: true, event: 'appointment.cancel', appointmentId, status: 'cancelled' });
      }

      default: {
        console.warn(`[incoming-webhook] Unsupported event type: ${eventType}`);
        return NextResponse.json(
          { error: `Unsupported event type: ${eventType}` },
          { status: 400 }
        );
      }
    }
  } catch (err) {
    console.error('[incoming-webhook] Error processing webhook:', err);
    return NextResponse.json(
      { error: 'Failed to process incoming webhook' },
      { status: 500 }
    );
  }
}
