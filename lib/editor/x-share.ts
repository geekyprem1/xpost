export const X_INTENT_URL = "https://x.com/intent/post";

export function buildXIntentUrl(text: string): string {
  return `${X_INTENT_URL}?text=${encodeURIComponent(text.trim())}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export async function blobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Unable to create a 2D rendering context");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Unable to convert the image to PNG"));
    }, "image/png");
  });
}
