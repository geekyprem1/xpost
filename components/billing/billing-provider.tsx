"use client";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BillingProfile } from "@/lib/billing/catalog";
import { useBillingStore } from "@/lib/billing/access-store";

export function BillingProvider({
  profile,
  children,
}: {
  profile: BillingProfile | null;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    useBillingStore.getState().setProfile(profile);
  }, [profile]);
  useEffect(() => {
    const update = async () => {
      const { data } = await createSupabaseBrowserClient()
        .from("profiles")
        .select("lifetime_editor, created_at")
        .single();
      if (data) useBillingStore.getState().setProfile(data as BillingProfile);
    };
    const timer = setInterval(
      () => useBillingStore.getState().refreshClock(),
      1000,
    );
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      useBillingStore.getState().setProfile(null);
    };
  }, []);
  return children;
}
