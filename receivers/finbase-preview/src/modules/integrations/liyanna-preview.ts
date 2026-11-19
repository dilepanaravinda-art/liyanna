import {z} from 'zod';
import Decimal from 'decimal.js';
import {createHash} from 'node:crypto';
const id=z.string().uuid();
const amount=z.string().regex(/^(0|[1-9]\d*)(\.\d{1,8})?$/).max(24);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const invoice=z.object({
 documentId:id,documentNumber:z.string().trim().min(1).max(80),revision:z.number().int().nonnegative(),
 issueDate:date,dueDate:date.nullable(),currency:z.string().regex(/^[A-Z]{3}$/),
 customerName:z.string().max(200),
 items:z.array(z.object({id:id,description:z.string().max(2000),quantity:amount,rate:amount}).strict()).min(1).max(500),
 totals:z.object({lines:z.array(amount).min(1).max(500),subtotal:amount,discount:amount,tax:amount,total:amount}).strict(),
 updatedAt:z.string().datetime(),
}).strict();
export const liyannaPreviewInput=z.object({
 sourceBusinessId:id,categoryId:z.string().min(1).max(100),
 snapshot:z.object({
  schemaVersion:z.literal('liyanna.invoice-snapshot.v1'),source:z.literal('liyanna'),
  mode:z.literal('read-only'),postingAuthorized:z.literal(false),origin:z.enum(['device','cloud']),
  businessId:id,businessName:z.string().min(1).max(200),workspaceRevision:z.number().int().nonnegative().nullable(),
  updatedAt:z.string().datetime(),documentStatus:z.literal('unspecified'),
  invoices:z.array(invoice).max(100),
 }).strict(),
}).strict();
export function previewLiyannaSnapshot(payload:unknown,context:{companyCurrency:string;mappingAvailable:boolean}) {
 const input=liyannaPreviewInput.parse(payload),s=input.snapshot;
 if(input.sourceBusinessId!==s.businessId)throw Error('SOURCE_BUSINESS_MISMATCH');
 const seen=new Set<string>(),numbers=new Set<string>();
 const rows=s.invoices.map(doc=>{
  if(seen.has(doc.documentId)||numbers.has(doc.documentNumber))throw Error('DUPLICATE_SOURCE_DOCUMENT');
  seen.add(doc.documentId);numbers.add(doc.documentNumber);
  const digits=new Intl.NumberFormat('en',{style:'currency',currency:doc.currency}).resolvedOptions().maximumFractionDigits!;
  const round=(v:Decimal)=>v.toDecimalPlaces(digits,Decimal.ROUND_HALF_UP);
  const lines=doc.items.map(item=>{
   const qty=new Decimal(item.quantity);if(qty.lte(0))throw Error('INVALID_QUANTITY');
   return round(qty.mul(item.rate));
  });
  const subtotal=lines.reduce((a,b)=>a.plus(b),new Decimal(0)),discount=new Decimal(doc.totals.discount),tax=new Decimal(doc.totals.tax);
  if(discount.gt(subtotal)||doc.totals.lines.length!==lines.length||lines.some((line,i)=>!line.eq(doc.totals.lines[i]))||
     !subtotal.eq(doc.totals.subtotal)||!subtotal.minus(discount).plus(tax).eq(doc.totals.total))throw Error('INCONSISTENT_SOURCE_TOTALS');
  if(new Decimal(doc.totals.total).gt('1000000000000'))throw Error('AMOUNT_TOO_LARGE');
  const issues=['ISSUANCE_REVIEW_REQUIRED'];
  if(doc.currency!==context.companyCurrency)issues.push('CURRENCY_MAPPING_REQUIRED');
  if(digits!==2)issues.push('CURRENCY_PRECISION_REVIEW_REQUIRED');
  if(!context.mappingAvailable)issues.push('REVENUE_MAPPING_REQUIRED');
  if(!doc.customerName.trim())issues.push('CUSTOMER_REQUIRED');
  if(doc.customerName.trim().length>160)issues.push('CUSTOMER_NAME_REVIEW_REQUIRED');
  if(!doc.dueDate)issues.push('DUE_DATE_REQUIRED');
  if(doc.dueDate && doc.dueDate<doc.issueDate)issues.push('INVALID_DUE_DATE');
  if(tax.gt(0))issues.push('TAX_ACCOUNT_MAPPING_REQUIRED');
  if(new Decimal(doc.totals.total).lte(0))issues.push('POSITIVE_AMOUNT_REQUIRED');
  return {documentId:doc.documentId,documentNumber:doc.documentNumber,revision:doc.revision,
   sourceCurrency:doc.currency,companyCurrency:context.companyCurrency,amount:doc.totals.total,
   customerName:doc.customerName,transactionDate:doc.issueDate,dueDate:doc.dueDate,
   proposedRevenueCategory:input.categoryId,
   candidateIdempotencyKey:createHash('sha256').update(JSON.stringify(['liyanna',s.businessId,doc.documentId,doc.revision])).digest('hex'),
   postingAuthorized:false,issues};
 });
 return {mode:'review-only',postingAuthorized:false,sourceBusinessId:s.businessId,origin:s.origin,
  mappingPersisted:false,documentCount:rows.length,documents:rows};
}
