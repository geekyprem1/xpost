import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  bucket: string,
  maxHits: number,
  windowSec: number
): Promise<boolean> {
  const { data, error } = await admin.rpc("hit_rate_limit", {
    p_user_id: userId,
    p_bucket: bucket,
    p_max_hits: maxHits,
    p_window_sec: windowSec,
  });
  if (error) return false;
  return data === true;
}
