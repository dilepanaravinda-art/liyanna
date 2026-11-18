/** Pure, opt-in commercial operations. No persistence or external side effects. */
import Decimal from "decimal.js";
import type { Document as LiyannaDocument } from "./model";
import { uid } from "./model";
import { canTransition, type QuotationStatus, type InvoiceStatus } from "./lifecycle";

export interface PaymentEntry {
  id: string;
  invoiceId: string;
  amount: string;
  currency: string;
  paidAt: string;
  reference: string;
  reconciliation: "unreconciled" | "reconciled" | "rejected";
}

export function convertAcceptedQuotation(
  quote: LiyannaDocument,
  status: QuotationStatus,
  existingInvoices: readonly LiyannaDocument[],
  invoiceNumber: string,
): LiyannaDocument {
  if (quote.type !== "quote" || status !== "accepted" || !canTransition("quote", status, "converted"))
    throw new Error("Only accepted quotations may be converted");
  if (existingInvoices.some(d => d.type === "invoice" && d.number === invoiceNumber && d.businessId === quote.businessId))
    throw new Error("Invoice number is already in use");
  // The caller must persist the source mapping atomically with invoice creation.
  // Do not use this pure helper as a concurrency-safe conversion endpoint.
  const now = new Date().toISOString();
  return {
    ...structuredClone(quote),
    id: uid(), type: "invoice", number: invoiceNumber,
    items: quote.items.map(item => ({ ...item, id: uid() })),
    issueDate: now.slice(0, 10), dueDate: "", revision: 0,
    createdAt: now, updatedAt: now,
  };
}

export function paymentBalance(invoiceTotal: string, currency: string, payments: readonly PaymentEntry[]) {
  const total = new Decimal(invoiceTotal);
  if (!total.isFinite() || total.isNegative()) throw new Error("Invalid invoice total");
  const received = payments.filter(p => p.reconciliation !== "rejected").reduce((sum, payment) => {
    if (payment.currency !== currency) throw new Error("Payment currency mismatch");
    const amount = new Decimal(payment.amount);
    if (!amount.isFinite() || !amount.isPositive()) throw new Error("Invalid payment amount");
    return sum.plus(amount);
  }, new Decimal(0));
  if (received.greaterThan(total)) throw new Error("Payments exceed invoice total");
  const remaining = total.minus(received);
  const status: InvoiceStatus = received.isZero() ? "issued" : remaining.isZero() ? "paid" : "partially_paid";
  return { received: received.toFixed(2), outstanding: remaining.toFixed(2), status };
}
