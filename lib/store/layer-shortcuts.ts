import { computeOutputSize } from "@/lib/renderer/geometry";
import {
  duplicateLayer,
  moveLayerBy,
  type Layer,
  type Scene,
} from "@/lib/scene";
import { useEditorStore } from "./editor-store";
import { isEditableTarget } from "./shortcuts";
import { useUiStore } from "./ui-store";

export type LayerShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
};

export type LayerShortcutAction =
  | { type: "remove"; id: string }
  | { type: "duplicate"; id: string; dx: number; dy: number }
  | { type: "nudge"; id: string; dx: number; dy: number }
  | { type: "reorder"; id: string; toIndex: number }
  | { type: "deselect" };

function layerAxes(
  scene: Scene,
  layer: Layer,
): { x: number; y: number } | null {
  if (layer.kind === "text") {
    const output = computeOutputSize(scene, 1, scene.image);
    return { x: output.width, y: output.height };
  }
  if (!scene.image) return null;
  return { x: scene.image.width, y: scene.image.height };
}

function offsetForPixels(
  scene: Scene,
  layer: Layer,
  pixels: number,
  axis: "x" | "y",
): number {
  const axes = layerAxes(scene, layer);
  return axes ? pixels / axes[axis] : 0;
}

export function resolveLayerShortcut(
  event: LayerShortcutEvent,
  scene: Scene,
  selectedLayerId: string | null,
): LayerShortcutAction | null {
  if (isEditableTarget(event.target)) return null;

  const modifier = event.ctrlKey || event.metaKey;

  if (event.key === "Escape") {
    return selectedLayerId ? { type: "deselect" } : null;
  }

  const index = scene.layers.findIndex((layer) => layer.id === selectedLayerId);
  if (index === -1) return null;
  const layer = scene.layers[index];
  if (layer.locked) return null;

  if (!modifier && (event.key === "Delete" || event.key === "Backspace")) {
    return { type: "remove", id: layer.id };
  }

  if (modifier && !event.altKey && event.key.toLowerCase() === "d") {
    return {
      type: "duplicate",
      id: layer.id,
      dx: offsetForPixels(scene, layer, 24, "x"),
      dy: offsetForPixels(scene, layer, 24, "y"),
    };
  }

  if (modifier && event.key === "]") {
    return index < scene.layers.length - 1
      ? { type: "reorder", id: layer.id, toIndex: index + 1 }
      : null;
  }
  if (modifier && event.key === "[") {
    return index > 0
      ? { type: "reorder", id: layer.id, toIndex: index - 1 }
      : null;
  }

  if (!modifier && !event.altKey && event.key.startsWith("Arrow")) {
    const pixels = event.shiftKey ? 10 : 1;
    const dx =
      event.key === "ArrowLeft"
        ? -offsetForPixels(scene, layer, pixels, "x")
        : event.key === "ArrowRight"
          ? offsetForPixels(scene, layer, pixels, "x")
          : 0;
    const dy =
      event.key === "ArrowUp"
        ? -offsetForPixels(scene, layer, pixels, "y")
        : event.key === "ArrowDown"
          ? offsetForPixels(scene, layer, pixels, "y")
          : 0;
    return { type: "nudge", id: layer.id, dx, dy };
  }

  return null;
}

export function handleLayerShortcutKey(event: LayerShortcutEvent): boolean {
  const scene = useEditorStore.getState().scene;
  const selectedLayerId = useUiStore.getState().selectedLayerId;
  const action = resolveLayerShortcut(event, scene, selectedLayerId);
  if (!action) return false;

  event.preventDefault();
  const store = useEditorStore.getState();

  switch (action.type) {
    case "remove":
      store.removeLayer(action.id);
      break;
    case "duplicate": {
      const layer = scene.layers.find((item) => item.id === action.id);
      if (!layer) break;
      const index = scene.layers.findIndex((item) => item.id === action.id);
      store.addLayer(duplicateLayer(layer, action.dx, action.dy), index + 1);
      break;
    }
    case "nudge":
      store.updateLayer(action.id, (layer) =>
        moveLayerBy(layer, action.dx, action.dy),
      );
      break;
    case "reorder":
      store.reorderLayer(action.id, action.toIndex);
      break;
    case "deselect":
      useUiStore.getState().selectLayer(null);
      break;
  }
  return true;
}
