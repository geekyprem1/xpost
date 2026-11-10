import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BillingProvider } from "@/components/billing/billing-provider";

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("lifetime_editor, created_at")
    .single();
  return <BillingProvider profile={profile}>{children}</BillingProvider>;
}
