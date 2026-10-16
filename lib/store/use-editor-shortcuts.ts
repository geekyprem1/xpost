"use client";

import { useEffect } from "react";
import { handleUndoRedoKey } from "./shortcuts";

export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleUndoRedoKey(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
