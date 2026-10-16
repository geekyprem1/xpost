import type { Scene } from "@/lib/scene";
import type { ExportFormat, ExportScale } from "./export-format";

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
  fps: number;
  maxWidth: number;
  maxHeight: number;
  maxFrames: number;
};

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
    }
  | { id: number; type: "error"; message: string }
  | { id: number; type: "cancelled" };
