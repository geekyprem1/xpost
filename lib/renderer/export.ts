import { createSunlightOverlayCanvas } from "@/lib/editor/sunlight-overlays";
import { compositeImageLayers } from "@/lib/layers/image-composite";
import { rasterizeTextLayers } from "@/lib/layers/text-raster";
import { croppedImageSize, type Scene } from "@/lib/scene";
import type { PreviewAssets } from "./types";
import { computeOutputSize } from "./geometry";
import { WebGL2Renderer } from "./renderer";
import { createWatermarkCanvas } from "./watermark";
import {
  exportMime,
  type ExportFormat,
  type ExportScale,
} from "./export-format";

export * from "./export-format";

export type ExportImageOptions = {
  format: ExportFormat;
  scale: ExportScale;
  quality?: number;
};

export type ExportImageAssets = {
  screenshot?: HTMLImageElement | null;
};

export type ExportImageResult = {
  blob: Blob;
  width: number;
  height: number;
  ms: number;
};

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load the image: ${url}`));
    image.src = url;
  });
}

export async function loadVideoFrame(
  url: string,
  posterUrl: string | null,
): Promise<{ source: TexImageSource; aspect: number } | null> {
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Video frame timeout")),
        5000,
      );
      video.addEventListener(
        "loadeddata",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      video.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          reject(new Error("Video load fail"));
        },
        { once: true },
      );
    });
    video.currentTime = 0.001;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1000);
      video.addEventListener(
        "seeked",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    return {
      source: video,
      aspect: video.videoWidth / Math.max(1, video.videoHeight),
    };
  } catch {
    if (!posterUrl) return null;
    try {
      const poster = await loadImage(posterUrl);
      return {
        source: poster,
        aspect: poster.naturalWidth / Math.max(1, poster.naturalHeight),
      };
    } catch {
      return null;
    }
  }
}

async function collectAssets(
  scene: Scene,
  assets: ExportImageAssets,
): Promise<Partial<PreviewAssets>> {
  const collected: Partial<PreviewAssets> = {
    watermark: createWatermarkCanvas(),
    sunlightOverlay:
      scene.sunlight.overlay === "none"
        ? null
        : createSunlightOverlayCanvas(scene.sunlight.overlay),
  };

  if (assets.screenshot) {
    const composed = compositeImageLayers(assets.screenshot, scene.layers, {
      maxDimension: 4096,
    });
    collected.screenshot = composed ?? assets.screenshot;
    collected.screenshotSize = composed
      ? { width: composed.width, height: composed.height }
      : {
          width: assets.screenshot.naturalWidth,
          height: assets.screenshot.naturalHeight,
        };
  }

  if (scene.background.kind === "image") {
    try {
      const image = await loadImage(scene.background.src.url);
      collected.backgroundImage = image;
      collected.backgroundAspect =
        image.naturalWidth / Math.max(1, image.naturalHeight);
    } catch {
      collected.backgroundImage = null;
    }
  }

  if (scene.background.kind === "video") {
    const frame = await loadVideoFrame(
      scene.background.src.url,
      scene.background.src.previewUrl ?? null,
    );
    if (frame) {
      collected.videoFrame = frame.source;
      collected.videoAspect = frame.aspect;
    }
  }

  return collected;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Unable to create an image from the canvas"));
        },
        mime,
        quality,
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function exportImage(
  scene: Scene,
  assets: ExportImageAssets,
  options: ExportImageOptions,
): Promise<ExportImageResult> {
  const imageSize = assets.screenshot
    ? {
        width: assets.screenshot.naturalWidth,
        height: assets.screenshot.naturalHeight,
      }
    : null;
  const output = computeOutputSize(
    scene,
    options.scale,
    croppedImageSize(scene, imageSize),
  );

  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const renderer = new WebGL2Renderer();
  const started = performance.now();

  try {
    await renderer.init(canvas);
    await document.fonts.ready;
    const textLayers = await rasterizeTextLayers(
      scene,
      output.width,
      output.width / scene.canvas.baseWidth,
    );
    renderer.setAssets({ ...(await collectAssets(scene, assets)), textLayers });
    renderer.render(scene, { scale: output.width / scene.canvas.baseWidth });
    const blob = await canvasToBlob(
      canvas,
      exportMime(options.format),
      options.format === "png" ? undefined : (options.quality ?? 0.92),
    );
    return {
      blob,
      width: output.width,
      height: output.height,
      ms: performance.now() - started,
    };
  } finally {
    renderer.dispose();
  }
}
