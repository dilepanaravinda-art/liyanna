/** Additive, opt-in commercial lifecycle policy. Existing documents remain unchanged. */
export type QuotationStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type InvoiceStatus = 'draft' | 'pending_approval' | 'approved' | 'issued' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'voided';
export type CommercialStatus = QuotationStatus | InvoiceStatus;
export type CommercialDocumentKind = 'quote' | 'invoice';
const quoteTransitions: Record<QuotationStatus, readonly QuotationStatus[]> = {
  draft: ['pending_approval'], pending_approval: ['approved', 'draft'], approved: ['sent'],
  sent: ['viewed', 'accepted', 'rejected', 'expired'], viewed: ['accepted', 'rejected', 'expired'],
  accepted: ['converted'], rejected: [], expired: [], converted: [],
};
const invoiceTransitions: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ['pending_approval'], pending_approval: ['approved', 'draft'], approved: ['issued'],
  issued: ['sent', 'partially_paid', 'paid', 'overdue', 'voided'],
  sent: ['partially_paid', 'paid', 'overdue', 'voided'],
  partially_paid: ['paid', 'overdue'], paid: [], overdue: ['partially_paid', 'paid', 'voided'], voided: [],
};
export function canTransition(kind: 'quote', from: QuotationStatus, to: QuotationStatus): boolean;
export function canTransition(kind: 'invoice', from: InvoiceStatus, to: InvoiceStatus): boolean;
export function canTransition(kind: CommercialDocumentKind, from: CommercialStatus, to: CommercialStatus): boolean {
  return transitionAllowed(kind, from, to);
}
function transitionAllowed(kind: CommercialDocumentKind, from: CommercialStatus, to: CommercialStatus): boolean {
  const transitions: Record<string, readonly string[]> = kind === 'quote' ? quoteTransitions : invoiceTransitions;
  return Object.prototype.hasOwnProperty.call(transitions, from) && transitions[from].includes(to);
}
export function requireTransition(kind: CommercialDocumentKind, from: CommercialStatus, to: CommercialStatus): void {
  if (!transitionAllowed(kind, from, to)) throw new Error(`Invalid ${kind} status transition: ${from} -> ${to}`);
}
