import { describe, expect, it } from "vitest";
import { validateFinbaseStatus, validateInvoicePublication, type ConnectionPolicy } from "./contracts";
const policy: ConnectionPolicy = { tenantId: "t1", businessId: "b1", mode: "finbase_connected", enabled: true, scopes: ["payment:read", "invoice:publish"] };
const base = { schemaVersion: "1.0", eventId: "11111111-1111-4111-8111-111111111111", occurredAt: "2026-11-18T10:00:00Z", tenantId: "t1", businessId: "b1" };
const status = { ...base, source: "finbase", liyannaDocumentId: "doc1", finbaseReceivableId: "ar1", currency: "LKR", invoiceTotal: "100.00", reconciledReceived: "40.00", outstanding: "60.00", status: "partially_paid", reconciledAt: null };
const invoice = { ...base, source: "liyanna", documentId: "doc1", documentNumber: "INV-2026-001", customerRef: "customer1", currency: "LKR", issuedOn: "2026-11-18", dueOn: null, total: "100.00", taxTotal: "0.00", revision: 1 };
describe("VIG FINBASE boundary", () => {
 it("accepts a valid scoped payment status", () => expect(validateFinbaseStatus(status, policy).outstanding).toBe("60.00"));
 it("rejects cross-tenant payment events", () => expect(() => validateFinbaseStatus({ ...status, tenantId: "other" }, policy)).toThrow());
 it("rejects disconnected access", () => expect(() => validateFinbaseStatus(status, { ...policy, enabled: false })).toThrow());
 it("rejects invalid money and extra fields", () => { expect(() => validateFinbaseStatus({ ...status, outstanding: "-10" }, policy)).toThrow(); expect(() => validateFinbaseStatus({ ...status, secret: "x" }, policy)).toThrow(); });
 it("accepts invoice publication only with scope", () => expect(validateInvoicePublication(invoice, policy).documentId).toBe("doc1"));
 it("rejects invoice publication without consent", () => expect(() => validateInvoicePublication(invoice, { ...policy, scopes: ["payment:read"] })).toThrow());
});
