import {
  extractDominantColors,
  type PixelSource,
} from "@/lib/backgrounds/dominant-colors";
import type { Scene } from "@/lib/scene";

export function buildGradientFromColors(colors: string[]): Scene["background"] {
  if (colors.length === 0) {
    return {
      kind: "gradient",
      stops: [
        { color: "#101014", at: 0 },
        { color: "#26262e", at: 1 },
      ],
      angle: 45,
    };
  }
  if (colors.length === 1) {
    return {
      kind: "gradient",
      stops: [
        { color: colors[0], at: 0 },
        { color: colors[0], at: 1 },
      ],
      angle: 45,
    };
  }
  const stops = colors
    .slice(0, 4)
    .map((color, index, list) => ({ color, at: index / (list.length - 1) }));
  return { kind: "gradient", stops, angle: 45 };
}

export function sampleImage(
  image: HTMLImageElement,
  maxWidth = 128,
): PixelSource {
  const scale = Math.min(1, maxWidth / Math.max(1, image.naturalWidth));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Unable to create a 2D rendering context");
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function gradientBackgroundFromImage(
  image: HTMLImageElement,
): Scene["background"] {
  const colors = extractDominantColors(sampleImage(image, 96), 4);
  return buildGradientFromColors(colors);
}

export function autoSceneFromColors(scene: Scene, colors: string[]): Scene {
  return {
    ...scene,
    background: buildGradientFromColors(colors),
    transform: { ...scene.transform, padding: 110 },
    layout: { radius: 28, shadow: 55 },
    style: { ...scene.style, shadow: "spread" },
  };
}

export function autoSceneFromImage(
  scene: Scene,
  image: HTMLImageElement,
): Scene {
  const colors = extractDominantColors(sampleImage(image, 128), 4);
  return autoSceneFromColors(scene, colors);
}
