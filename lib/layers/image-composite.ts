import type {
  AnnotationLayer,
  AnnotationShape,
  Layer,
  RedactLayer,
} from "@/lib/scene";

export type CompositeSource =
  HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas;

export type CompositeOptions = {
  maxDimension?: number;
};

export function sourceDimensions(source: CompositeSource): {
  width: number;
  height: number;
} {
  const candidate = source as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  return {
    width: Math.max(
      1,
      Math.round(candidate.naturalWidth ?? candidate.width ?? 1),
    ),
    height: Math.max(
      1,
      Math.round(candidate.naturalHeight ?? candidate.height ?? 1),
    ),
  };
}

/** Image-space layers (annotations / redactions) are baked into the screenshot. */
export function imageSpaceLayers(layers: Layer[]): Layer[] {
  return layers.filter(
    (layer) =>
      layer.visible && (layer.kind === "annotation" || layer.kind === "redact"),
  );
}

export function imageSpaceCacheKey(layers: Layer[]): string {
  return JSON.stringify(imageSpaceLayers(layers));
}

function arrowControl(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bend: number,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const offset = bend * length * 0.5;
  return {
    x: (from.x + to.x) / 2 + nx * offset,
    y: (from.y + to.y) / 2 + ny * offset,
  };
}

function arrowHead(
  start: { x: number; y: number },
  end: { x: number; y: number },
  control: { x: number; y: number } | null,
  strokePx: number,
  color: string,
) {
  const tangent = control
    ? { x: end.x - control.x, y: end.y - control.y }
    : { x: end.x - start.x, y: end.y - start.y };
  const length = Math.hypot(tangent.x, tangent.y) || 1;
  const dx = tangent.x / length;
  const dy = tangent.y / length;
  const px = -dy;
  const py = dx;
  const headLength = Math.max(strokePx * 4, length * 0.12, 8);
  const headWidth = headLength * 0.62;
  const baseX = end.x - dx * headLength;
  const baseY = end.y - dy * headLength;

  return {
    points: [
      [end.x, end.y],
      [baseX + px * headWidth * 0.5, baseY + py * headWidth * 0.5],
      [baseX - px * headWidth * 0.5, baseY - py * headWidth * 0.5],
    ] as [number, number][],
    color,
  };
}

