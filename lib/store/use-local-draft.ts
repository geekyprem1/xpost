"use client";

import { useEffect, useState } from "react";
import { createDefaultScene } from "@/lib/scene";
import { loadImageFromFile } from "@/lib/image/load";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useEditorStore } from "./editor-store";
import {
  readLocalDraft,
  writeLocalDraft,
  type LocalDraft,
} from "./local-draft";

export function useLocalDraft() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: LocalDraft | null = null;
    let revision = 0;
    let userId: string | undefined;

    const flush = () => {
      clearTimeout(timer);
      if (!pending || !userId) return;
      const draft = pending;
      const savingRevision = revision;
      pending = null;
      void writeLocalDraft(userId, draft)
        .then(() => {
          if (!cancelled) setError(null);
        })
        .catch(() => {
          // Keep unsaved work available for the next flush (e.g. tab hiding).
          if (!pending && revision === savingRevision) pending = draft;
          if (!cancelled)
            setError(
              "Your draft could not be saved in this browser. Keep this tab open and try again.",
            );
        });
    };
    const onVisibility = () => {
      if (document.hidden) flush();
    };

    void (async () => {
      try {
        const { data, error: authError } =
          await createSupabaseBrowserClient().auth.getUser();
        if (cancelled) return;
        if (authError || !data.user)
          throw new Error("Unable to identify your account.");
        userId = data.user.id;
        // Never show another account's in-memory composition if storage fails.
        useEditorStore.getState().replaceScene(createDefaultScene());
        const draft = await readLocalDraft(userId);
        if (cancelled) return;
        let loaded: Awaited<ReturnType<typeof loadImageFromFile>> | null = null;
        if (draft?.image) {
          loaded = await loadImageFromFile(
            new File([draft.image], "restored-screenshot", {
              type: draft.image.type,
            }),
          );
          if (cancelled) {
            URL.revokeObjectURL(loaded.url);
            return;
          }
        }
        const store = useEditorStore.getState();
        store.replaceScene(draft?.scene ?? createDefaultScene());
        if (loaded && draft?.image) {
          store.setImage(
            loaded.element,
            loaded.url,
            draft.scene.image?.path.replace(/^local\//, "") ?? "screenshot",
            draft.image,
          );
        }
        store.setPostText(draft?.postText ?? "");
        useEditorStore.temporal.getState().clear();

        unsubscribe = useEditorStore.subscribe((state, previous) => {
          if (
            state.scene === previous.scene &&
            state.postText === previous.postText &&
            state.imageBlob === previous.imageBlob
          )
            return;
          revision++;
          pending = {
            version: 1,
            scene: state.scene,
            image: state.imageBlob,
            postText: state.postText,
          };
          clearTimeout(timer);
          // Upload/removal saves immediately; text and slider changes coalesce.
          if (state.imageBlob !== previous.imageBlob) flush();
          else timer = setTimeout(flush, 200);
        });
        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", onVisibility);
      } catch {
        if (!cancelled)
          setError(
            "Your saved draft could not be restored. Reload to retry; existing saved work has not been overwritten.",
          );
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { ready, error };
}
