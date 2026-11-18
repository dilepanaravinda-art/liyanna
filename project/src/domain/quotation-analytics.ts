/** Read-only, tenant-scoped quotation funnel analytics. No external side effects. */
import Decimal from 'decimal.js';

export type QuoteState = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';
export interface QuoteMetricRecord {
  id: string;
  businessId: string;
  currency: string;
  total: string;
  status: QuoteState;
  createdAt: string; // YYYY-MM-DD
}
export interface QuoteCurrencyMetrics {
  currency: string;
  quoteCount: number;
  quotedValue: string;
  acceptedCount: number;
  acceptedValue: string;
  convertedCount: number;
  convertedValue: string;
  decidedCount: number;
  acceptanceRatePercent: string | null;
  conversionRatePercent: string | null;
}
const decided = new Set<QuoteState>(['accepted', 'rejected', 'converted']);
const accepted = new Set<QuoteState>(['accepted', 'converted']);
function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y,m,d] = date.split('-').map(Number);
  const actual = new Date(Date.UTC(y,m-1,d));
  return actual.getUTCFullYear() === y && actual.getUTCMonth() === m-1 && actual.getUTCDate() === d;
}
/** Rates: accepted / decided; converted / total quotes. Exclude unresolved quotes from acceptance denominator. */
export function quotationFunnel(
  businessId: string,
  records: readonly QuoteMetricRecord[],
  fromDate?: string,
  toDate?: string,
): QuoteCurrencyMetrics[] {
  if (fromDate && !validDate(fromDate)) throw new Error('Invalid start date');
  if (toDate && !validDate(toDate)) throw new Error('Invalid end date');
  if (fromDate && toDate && fromDate > toDate) throw new Error('Start date after end date');
  type Aggregate = { count: number; quoted: Decimal; accepted: number; acceptedValue: Decimal; converted: number; convertedValue: Decimal; decided: number };
  const grouped = new Map<string, Aggregate>();
  const ids = new Set<string>();
  for (const q of records) {
    if (q.businessId !== businessId) continue;
    if (!validDate(q.createdAt)) throw new Error('Invalid quotation date');
    if (fromDate && q.createdAt < fromDate || toDate && q.createdAt > toDate) continue;
    if (ids.has(q.id)) throw new Error('Duplicate quotation ID');
    ids.add(q.id);
    if (!/^[A-Z]{3}$/.test(q.currency)) throw new Error('Invalid currency');
    if (!['draft','pending_approval','approved','sent','viewed','accepted','rejected','expired','converted'].includes(q.status)) throw new Error('Invalid quotation status');
    const amount = new Decimal(q.total);
    if (!amount.isFinite() || amount.isNegative()) throw new Error('Invalid quotation amount');
    const a = grouped.get(q.currency) ?? { count:0, quoted:new Decimal(0), accepted:0, acceptedValue:new Decimal(0), converted:0, convertedValue:new Decimal(0), decided:0 };
    a.count++; a.quoted = a.quoted.plus(amount);
    if (decided.has(q.status)) a.decided++;
    if (accepted.has(q.status)) { a.accepted++; a.acceptedValue = a.acceptedValue.plus(amount); }
    if (q.status === 'converted') { a.converted++; a.convertedValue = a.convertedValue.plus(amount); }
    grouped.set(q.currency, a);
  }
  return [...grouped.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([currency,a]) => ({
    currency, quoteCount:a.count, quotedValue:a.quoted.toFixed(2),
    acceptedCount:a.accepted, acceptedValue:a.acceptedValue.toFixed(2),
    convertedCount:a.converted, convertedValue:a.convertedValue.toFixed(2),
    decidedCount:a.decided,
    acceptanceRatePercent:a.decided ? new Decimal(a.accepted).div(a.decided).mul(100).toFixed(2) : null,
    conversionRatePercent:a.count ? new Decimal(a.converted).div(a.count).mul(100).toFixed(2) : null,
  }));
}
