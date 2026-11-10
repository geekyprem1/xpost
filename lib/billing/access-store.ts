import { create } from "zustand";
import type { Scene } from "@/lib/scene";
import { editorAccess, type BillingProfile } from "./catalog";

export const useBillingStore = create<{
  profile: BillingProfile | null;
  pro: boolean;
  setProfile: (profile: BillingProfile | null) => void;
  refreshClock: () => void;
}>((set, get) => ({
  profile: null,
  pro: false,
  setProfile: (profile) => set({ profile, pro: editorAccess(profile).pro }),
  refreshClock: () => set({ pro: editorAccess(get().profile).pro }),
}));

/** Browser rendering is local; apply the same licence policy to every normal export path. */
export function billingScene(
  scene: Scene,
  pro = editorAccess(useBillingStore.getState().profile).pro,
): Scene {
  if (pro) return scene;
  return {
    ...scene,
    watermark: true,
    frame: { ...scene.frame, kind: "screenshot" },
    background:
      scene.background.kind === "video" || scene.background.kind === "image"
        ? { kind: "solid", color: "#6650d8" }
        : scene.background,
  };
}
