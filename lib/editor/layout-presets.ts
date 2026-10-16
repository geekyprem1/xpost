import type { Scene } from "@/lib/scene";

export type LayoutPreset = {
  id: string;
  name: string;
  transform: Pick<
    Scene["transform"],
    "zoom" | "anchor" | "offset" | "padding"
  >;
};

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "center",
    name: "Center",
    transform: { zoom: 100, anchor: "center", offset: { x: 0, y: 0 }, padding: 100 },
  },
  {
    id: "hero",
    name: "Hero",
    transform: { zoom: 122, anchor: "bottom-center", offset: { x: 0, y: 60 }, padding: 90 },
  },
  {
    id: "left",
    name: "Left",
    transform: { zoom: 104, anchor: "center-left", offset: { x: -40, y: 0 }, padding: 100 },
  },
  {
    id: "right",
    name: "Right",
    transform: { zoom: 104, anchor: "center-right", offset: { x: 40, y: 0 }, padding: 100 },
  },
  {
    id: "bottom-peek",
    name: "Bottom Peek",
    transform: { zoom: 112, anchor: "bottom-center", offset: { x: 0, y: 130 }, padding: 80 },
  },
  {
    id: "top-shelf",
    name: "Top Shelf",
    transform: { zoom: 112, anchor: "top-center", offset: { x: 0, y: -130 }, padding: 80 },
  },
];

export function applyLayoutPreset(scene: Scene, preset: LayoutPreset): Scene {
  return {
    ...scene,
    transform: {
      ...scene.transform,
      ...preset.transform,
      offset: { ...preset.transform.offset },
    },
  };
}

export function isPresetActive(scene: Scene, preset: LayoutPreset): boolean {
  const transform = scene.transform;
  return (
    transform.zoom === preset.transform.zoom &&
    transform.anchor === preset.transform.anchor &&
    transform.offset.x === preset.transform.offset.x &&
    transform.offset.y === preset.transform.offset.y &&
    transform.padding === preset.transform.padding
  );
}
