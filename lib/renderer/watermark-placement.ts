/**
 * Where and how strongly the watermark is drawn. Pure (no DOM) so the
 * renderer, the export worker and tests share one placement rule — preview
 * and export stay identical at every scale.
 */
export const WATERMARK_CORNERS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;
export type WatermarkCorner = (typeof WATERMARK_CORNERS)[number];

export type WatermarkPlacement = {
  corner: WatermarkCorner;
  /** Height multiplier over the default 36 design px (0.5–2). */
  size: number;
  /** 0–1 */
  opacity: number;
};

export const DEFAULT_WATERMARK_PLACEMENT: WatermarkPlacement = {
  corner: "bottom-right",
  size: 1,
  opacity: 1,
};

/** Design px at baseWidth 1500, multiplied by the render scale. */
export const WATERMARK_BASE_HEIGHT = 36;
export const WATERMARK_MARGIN = 30;

export type WatermarkRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Top-left pixel rect of the watermark on a canvas. `aspect` is the watermark
 * texture's width / height. The badge never grows wider than the canvas minus
 * both margins (long handles on narrow aspects shrink instead of clipping).
 */
export function watermarkRect(
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  aspect: number,
  placement: WatermarkPlacement = DEFAULT_WATERMARK_PLACEMENT,
): WatermarkRect {
  const size = clamp(placement.size, 0.5, 2);
  const margin = WATERMARK_MARGIN * scale;
  let height = WATERMARK_BASE_HEIGHT * scale * size;
  let width = height * Math.max(0.01, aspect);
  const maxWidth = Math.max(1, canvasWidth - margin * 2);
  if (width > maxWidth) {
    width = maxWidth;
    height = width / Math.max(0.01, aspect);
  }
  const left = placement.corner.endsWith("left");
  const top = placement.corner.startsWith("top");
  return {
    x: left ? margin : canvasWidth - margin - width,
    y: top ? margin : canvasHeight - margin - height,
    width,
    height,
  };
}

export function clampWatermarkOpacity(opacity: number): number {
  return clamp(opacity, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
