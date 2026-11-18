import { describe, expect, it } from 'vitest';
import { quotationFunnel, type QuoteMetricRecord } from './quotation-analytics';
const q: QuoteMetricRecord[] = [
  {id:'1',businessId:'a',currency:'USD',total:'100.10',status:'accepted',createdAt:'2026-11-01'},
  {id:'2',businessId:'a',currency:'USD',total:'200',status:'rejected',createdAt:'2026-11-02'},
  {id:'3',businessId:'a',currency:'USD',total:'300',status:'converted',createdAt:'2026-11-03'},
  {id:'4',businessId:'a',currency:'LKR',total:'500',status:'draft',createdAt:'2026-11-04'},
  {id:'5',businessId:'b',currency:'USD',total:'900',status:'converted',createdAt:'2026-11-04'},
];
describe('quotation funnel', () => {
  it('separates tenants and currencies, and counts converted as accepted', () => {
    expect(quotationFunnel('a',q)).toEqual([
      {currency:'LKR',quoteCount:1,quotedValue:'500.00',acceptedCount:0,acceptedValue:'0.00',convertedCount:0,convertedValue:'0.00',decidedCount:0,acceptanceRatePercent:null,conversionRatePercent:'0.00'},
      {currency:'USD',quoteCount:3,quotedValue:'600.10',acceptedCount:2,acceptedValue:'400.10',convertedCount:1,convertedValue:'300.00',decidedCount:3,acceptanceRatePercent:'66.67',conversionRatePercent:'33.33'},
    ]);
  });
  it('filters inclusive date range', () => { expect(quotationFunnel('a',q,'2026-11-03','2026-11-03')[0].quoteCount).toBe(1); });
  it('rejects duplicate IDs and invalid calendar dates', () => {
    expect(() => quotationFunnel('a',[q[0],q[0]])).toThrow('Duplicate');
    expect(() => quotationFunnel('a',[{...q[0],createdAt:'2026-02-30'}])).toThrow('date');
  });
  it('rejects negative amounts', () => expect(() => quotationFunnel('a',[{...q[0],total:'-1'}])).toThrow('amount'));
});
