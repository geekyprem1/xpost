import type { AnnotationToolId } from "@/lib/editor/annotation-tools";
import { createTextLayer } from "@/lib/editor/text-presets";
import { useEditorStore } from "./editor-store";
import { isEditableTarget } from "./shortcuts";
import { useUiStore } from "./ui-store";

export type AnnotationShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
};

export type AnnotationShortcutAction =
  | { type: "tool"; tool: AnnotationToolId }
  | { type: "redact" }
  | { type: "exit" }
  | { type: "text" };

const TOOL_KEYS: Record<string, AnnotationToolId> = {
  a: "arrow",
  r: "rect",
  o: "ellipse",
  h: "highlight",
  n: "step",
  e: "emoji",
};

export function resolveAnnotationShortcut(
  event: AnnotationShortcutEvent,
  context: { toolActive: boolean; hasImage: boolean },
): AnnotationShortcutAction | null {
  if (isEditableTarget(event.target)) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  if (event.key === "Escape") {
    return context.toolActive ? { type: "exit" } : null;
  }

  if (!context.hasImage) return null;

  const key = event.key.toLowerCase();
  if (key === "t") return { type: "text" };
  if (key === "b") return { type: "redact" };
  const tool = TOOL_KEYS[key];
  return tool ? { type: "tool", tool } : null;
}

export function handleAnnotationShortcutKey(
  event: AnnotationShortcutEvent,
): boolean {
  const scene = useEditorStore.getState().scene;
  const ui = useUiStore.getState();
  const action = resolveAnnotationShortcut(event, {
    toolActive:
      ui.annotationTool !== null || ui.redactTool !== null || ui.cropTool,
    hasImage: scene.image !== null,
  });
  if (!action) return false;

  event.preventDefault();
  if (action.type === "exit") {
    ui.setAnnotationTool(null);
    ui.setRedactTool(null);
    ui.setCropTool(false);
  } else if (action.type === "redact") {
    ui.setRedactTool(ui.redactTool === "blur" ? null : "blur");
  } else if (action.type === "text") {
    ui.setAnnotationTool(null);
    ui.setRedactTool(null);
    useEditorStore.getState().addLayer(createTextLayer("headline"));
  } else {
    // Same key again exits the tool.
    ui.setAnnotationTool(
      ui.annotationTool === action.tool ? null : action.tool,
    );
  }
  return true;
}
