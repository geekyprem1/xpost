import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAuthEnabled } from "@/lib/supabase/auth-flag";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (isAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
  }

  return <>{children}</>;
}
