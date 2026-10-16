import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type CreditsInfo = { credits: number; resetAt: string | null };

export async function fetchCredits(): Promise<CreditsInfo | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("ai_credits, credits_reset_at")
      .single();
    if (error || !data) return null;
    const row = data as { ai_credits: number; credits_reset_at: string };
    return { credits: row.ai_credits, resetAt: row.credits_reset_at ?? null };
  } catch {
    return null;
  }
}
