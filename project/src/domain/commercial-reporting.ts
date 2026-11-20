/** Deterministic, currency-separated commercial metrics. No persistence or AI inference. */
import Decimal from 'decimal.js';

export type ReportInvoice = {
  id: string; businessId: string; currency: string; total: string;
  issuedAt: string; dueDate?: string; status: 'issued'|'sent'|'partially_paid'|'paid'|'overdue'|'voided';
};
export type ReportPayment = {
  id: string; businessId: string; invoiceId: string; currency: string;
  amount: string; reconciliation: 'unreconciled'|'reconciled'|'rejected';
};
export type CurrencySummary = {
  currency: string; invoiceCount: number; invoiced: string;
  received: string; outstanding: string; overdue: string;
};

function amount(value: string): Decimal {
  const n = new Decimal(value);
  if (!n.isFinite() || n.isNegative()) throw new Error('Invalid monetary amount');
  return n;
}
function isoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    throw new Error('Invalid reporting date');
  return value;
}
/** Unreconciled payments are excluded from confirmed receipts until reconciliation. */
export function commercialSummary(
  businessId: string, invoices: readonly ReportInvoice[], payments: readonly ReportPayment[], asOfDate: string,
): CurrencySummary[] {
  isoDate(asOfDate);
  const filtered = invoices.filter(i => i.businessId === businessId && i.status !== 'voided');
  const byId = new Map<string, ReportInvoice>();
  for (const invoice of filtered) {
    if (byId.has(invoice.id)) throw new Error('Duplicate invoice ID');
    if (!/^[A-Z]{3}$/.test(invoice.currency)) throw new Error('Invalid currency');
    amount(invoice.total);
    isoDate(invoice.issuedAt);
    if (invoice.dueDate) isoDate(invoice.dueDate);
    byId.set(invoice.id, invoice);
  }
  const paid = new Map<string, Decimal>();
  const paymentIds = new Set<string>();
  for (const payment of payments) {
    if (payment.businessId !== businessId) continue;
    if (paymentIds.has(payment.id)) throw new Error('Duplicate payment ID');
    paymentIds.add(payment.id);
    const invoice = byId.get(payment.invoiceId);
    if (!invoice) continue; // exclude payments for voided or out-of-scope invoices
    if (payment.currency !== invoice.currency) throw new Error('Payment currency mismatch');
    const n = amount(payment.amount);
    if (payment.reconciliation !== 'reconciled') continue;
    paid.set(invoice.id, (paid.get(invoice.id) ?? new Decimal(0)).plus(n));
  }
  const sums = new Map<string, { count: number; invoiced: Decimal; received: Decimal; outstanding: Decimal; overdue: Decimal }>();
  for (const invoice of filtered) {
    const total = amount(invoice.total);
    const received = paid.get(invoice.id) ?? new Decimal(0);
    if (received.gt(total)) throw new Error('Confirmed payments exceed invoice total');
    const balance = total.minus(received);
    const row = sums.get(invoice.currency) ?? { count: 0, invoiced: new Decimal(0), received: new Decimal(0), outstanding: new Decimal(0), overdue: new Decimal(0) };
    row.count++;
    row.invoiced = row.invoiced.plus(total);
    row.received = row.received.plus(received);
    row.outstanding = row.outstanding.plus(balance);
    if (invoice.dueDate && invoice.dueDate < asOfDate) row.overdue = row.overdue.plus(balance);
    sums.set(invoice.currency, row);
  }
  return [...sums.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([currency, s]) => ({
    currency, invoiceCount: s.count, invoiced: s.invoiced.toFixed(2), received: s.received.toFixed(2),
    outstanding: s.outstanding.toFixed(2), overdue: s.overdue.toFixed(2),
  }));
}
