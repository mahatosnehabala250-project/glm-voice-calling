import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { generateInvoicePDF, type InvoicePDFData, type ClinicPDFData } from '@/lib/pdf-generator';

// GET /api/admin/invoices/:id/download — Download invoice as printable HTML
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Fetch invoice with clinic details
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        clinic: {
          select: {
            id: true, name: true, doctorName: true, address: true,
            city: true, state: true, pincode: true, phone: true, email: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Build PDF data
    const invoiceData: InvoicePDFData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt.toISOString(),
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString() || null,
      planType: invoice.planType,
      planPrice: invoice.planPrice,
      subtotal: invoice.subtotal,
      gstPercent: invoice.gstPercent,
      gstAmount: invoice.gstAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      currency: invoice.currency,
      items: JSON.parse(invoice.items),
      notes: invoice.notes,
    };

    const clinicData: ClinicPDFData = {
      name: invoice.clinic.name,
      doctorName: invoice.clinic.doctorName,
      address: invoice.clinic.address,
      city: invoice.clinic.city,
      state: invoice.clinic.state,
      pincode: invoice.clinic.pincode,
      phone: invoice.clinic.phone,
      email: invoice.clinic.email,
    };

    // Generate HTML invoice
    const html = generateInvoicePDF(invoiceData, clinicData);

    // Return as downloadable HTML file
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (err) {
    console.error('Download invoice error:', err);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
