import type { AnchorId, Scene, StyleId } from "@/lib/scene";

import { getFrameConfig, getFrameMetrics, FRAME_DESIGN_WIDTH } from "./frames";

export const DEFAULT_CAMERA_DIST = 1600;

export const ASPECT_RATIOS: Record<string, number> = {
  "2:1": 2,
  "16:9": 16 / 9,
  "16:10": 16 / 10,
  "3:2": 3 / 2,
  "4:3": 4 / 3,
  "5:4": 5 / 4,
  "1:1": 1,
  "4:5": 4 / 5,
  "3:4": 3 / 4,
  "2:3": 2 / 3,
  "9:16": 9 / 16,
  "mbp-14": 3024 / 1964,
  "mbp-16": 3456 / 2234,
};

export const ANCHOR_POINTS: Record<AnchorId, { x: number; y: number }> = {
  "top-left": { x: 0, y: 0 },
  "top-center": { x: 0.5, y: 0 },
  "top-right": { x: 1, y: 0 },
  "center-left": { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  "center-right": { x: 1, y: 0.5 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-center": { x: 0.5, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

const CORNER_MULTIPLIERS = { sharp: 0.3, curved: 1, round: 1.7 } as const;

export type StyleParams = {
  padPx: number;
  glassBlurPx: number;
  glassTint: [number, number, number, number];
  fill: [number, number, number, number];
  borderColor: [number, number, number, number];
  borderWidthPx: number;
  insetAlpha: number;
};

export const STYLE_PARAMS: Record<StyleId, StyleParams> = {
  default: {
    padPx: 0,
    glassBlurPx: 0,
    glassTint: [1, 1, 1, 0],
    fill: [0, 0, 0, 0],
    borderColor: [0, 0, 0, 0],
    borderWidthPx: 0,
    insetAlpha: 0,
  },
  "glass-light": {
    padPx: 30,
    glassBlurPx: 26,
    glassTint: [1, 1, 1, 0.22],
    fill: [1, 1, 1, 0.06],
    borderColor: [1, 1, 1, 0.4],
    borderWidthPx: 1,
    insetAlpha: 0,
  },
  "glass-dark": {
    padPx: 30,
    glassBlurPx: 26,
    glassTint: [0, 0, 0, 0.32],
    fill: [0, 0, 0, 0.08],
    borderColor: [1, 1, 1, 0.2],
    borderWidthPx: 1,
    insetAlpha: 0,
  },
  "liquid-glass": {
    padPx: 36,
    glassBlurPx: 40,
    glassTint: [1, 1, 1, 0.14],
    fill: [1, 1, 1, 0.04],
    borderColor: [1, 1, 1, 0.5],
    borderWidthPx: 1.5,
    insetAlpha: 0,
  },
  "inset-light": {
    padPx: 26,
    glassBlurPx: 0,
    glassTint: [1, 1, 1, 0],
    fill: [1, 1, 1, 0.14],
    borderColor: [1, 1, 1, 0.18],
    borderWidthPx: 1,
    insetAlpha: 0.35,
  },
  "inset-dark": {
    padPx: 26,
    glassBlurPx: 0,
    glassTint: [0, 0, 0, 0],
    fill: [0, 0, 0, 0.4],
    borderColor: [0, 0, 0, 0.5],
    borderWidthPx: 1,
    insetAlpha: 0.5,
  },
  outline: {
    padPx: 22,
    glassBlurPx: 0,
    glassTint: [1, 1, 1, 0],
    fill: [0, 0, 0, 0],
    borderColor: [1, 1, 1, 0.9],
    borderWidthPx: 2,
    insetAlpha: 0,
  },
  border: {
    padPx: 20,
    glassBlurPx: 0,
    glassTint: [1, 1, 1, 0],
    fill: [1, 1, 1, 0.12],
    borderColor: [1, 1, 1, 0.7],
    borderWidthPx: 7,
    insetAlpha: 0,
  },
  "border-dark": {
    padPx: 20,
    glassBlurPx: 0,
    glassTint: [0, 0, 0, 0],
    fill: [0.07, 0.07, 0.09, 1],
    borderColor: [0.16, 0.16, 0.2, 1],
    borderWidthPx: 7,
    insetAlpha: 0,
  },
};

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type ShadowParams = {
  spreadPx: number;
  alpha: number;
  offsetYPx: number;
};

export type CardLayout = {
  output: Size;
  contentRect: Rect;
  imageRect: Rect;
  imageRadiusPx: number;
  plateRect: Rect;
  plateRadiusPx: number;
  shadow: ShadowParams;
};

export function computeOutputSize(
  scene: Scene,
  scale: number,
  imageSize?: Size | null
): Size {
  const width = Math.max(1, Math.round(scene.canvas.baseWidth * scale));
  const ratio =
    scene.canvas.aspect === "auto"
      ? imageSize && imageSize.height > 0
        ? imageSize.width / imageSize.height
        : 4 / 3
      : ASPECT_RATIOS[scene.canvas.aspect] ?? 4 / 3;
  return { width, height: Math.max(1, Math.round(width / ratio)) };
}

export function cornerRadiusPx(scene: Scene, scale: number): number {
  return scene.layout.radius * CORNER_MULTIPLIERS[scene.style.corner] * scale;
}

export function isPlateVisible(scene: Scene): boolean {
  const style = STYLE_PARAMS[scene.style.preset];
  return (
    style.glassBlurPx > 0 ||
    style.fill[3] > 0 ||
    style.borderWidthPx > 0 ||
    style.insetAlpha > 0
  );
}

export function shadowParams(scene: Scene, scale: number): ShadowParams {
  if (scene.style.shadow === "none") {
    return { spreadPx: 0, alpha: 0, offsetYPx: 0 };
  }
  const intensity = scene.layout.shadow;
  if (scene.style.shadow === "hug") {
    return {
      spreadPx: (10 + intensity * 0.4) * scale,
      alpha: 0.32,
      offsetYPx: 10 * scale,
    };
  }
  return {
    spreadPx: (26 + intensity * 1.2) * scale,
    alpha: 0.28,
    offsetYPx: 18 * scale,
  };
}

export function computeCardLayout(
  scene: Scene,
  scale: number,
  imageSize?: Size | null
): CardLayout {
  const output = computeOutputSize(scene, scale, imageSize);
  const padding = scene.transform.padding * scale;
  const contentRect = {
    x: padding,
    y: padding,
    width: Math.max(1, output.width - padding * 2),
    height: Math.max(1, output.height - padding * 2),
  };

  const radius = cornerRadiusPx(scene, scale);
  const zoom = scene.transform.zoom / 100;

  let imageWidth: number;
  let imageHeight: number;
  if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
    const fit = Math.min(
      contentRect.width / imageSize.width,
      contentRect.height / imageSize.height
    );
    imageWidth = imageSize.width * fit * zoom;
    imageHeight = imageSize.height * fit * zoom;
  } else {
    imageWidth = contentRect.width * zoom;
    imageHeight = contentRect.height * zoom;
  }

  const device = getFrameConfig(scene.frame.kind);
  if (device?.screenAspect) {
    const metrics = getFrameMetrics(device);
    const outerWidth = 1 + (metrics.left + metrics.right) / FRAME_DESIGN_WIDTH;
    const outerHeight = 1 / device.screenAspect + (metrics.top + metrics.bottom) / FRAME_DESIGN_WIDTH;
    imageWidth = Math.min(contentRect.width / outerWidth, contentRect.height / outerHeight) * zoom;
    imageHeight = imageWidth / device.screenAspect;
  }
  const anchor = ANCHOR_POINTS[scene.transform.anchor];
  const centerX =
    contentRect.x + contentRect.width * anchor.x + scene.transform.offset.x * scale;
  const centerY =
    contentRect.y + contentRect.height * anchor.y + scene.transform.offset.y * scale;

  const imageRect = {
    x: centerX - imageWidth / 2,
    y: centerY - imageHeight / 2,
    width: imageWidth,
    height: imageHeight,
  };

  const style = STYLE_PARAMS[scene.style.preset];
  const pad = style.padPx * scale;
  const plateRect = {
    x: imageRect.x - pad,
    y: imageRect.y - pad,
    width: imageRect.width + pad * 2,
    height: imageRect.height + pad * 2,
  };

  return {
    output,
    contentRect,
    imageRect,
    imageRadiusPx: radius,
    plateRect,
    plateRadiusPx: radius + Math.min(pad, 40 * scale) * 0.5,
    shadow: shadowParams(scene, scale),
  };
}

export function fitSize(container: Size, content: Size): Size {
  if (content.width <= 0 || content.height <= 0) {
    return { width: 0, height: 0 };
  }
  const factor = Math.min(
    container.width / content.width,
    container.height / content.height
  );
  return { width: content.width * factor, height: content.height * factor };
}

export function projectTiltedCorners(
  rect: Rect,
  tiltX: number,
  tiltY: number,
  camera: number
): [number, number][] {
  const rx = (tiltX * Math.PI) / 180;
  const ry = (tiltY * Math.PI) / 180;
  const cosy = Math.cos(ry);
  const siny = Math.sin(ry);
  const cosx = Math.cos(rx);
  const sinx = Math.sin(rx);
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const cx = rect.x + halfW;
  const cy = rect.y + halfH;

  const project = (dx: number, dy: number): [number, number] => {
    const x1 = dx * cosy;
    const z1 = -dx * siny;
    const y2 = dy * cosx - z1 * sinx;
    const z2 = dy * sinx + z1 * cosx;
    const k = camera / (camera - z2);
    return [cx + x1 * k, cy + y2 * k];
  };

  return [
    project(-halfW, -halfH),
    project(halfW, -halfH),
    project(halfW, halfH),
    project(-halfW, halfH),
  ];
}

export function boundingRect(points: [number, number][]): Rect {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