export function parseHexColor(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function contrastColor(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return "#ffffff";
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

function drawShape(
  context: CanvasRenderingContext2D,
  shape: AnnotationShape,
  width: number,
  height: number,
  layer: AnnotationLayer,
) {
  const strokeColor = layer.color;
  const strokePx = Math.max(1, layer.stroke * width);

  context.save();
  context.lineWidth = strokePx;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = strokeColor;
  context.fillStyle = strokeColor;

  if (shape.type === "arrow") {
    const from = { x: shape.from.x * width, y: shape.from.y * height };
    const to = { x: shape.to.x * width, y: shape.to.y * height };
    const controlUv =
      shape.bend === 0 ? null : arrowControl(shape.from, shape.to, shape.bend);
    const control = controlUv
      ? { x: controlUv.x * width, y: controlUv.y * height }
      : null;

    context.beginPath();
    context.moveTo(from.x, from.y);
    if (control) context.quadraticCurveTo(control.x, control.y, to.x, to.y);
    else context.lineTo(to.x, to.y);
    context.stroke();

    if (shape.head) {
      const head = arrowHead(from, to, control, strokePx, strokeColor);
      context.beginPath();
      head.points.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.fill();
    }
  } else if (shape.type === "rect") {
    context.beginPath();
    context.roundRect(
      shape.x * width,
      shape.y * height,
      shape.w * width,
      shape.h * height,
      shape.radius * width,
    );
    context.stroke();
  } else if (shape.type === "ellipse") {
    context.beginPath();
    context.ellipse(
      (shape.x + shape.w / 2) * width,
      (shape.y + shape.h / 2) * height,
      (shape.w / 2) * width,
      (shape.h / 2) * height,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  } else if (shape.type === "highlight") {
    context.globalAlpha = 0.32;
    context.fillRect(
      shape.x * width,
      shape.y * height,
      shape.w * width,
      shape.h * height,
    );
  } else if (shape.type === "step") {
    const radius = (shape.size / 2) * width;
    const cx = shape.x * width;
    const cy = shape.y * height;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = contrastColor(strokeColor);
    context.font = `700 ${shape.size * width * 0.8}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(shape.n), cx, cy + shape.size * width * 0.02);
  } else {
    context.font = `${shape.size * width}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(shape.char, shape.x * width, shape.y * height);
  }

  context.restore();
}

export function pixelBlockSize(
  strength: number,
  width: number,
  height: number,
): number {
  const min = Math.max(1, Math.min(width, height));
  const factor = Math.max(0, Math.min(100, strength)) / 100;
  return Math.max(2, Math.round(min * (0.01 + factor * 0.12)));
}

export function redactBlurPx(
  strength: number,
  width: number,
  height: number,
): number {
  const min = Math.max(1, Math.min(width, height));
  const factor = Math.max(0, Math.min(100, strength)) / 100;
  return Math.max(1, Math.round(min * (0.004 + factor * 0.07)));
}

function redactRegion(layer: RedactLayer, width: number, height: number) {
  const x = Math.max(0, Math.round(layer.x * width));
  const y = Math.max(0, Math.round(layer.y * height));
  return {
    x,
    y,
    w: Math.max(1, Math.min(width - x, Math.round(layer.w * width))),
    h: Math.max(1, Math.min(height - y, Math.round(layer.h * height))),
  };
}

/**
 * Destroys the underlying pixels: the source region is sampled first, then
 * replaced by a pixelated / blurred / solid fill. Irreversible (RD-2).
 */
function applyRedaction(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  layer: RedactLayer,
) {
  const { x, y, w, h } = redactRegion(layer, canvas.width, canvas.height);
  if (w <= 0 || h <= 0) return;

  if (layer.mode === "solid") {
    context.save();
    context.fillStyle = layer.color;
    context.fillRect(x, y, w, h);
    context.restore();
    return;
  }

  const region = document.createElement("canvas");
  region.width = w;
  region.height = h;
  const regionContext = region.getContext("2d");
  if (!regionContext) return;
  regionContext.drawImage(canvas, x, y, w, h, 0, 0, w, h);

  if (layer.mode === "pixelate") {
    const block = pixelBlockSize(layer.strength, w, h);
    const smallWidth = Math.max(1, Math.ceil(w / block));
    const smallHeight = Math.max(1, Math.ceil(h / block));
    const small = document.createElement("canvas");
    small.width = smallWidth;
    small.height = smallHeight;
    const smallContext = small.getContext("2d", {
      willReadFrequently: true,
    });
    if (!smallContext) return;
    smallContext.imageSmoothingEnabled = true;
    smallContext.drawImage(region, 0, 0, smallWidth, smallHeight);
    const smallData = smallContext.getImageData(
      0,
      0,
      smallWidth,
      smallHeight,
    ).data;

    // Exact integer cells: every block is one uniform colour, so no original
    // detail survives and the output is deterministic across browsers.
    context.save();
    for (let sy = 0; sy < smallHeight; sy++) {
      const cellY = y + Math.floor((sy * h) / smallHeight);
      const cellYEnd = y + Math.floor(((sy + 1) * h) / smallHeight);
      for (let sx = 0; sx < smallWidth; sx++) {
        const cellX = x + Math.floor((sx * w) / smallWidth);
        const cellXEnd = x + Math.floor(((sx + 1) * w) / smallWidth);
        const index = (sy * smallWidth + sx) * 4;
        context.fillStyle = `rgb(${smallData[index]}, ${smallData[index + 1]}, ${smallData[index + 2]})`;
        context.fillRect(
          cellX,
          cellY,
          Math.max(1, cellXEnd - cellX),
          Math.max(1, cellYEnd - cellY),
        );
      }
    }
    context.restore();
    return;
  }

  const blur = redactBlurPx(layer.strength, w, h);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.filter = `blur(${blur}px)`;
  context.drawImage(region, x, y);
  context.restore();
}

/**
 * Bakes image-space redactions and annotations into screenshot pixels
 * (ARCH §5.7 A). Returns null when there is nothing to composite.
 */
export function compositeImageLayers(
  source: CompositeSource,
  layers: Layer[],
  options: CompositeOptions = {},
): HTMLCanvasElement | null {
  const baked = imageSpaceLayers(layers);
  if (baked.length === 0) return null;

  const size = sourceDimensions(source);
  const maxDimension = options.maxDimension ?? 4096;
  const scale = Math.min(1, maxDimension / Math.max(size.width, size.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(size.width * scale));
  canvas.height = Math.max(1, Math.round(size.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a 2D rendering context");
  context.drawImage(
    source as CanvasImageSource,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  // Privacy pass first: annotations stay visible on top of redacted pixels.
  for (const layer of baked) {
    if (layer.kind !== "redact") continue;
    applyRedaction(context, canvas, layer);
  }
  for (const layer of baked) {
    if (layer.kind !== "annotation") continue;
    drawShape(context, layer.shape, canvas.width, canvas.height, layer);
  }

  return canvas;
}
