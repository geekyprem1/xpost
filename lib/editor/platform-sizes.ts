import {
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  type AspectId,
  type Scene,
} from "@/lib/scene";

/**
 * Platform presets (PRD PS-1). 1× export = exactly these pixels (PS-2).
 * X ke liye PRD sirf ratio deta hai — X ke recommended in-feed sizes liye hain.
 */
export const PLATFORM_SIZES = [
  { id: "x-16-9", group: "X", label: "X 16:9", width: 1600, height: 900 },
  { id: "x-1-1", group: "X", label: "X 1:1", width: 1080, height: 1080 },
  { id: "x-4-5", group: "X", label: "X 4:5", width: 1080, height: 1350 },
  {
    id: "linkedin",
    group: "LinkedIn",
    label: "LinkedIn",
    width: 1200,
    height: 627,
  },
  {
    id: "ig-portrait",
    group: "Instagram",
    label: "IG portrait",
    width: 1080,
    height: 1350,
  },
  {
    id: "ig-square",
    group: "Instagram",
    label: "IG square",
    width: 1080,
    height: 1080,
  },
  {
    id: "ig-story",
    group: "Instagram",
    label: "IG story",
    width: 1080,
    height: 1920,
  },
  {
    id: "product-hunt",
    group: "Product Hunt",
    label: "Product Hunt",
    width: 1270,
    height: 760,
  },
  { id: "og-image", group: "Web", label: "OG image", width: 1200, height: 630 },
  {
    id: "youtube",
    group: "YouTube",
    label: "YouTube thumb",
    width: 1280,
    height: 720,
  },
] as const;

export type PlatformSize = (typeof PLATFORM_SIZES)[number];
export type PlatformSizeId = PlatformSize["id"];

export function findPlatformSize(
  id: string | undefined,
): PlatformSize | undefined {
  return PLATFORM_SIZES.find((item) => item.id === id);
}

export function applyPlatformSize(scene: Scene, id: PlatformSizeId): Scene {
  const preset = findPlatformSize(id);
  if (!preset) return scene;
  return {
    ...scene,
    canvas: {
      ...scene.canvas,
      size: { width: preset.width, height: preset.height, preset: preset.id },
    },
  };
}

/** Parses a user-typed dimension; null when outside 200–4096 or not a number. */
export function parseCanvasDimension(input: string | number): number | null {
  const value = typeof input === "number" ? input : Number(input.trim());
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_CANVAS_SIZE || rounded > MAX_CANVAS_SIZE) return null;
  return rounded;
}

/** Custom size (PS-3). Invalid input leaves the scene unchanged. */
export function applyCustomSize(
  scene: Scene,
  width: number,
  height: number,
): Scene {
  const w = parseCanvasDimension(width);
  const h = parseCanvasDimension(height);
  if (w === null || h === null) return scene;
  return {
    ...scene,
    canvas: { ...scene.canvas, size: { width: w, height: h } },
  };
}

/** Aspect ratio chunna exact size hata deta hai (dono ek saath active nahi). */
export function setCanvasAspect(scene: Scene, aspect: AspectId): Scene {
  return { ...scene, canvas: withAspect(scene.canvas, aspect) };
}

export function withAspect(
  canvas: Scene["canvas"],
  aspect: AspectId,
): Scene["canvas"] {
  const { size: _size, ...rest } = canvas;
  void _size;
  return { ...rest, aspect };
}
