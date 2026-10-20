"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadImageFromFile } from "@/lib/image/load";
import { createDefaultScene, type Scene } from "@/lib/scene";
import { createAutosave } from "@/lib/store/autosave";
import { useEditorStore } from "@/lib/store/editor-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createProject,
  downloadProjectImage,
  getProject,
  saveProject,
  type ProjectRecord,
} from "./project-api";
import {
  deleteProjectCache,
  readProjectCache,
  writeProjectCache,
  type ProjectCacheEntry,
} from "./project-cache";
import { decideOpen, isProjectError, titleFromFileName } from "./project-model";
import {
  projectHref,
  useProjectSessionStore,
  type ConflictChoice,
} from "./project-store";
import { renderProjectThumbnail } from "./thumbnail";

/** Snapshot of everything a project save needs — taken at change time. */
type Snapshot = {
  revision: number;
  scene: Scene;
  postText: string;
  imageBlob: Blob | null;
  imageElement: HTMLImageElement | null;
};

const SAVE_DEBOUNCE_MS = 1500;
const THUMB_MIN_INTERVAL_MS = 15_000;

function snapshotOf(revision: number): Snapshot {
  const state = useEditorStore.getState();
  return {
    revision,
    scene: state.scene,
    postText: state.postText,
    imageBlob: state.imageBlob,
    imageElement: state.imageElement,
  };
}

async function applyToEditor(
  scene: Scene,
  image: Blob | null,
  postText: string,
) {
  let loaded: Awaited<ReturnType<typeof loadImageFromFile>> | null = null;
  if (image && scene.image) {
    loaded = await loadImageFromFile(
      new File([image], "screenshot", { type: image.type || "image/png" }),
    );
  }
  const store = useEditorStore.getState();
  store.replaceScene(loaded ? scene : { ...scene, image: null });
  if (loaded && scene.image) {
    store.setImage(
      loaded.element,
      loaded.url,
      "screenshot",
      image ?? undefined,
      {
        restore: scene.image,
      },
    );
  }
  store.setPostText(postText);
  useEditorStore.temporal.getState().clear();
}

function retryable(error: unknown): boolean {
  return !(
    isProjectError(error, "CONFLICT") ||
    isProjectError(error, "UNAUTHENTICATED") ||
    isProjectError(error, "INVALID") ||
    isProjectError(error, "NOT_FOUND")
  );
}

/**
 * Opens a cloud project into the editor and keeps it saved (PJ-2…PJ-4):
 * IndexedDB cache on every change (reload / offline safe), debounced cloud
 * save with optimistic concurrency (`updated_at`), thumbnail refresh, and a
 * conflict prompt when the cloud copy changed elsewhere.
 */
