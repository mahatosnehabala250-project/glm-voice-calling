import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Convert paisa to rupees
function toRupees(paisa: number): number {
  return paisa / 100;
}

// PUT /api/admin/invoices/:id — Update invoice status (e.g., mark as paid)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Fetch existing invoice
    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        clinic: {
          select: { id: true, name: true, doctorName: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Build update data based on requested status
    const updateData: Record<string, unknown> = {};

    switch (status) {
      case 'paid':
        updateData.status = 'paid';
        updateData.paidAmount = existing.totalAmount;
        updateData.paidAt = new Date();
        break;

      case 'overdue':
        updateData.status = 'overdue';
        break;

      case 'cancelled':
        updateData.status = 'cancelled';
        break;

      case 'partial': {
        // For partial payments, accept a paidAmount in the body
        const { paidAmount } = body;
        if (typeof paidAmount === 'number' && paidAmount > 0) {
          updateData.status = 'partial';
          updateData.paidAmount = paidAmount;
          // If fully paid now, mark as paid
          if (paidAmount >= existing.totalAmount) {
            updateData.status = 'paid';
            updateData.paidAmount = existing.totalAmount;
            updateData.paidAt = new Date();
          }
        } else {
          return NextResponse.json(
            { error: 'paidAmount is required for partial status' },
            { status: 400 }
          );
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid status: "${status}". Must be one of: paid, overdue, cancelled, partial` },
          { status: 400 }
        );
    }

    // Update the invoice
    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        clinic: {
          select: { id: true, name: true, doctorName: true },
        },
      },
    });

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        clinicId: invoice.clinicId,
        clinicName: invoice.clinic.name,
        doctorName: invoice.clinic.doctorName,
        invoiceNumber: invoice.invoiceNumber,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        subtotal: invoice.subtotal,
        subtotalRupees: toRupees(invoice.subtotal),
        gstPercent: invoice.gstPercent,
        gstAmount: invoice.gstAmount,
        gstAmountRupees: toRupees(invoice.gstAmount),
        totalAmount: invoice.totalAmount,
        totalAmountRupees: toRupees(invoice.totalAmount),
        paidAmount: invoice.paidAmount,
        paidAmountRupees: toRupees(invoice.paidAmount),
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt?.toISOString() || null,
        planType: invoice.planType,
        planPrice: invoice.planPrice,
        planPriceRupees: toRupees(invoice.planPrice),
        items: JSON.parse(invoice.items),
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('Update invoice error:', err);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
