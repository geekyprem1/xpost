"use client";

import { useEffect, useRef } from "react";
import { applyLook, findLook } from "@/lib/looks/looks";
import { takePendingImage, takePendingLook } from "@/lib/editor/handoff";
import { useImageActions } from "@/lib/image/use-image-actions";
import { useEditorStore } from "@/lib/store";

/**
 * Applies a look and/or screenshot picked on the landing page. Must run after
 * the local draft is restored, otherwise the restore would overwrite it.
 */
export function useEditorHandoff(ready: boolean) {
  const { loadFile } = useImageActions();
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;

    const lookId = takePendingLook();
    const look = lookId ? findLook(lookId) : null;
    if (look) {
      useEditorStore.getState().setScene((scene) => applyLook(scene, look));
    }

    void takePendingImage().then((file) => {
      if (file) void loadFile(file);
    });
  }, [ready, loadFile]);
}
