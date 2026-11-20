/** Draft identifiers are not legally issued document numbers. */
export function temporaryDraftNumber(type: "invoice" | "quote", draftId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) throw new Error("Invalid draft ID");
  return `DRAFT-${type.toUpperCase()}-${draftId}`;
}
/** Must be called only after the server has reserved an authoritative number. */
export function assertFinalNumber(type: "invoice" | "quote", value: string): void {
  const prefix = type === "invoice" ? "INV" : "QUO";
  if (!new RegExp(`^${prefix}-[0-9]{4}-[0-9]{3,}$`).test(value)) throw new Error("Invalid final document number");
}
