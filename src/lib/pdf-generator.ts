// Invoice PDF & HTML generation for VoiceAI SaaS Platform
// Generates professional GST-compliant invoice documents

// ============================
// Types
// ============================

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  planType: string;
  planPrice: number; // in paisa
  subtotal: number;  // in paisa
  gstPercent: number;
  gstAmount: number; // in paisa
  totalAmount: number; // in paisa
  paidAmount: number;  // in paisa
  currency: string;
  items: InvoiceLineItem[];
  notes?: string | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in paisa
  amount: number;    // in paisa
}

export interface ClinicPDFData {
  name: string;
  doctorName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
}

// ============================
// Helpers
// ============================

function toRupees(paisa: number): string {
  return (paisa / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter Plan',
  pro: 'Professional Plan',
  enterprise: 'Enterprise Plan',
};

const PLAN_CALLS: Record<string, number> = {
  starter: 500,
  pro: 2000,
  enterprise: 0, // unlimited
};

// ============================
// Invoice PDF Generator
// ============================

export function generateInvoicePDF(invoice: InvoicePDFData, clinic: ClinicPDFData): string {
  const balanceDue = invoice.totalAmount - invoice.paidAmount;
  const planLabel = PLAN_LABELS[invoice.planType] || invoice.planType;
  const planCalls = PLAN_CALLS[invoice.planType];

  const fullAddress = [
    clinic.address,
    clinic.city,
    clinic.state,
    clinic.pincode,
  ].filter(Boolean).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.5;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Header */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 3px solid #0d9488;
    }
    .company-info {
      flex: 1;
    }
    .company-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #059669, #0d9488);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 22px;
      font-weight: 800;
    }
    .company-name {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .company-tagline {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .company-details {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.7;
    }
    .company-details .label {
      color: #64748b;
      font-weight: 500;
    }

    /* Invoice Title */
    .invoice-title-block {
      text-align: right;
    }
    .invoice-title {
      font-size: 24px;
      font-weight: 800;
      color: #0d9488;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta .row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 4px;
      font-size: 11.5px;
    }
    .invoice-meta .label {
      color: #64748b;
      font-weight: 500;
    }
    .invoice-meta .value {
      font-weight: 600;
      color: #1e293b;
    }

    /* Status Badge */
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }
    .status-paid {
      background: #d1fae5;
      color: #065f46;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .status-overdue {
      background: #ffe4e6;
      color: #9f1239;
    }

    /* Bill To Section */
    .bill-to-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 28px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0d9488;
      margin-bottom: 8px;
    }
    .bill-to-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .bill-to-doctor {
      font-size: 12px;
      color: #475569;
      margin-bottom: 6px;
    }
    .bill-to-address {
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .bill-to-contact {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
    }

    /* Invoice Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .detail-item {
      background: white;
    }
    .detail-item .detail-label {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-item .detail-value {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .items-table thead th {
      background: #0d9488;
      color: white;
      padding: 10px 14px;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4),
    .items-table thead th:nth-child(5) {
      text-align: right;
    }
    .items-table thead th:first-child {
      border-radius: 8px 0 0 0;
    }
    .items-table thead th:last-child {
      border-radius: 0 8px 0 0;
    }
    .items-table tbody td {
      padding: 10px 14px;
      font-size: 11.5px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .items-table tbody td:nth-child(3),
    .items-table tbody td:nth-child(4),
    .items-table tbody td:nth-child(5) {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .items-table tbody tr:last-child td {
      border-bottom: none;
    }
    .items-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .items-table .item-desc {
      font-weight: 500;
      color: #1e293b;
    }
    .items-table .item-desc-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .sn-column {
      width: 40px;
      text-align: center !important;
      color: #94a3b8;
      font-weight: 500;
    }

    /* Summary Section */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .summary-box {
      width: 280px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      font-size: 12px;
    }
    .summary-row:not(:last-child) {
      border-bottom: 1px solid #f1f5f9;
    }
    .summary-row .summary-label {
      color: #64748b;
    }
    .summary-row .summary-value {
      font-weight: 600;
      color: #1e293b;
      font-variant-numeric: tabular-nums;
    }
    .summary-row.total {
      background: #0d9488;
      padding: 12px 16px;
    }
    .summary-row.total .summary-label {
      color: rgba(255,255,255,0.9);
      font-weight: 600;
    }
    .summary-row.total .summary-value {
      color: white;
      font-weight: 800;
      font-size: 16px;
    }
    .summary-row.balance {
      background: #fef3c7;
    }
    .summary-row.balance .summary-label {
      color: #92400e;
      font-weight: 600;
    }
    .summary-row.balance .summary-value {
      color: #92400e;
      font-weight: 700;
    }

    /* Footer */
    .invoice-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    .thank-you {
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      color: #0d9488;
      margin-bottom: 20px;
    }
    .bank-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .bank-section {
      padding: 14px 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .bank-section .section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0d9488;
      margin-bottom: 6px;
    }
    .bank-section .detail-row {
      display: flex;
      gap: 8px;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .bank-section .detail-row .label {
      color: #94a3b8;
      min-width: 70px;
    }
    .bank-section .detail-row .value {
      color: #334155;
      font-weight: 500;
    }
    .terms-section {
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.7;
    }
    .terms-section .section-label {
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }

    /* Print styles */
    @media print {
      body {
        padding: 0;
        margin: 0;
        max-width: none;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="invoice-header">
    <div class="company-info">
      <div class="company-logo">
        <div class="logo-icon">V</div>
        <div>
          <div class="company-name">VoiceAI Technologies</div>
          <div class="company-tagline">AI-Powered Patient Communication Platform</div>
        </div>
      </div>
      <div class="company-details">
        <div><span class="label">GSTIN: </span>27AADCV1234F1Z5</div>
        <div><span class="label">PAN: </span>AADCV1234F</div>
        <div><span class="label">CIN: </span>U72200MH2020PTC345678</div>
        <div><span class="label">Address: </span>301, Infinity Tower, Bandra Kurla Complex,</div>
        <div style="padding-left: 58px;">Mumbai, Maharashtra - 400051</div>
      </div>
    </div>
    <div class="invoice-title-block">
      <div class="invoice-title">TAX INVOICE</div>
      <div class="invoice-meta">
        <div class="row">
          <span class="label">Invoice No:</span>
          <span class="value">${invoice.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">Date:</span>
          <span class="value">${formatDate(invoice.invoiceDate)}</span>
        </div>
        <div class="row">
          <span class="label">Due Date:</span>
          <span class="value">${formatDate(invoice.dueDate)}</span>
        </div>
      </div>
      <div style="text-align: right; margin-top: 6px;">
        <span class="status-badge status-${invoice.status}">${invoice.status}</span>
      </div>
    </div>
  </div>

  <!-- Bill To & Invoice Details -->
  <div class="bill-to-section">
    <div>
      <div class="section-label">Bill To</div>
      <div class="bill-to-name">${clinic.name}</div>
      <div class="bill-to-doctor">${clinic.doctorName}</div>
      <div class="bill-to-address">
        ${fullAddress || 'N/A'}
      </div>
      ${clinic.phone ? `<div class="bill-to-contact">Tel: ${clinic.phone}</div>` : ''}
      ${clinic.email ? `<div class="bill-to-contact">Email: ${clinic.email}</div>` : ''}
    </div>
    <div>
      <div class="section-label">Invoice Details</div>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Period Start</div>
          <div class="detail-value">${formatDate(invoice.periodStart)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Period End</div>
          <div class="detail-value">${formatDate(invoice.periodEnd)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Due Date</div>
          <div class="detail-value">${formatDate(invoice.dueDate)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="sn-column">S/N</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price (₹)</th>
        <th>Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, i) => `
        <tr>
          <td class="sn-column">${i + 1}</td>
          <td>
            <div class="item-desc">${item.description}</div>
          </td>
          <td>${item.quantity}</td>
          <td>${toRupees(item.unitPrice)}</td>
          <td style="font-weight: 600;">${toRupees(item.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary-section">
    <div class="summary-box">
      <div class="summary-row">
        <span class="summary-label">Subtotal</span>
        <span class="summary-value">₹${toRupees(invoice.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">GST @ ${invoice.gstPercent}%</span>
        <span class="summary-value">₹${toRupees(invoice.gstAmount)}</span>
      </div>
      <div class="summary-row total">
        <span class="summary-label">Total Amount</span>
        <span class="summary-value">₹${toRupees(invoice.totalAmount)}</span>
      </div>
      ${invoice.paidAmount > 0 ? `
        <div class="summary-row">
          <span class="summary-label">Amount Paid</span>
          <span class="summary-value" style="color: #059669;">- ₹${toRupees(invoice.paidAmount)}</span>
        </div>
      ` : ''}
      ${balanceDue > 0 ? `
        <div class="summary-row balance">
          <span class="summary-label">Balance Due</span>
          <span class="summary-value">₹${toRupees(balanceDue)}</span>
        </div>
      ` : ''}
    </div>
  </div>

  <!-- Amount in Words -->
  <div style="margin-bottom: 24px; padding: 10px 16px; background: #f0fdf4; border-radius: 6px; border: 1px solid #d1fae5; font-size: 11px;">
    <span style="color: #065f46; font-weight: 600;">Amount in Words: </span>
    <span style="color: #1e293b;">Rupees ${numberToWords(invoice.totalAmount)} Only</span>
  </div>

  <!-- Footer -->
  <div class="invoice-footer">
    <div class="thank-you">Thank you for your business! 🙏</div>

    <div class="bank-details">
      <div class="bank-section">
        <div class="section-label">Bank Details (NEFT/RTGS)</div>
        <div class="detail-row">
          <span class="label">Bank:</span>
          <span class="value">Axis Bank Ltd</span>
        </div>
        <div class="detail-row">
          <span class="label">A/C No:</span>
          <span class="value">912020012345678</span>
        </div>
        <div class="detail-row">
          <span class="label">IFSC:</span>
          <span class="value">UTIB0001234</span>
        </div>
        <div class="detail-row">
          <span class="label">A/C Name:</span>
          <span class="value">VoiceAI Technologies Pvt Ltd</span>
        </div>
      </div>
      <div class="bank-section">
        <div class="section-label">UPI Payment</div>
        <div class="detail-row">
          <span class="label">UPI ID:</span>
          <span class="value">voiceai@axis</span>
        </div>
        <div class="detail-row">
          <span class="label">QR Code:</span>
          <span class="value">Scan at voiceai.in/pay</span>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
          <div class="section-label">Contact Us</div>
          <div class="detail-row">
            <span class="label">Email:</span>
            <span class="value">billing@voiceai.in</span>
          </div>
          <div class="detail-row">
            <span class="label">Phone:</span>
            <span class="value">+91-22-4567-8900</span>
          </div>
        </div>
      </div>
    </div>

    <div class="terms-section">
      <div class="section-label">Terms & Conditions</div>
      <div>1. Payment is due within 15 days from the invoice date unless otherwise agreed.</div>
      <div>2. Late payments may attract interest at 18% per annum.</div>
      <div>3. All disputes are subject to Mumbai jurisdiction.</div>
      <div>4. This is a computer-generated invoice and does not require a signature.</div>
      <div style="margin-top: 8px; color: #cbd5e1;">Generated by VoiceAI Platform on ${formatFullDate(new Date().toISOString())}</div>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

// ============================
// Number to Words (Indian System)
// ============================

function numberToWords(paisa: number): string {
  const rupees = Math.floor(paisa / 100);
  const paise = paisa % 100;
  let result = '';

  if (rupees === 0) {
    result = 'Zero';
  } else {
    result = convertToIndianWords(rupees);
  }

  result += ' Rupees';

  if (paise > 0) {
    result += ` and ${convertToIndianWords(paise)} Paise`;
  }

  return result;
}

function convertToIndianWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return `Minus ${convertToIndianWords(-num)}`;

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    }
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertBelowThousand(n % 100) : '');
  }

  if (num < 1000) return convertBelowThousand(num);

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';
  if (crores > 0) result += convertBelowThousand(crores) + ' Crore' + (crores > 1 ? 's' : '');
  if (lakhs > 0) result += (result ? ' ' : '') + convertBelowThousand(lakhs) + ' Lakh' + (lakhs > 1 ? 's' : '');
  if (thousands > 0) result += (result ? ' ' : '') + convertBelowThousand(thousands) + ' Thousand';
  if (remainder > 0) result += (result ? ' ' : '') + convertBelowThousand(remainder);

  return result;
}

// ============================
// Legacy: Browser print PDF
// ============================

export function generatePDFFromHTML(title: string, htmlContent: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1e293b; }
        h1 { color: #059669; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
        .date { color: #94a3b8; font-size: 12px; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f0fdf4; color: #065f46; padding: 10px 12px; text-align: left; font-size: 13px; border-bottom: 2px solid #d1fae5; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        tr:hover { background: #f8fafc; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
        .badge-emerald { background: #d1fae5; color: #065f46; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .badge-rose { background: #ffe4e6; color: #9f1239; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #059669; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      ${htmlContent}
      <div class="footer">Generated by VoiceAI Platform — ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `);

  printWindow.document.close();
}
