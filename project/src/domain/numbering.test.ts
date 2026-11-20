import { describe, expect, it } from "vitest";
import { temporaryDraftNumber, assertFinalNumber } from "./numbering";
describe("document numbering guards", () => {
 it("marks offline drafts as temporary", () => expect(temporaryDraftNumber("invoice", "123e4567-e89b-12d3-a456-426614174000")).toMatch(/^DRAFT-INVOICE-/));
 it("rejects draft numbers as final", () => expect(() => assertFinalNumber("invoice", "DRAFT-INVOICE-abc")).toThrow());
 it("accepts expected server numbers", () => expect(() => assertFinalNumber("quote", "QUO-2026-001")).not.toThrow());
});
