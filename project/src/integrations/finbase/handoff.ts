import { workspaceSchema } from "../../domain/validation";
import { calculate } from "../../domain/money";
import type { WorkspaceSnapshot } from "../../domain/model";

/** A review snapshot, never an invoice-issued event or authorization to post. */
export function invoiceHandoff(input: WorkspaceSnapshot, origin: "device" | "cloud", revision: number | null = null) {
 const workspace=workspaceSchema.parse(input);
 return {
   schemaVersion: "liyanna.invoice-snapshot.v1" as const,
   source: "liyanna" as const,
   mode: "read-only" as const,
   postingAuthorized: false as const,
   origin,
   businessId: workspace.business.id,
   businessName: workspace.business.name,
   workspaceRevision: revision,
   updatedAt: workspace.updatedAt,
   documentStatus: "unspecified" as const,
   invoices: workspace.documents.filter(d=>d.type==="invoice").map(d=>({
     documentId:d.id, documentNumber:d.number, revision:d.revision,
     issueDate:d.issueDate, dueDate:d.dueDate || null, currency:d.currency,
     customerName:d.customer.name, items:d.items.map(i=>({...i})),
     totals:calculate(d), updatedAt:d.updatedAt,
   })),
 };
}
