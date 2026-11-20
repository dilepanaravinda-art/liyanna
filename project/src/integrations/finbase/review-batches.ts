import Decimal from "decimal.js";
import type { WorkspaceSnapshot } from "../../domain/model";
import { currencyDigits } from "../../domain/money";
import { invoiceHandoff } from "./handoff";

// Leave room for the receiver's business/mapping request envelope (64 KB).
export const REVIEW_FILE_LIMIT = 60_000;
export const REVIEW_INVOICE_LIMIT = 100;
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
export function invoiceReviewBatches(workspace: WorkspaceSnapshot) {
  const snapshot = invoiceHandoff(workspace, "device");
  if (!snapshot.businessName.trim() || snapshot.businessName.length > 200)
    throw Error("Enter a business name of up to 200 characters before exporting.");
  const ids = new Set<string>(), numbers = new Set<string>();
  const invoices = snapshot.invoices.map(invoice => {
    const number = invoice.documentNumber.trim();
    if (!number || number.length > 80) throw Error("Invoice numbers must contain 1 to 80 characters.");
    if (ids.has(invoice.documentId) || numbers.has(number))
      throw Error("Duplicate invoice IDs or numbers found. Give each invoice a unique number before exporting.");
    ids.add(invoice.documentId); numbers.add(number);
    if (invoice.customerName.length > 200 || invoice.items.length > 500 || invoice.items.some(i => i.description.length > 2000))
      throw Error("An invoice exceeds the review field limits. Shorten long customer or item descriptions, or split large invoices.");
    return {...invoice, documentNumber: number, items: invoice.items.map(item => ({...item,
      quantity: new Decimal(item.quantity).toFixed(), rate: new Decimal(item.rate).toFixed(),
    }))};
  });
  const batches: typeof snapshot[] = [];
  let current: typeof snapshot = {...snapshot, invoices: []};
  for (const invoice of invoices) {
    const candidate = {...current, invoices: [...current.invoices, invoice]};
    if (candidate.invoices.length > REVIEW_INVOICE_LIMIT || bytes(candidate) > REVIEW_FILE_LIMIT) {
      if (current.invoices.length) batches.push(current);
      current = {...snapshot, invoices: [invoice]};
      if (bytes(current) > REVIEW_FILE_LIMIT)
        throw Error("An invoice is too large for a review file. Split its line items into smaller invoices before exporting.");
    } else current = candidate;
  }
  if (current.invoices.length) batches.push(current);
  const checks = [
    {label: "Customer name missing", count: invoices.filter(d => !d.customerName.trim()).length},
    {label: "Customer name needs shortening for FINBASE", count: invoices.filter(d => d.customerName.trim().length > 160).length},
    {label: "Due date missing", count: invoices.filter(d => !d.dueDate).length},
    {label: "Due date precedes invoice date", count: invoices.filter(d => d.dueDate && d.dueDate < d.issueDate).length},
    {label: "Tax account mapping needed", count: invoices.filter(d => new Decimal(d.totals.tax).gt(0)).length},
    {label: "Positive invoice amount needed", count: invoices.filter(d => new Decimal(d.totals.total).lte(0)).length},
    {label: "Currency precision review needed", count: invoices.filter(d => currencyDigits(d.currency) !== 2).length},
    {label: "Issuance approval needed", count: invoices.length},
  ];
  return {batches, checks, invoiceCount: invoices.length, currencies: [...new Set(invoices.map(d => d.currency))]};
}
