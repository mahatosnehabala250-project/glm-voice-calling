import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLAN_PRICES: Record<string, number> = {
  starter: 2999,
  pro: 6999,
  enterprise: 14999,
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter Plan',
  pro: 'Professional Plan',
  enterprise: 'Enterprise Plan',
};

interface GeneratedInvoice {
  id: string;
  clinicId: string;
  clinicName: string;
  doctorName: string;
  planType: string;
  planLabel: string;
  amount: number;
  subtotal: number;
  tax: number;
  status: 'paid' | 'pending' | 'overdue';
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

// Deterministic hash from clinic id + month index to decide status & invoice count
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(req: NextRequest) {
  try {
    const clinics = await db.clinic.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const invoices: GeneratedInvoice[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const clinic of clinics) {
      const amount = PLAN_PRICES[clinic.planType] || 2999;
      const planLabel = PLAN_LABELS[clinic.planType] || 'Starter Plan';
      const hash = hashString(clinic.id);

      // Generate 1-3 invoices per clinic based on hash
      const invoiceCount = (hash % 3) + 1;

      for (let i = 0; i < invoiceCount; i++) {
        // Each invoice is for a different month
        const monthOffset = i;
        const invoiceMonth = ((currentMonth - monthOffset) % 12 + 12) % 12;
        const invoiceYear = currentMonth - monthOffset < 0 ? currentYear - 1 : currentYear;

        // Invoice date: 1st of that month
        const invoiceDate = new Date(invoiceYear, invoiceMonth, 1);
        // Due date: 10th of that month
        const dueDate = new Date(invoiceYear, invoiceMonth, 10);
        // Billing period: full month
        const periodStart = new Date(invoiceYear, invoiceMonth, 1);
        const periodEnd = new Date(invoiceYear, invoiceMonth + 1, 0);

        // Determine status deterministically
        const statusHash = hashString(`${clinic.id}-${i}`);
        let status: 'paid' | 'pending' | 'overdue';

        // For the most recent month (current or last), some are pending
        if (i === 0) {
          status = statusHash % 3 === 0 ? 'overdue' : statusHash % 3 === 1 ? 'pending' : 'paid';
        } else if (i === 1) {
          // Older months: mostly paid, some overdue
          status = statusHash % 4 === 0 ? 'overdue' : 'paid';
        } else {
          // Oldest: mostly paid
          status = statusHash % 5 === 0 ? 'overdue' : 'paid';
        }

        // If clinic status is overdue, first invoice is overdue
        if (clinic.status === 'overdue' && i === 0) {
          status = 'overdue';
        }

        // If clinic status is trial, first invoice is pending
        if (clinic.status === 'trial' && i === 0) {
          status = 'pending';
        }

        const subtotal = amount;
        const tax = Math.round(amount * 0.18); // 18% GST
        const total = subtotal + tax;

        // Generate invoice number
        const monthStr = String(invoiceMonth + 1).padStart(2, '0');
        const invoiceNum = `INV-${invoiceYear}${monthStr}-${String(hash % 9000 + 1000).slice(0, 4)}`;

        // Paid date for paid invoices
        let paidDate: string | undefined;
        if (status === 'paid') {
          const paidDay = 1 + (statusHash % 10); // Paid between 1st and 10th
          paidDate = new Date(invoiceYear, invoiceMonth, paidDay).toISOString();
        }

        invoices.push({
          id: invoiceNum,
          clinicId: clinic.id,
          clinicName: clinic.name,
          doctorName: clinic.doctorName,
          planType: clinic.planType,
          planLabel,
          amount: total,
          subtotal,
          tax,
          status,
          invoiceDate: invoiceDate.toISOString(),
          dueDate: dueDate.toISOString(),
          paidDate,
          billingPeriodStart: periodStart.toISOString(),
          billingPeriodEnd: periodEnd.toISOString(),
        });
      }
    }

    // Sort by date, newest first
    invoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
    const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

    return NextResponse.json({
      invoices,
      summary: {
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        totalInvoices: invoices.length,
        paidCount: invoices.filter(inv => inv.status === 'paid').length,
        pendingCount: invoices.filter(inv => inv.status === 'pending').length,
        overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
      },
    });
  } catch (err) {
    console.error('Fetch invoices error:', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
