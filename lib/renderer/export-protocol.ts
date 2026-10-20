import type { Scene } from "@/lib/scene";
import type { ExportFormat, ExportScale } from "./export-format";
import type { WatermarkPlacement } from "./watermark-placement";

export type BakedTextLayer = {
  id: string;
  bitmap: ImageBitmap;
  x: number;
  y: number;
  width: number;
  aspect: number;
  rotation: number;
  opacity?: number;
};

// NOTE: ImageBitmaps transfer hote hain (OffscreenCanvas with context transfer nahi
// ho sakta). Worker inhe OffscreenCanvas mein draw karta hai — kyunki Chrome
// ImageBitmap ke liye UNPACK_FLIP_Y_WEBGL ignore karta hai, par canvas pe honored
// hota hai (warna output vertically flipped aata hai).
export type BakedAssets = {
  screenshot?: ImageBitmap | null;
  backgroundImage?: ImageBitmap | null;
  videoFrame?: ImageBitmap | null;
  videoAspect?: number | null;
  sunlightOverlay?: ImageBitmap | null;
  watermark?: ImageBitmap | null;
  watermarkPlacement?: WatermarkPlacement | null;
  textLayers?: BakedTextLayer[] | null;
};

export type ImageExportOptions = {
  format: ExportFormat;
  scale: ExportScale;
  quality?: number;
};

export type VideoExportOptions = {
  fps: number;
  maxWidth: number;
  maxHeight: number;
  bitrate: number;
};

export type GifExportOptions = {
  durationSeconds?: number;
  fps: number;
  maxWidth: number;
  maxHeight: number;
  maxFrames: number;
  /** Ordered dithering: smoother gradients, somewhat larger file. */
  dither?: boolean;
};

/** Milliseconds spent per export step, for diagnosing slow exports. */
export type ExportTimings = Record<string, number>;

export type ExportWorkerRequest =
  | {
      kind: "image";
      id: number;
      scene: Scene;
      assets: BakedAssets;
      options: ImageExportOptions;
    }
  | {
      kind: "video";
      id: number;
      scene: Scene;
      assets: BakedAssets;
      options: VideoExportOptions;
    }
  | {
      kind: "gif";
      id: number;
      scene: Scene;
      assets: BakedAssets;
      options: GifExportOptions;
    };

export type ExportWorkerCancel = { id: number; type: "cancel" };

export type ExportWorkerMessage =
  | {
      id: number;
      type: "progress";
      phase: "init" | "decode" | "render" | "encode";
      frame?: number;
      total?: number;
    }
  | {
      id: number;
      type: "done";
      blob: Blob;
      width: number;
      height: number;
      ms: number;
      frames?: number;
      durationSeconds?: number;
      timings?: ExportTimings;
    }
  | { id: number; type: "error"; message: string }
  | { id: number; type: "cancelled" };
