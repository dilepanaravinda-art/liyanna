import { describe, it, expect } from "vitest";
import { paymentBalance, convertAcceptedQuotation } from "./commercial";
import { emptyWorkspace, blankDocument } from "./model";

describe("commercial operations", () => {
  it("calculates partial and full payments using decimals", () => {
    const p = { id: "p", invoiceId: "i", currency: "USD", paidAt: "2026-11-18", reference: "bank", reconciliation: "reconciled" as const };
    expect(paymentBalance("0.30", "USD", [{...p, amount: "0.10"}, {...p, id: "p2", amount: "0.20"}])).toEqual({ received: "0.30", outstanding: "0.00", status: "paid" });
    expect(paymentBalance("100", "USD", [{...p, amount: "25"}]).status).toBe("partially_paid");
  });
  it("rejects mismatched currency, overpayment and invalid amounts", () => {
    const p = { id: "p", invoiceId: "i", amount: "101", currency: "USD", paidAt: "2026-11-18", reference: "bank", reconciliation: "reconciled" as const };
    expect(() => paymentBalance("100", "USD", [p])).toThrow();
    expect(() => paymentBalance("100", "LKR", [p])).toThrow();
    expect(() => paymentBalance("100", "USD", [{...p, amount: "-1"}])).toThrow();
  });
  it("converts only accepted quotations and does not mutate the source", () => {
    const ws = emptyWorkspace();
    const quote = blankDocument(ws.business, "quote", "QUO-2026-001");
    expect(() => convertAcceptedQuotation(quote, "draft", [], "INV-2026-001")).toThrow();
    const invoice = convertAcceptedQuotation(quote, "accepted", [], "INV-2026-001");
    expect(invoice.type).toBe("invoice");
    expect(invoice.id).not.toBe(quote.id);
    expect(invoice.items[0].id).not.toBe(quote.items[0].id);
    expect(quote.type).toBe("quote");
    expect(() => convertAcceptedQuotation(quote, "accepted", [invoice], "INV-2026-001")).toThrow();
  });
});
