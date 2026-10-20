import { z } from "zod";
import { sceneSchema, type Scene } from "@/lib/scene";
import { withAspect } from "@/lib/editor/platform-sizes";
import {
  WATERMARK_CORNERS,
  type WatermarkPlacement,
} from "@/lib/renderer/watermark-placement";

/**
 * Brand kit (PRD BK-1…BK-3): saved styles, brand colors and a custom
 * watermark. Pure data + operations; persistence lives in brand-storage.ts.
 * Abhi browser (localStorage) mein — `user_styles` table T8.9 / T8.10 ke saath.
 */

export const BRAND_KIT_VERSION = 1;
/** PRD `limits.brand_styles_max`. */
export const MAX_SAVED_STYLES = 10;
export const MAX_BRAND_COLORS = 6;
export const MAX_STYLE_NAME = 40;
export const MAX_WATERMARK_TEXT = 40;
/** PRD BK-2: PNG / SVG ≤ 500 KB (original file). */
export const MAX_LOGO_BYTES = 500 * 1024;

const shape = sceneSchema.shape;

/** The "look" of a scene — everything except the screenshot, crop and layers. */
export const styleSnapshotSchema = z.object({
  aspect: shape.canvas.shape.aspect,
  /** Exact platform size (T8.8); purane saved styles mein nahi hota. */
  size: shape.canvas.shape.size,
  background: shape.background,
  frame: shape.frame,
  style: shape.style,
  transform: shape.transform,
  layout: shape.layout,
  sunlight: shape.sunlight,
});
export type StyleSnapshot = z.infer<typeof styleSnapshotSchema>;

export const savedStyleSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(MAX_STYLE_NAME),
  createdAt: z.number(),
  snapshot: styleSnapshotSchema,
});
export type SavedStyle = z.infer<typeof savedStyleSchema>;

const HEX_COLOR = /^#[0-9a-f]{6}$/;
const hexColorSchema = z.string().regex(HEX_COLOR);

export const brandLogoSchema = z.object({
  /** Rasterized PNG data URL (SVG bhi PNG mein convert hota hai). */
  dataUrl: z.string().startsWith("data:image/png;base64,"),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  name: z.string().max(120),
});
export type BrandLogo = z.infer<typeof brandLogoSchema>;

export const brandWatermarkSchema = z.object({
  /** Custom watermark on → "Shotlark" badge ki jagah ye. */
  enabled: z.boolean(),
  text: z.string().max(MAX_WATERMARK_TEXT),
  logo: brandLogoSchema.nullable(),
  corner: z.enum(WATERMARK_CORNERS),
  /** Percent of the default badge height, 50–200. */
  size: z.number().min(50).max(200),
  /** Percent, 10–100. */
  opacity: z.number().min(10).max(100),
  /** Rounded pill behind the logo / text for contrast. */
  pill: z.boolean(),
  /** dark = dark pill + white text; light = light pill + dark text. */
  tone: z.enum(["dark", "light"]),
});
export type BrandWatermark = z.infer<typeof brandWatermarkSchema>;

export type BrandKit = {
  version: typeof BRAND_KIT_VERSION;
  styles: SavedStyle[];
  colors: string[];
  watermark: BrandWatermark;
};

export const DEFAULT_BRAND_WATERMARK: BrandWatermark = {
  enabled: false,
  text: "",
  logo: null,
  corner: "bottom-right",
  size: 100,
  opacity: 100,
  pill: true,
  tone: "dark",
};

export function createEmptyBrandKit(): BrandKit {
  return {
    version: BRAND_KIT_VERSION,
    styles: [],
    colors: [],
    watermark: { ...DEFAULT_BRAND_WATERMARK },
  };
}

/**
 * Tolerant parse of stored data: a bad style or color is dropped instead of
 * losing the whole kit (scene schema badalne pe ek purana style toot sakta hai).
 */
export function parseBrandKit(input: unknown): BrandKit {
  const kit = createEmptyBrandKit();
  if (!input || typeof input !== "object") return kit;
  const raw = input as Record<string, unknown>;
  if (raw.version !== BRAND_KIT_VERSION) return kit;

  if (Array.isArray(raw.styles)) {
    const seen = new Set<string>();
    for (const item of raw.styles) {
      const parsed = savedStyleSchema.safeParse(item);
      if (!parsed.success || seen.has(parsed.data.id)) continue;
      seen.add(parsed.data.id);
      kit.styles.push(parsed.data);
      if (kit.styles.length >= MAX_SAVED_STYLES) break;
    }
  }
  if (Array.isArray(raw.colors)) {
    for (const item of raw.colors) {
      if (typeof item !== "string") continue;
      kit.colors = addBrandColor(kit.colors, item);
    }
  }
  const watermark = brandWatermarkSchema.safeParse(raw.watermark);
  if (watermark.success) {
    kit.watermark = watermark.data;
  } else if (raw.watermark && typeof raw.watermark === "object") {
    // Partial / older shape: keep valid fields, default the rest.
    const merged = brandWatermarkSchema.safeParse({
      ...DEFAULT_BRAND_WATERMARK,
      ...(raw.watermark as object),
    });
    if (merged.success) kit.watermark = merged.data;
  }
  return kit;
}

