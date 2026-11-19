import {describe, it, expect} from "vitest";
import {emptyWorkspace, blankDocument} from "../../domain/model";
import {invoiceReviewBatches, REVIEW_FILE_LIMIT} from "./review-batches";
function fixture(count = 1) {
  const ws = emptyWorkspace(); ws.business.name = "Review company"; ws.business.currency = "LKR";
  ws.documents = Array.from({length: count}, (_, i) => {
    const doc = blankDocument(ws.business, "invoice", `INV-${i + 1}`);
    doc.items[0].rate = "125.50"; doc.customer.name = "Customer";
    return doc;
  });
  return ws;
}
describe("receiver-compatible review batches", () => {
  it("covers every invoice exactly once and excludes quotes without changing the workspace", () => {
    const ws = fixture(205); ws.documents.push(blankDocument(ws.business, "quote", "Q1"));
    const before = JSON.stringify(ws), result = invoiceReviewBatches(ws);
    const ids = result.batches.flatMap(b => b.invoices.map(d => d.documentId));
    expect(ids).toEqual(ws.documents.filter(d => d.type === "invoice").map(d => d.id));
    expect(new Set(ids).size).toBe(205);
    expect(result.batches.every(b => b.invoices.length <= 100)).toBe(true);
    expect(JSON.stringify(ws)).toBe(before);
  });
  it("counts UTF-8 bytes and splits long multilingual invoice records within file limits", () => {
    const ws = fixture(50);
    ws.documents.forEach(doc => {doc.items[0].description = "සිංහල".repeat(100);});
    const result = invoiceReviewBatches(ws);
    expect(result.batches.length).toBeGreaterThan(1);
    expect(result.batches.every(b => new TextEncoder().encode(JSON.stringify(b)).length <= REVIEW_FILE_LIMIT)).toBe(true);
    expect(result.batches.flatMap(b => b.invoices)).toHaveLength(50);
  });
  it("rejects a single oversized invoice instead of dropping or truncating it", () => {
    const ws = fixture();
    ws.documents[0].items = Array.from({length: 40}, () => ({id:crypto.randomUUID(),description:"x".repeat(1900),quantity:"1",rate:"1"}));
    expect(() => invoiceReviewBatches(ws)).toThrow(/too large/);
  });
  it("rejects duplicate trimmed numbers even when they would land in different files", () => {
    const ws = fixture(102); ws.documents[101].number = " INV-1 ";
    expect(() => invoiceReviewBatches(ws)).toThrow(/Duplicate/);
  });
  it("reports source gaps and preserves the no-posting envelope in every batch", () => {
    const ws = fixture(); ws.documents[0].customer.name = ""; ws.documents[0].tax = "10";
    const result = invoiceReviewBatches(ws);
    expect(result.checks.filter(c => c.count).map(c => c.label)).toEqual([
      "Customer name missing", "Due date missing", "Tax account mapping needed", "Issuance approval needed",
    ]);
    for (const batch of result.batches) {
      expect(batch.postingAuthorized).toBe(false); expect(batch.documentStatus).toBe("unspecified");
      expect(batch.invoices[0].totals.total).toBe("138.05");
    }
  });
  it("canonicalizes amount strings for the strict receiver without changing exact values", () => {
    const ws = fixture(); ws.documents[0].items[0].rate = "00125.5000";
    const invoice = invoiceReviewBatches(ws).batches[0].invoices[0];
    expect(invoice.items[0].rate).toBe("125.5"); expect(invoice.totals.total).toBe("125.50");
  });
  it("produces no empty files when there are no invoices", () => {
    expect(invoiceReviewBatches(fixture(0)).batches).toEqual([]);
  });
});
