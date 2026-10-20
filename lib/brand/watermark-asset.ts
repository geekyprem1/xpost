import { ensureFont, fontStack } from "@/lib/fonts";
import { createWatermarkCanvas } from "@/lib/renderer/watermark";
import {
  DEFAULT_WATERMARK_PLACEMENT,
  type WatermarkPlacement,
} from "@/lib/renderer/watermark-placement";
import {
  MAX_LOGO_BYTES,
  hasCustomWatermark,
  watermarkContentKey,
  watermarkPlacementFor,
  type BrandLogo,
  type BrandWatermark,
} from "./brand-kit";
import { useBrandStore } from "./brand-store";

/** Badge canvas resolution: 36 design px × 4 → sharp up to 3× export at 200%. */
const RENDER_SCALE = 4;
const LOGO_MAX_HEIGHT = 256;
const LOGO_MAX_WIDTH = 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/svg+xml"];

export const LOGO_ACCEPT = ACCEPTED_LOGO_TYPES.join(",");

export type ActiveWatermark = {
  source: HTMLCanvasElement;
  placement: WatermarkPlacement;
  custom: boolean;
};

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The logo could not be loaded."));
    image.src = src;
  });
}

/**
 * Validates a PNG / SVG logo (≤ 500 KB) and rasterizes it to a small PNG
 * (≤ 256 px tall). SVG ko bhi PNG bana dete hain — storage chhota, aur export
 * mein har browser same pixels draw kare.
 */
export async function prepareLogo(file: File): Promise<BrandLogo> {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    throw new Error("Logo must be a PNG or SVG file.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo must be 500 KB or smaller.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    // Some SVGs have no intrinsic size; treat them as a square.
    const naturalWidth = image.naturalWidth || LOGO_MAX_HEIGHT;
    const naturalHeight = image.naturalHeight || LOGO_MAX_HEIGHT;
    const fit = Math.min(
      LOGO_MAX_HEIGHT / naturalHeight,
      LOGO_MAX_WIDTH / naturalWidth,
    );
    // Raster logos only shrink; SVGs scale up cleanly to the full height.
    const factor = file.type === "image/svg+xml" ? fit : Math.min(1, fit);
    const width = Math.max(1, Math.round(naturalWidth * factor));
    const height = Math.max(1, Math.round(naturalHeight * factor));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to create a 2D rendering context");
    ctx.drawImage(image, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width,
      height,
      name: file.name.slice(0, 120),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Custom badge: [pill] [logo] [text]. Height = 36 design px × RENDER_SCALE. */
export async function createBrandWatermarkCanvas(
  watermark: BrandWatermark,
): Promise<HTMLCanvasElement> {
  const s = RENDER_SCALE;
  const height = 36 * s;
  const text = watermark.text.trim();
  const pill = watermark.pill;
  const padX = pill ? 12 * s : 0;
  const padY = pill ? 5 * s : 0;
  const gap = 8 * s;
  const fontSize = 19 * s;

  let logo: HTMLImageElement | null = null;
  if (watermark.logo) logo = await loadImageElement(watermark.logo.dataUrl);
  if (text) {
    try {
      await ensureFont("inter");
    } catch {
      // System font fallback is fine; ensureFont retries on the next build.
    }
  }

  const logoHeight = height - padY * 2;
  const logoWidth = logo
    ? Math.round(
        logoHeight * (logo.naturalWidth / Math.max(1, logo.naturalHeight)),
      )
    : 0;

  const font = `600 ${fontSize}px ${fontStack("inter")}`;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Unable to create a 2D rendering context");
  measure.font = font;
  const textWidth = text ? Math.ceil(measure.measureText(text).width) : 0;

  const contentWidth =
    logoWidth + textWidth + (logoWidth > 0 && textWidth > 0 ? gap : 0);
  const width = Math.max(1, Math.ceil(contentWidth + padX * 2));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create a 2D rendering context");

  const dark = watermark.tone === "dark";
  if (pill) {
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, height / 2);
    ctx.fillStyle = dark
      ? "rgba(12, 12, 18, 0.5)"
      : "rgba(255, 255, 255, 0.82)";
    ctx.fill();
  }

  let x = padX;
  if (logo) {
    ctx.drawImage(logo, x, padY, logoWidth, logoHeight);
    x += logoWidth + (textWidth > 0 ? gap : 0);
  }
  if (text) {
    ctx.font = font;
    ctx.textBaseline = "middle";
    if (!pill) {
      // No pill → soft shadow so text stays readable on busy backgrounds.
      ctx.shadowColor = dark
        ? "rgba(0, 0, 0, 0.45)"
        : "rgba(255, 255, 255, 0.55)";
      ctx.shadowBlur = 4 * s;
    }
    ctx.fillStyle = dark
      ? "rgba(255, 255, 255, 0.95)"
      : "rgba(17, 17, 24, 0.92)";
    ctx.fillText(text, x, height / 2 + s);
  }
  return canvas;
}

let cache: { key: string; source: HTMLCanvasElement } | null = null;

/**
 * Watermark jo preview aur har export use karta hai (single source).
 * Custom off / empty → default "Shotlark" badge, bottom-right.
 */
export async function resolveWatermark(
  watermark: BrandWatermark,
): Promise<ActiveWatermark> {
  if (!hasCustomWatermark(watermark)) {
    await document.fonts.ready;
    return {
      source: createWatermarkCanvas(),
      placement: DEFAULT_WATERMARK_PLACEMENT,
      custom: false,
    };
  }
  const key = watermarkContentKey(watermark);
  if (cache?.key !== key) {
    cache = { key, source: await createBrandWatermarkCanvas(watermark) };
  }
  return {
    source: cache.source,
    placement: watermarkPlacementFor(watermark),
    custom: true,
  };
}

export function resolveActiveWatermark(): Promise<ActiveWatermark> {
  return resolveWatermark(useBrandStore.getState().kit.watermark);
}