// ── Saved styles (BK-1) ──────────────────────────────────────────────

export function captureStyle(scene: Scene): StyleSnapshot {
  return structuredClone({
    aspect: scene.canvas.aspect,
    ...(scene.canvas.size ? { size: scene.canvas.size } : {}),
    background: scene.background,
    frame: scene.frame,
    style: scene.style,
    transform: scene.transform,
    layout: scene.layout,
    sunlight: scene.sunlight,
  });
}

/** Screenshot, crop, layers, watermark toggle aur canvas width untouched. */
export function applyStyleSnapshot(
  scene: Scene,
  snapshot: StyleSnapshot,
): Scene {
  const copy = structuredClone(snapshot);
  const canvas = withAspect(scene.canvas, copy.aspect);
  return {
    ...scene,
    canvas: copy.size ? { ...canvas, size: copy.size } : canvas,
    background: copy.background,
    frame: copy.frame,
    style: copy.style,
    transform: copy.transform,
    layout: copy.layout,
    sunlight: copy.sunlight,
  };
}

export function styleMatches(scene: Scene, snapshot: StyleSnapshot): boolean {
  return JSON.stringify(captureStyle(scene)) === JSON.stringify(snapshot);
}

export function normalizeStyleName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_STYLE_NAME);
}

export function nextStyleName(styles: SavedStyle[]): string {
  const taken = new Set(styles.map((style) => style.name.toLowerCase()));
  for (let n = styles.length + 1; ; n++) {
    const name = `My style ${n}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
}

export class BrandLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrandLimitError";
  }
}

export function addSavedStyle(
  kit: BrandKit,
  input: { id: string; name: string; snapshot: StyleSnapshot; now: number },
): BrandKit {
  if (kit.styles.length >= MAX_SAVED_STYLES) {
    throw new BrandLimitError(
      `You can save up to ${MAX_SAVED_STYLES} styles. Delete one to save a new style.`,
    );
  }
  const name = normalizeStyleName(input.name) || nextStyleName(kit.styles);
  const style = savedStyleSchema.parse({
    id: input.id,
    name,
    createdAt: input.now,
    snapshot: input.snapshot,
  });
  return { ...kit, styles: [...kit.styles, style] };
}

export function renameSavedStyle(
  kit: BrandKit,
  id: string,
  name: string,
): BrandKit {
  const normalized = normalizeStyleName(name);
  if (!normalized) return kit;
  return {
    ...kit,
    styles: kit.styles.map((style) =>
      style.id === id ? { ...style, name: normalized } : style,
    ),
  };
}

export function removeSavedStyle(kit: BrandKit, id: string): BrandKit {
  return { ...kit, styles: kit.styles.filter((style) => style.id !== id) };
}

// ── Brand colors (BK-3) ──────────────────────────────────────────────

/** `#ABC` / `abcdef` / `#AbCdEf` → `#abcdef`; invalid → null. */
export function normalizeHexColor(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return hexColorSchema.safeParse(value).success ? value : null;
}

/** Adds a color (dedupe, max 6). Invalid or over-limit input is ignored. */
export function addBrandColor(colors: string[], input: string): string[] {
  const color = normalizeHexColor(input);
  if (!color || colors.includes(color) || colors.length >= MAX_BRAND_COLORS) {
    return colors;
  }
  return [...colors, color];
}

export function removeBrandColor(colors: string[], input: string): string[] {
  const color = normalizeHexColor(input);
  return colors.filter((item) => item !== color);
}

/** First 2–4 brand colors as an evenly spaced 135° gradient; < 2 → null. */
export function brandGradient(
  colors: string[],
): Extract<Scene["background"], { kind: "gradient" }> | null {
  const picked = colors.slice(0, 4);
  if (picked.length < 2) return null;
  return {
    kind: "gradient",
    angle: 135,
    stops: picked.map((color, index) => ({
      color,
      at: index / (picked.length - 1),
    })),
  };
}

// ── Watermark (BK-2) ─────────────────────────────────────────────────

/** Custom watermark sirf tab jab on ho aur kuch dikhane ko ho. */
export function hasCustomWatermark(watermark: BrandWatermark): boolean {
  return (
    watermark.enabled &&
    (watermark.logo !== null || watermark.text.trim().length > 0)
  );
}

export function watermarkPlacementFor(
  watermark: BrandWatermark,
): WatermarkPlacement {
  return {
    corner: watermark.corner,
    size: watermark.size / 100,
    opacity: watermark.opacity / 100,
  };
}

/** Content key: changes only when the badge pixels change (not placement). */
export function watermarkContentKey(watermark: BrandWatermark): string {
  return JSON.stringify([
    watermark.text.trim(),
    watermark.logo?.dataUrl.length ?? 0,
    watermark.logo?.dataUrl.slice(-64) ?? "",
    watermark.pill,
    watermark.tone,
  ]);
}
