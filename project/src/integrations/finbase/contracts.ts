/** VIG v1 draft contract. This is not a verified FINBASE API specification. */
import { z } from "zod";

const identifier = z.string().trim().min(1).max(160);
const money = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,4})?$/, "Use a nonnegative decimal string");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const currency = z.string().regex(/^[A-Z]{3}$/);

export const invoiceIssuedV1 = z.object({
  schemaVersion: z.literal("1.0"),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  tenantId: identifier,
  businessId: identifier,
  source: z.literal("liyanna"),
  documentId: identifier,
  documentNumber: identifier,
  customerRef: identifier,
  currency,
  issuedOn: isoDate,
  dueOn: isoDate.nullable(),
  total: money,
  taxTotal: money,
  revision: z.number().int().nonnegative(),
}).strict();
export type InvoiceIssuedV1 = z.infer<typeof invoiceIssuedV1>;

export const paymentStatusV1 = z.object({
  schemaVersion: z.literal("1.0"),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  tenantId: identifier,
  businessId: identifier,
  source: z.literal("finbase"),
  liyannaDocumentId: identifier,
  finbaseReceivableId: identifier,
  currency,
  invoiceTotal: money,
  reconciledReceived: money,
  outstanding: money,
  status: z.enum(["unpaid", "partially_paid", "paid", "overdue", "voided"]),
  reconciledAt: z.string().datetime({ offset: true }).nullable(),
}).strict();
export type PaymentStatusV1 = z.infer<typeof paymentStatusV1>;

export type IntegrationMode = "disconnected" | "standalone" | "finbase_connected";
export type ConnectionPolicy = {
  tenantId: string;
  businessId: string;
  mode: IntegrationMode;
  enabled: boolean;
  scopes: readonly ("invoice:publish" | "payment:read")[];
};

/** Gate incoming status data before rendering; persistence must additionally enforce idempotency. */
export function validateFinbaseStatus(payload: unknown, policy: ConnectionPolicy) {
  if (!policy.enabled || policy.mode !== "finbase_connected" || !policy.scopes.includes("payment:read"))
    throw new Error("FINBASE payment read access is disabled");
  const parsed = paymentStatusV1.parse(payload);
  if (parsed.tenantId !== policy.tenantId || parsed.businessId !== policy.businessId)
    throw new Error("Tenant/business scope mismatch");
  return parsed;
}

/** Prevent invoice publication when connection consent/scope is absent. */
export function validateInvoicePublication(payload: unknown, policy: ConnectionPolicy) {
  if (!policy.enabled || policy.mode !== "finbase_connected" || !policy.scopes.includes("invoice:publish"))
    throw new Error("FINBASE invoice publishing is disabled");
  const parsed = invoiceIssuedV1.parse(payload);
  if (parsed.tenantId !== policy.tenantId || parsed.businessId !== policy.businessId)
    throw new Error("Tenant/business scope mismatch");
  return parsed;
}