export function useProjectSession(projectId: string | null) {
  const [ready, setReady] = useState(projectId === null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    const id = projectId;
    let cancelled = false;
    const client = createSupabaseBrowserClient();
    const session = useProjectSessionStore.getState();
    session.set({
      projectId: id,
      title: null,
      status: "loading",
      message: null,
      conflict: null,
      resolveConflict: null,
      retry: null,
    });

    let userId = "";
    let title = "";
    let base = "";
    let imagePath: string | null = null;
    /** Blob jo `imagePath` pe cloud mein hai (reference compare → upload needed?). */
    let syncedBlob: Blob | null = null;
    let revision = 0;
    let savedRevision = 0;
    let force = false;
    let thumbDirty = true;
    let lastThumbAt = 0;
    /** Cloud row pe thumbnail hai? Nahi → agle save mein zaroor banao (purane projects backfill). */
    let hasThumbnail = true;
    let latest: Snapshot | null = null;
    let cacheTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    const writeCache = async (snapshot: Snapshot) => {
      const entry: ProjectCacheEntry = {
        version: 1,
        projectId: id,
        userId,
        baseUpdatedAt: base,
        dirty: snapshot.revision !== savedRevision || force,
        title,
        scene: snapshot.scene,
        image: snapshot.imageBlob,
        imagePath: snapshot.imageBlob === syncedBlob ? imagePath : null,
        postText: snapshot.postText,
      };
      await writeProjectCache(entry).catch(() => undefined);
    };

    const autosave = createAutosave<Snapshot>({
      debounceMs: SAVE_DEBOUNCE_MS,
      shouldRetry: retryable,
      save: async (snapshot) => {
        const image =
          snapshot.imageBlob === syncedBlob ? undefined : snapshot.imageBlob;
        let thumbnail: Blob | null = null;
        const now = Date.now();
        if (
          !hasThumbnail ||
          image !== undefined ||
          (thumbDirty && now - lastThumbAt > THUMB_MIN_INTERVAL_MS)
        ) {
          lastThumbAt = now;
          thumbnail = await renderProjectThumbnail(
            snapshot.scene,
            snapshot.imageElement,
          ).catch((reason: unknown) => {
            console.warn("[projects] thumbnail render failed", reason);
            return null;
          });
          // Fail hua to agle save pe phir try (dirty bana rehta hai).
          if (thumbnail) thumbDirty = false;
        }
        const saved = await saveProject(client, {
          userId,
          projectId: id,
          baseUpdatedAt: base,
          force,
          scene: snapshot.scene,
          postText: snapshot.postText,
          image,
          currentImagePath: imagePath,
          thumbnail,
        });
        force = false;
        base = saved.updatedAt;
        imagePath = saved.imagePath;
        if (saved.thumbnailUploaded) hasThumbnail = true;
        else if (thumbnail) thumbDirty = true;
        syncedBlob = snapshot.imageBlob;
        savedRevision = snapshot.revision;
        await writeCache(latest ?? snapshot);
      },
      onError: (reason) => {
        if (cancelled) return;
        const store = useProjectSessionStore.getState();
        if (isProjectError(reason, "CONFLICT")) {
          store.set({
            status: "conflict",
            conflict: "save",
            message:
              "This project was changed in another tab or device. Choose which version to keep.",
            resolveConflict: resolve,
          });
        } else if (retryable(reason)) {
          store.set({
            status: "offline",
            message:
              "Could not reach the cloud. Your changes are kept in this browser and will retry.",
          });
        } else {
          store.set({
            status: "error",
            message:
              reason instanceof Error
                ? reason.message
                : "Your changes could not be saved.",
          });
        }
      },
    });

    autosave.subscribe((status) => {
      if (cancelled) return;
      const store = useProjectSessionStore.getState();
      if (store.conflict) return;
      if (status === "saving") store.set({ status: "saving" });
      else if (status === "saved")
        store.set({ status: "saved", message: null });
      else if (status === "dirty" && store.status !== "offline")
        store.set({ status: "dirty" });
    });

    function resolve(choice: ConflictChoice) {
      const store = useProjectSessionStore.getState();
      store.set({ conflict: null, resolveConflict: null, message: null });
      if (choice === "local") {
        force = true;
        autosave.schedule(latest ?? snapshotOf(revision));
        void autosave.flush();
      } else {
        // Cloud version: local cache hata ke dobara kholo.
        cancelled = true;
        void deleteProjectCache(id).then(() => window.location.reload());
      }
    }

    const startTracking = (pendingSave: boolean) => {
      latest = snapshotOf(revision);
      unsubscribe = useEditorStore.subscribe((state, previous) => {
        if (
          state.scene === previous.scene &&
          state.postText === previous.postText &&
          state.imageBlob === previous.imageBlob
        )
          return;
        revision++;
        thumbDirty = true;
        latest = snapshotOf(revision);
        const snapshot = latest;
        clearTimeout(cacheTimer);
        cacheTimer = setTimeout(() => void writeCache(snapshot), 300);
        if (useProjectSessionStore.getState().conflict) return;
        autosave.schedule(snapshot);
        if (state.imageBlob !== previous.imageBlob) void autosave.flush();
      });
      if (pendingSave) {
        revision++;
        latest = snapshotOf(revision);
        autosave.schedule(latest);
      }
    };

    const flushNow = () => {
      if (latest) void writeCache(latest);
      void autosave.flush();
    };
    const onVisibility = () => {
      if (document.hidden) flushNow();
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      useProjectSessionStore.getState().set({ status: "error", message });
    };

    void (async () => {
      try {
        const { data } = await client.auth.getUser();
        if (cancelled) return;
        if (!data.user) {
          fail("Your session has expired. Sign in again.");
          return;
        }
        userId = data.user.id;
        useEditorStore.getState().replaceScene(createDefaultScene());

        const [server, cache] = await Promise.all([
          getProject(client, id).then(
            (record) => ({ record, failure: null as unknown }),
            (failure: unknown) => ({
              record: null as ProjectRecord | null,
              failure,
            }),
          ),
          readProjectCache(id, userId),
        ]);
        if (cancelled) return;

        if (!server.record) {
          if (isProjectError(server.failure, "NOT_FOUND")) {
            await deleteProjectCache(id);
            if (!cancelled) setNotFound(true);
            return;
          }
          if (cache && retryable(server.failure)) {
            // Offline open: browser copy, cloud pe baad mein save.
            title = cache.title;
            base = cache.baseUpdatedAt;
            imagePath = cache.imagePath;
            syncedBlob = cache.imagePath ? cache.image : null;
            await applyToEditor(cache.scene, cache.image, cache.postText);
            if (cancelled) return;
            useProjectSessionStore.getState().set({
              title,
              status: "offline",
              message:
                "Opened the copy saved in this browser. It will sync when you are back online.",
            });
            startTracking(cache.dirty);
            return;
          }
          fail(
            server.failure instanceof Error
              ? server.failure.message
              : "The project could not be loaded.",
          );
          return;
        }

        const record = server.record;
        title = record.title;
        useProjectSessionStore.getState().set({ title });
        let decision = decideOpen(record.updatedAt, cache);
        if (decision === "conflict") {
          const choice = await new Promise<ConflictChoice>((resolveChoice) => {
            useProjectSessionStore.getState().set({
              status: "conflict",
              conflict: "open",
              message:
                "This browser has unsaved changes, but the cloud copy was updated elsewhere.",
              resolveConflict: resolveChoice,
            });
          });
          if (cancelled) return;
          useProjectSessionStore.getState().set({
            conflict: null,
            resolveConflict: null,
            message: null,
            status: "loading",
          });
          decision = choice === "local" ? "cache" : "server";
        }

        base = record.updatedAt;
        imagePath = record.sourceImagePath;
        hasThumbnail = record.thumbnailPath !== null;
        if (decision === "cache" && cache) {
          syncedBlob =
            cache.imagePath === record.sourceImagePath ? cache.image : null;
          await applyToEditor(cache.scene, cache.image, cache.postText);
          if (cancelled) return;
          useProjectSessionStore
            .getState()
            .set({ status: cache.dirty ? "dirty" : "saved" });
          startTracking(
            cache.dirty || syncedBlob !== cache.image || !hasThumbnail,
          );
        } else {
          const image = record.sourceImagePath
            ? await downloadProjectImage(client, record.sourceImagePath)
            : null;
          if (cancelled) return;
          syncedBlob = image;
          await applyToEditor(record.scene, image, record.postText);
          if (cancelled) return;
          useProjectSessionStore.getState().set({ status: "saved" });
          // Thumbnail missing (purana / failed) → ek save jo use bana de.
          startTracking(!hasThumbnail);
          if (latest) await writeCache(latest);
        }
        window.addEventListener("pagehide", flushNow);
        document.addEventListener("visibilitychange", onVisibility);
        useProjectSessionStore
          .getState()
          .set({ retry: () => autosave.retry() });
      } catch (reason) {
        fail(
          reason instanceof Error
            ? reason.message
            : "The project could not be opened.",
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      clearTimeout(cacheTimer);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
      if (latest) void writeCache(latest);
      // Snapshot-based: pending save abhi bhi isi project ka data likhega.
      void autosave.flush().finally(() => autosave.dispose());
      useProjectSessionStore.getState().reset();
    };
  }, [projectId, attempt]);

  const retryOpen = () => {
    setError(null);
    setNotFound(false);
    setReady(false);
    setAttempt((value) => value + 1);
  };

  return { ready, notFound, error, retryOpen };
}

let inflightPromotion: {
  blob: Blob;
  promise: ReturnType<typeof createProject>;
} | null = null;

/**
 * /editor: pehli screenshot aate hi local draft cloud project ban jaata hai
 * (PJ-2, PJ-5 — purana draft bhi isi se import hota hai), phir
 * /editor/{id} pe redirect. Limit / network pe draft local hi rehta hai.
 */
export function useProjectPromotion(
  enabled: boolean,
  discardDraft: () => Promise<void>,
) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let busy = false;
    let blockedBlob: Blob | null = null;
    const client = createSupabaseBrowserClient();
    const session = useProjectSessionStore.getState();
    session.set({
      projectId: null,
      title: null,
      status: "local",
      message: null,
    });

    const promote = async () => {
      const start = useEditorStore.getState();
      if (
        busy ||
        cancelled ||
        !start.imageBlob ||
        start.imageBlob === blockedBlob
      )
        return;
      busy = true;
      useProjectSessionStore
        .getState()
        .set({ status: "creating", message: null });
      try {
        const { data } = await client.auth.getUser();
        if (!data.user) throw new Error("Sign in to save projects.");
        const userId = data.user.id;
        const title = titleFromFileName(start.scene.image?.path);
        const blob = start.imageBlob;
        // Same screenshot → same create call (Strict Mode / double effect se duplicate nahi).
        if (inflightPromotion?.blob !== blob) {
          const promise = renderProjectThumbnail(
            start.scene,
            start.imageElement,
          )
            .catch((reason: unknown) => {
              console.warn("[projects] thumbnail render failed", reason);
              return null;
            })
            .then((thumbnail) =>
              createProject(client, {
                userId,
                title,
                scene: start.scene,
                postText: start.postText,
                image: blob,
                thumbnail,
              }),
            );
          inflightPromotion = { blob, promise };
          promise.catch(() => {
            if (inflightPromotion?.blob === blob) inflightPromotion = null;
          });
        }
        const created = await inflightPromotion.promise;
        // Create ke dauraan hue edits bhi na khoyein: cache mein dirty.
        const now = useEditorStore.getState();
        const changed =
          now.scene !== start.scene ||
          now.postText !== start.postText ||
          now.imageBlob !== start.imageBlob;
        await writeProjectCache({
          version: 1,
          projectId: created.id,
          userId,
          baseUpdatedAt: created.updatedAt,
          dirty: changed,
          title,
          scene: now.scene,
          image: now.imageBlob,
          imagePath:
            now.imageBlob === start.imageBlob ? created.imagePath : null,
          postText: now.postText,
        }).catch(() => undefined);
        await discardDraft();
        if (!cancelled) router.replace(projectHref(created.id));
      } catch (reason) {
        blockedBlob = start.imageBlob;
        busy = false;
        if (!cancelled)
          useProjectSessionStore.getState().set({
            status: "local",
            message:
              reason instanceof Error
                ? `${reason.message} Your work is kept as a local draft.`
                : "The project could not be created. Your work is kept as a local draft.",
          });
      }
    };

    void promote();
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.imageBlob !== previous.imageBlob) void promote();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, discardDraft, router]);
}
