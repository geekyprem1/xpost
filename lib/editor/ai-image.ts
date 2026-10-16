import { fitWithin } from "@/lib/image/compress";
import { startImageExport } from "@/lib/renderer/export-client";
import type { Scene } from "@/lib/scene";

export async function capturePostImageForAi(
  scene: Scene,
  screenshot: HTMLImageElement | null,
  max = 1024,
  liveCanvas?: HTMLCanvasElement | null,
): Promise<string> {
  // Copy immediately: the editor owns the decoded video frame and its playback position.
  if (
    scene.background.kind === "video" &&
    liveCanvas &&
    liveCanvas.width > 0 &&
    liveCanvas.height > 0
  ) {
    const target = fitWithin(
      { width: liveCanvas.width, height: liveCanvas.height },
      max,
    );
    const snapshot = document.createElement("canvas");
    snapshot.width = target.width;
    snapshot.height = target.height;
    const context = snapshot.getContext("2d");
    if (!context) throw new Error("Unable to create a preview snapshot");
    context.drawImage(liveCanvas, 0, 0, target.width, target.height);
    return snapshot.toDataURL("image/jpeg", 0.85);
  }

  const handle = startImageExport(
    scene,
    { screenshot },
    { format: "jpg", scale: 1 },
    {},
  );
  const result = await handle.promise;
  const bitmap = await createImageBitmap(result.blob);
  const target = fitWithin({ width: bitmap.width, height: bitmap.height }, max);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Unable to create a 2D rendering context");
  }
  context.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
