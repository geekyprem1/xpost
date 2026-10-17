import type { ImageCrop } from "@/lib/scene";

export type RgbaImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

function pixelMatches(
  data: RgbaImage["data"],
  width: number,
  x: number,
  y: number,
  color: [number, number, number],
  tolerance: number,
): boolean {
  const index = (y * width + x) * 4;
  return (
    Math.abs(data[index] - color[0]) <= tolerance &&
    Math.abs(data[index + 1] - color[1]) <= tolerance &&
    Math.abs(data[index + 2] - color[2]) <= tolerance
  );
}

/**
 * Finds the content rect inside a uniform border. Returns null when the
 * corners differ (photo-like image) or the image is uniformly coloured.
 */
export function autoTrimRect(
  image: RgbaImage,
  tolerance = 12,
): ImageCrop | null {
  const { width, height, data } = image;
  if (width < 3 || height < 3) return null;

  const corner = (x: number, y: number): [number, number, number] => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };
  const reference = corner(0, 0);
  for (const [x, y] of [
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]) {
    const value = corner(x, y);
    for (let channel = 0; channel < 3; channel++) {
      if (Math.abs(value[channel] - reference[channel]) > tolerance) {
        return null;
      }
    }
  }

  const stepX = Math.max(1, Math.floor(width / 64));
  const stepY = Math.max(1, Math.floor(height / 64));

  const rowIsBorder = (y: number) => {
    for (let x = 0; x < width; x += stepX) {
      if (!pixelMatches(data, width, x, y, reference, tolerance)) return false;
    }
    return true;
  };
  const columnIsBorder = (x: number) => {
    for (let y = 0; y < height; y += stepY) {
      if (!pixelMatches(data, width, x, y, reference, tolerance)) return false;
    }
    return true;
  };

  let top = 0;
  while (top < height && rowIsBorder(top)) top++;
  let bottom = height - 1;
  while (bottom >= top && rowIsBorder(bottom)) bottom--;
  let left = 0;
  while (left < width && columnIsBorder(left)) left++;
  let right = width - 1;
  while (right >= left && columnIsBorder(right)) right--;

  if (top >= bottom || left >= right) return null;

  return {
    x: left / width,
    y: top / height,
    w: (right - left + 1) / width,
    h: (bottom - top + 1) / height,
  };
}

export function detectAutoTrim(
  image: HTMLImageElement,
  tolerance = 12,
): ImageCrop | null {
  const maxDimension = 1024;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  return autoTrimRect(
    { width: canvas.width, height: canvas.height, data: data.data },
    tolerance,
  );
}
