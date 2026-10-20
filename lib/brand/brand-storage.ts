import { createEmptyBrandKit, parseBrandKit, type BrandKit } from "./brand-kit";

/** Minimal Storage surface so tests can inject an in-memory store. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const BRAND_STORAGE_PREFIX = "shotlark-brand:";

export function brandStorageKey(userKey: string): string {
  return `${BRAND_STORAGE_PREFIX}${userKey}`;
}

export function readBrandKit(
  storage: KeyValueStorage | null,
  userKey: string,
): BrandKit {
  if (!storage) return createEmptyBrandKit();
  try {
    const raw = storage.getItem(brandStorageKey(userKey));
    if (!raw) return createEmptyBrandKit();
    return parseBrandKit(JSON.parse(raw));
  } catch {
    return createEmptyBrandKit();
  }
}

/** Throws when storage is unavailable or full (caller shows the message). */
export function writeBrandKit(
  storage: KeyValueStorage | null,
  userKey: string,
  kit: BrandKit,
): void {
  if (!storage) throw new Error("Browser storage is unavailable.");
  storage.setItem(brandStorageKey(userKey), JSON.stringify(kit));
}

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
