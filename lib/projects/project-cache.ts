import { migrateScene, type Scene } from "@/lib/scene";

/**
 * Per-project IndexedDB cache (PJ-4): fast reopen + unsynced edits survive a
 * reload / offline. `baseUpdatedAt` = server `updated_at` jis version pe ye
 * edits based hain; `dirty` = cloud pe abhi save nahi hua.
 */
export type ProjectCacheEntry = {
  version: 1;
  projectId: string;
  userId: string;
  baseUpdatedAt: string;
  dirty: boolean;
  title: string;
  scene: Scene;
  image: Blob | null;
  /** Storage path jo `image` bytes ko represent karta hai (null = not uploaded yet). */
  imagePath: string | null;
  postText: string;
};

const DB_NAME = "shotlark-projects";
const STORE = "projects";

let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Project storage is blocked by another tab."));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

function run<T>(
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest | void,
): Promise<T | undefined> {
  return openDatabase().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = body(tx.objectStore(STORE));
        tx.oncomplete = () =>
          resolve(request ? (request.result as T) : undefined);
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** Invalid / foreign / unparseable entry → null (cache kabhi load ko block nahi karta). */
export function parseProjectCache(
  value: unknown,
  projectId: string,
  userId: string,
): ProjectCacheEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as ProjectCacheEntry;
  if (
    entry.version !== 1 ||
    entry.projectId !== projectId ||
    entry.userId !== userId ||
    typeof entry.baseUpdatedAt !== "string" ||
    typeof entry.dirty !== "boolean" ||
    typeof entry.title !== "string" ||
    typeof entry.postText !== "string" ||
    (entry.image !== null && !(entry.image instanceof Blob)) ||
    (entry.imagePath !== null && typeof entry.imagePath !== "string")
  ) {
    return null;
  }
  const { scene, warning } = migrateScene(entry.scene);
  if (warning || (scene.image !== null && entry.image === null)) return null;
  return { ...entry, scene, image: scene.image ? entry.image : null };
}

export async function readProjectCache(
  projectId: string,
  userId: string,
): Promise<ProjectCacheEntry | null> {
  try {
    const value = await run<unknown>("readonly", (store) =>
      store.get(projectId),
    );
    return parseProjectCache(value, projectId, userId);
  } catch {
    return null;
  }
}

export async function writeProjectCache(
  entry: ProjectCacheEntry,
): Promise<void> {
  await run("readwrite", (store) => store.put(entry, entry.projectId));
}

export async function deleteProjectCache(projectId: string): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(projectId));
  } catch {
    // Cache optional hai.
  }
}
