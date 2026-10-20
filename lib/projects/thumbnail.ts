import { fitWithin } from "@/lib/image/compress";
import { startImageExport } from "@/lib/renderer/export-client";
import type { Scene } from "@/lib/scene";

const THUMB_MAX = 640;

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Thumbnail encode failed")),
      "image/webp",
      0.8,
    );
  });
}

/** Dashboard thumbnail (≤ 640 px WebP) — same export path as downloads, so it matches. */
export async function renderProjectThumbnail(
  scene: Scene,
  screenshot: HTMLImageElement | null,
): Promise<Blob> {
  const result = await startImageExport(
    scene,
    { screenshot },
    { format: "png", scale: 1 },
    {},
  ).promise;
  const bitmap = await createImageBitmap(result.blob);
  try {
    const target = fitWithin(
      { width: bitmap.width, height: bitmap.height },
      THUMB_MAX,
    );
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create a 2D rendering context");
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    return await canvasToWebp(canvas);
  } finally {
    bitmap.close();
  }
}
