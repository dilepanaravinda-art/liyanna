import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { blankDocument, emptyWorkspace } from "../domain/model";
import { buildDefinition } from "./template";
import { makeProbe } from "./probe";

function font(name: string) {
  return readFileSync(resolve(process.cwd(), "public/fonts", name));
}
function render(definition: TDocumentDefinitions): Promise<Buffer> {
  const printer = new PdfPrinter({
    NotoSans: {
      normal: font("NotoSans-Regular.ttf"),
      bold: font("NotoSans-Bold.ttf"),
      italics: font("NotoSans-Regular.ttf"),
      bolditalics: font("NotoSans-Bold.ttf"),
    },
  });
  const stream = printer.createPdfKitDocument(definition);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.end();
  });
}
function verifyPdf(bytes: Uint8Array, multipage = false) {
  const pdf = Buffer.from(bytes).toString("latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(pdf).not.toContain("NaN");
  const pages = pdf.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  expect(pages).toBeGreaterThanOrEqual(multipage ? 2 : 1);
}
describe("PDF generation with bundled fonts", () => {
  for (const type of ["invoice", "quote"] as const) {
    it(`renders a complete multipage ${type} using the application template`, async () => {
      const workspace = emptyWorkspace();
      workspace.business.name = "LIYANNA verification";
      workspace.business.currency = "LKR";
      const document = blankDocument(workspace.business, type, "TEST-2026-001");
      document.customer.name = "Test customer";
      document.items = Array.from({ length: 100 }, (_, i) => ({
        id: crypto.randomUUID(),
        description: `Service ${i + 1}: professional services`,
        quantity: "2",
        rate: "125.50",
      }));
      document.discountKind = "percent";
      document.discount = "10";
      document.tax = "18";
      document.notes = "Payment due within 30 days.\n".repeat(100);
      document.paymentDetails = "Bank transfer reference TEST-2026-001";
      const definition = await buildDefinition(document,
        async (text, _width, size, bold, color) => ({ text, fontSize: size, bold, color }));
      expect(definition.info?.title).toContain("TEST-2026-001");
      verifyPdf(await render(definition), true);
    }, 20000);
  }
  it("loads English, Sinhala and Tamil fonts in a multipage PDF", async () => {
    verifyPdf(await makeProbe(font), true);
  }, 20000);
});
