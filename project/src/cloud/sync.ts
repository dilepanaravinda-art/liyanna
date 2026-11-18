import { z } from "zod";
import type { WorkspaceSnapshot } from "../domain/model";
import { workspaceSchema } from "../domain/validation";
import { rpc, cloudClient } from "./client";
const response = z.object({
  snapshot: workspaceSchema,
  revision: z.number().int(),
  role: z.enum(["owner", "staff"]),
  scope: z.enum(["owner", "all", "own"]),
});
export type CloudWorkspace = z.infer<typeof response>;
export async function getCloudWorkspace(id: string) {
  return response.parse(
    await rpc("liyanna_read_workspace", { p_business: id }),
  );
}
export async function syncWorkspace(
  snapshot: WorkspaceSnapshot,
  expected: number,
) {
  workspaceSchema.parse(snapshot);
  return response.parse(
    await rpc("liyanna_sync", {
      p_business: snapshot.business.id,
      p_expected: expected,
      p_snapshot: snapshot,
    }),
  );
}
export interface Member {
  business_id: string;
  user_id: string;
  email: string;
  scope: "own" | "all";
}
export async function listMemberships(): Promise<
  { id: string; name: string }[]
> {
  const { data, error } = await cloudClient()
    .from("liyanna_businesses")
    .select("id,profile");
  if (error) throw Error(error.message);
  return (data ?? []).map((v) => ({ id: v.id, name: v.profile.name }));
}
export async function listStaff(businessId: string): Promise<Member[]> {
  const { data, error } = await cloudClient()
    .from("liyanna_members")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw Error(error.message);
  return data ?? [];
}
export async function setStaff(
  businessId: string,
  email: string,
  scope: "own" | "all",
) {
  await rpc("liyanna_member", {
    p_business: businessId,
    p_email: email,
    p_scope: scope,
  });
}
export async function removeStaff(businessId: string, userId: string) {
  await rpc("liyanna_remove_member", {
    p_business: businessId,
    p_user: userId,
  });
}
export async function deleteSharedWorkspace(businessId: string) {
  await rpc("liyanna_clear_shared", { p_business: businessId });
}
