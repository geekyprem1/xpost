"use client";

import { useEffect } from "react";
import { handleAnnotationShortcutKey } from "./annotation-shortcuts";
import { handleLayerShortcutKey } from "./layer-shortcuts";
import { handleUndoRedoKey } from "./shortcuts";

export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (handleUndoRedoKey(event)) return;
      if (handleAnnotationShortcutKey(event)) return;
      handleLayerShortcutKey(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
