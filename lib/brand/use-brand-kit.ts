"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { flushBrandKit, useBrandStore } from "./brand-store";

/**
 * Loads the brand kit for the signed-in user (key = Supabase user id, same as
 * drafts) — ek account ka kit doosre account mein kabhi nahi dikhta.
 * Guest key tab use hota hai jab user na mile (T7.5 guest mode ke liye ready).
 */
export function useBrandKitLoader() {
  useEffect(() => {
    let cancelled = false;
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) useBrandStore.getState().load(data.user?.id ?? "guest");
      })
      .catch(() => {
        if (!cancelled) useBrandStore.getState().load("guest");
      });
    const onHide = () => flushBrandKit();
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
      flushBrandKit();
    };
  }, []);
}
