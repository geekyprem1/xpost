import { redoEditor, undoEditor } from "./editor-store";

export type UndoRedoKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const element = target as { tagName?: unknown; isContentEditable?: unknown };
  if (element.isContentEditable === true) return true;
  if (typeof element.tagName !== "string") return false;
  const tag = element.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function handleUndoRedoKey(event: UndoRedoKeyEvent): boolean {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier || isEditableTarget(event.target)) return false;
  if (event.key.toLowerCase() !== "z") return false;
  event.preventDefault();
  if (event.shiftKey) {
    redoEditor();
  } else {
    undoEditor();
  }
  return true;
}
