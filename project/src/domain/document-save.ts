import type { Document, WorkspaceSnapshot } from "./model";
export function prepareDocumentSave(
  draft: Document,
  workspace: WorkspaceSnapshot,
): Document {
  if (draft.businessId !== workspace.business.id)
    throw Error("This document belongs to another workspace");
  const existing = workspace.documents.find((d) => d.id === draft.id);
  if (existing && existing.revision !== draft.revision)
    throw Error(
      "A newer document version is available. Reopen it before saving your edits.",
    );
  if (!existing && draft.revision > 0)
    throw Error(
      "This document was removed. Duplicate your edits into a new document instead.",
    );
  if (
    workspace.documents.some(
      (d) =>
        d.id !== draft.id && d.type === draft.type && d.number === draft.number,
    )
  )
    throw Error("That document number is already in use");
  return {
    ...draft,
    revision: (existing?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}
