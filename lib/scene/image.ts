import type { Scene } from "./schema";

export type ImageCrop = { x: number; y: number; w: number; h: number };
export type Size = { width: number; height: number };

export const FULL_CROP: ImageCrop = { x: 0, y: 0, w: 1, h: 1 };

export function getImageCrop(scene: Scene): ImageCrop {
  return scene.image?.crop ?? FULL_CROP;
}

/** Displayed image size: crop is normalized to the uncropped source. */
export function croppedImageSize(
  scene: Scene,
  size: Size | null | undefined,
): Size | null {
  if (!size) return null;
  const crop = getImageCrop(scene);
  return {
    width: Math.max(1, size.width * crop.w),
    height: Math.max(1, size.height * crop.h),
  };
}

export function isFullCrop(crop: ImageCrop): boolean {
  return crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1;
}
