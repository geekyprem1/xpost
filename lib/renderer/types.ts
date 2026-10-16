import type { Scene } from "@/lib/scene";

export type RenderOptions = {
  scale: number;
  timeSec?: number;
};

export type PreviewAssets = {
  screenshot?: TexImageSource | null;
  screenshotSize?: { width: number; height: number } | null;
  backgroundImage?: TexImageSource | null;
  backgroundAspect?: number | null;
  videoFrame?: TexImageSource | null;
  videoAspect?: number | null;
  sunlightOverlay?: TexImageSource | null;
  watermark?: TexImageSource | null;
};

export interface Renderer {
  init(target: HTMLCanvasElement | OffscreenCanvas): Promise<void>;
  render(scene: Scene, options: RenderOptions): void;
  dispose(): void;
}

export type RenderBlobResult = {
  blob: Blob;
  ms: number;
  width: number;
  height: number;
};
