import { create } from "zustand";
import type { Scene } from "@/lib/scene";
import {
  BrandLimitError,
  addBrandColor,
  addSavedStyle,
  captureStyle,
  createEmptyBrandKit,
  removeBrandColor,
  removeSavedStyle,
  renameSavedStyle,
  type BrandKit,
  type BrandWatermark,
} from "./brand-kit";
import {
  browserStorage,
  readBrandKit,
  writeBrandKit,
  type KeyValueStorage,
} from "./brand-storage";

type BrandState = {
  /** Supabase user id (ya "guest"); null = abhi load nahi hua. */
  userKey: string | null;
  kit: BrandKit;
  error: string | null;
  load: (userKey: string, storage?: KeyValueStorage | null) => void;
  saveStyle: (name: string, scene: Scene) => boolean;
  renameStyle: (id: string, name: string) => void;
  deleteStyle: (id: string) => void;
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  updateWatermark: (patch: Partial<BrandWatermark>) => void;
  clearError: () => void;
};

let storageOverride: KeyValueStorage | null | undefined;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function storage(): KeyValueStorage | null {
  return storageOverride !== undefined ? storageOverride : browserStorage();
}

const STORAGE_ERROR =
  "Brand kit could not be saved in this browser (storage full or blocked). Try a smaller logo.";

export const useBrandStore = create<BrandState>()((set, get) => {
  const persistNow = () => {
    clearTimeout(persistTimer);
    persistTimer = undefined;
    const { userKey, kit } = get();
    if (!userKey) return;
    try {
      writeBrandKit(storage(), userKey, kit);
      if (get().error === STORAGE_ERROR) set({ error: null });
    } catch {
      set({ error: STORAGE_ERROR });
    }
  };
  // Sliders fire many updates; coalesce writes (logo data URL can be ~100 KB).
  const persistSoon = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 150);
  };
  const commit = (kit: BrandKit, mode: "now" | "soon" = "now") => {
    set({ kit });
    if (mode === "now") persistNow();
    else persistSoon();
  };

  return {
    userKey: null,
    kit: createEmptyBrandKit(),
    error: null,
    load: (userKey, override) => {
      if (persistTimer) persistNow();
      storageOverride = override;
      set({ userKey, kit: readBrandKit(storage(), userKey), error: null });
    },
    saveStyle: (name, scene) => {
      try {
        commit(
          addSavedStyle(get().kit, {
            id: crypto.randomUUID(),
            name,
            snapshot: captureStyle(scene),
            now: Date.now(),
          }),
        );
        return true;
      } catch (error) {
        set({
          error:
            error instanceof BrandLimitError
              ? error.message
              : "This style could not be saved.",
        });
        return false;
      }
    },
    renameStyle: (id, name) => commit(renameSavedStyle(get().kit, id, name)),
    deleteStyle: (id) => commit(removeSavedStyle(get().kit, id)),
    addColor: (color) => {
      const kit = get().kit;
      commit({ ...kit, colors: addBrandColor(kit.colors, color) });
    },
    removeColor: (color) => {
      const kit = get().kit;
      commit({ ...kit, colors: removeBrandColor(kit.colors, color) });
    },
    updateWatermark: (patch) => {
      const kit = get().kit;
      commit({ ...kit, watermark: { ...kit.watermark, ...patch } }, "soon");
    },
    clearError: () => set({ error: null }),
  };
});

/** Pending debounced write turant flush (tab hide / tests). */
export function flushBrandKit() {
  if (!persistTimer) return;
  clearTimeout(persistTimer);
  persistTimer = undefined;
  const { userKey, kit } = useBrandStore.getState();
  if (!userKey) return;
  try {
    writeBrandKit(storage(), userKey, kit);
  } catch {
    useBrandStore.setState({ error: STORAGE_ERROR });
  }
}
