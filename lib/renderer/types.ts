import type { ImageCrop, Scene } from "@/lib/scene";
import type { WatermarkPlacement } from "./watermark-placement";

export type RenderOptions = {
  scale: number;
  timeSec?: number;
  /** Preview-only override, e.g. full image while the crop UI is open. */
  cropOverride?: ImageCrop | null;
};

/**
 * Normalized text-layer quad: position/size as canvas fractions so the same
 * baked bitmap works at preview DPR and any export scale.
 */
export type TextLayerAsset = {
  id: string;
  source: TexImageSource;
  x: number;
  y: number;
  width: number;
  aspect: number;
  rotation: number;
  opacity?: number;
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
  /** Corner / size / opacity of the watermark; default bottom-right, 1×, opaque. */
  watermarkPlacement?: WatermarkPlacement | null;
  textLayers?: TextLayerAsset[] | null;
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
