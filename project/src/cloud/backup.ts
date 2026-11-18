import type { WorkspaceSnapshot } from "../domain/model";
import { parseBackup, exportBackup } from "../storage/backup";
import { cloudClient, rpc } from "./client";
export interface BackupMetadata {
  id: string;
  created_at: string;
}
export async function ensureBusiness(snapshot: WorkspaceSnapshot) {
  await rpc("liyanna_create_business", { p_business: snapshot.business });
}
export async function createCloudBackup(snapshot: WorkspaceSnapshot) {
  exportBackup(snapshot);
  await ensureBusiness(snapshot);
  return rpc<string>("liyanna_backup", { p_snapshot: snapshot });
}
export async function listCloudBackups(
  businessId: string,
): Promise<BackupMetadata[]> {
  const { data, error } = await cloudClient()
    .from("liyanna_backups")
    .select("id,created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw Error(error.message);
  return data ?? [];
}
export async function restoreCloudBackup(
  id: string,
): Promise<WorkspaceSnapshot> {
  const { data, error } = await cloudClient()
    .from("liyanna_backups")
    .select("snapshot")
    .eq("id", id)
    .single();
  if (error) throw Error(error.message);
  return parseBackup(JSON.stringify(data.snapshot));
}
export async function deleteCloudBackup(id: string) {
  const { data, error } = await cloudClient()
    .from("liyanna_backups")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw Error(error.message);
  if (!data?.length) throw Error("Backup unavailable or access denied");
}
