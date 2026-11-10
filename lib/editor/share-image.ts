import { startImageExport } from "@/lib/renderer/export-client";
import type { ExportImageOptions } from "@/lib/renderer/export";
import {
  encodeWithinLimit,
  X_IMAGE_ATTEMPTS,
  X_IMAGE_MAX_BYTES,
} from "@/lib/renderer/x-presets";
import type { Scene } from "@/lib/scene";

export type ShareImages = { jpeg: Blob; png: Blob | null };
type Encode = (options: ExportImageOptions) => Promise<Blob>;

/** Share exports never use the smaller image sent to the AI provider. */
export async function encodeShareImages(encode: Encode): Promise<ShareImages> {
  const jpeg = await encodeWithinLimit(
    X_IMAGE_ATTEMPTS,
    X_IMAGE_MAX_BYTES,
    async ({ scale, quality }) => {
      const blob = await encode({ format: "jpg", scale, quality });
      return { bytes: blob.size, value: blob };
    },
  );
  if (!jpeg) throw new Error("Image exceeds 5 MB. Try a smaller canvas size.");

  let png: Blob | null = null;
  for (const scale of [2, 1.5, 1] as const) {
    const blob = await encode({ format: "png", scale });
    if (blob.size <= X_IMAGE_MAX_BYTES) {
      png = blob;
      break;
    }
  }
  return { jpeg: jpeg.value, png };
}

/** One-entry cache, including in-flight work; failed exports can be retried. */
export function createShareImageCache<T>(
  render: (input: T) => Promise<ShareImages>,
) {
  let current: { input: T; promise: Promise<ShareImages> } | null = null;
  return {
    get(input: T): Promise<ShareImages> {
      if (current?.input === input) return current.promise;
      const promise = render(input).catch((error) => {
        if (current?.promise === promise) current = null;
        throw error;
      });
      current = { input, promise };
      return promise;
    },
    clear() {
      current = null;
    },
  };
}

export function renderShareImages(scene: Scene, screenshot: HTMLImageElement) {
  return encodeShareImages(async (options) => {
    const result = await startImageExport(scene, { screenshot }, options)
      .promise;
    return result.blob;
  });
}

export function downloadShareImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "shotlark-post.jpg";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
