import type { WorkspaceSnapshot } from "../domain/model";
import type { CloudWorkspace } from "./sync";
type Decision =
  | { kind: "cancelled" | "idle" }
  | { kind: "pull" | "conflict"; remote: CloudWorkspace };
export async function synchronise(
  local: WorkspaceSnapshot,
  settings: { revision: number; lastSyncedAt: string },
  current: () => {
    data: WorkspaceSnapshot | null;
    dirty: boolean;
    cancelled?: boolean;
  },
  read: (id: string) => Promise<CloudWorkspace>,
  write: (
    snapshot: WorkspaceSnapshot,
    revision: number,
  ) => Promise<CloudWorkspace>,
): Promise<Decision> {
  const changed = () =>
    current().data !== local || current().dirty || current().cancelled;
  const remote = await read(local.business.id);
  if (changed()) return { kind: "cancelled" };
  if (remote.revision !== settings.revision)
    return {
      kind: local.updatedAt === settings.lastSyncedAt ? "pull" : "conflict",
      remote,
    };
  if (local.updatedAt === settings.lastSyncedAt) return { kind: "idle" };
  const uploaded = await write(local, settings.revision);
  return { kind: changed() ? "conflict" : "pull", remote: uploaded };
}
export async function finaliseSharedDownload(
  id: string,
  snapshot: WorkspaceSnapshot,
  revision: number,
  write: (
    snapshot: WorkspaceSnapshot,
    revision: number,
  ) => Promise<CloudWorkspace>,
) {
  const remote = await write(snapshot, revision);
  const document = remote.snapshot.documents.find((d) => d.id === id);
  if (!document)
    throw Error(
      "The shared document is unavailable. Reopen the workspace before downloading.",
    );
  return { document, remote };
}
