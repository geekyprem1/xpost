/**
 * Hands a screenshot and/or a look from the marketing page into the editor.
 *
 * Query strings don't survive the login redirect (proxy.ts and
 * /auth/callback both drop them), so the handoff lives in browser storage:
 * the image in IndexedDB (Blobs can be large) and the look id in
 * localStorage. Entries expire so a stale pick never surprises the user.
 */

const DB_NAME = "shotlark-handoff";
const STORE = "pending";
const IMAGE_KEY = "image";
const LOOK_KEY = "shotlark-pending-look";
const MAX_AGE_MS = 60 * 60 * 1000;

type PendingImage = { blob: Blob; name: string; savedAt: number };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function savePendingImage(file: File): Promise<void> {
  const value: PendingImage = {
    blob: file,
    name: file.name || "screenshot",
    savedAt: Date.now(),
  };
  await withStore("readwrite", (store) => store.put(value, IMAGE_KEY));
}

/** Returns the pending screenshot (if fresh) and removes it from storage. */
export async function takePendingImage(): Promise<File | null> {
  try {
    const value = (await withStore("readonly", (store) =>
      store.get(IMAGE_KEY),
    )) as PendingImage | undefined;
    if (!value) return null;
    await withStore("readwrite", (store) => store.delete(IMAGE_KEY));
    if (!(value.blob instanceof Blob)) return null;
    if (Date.now() - value.savedAt > MAX_AGE_MS) return null;
    return new File([value.blob], value.name, { type: value.blob.type });
  } catch {
    return null;
  }
}

export function savePendingLook(id: string): void {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify({ id, savedAt: Date.now() }));
  } catch {
    // Storage disabled: the editor simply opens with its defaults.
  }
}

/** Returns the pending look id (if fresh) and removes it from storage. */
export function takePendingLook(): string | null {
  try {
    const raw = localStorage.getItem(LOOK_KEY);
    if (!raw) return null;
    localStorage.removeItem(LOOK_KEY);
    const value = JSON.parse(raw) as { id?: unknown; savedAt?: unknown };
    if (typeof value.id !== "string" || typeof value.savedAt !== "number")
      return null;
    if (Date.now() - value.savedAt > MAX_AGE_MS) return null;
    return value.id;
  } catch {
    return null;
  }
}
