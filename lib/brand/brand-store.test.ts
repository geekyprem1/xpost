import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import { MAX_SAVED_STYLES } from "./brand-kit";
import {
  brandStorageKey,
  readBrandKit,
  type KeyValueStorage,
} from "./brand-storage";
import { flushBrandKit, useBrandStore } from "./brand-store";

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("brand store", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });
    storage = memoryStorage();
    useBrandStore.getState().load("user-a", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save style storage mein user key ke saath persist hota hai", () => {
    expect(
      useBrandStore.getState().saveStyle("Launch", createDefaultScene()),
    ).toBe(true);
    expect(storage.data.has(brandStorageKey("user-a"))).toBe(true);
    expect(readBrandKit(storage, "user-a").styles[0].name).toBe("Launch");
  });

  it("doosre user ka kit alag hai", () => {
    useBrandStore.getState().addColor("#ff0000");
    useBrandStore.getState().load("user-b", storage);
    expect(useBrandStore.getState().kit.colors).toEqual([]);
    useBrandStore.getState().load("user-a", storage);
    expect(useBrandStore.getState().kit.colors).toEqual(["#ff0000"]);
  });

  it("limit pe save false + error message", () => {
    const scene = createDefaultScene();
    for (let i = 0; i < MAX_SAVED_STYLES; i++)
      useBrandStore.getState().saveStyle("", scene);
    expect(useBrandStore.getState().saveStyle("Extra", scene)).toBe(false);
    expect(useBrandStore.getState().error).toMatch(/up to 10/);
    expect(useBrandStore.getState().kit.styles).toHaveLength(MAX_SAVED_STYLES);
  });

  it("watermark updates debounce hote hain, flush pe likhe jaate hain", () => {
    useBrandStore.getState().updateWatermark({ enabled: true, text: "@me" });
    expect(readBrandKit(storage, "user-a").watermark.text).toBe("");
    flushBrandKit();
    expect(readBrandKit(storage, "user-a").watermark.text).toBe("@me");
  });

  it("storage full → error, in-memory state bachi rehti hai", () => {
    const full: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    useBrandStore.getState().load("user-c", full);
    useBrandStore.getState().addColor("#00ff00");
    expect(useBrandStore.getState().kit.colors).toEqual(["#00ff00"]);
    expect(useBrandStore.getState().error).toMatch(/could not be saved/);
  });
});
