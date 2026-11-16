import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const cloudConfigured = Boolean(url && key);
let instance: SupabaseClient | undefined;
export function cloudClient() {
  if (!url || !key) throw Error("Cloud not connected");
  return (instance ??= createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }));
}
export async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await cloudClient().rpc(name, args);
  if (error) throw Error(error.message);
  return data as T;
}
