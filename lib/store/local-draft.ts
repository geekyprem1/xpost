import { migrateScene, type Scene } from "@/lib/scene";

export type LocalDraft = {
  version: 1;
  scene: Scene;
  image: Blob | null;
  postText: string;
};

let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("shotlark-drafts", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("drafts");
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Draft storage is blocked by another tab."));
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

export function parseLocalDraft(value: unknown): LocalDraft {
  if (!value || typeof value !== "object")
    throw new Error("Invalid saved draft.");
  const draft = value as LocalDraft;
  if (
    draft.version !== 1 ||
    typeof draft.postText !== "string" ||
    (draft.image !== null && !(draft.image instanceof Blob))
  ) {
    throw new Error(
      "The saved draft is missing its screenshot or has an unsupported format.",
    );
  }
  const { scene, warning } = migrateScene(draft.scene);
  if (warning || (scene.image !== null && draft.image === null)) {
    throw new Error(
      "The saved draft is missing its screenshot or has an unsupported format.",
    );
  }
  return {
    version: 1,
    scene,
    image: scene.image ? draft.image : null,
    postText: draft.postText,
  };
}

export async function readLocalDraft(
  userId: string,
): Promise<LocalDraft | null> {
  const db = await openDatabase();
  const value = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const request = tx.objectStore("drafts").get(userId);
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
  return value === undefined ? null : parseLocalDraft(value);
}

export async function writeLocalDraft(
  userId: string,
  draft: LocalDraft,
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    // Store the image bytes and composition together: a reload cannot restore
    // metadata for one screenshot and bytes from a different upload.
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(draft, userId);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
