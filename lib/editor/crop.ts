import type { ImageCrop } from "@/lib/scene";

export type CropCorner = "nw" | "ne" | "se" | "sw";

export const MIN_CROP = 0.02;

export const CROP_ASPECTS = [
  { id: "free", label: "Free" },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
] as const;
export type CropAspectId = (typeof CROP_ASPECTS)[number]["id"];

export function cropAspectRatio(id: CropAspectId): number | null {
  const aspect = CROP_ASPECTS.find((item) => item.id === id);
  if (!aspect || aspect.id === "free") return null;
  return aspect.ratio;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * New crop rect from dragging one corner inside the full image. The opposite
 * corner stays anchored; the rect may shrink or grow up to the image edges.
 */
export function cropFromCorner(
  start: ImageCrop,
  corner: CropCorner,
  point: { x: number; y: number },
  ratio: number | null,
  sourceSize: { width: number; height: number },
): ImageCrop {
  const px = clamp(point.x, 0, 1);
  const py = clamp(point.y, 0, 1);

  const anchorX =
    corner === "se" || corner === "ne" ? start.x : start.x + start.w;
  const anchorY =
    corner === "se" || corner === "sw" ? start.y : start.y + start.h;

  const movingX =
    corner === "se" || corner === "ne"
      ? clamp(px, anchorX + MIN_CROP, 1)
      : clamp(px, 0, anchorX - MIN_CROP);
  const movingY =
    corner === "se" || corner === "sw"
      ? clamp(py, anchorY + MIN_CROP, 1)
      : clamp(py, 0, anchorY - MIN_CROP);

  let left = Math.min(anchorX, movingX);
  let right = Math.max(anchorX, movingX);
  let top = Math.min(anchorY, movingY);
  let bottom = Math.max(anchorY, movingY);

  if (ratio && ratio > 0 && sourceSize.width > 0 && sourceSize.height > 0) {
    // Normalized w/h for an output aspect ratio: w/h = ratio * srcH/srcW.
    const k = (ratio * sourceSize.height) / sourceSize.width;
    const maxWidth = corner === "se" || corner === "ne" ? 1 - anchorX : anchorX;
    const maxHeight =
      corner === "se" || corner === "sw" ? 1 - anchorY : anchorY;

    let width = clamp(right - left, MIN_CROP, Math.max(MIN_CROP, maxWidth));
    let height = clamp(width / k, MIN_CROP, Math.max(MIN_CROP, maxHeight));
    width = clamp(height * k, MIN_CROP, Math.max(MIN_CROP, maxWidth));
    height = width / k;

    if (corner === "se" || corner === "ne") {
      left = anchorX;
      right = left + width;
    } else {
      right = anchorX;
      left = right - width;
    }
    if (corner === "se" || corner === "sw") {
      top = anchorY;
      bottom = top + height;
    } else {
      bottom = anchorY;
      top = bottom - height;
    }
  }

  left = clamp(left, 0, 1 - MIN_CROP);
  top = clamp(top, 0, 1 - MIN_CROP);
  right = clamp(right, left + MIN_CROP, 1);
  bottom = clamp(bottom, top + MIN_CROP, 1);

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  };
}

export function moveCrop(
  start: ImageCrop,
  delta: { x: number; y: number },
): ImageCrop {
  return {
    x: clamp(start.x + delta.x, 0, 1 - start.w),
    y: clamp(start.y + delta.y, 0, 1 - start.h),
    w: start.w,
    h: start.h,
  };
}
