import { describe, expect, it } from 'vitest';
import { commercialSummary, type ReportInvoice, type ReportPayment } from './commercial-reporting';
const invoices: ReportInvoice[] = [
  { id:'i1', businessId:'b1', currency:'USD', total:'100.30', issuedAt:'2026-11-01', dueDate:'2026-11-10', status:'issued' },
  { id:'i2', businessId:'b1', currency:'LKR', total:'1000', issuedAt:'2026-11-01', dueDate:'2026-11-30', status:'issued' },
  { id:'i3', businessId:'b2', currency:'USD', total:'500', issuedAt:'2026-11-01', status:'issued' },
];
const payments: ReportPayment[] = [
  { id:'p1', businessId:'b1', invoiceId:'i1', currency:'USD', amount:'25.10', reconciliation:'reconciled' },
  { id:'p2', businessId:'b1', invoiceId:'i1', currency:'USD', amount:'50', reconciliation:'unreconciled' },
];
describe('commercial reporting', () => {
  it('separates currencies, tenants and unconfirmed receipts', () => {
    expect(commercialSummary('b1', invoices, payments, '2026-11-18')).toEqual([
      {currency:'LKR',invoiceCount:1,invoiced:'1000.00',received:'0.00',outstanding:'1000.00',overdue:'0.00'},
      {currency:'USD',invoiceCount:1,invoiced:'100.30',received:'25.10',outstanding:'75.20',overdue:'75.20'},
    ]);
  });
  it('rejects duplicate payment IDs and overpayment', () => {
    expect(() => commercialSummary('b1', invoices, [...payments, payments[0]], '2026-11-18')).toThrow('Duplicate payment ID');
    expect(() => commercialSummary('b1', invoices, [{...payments[0], amount:'101'}], '2026-11-18')).toThrow('exceed');
  });
  it('excludes voided invoices', () => {
    expect(commercialSummary('b1', [{...invoices[0], status:'voided'}], [], '2026-11-18')).toEqual([]);
  });
});
