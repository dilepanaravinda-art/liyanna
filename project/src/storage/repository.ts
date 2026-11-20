import type { WorkspaceSnapshot } from "../domain/model";
export interface WorkspaceRepository {
  load(): Promise<WorkspaceSnapshot | null>;
  save(
    snapshot: WorkspaceSnapshot,
    expectedUpdatedAt?: string | null,
  ): Promise<void>;
}
