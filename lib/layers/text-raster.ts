import { ensureFonts } from "@/lib/fonts";
import type { TextLayerAsset } from "@/lib/renderer/types";
import type { Scene, TextLayer } from "@/lib/scene";
import { layoutText, textFontCss } from "./text-layout";

function setLetterSpacing(
  context: CanvasRenderingContext2D,
  spacingPx: number,
) {
  const target = context as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };
  if ("letterSpacing" in target) target.letterSpacing = `${spacingPx}px`;
}

function paintRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  const clamped = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(x, 0, width, height, clamped);
  context.fill();
}

export function rasterizeTextLayer(
  layer: TextLayer,
  outputWidth: number,
  scale: number,
): TextLayerAsset {
  const canvas = document.createElement("canvas");
  const measureContext = canvas.getContext("2d");
  if (!measureContext) throw new Error("Unable to create a 2D context");

  const font = textFontCss(layer, scale);
  const fontPx = layer.style.size * scale;
  const letterSpacingPx = layer.style.letterSpacing * fontPx;
  measureContext.font = font;
  setLetterSpacing(measureContext, letterSpacingPx);

  const widthPx = Math.max(1, Math.round(layer.width * outputWidth));
  const layout = layoutText(layer, {
    widthPx,
    scale,
    measure: (text) => measureContext.measureText(text).width,
  });
  const heightPx = Math.max(1, Math.ceil(layout.heightPx));

  canvas.width = widthPx;
  canvas.height = heightPx;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a 2D context");

  context.font = font;
  setLetterSpacing(context, letterSpacingPx);
  context.textBaseline = "top";
  context.textAlign =
    layer.style.align === "left"
      ? "left"
      : layer.style.align === "right"
        ? "right"
        : "center";

  if (layer.style.background) {
    const textWidth = Math.max(0, ...layout.lines.map((line) => line.width));
    const pillWidth = Math.min(
      widthPx,
      Math.max(1, textWidth + layout.paddingPx * 2),
    );
    const pillX =
      layer.style.align === "left"
        ? 0
        : layer.style.align === "right"
          ? widthPx - pillWidth
          : (widthPx - pillWidth) / 2;
    paintRoundRect(
      context,
      pillX,
      pillWidth,
      heightPx,
      layer.style.background.radius * scale,
      layer.style.background.color,
    );
  }

  if (layer.style.shadow) {
    context.shadowColor = layer.style.shadow.color;
    context.shadowBlur = layer.style.shadow.blur * scale;
    context.shadowOffsetY = layer.style.shadow.y * scale;
  }

  context.fillStyle = layer.style.color;
  const x =
    layer.style.align === "left"
      ? layout.paddingPx
      : layer.style.align === "right"
        ? widthPx - layout.paddingPx
        : widthPx / 2;
  let y = layout.paddingPx;
  for (const line of layout.lines) {
    context.fillText(line.text, x, y);
    y += layout.lineHeightPx;
  }

  return {
    id: layer.id,
    source: canvas,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    aspect: heightPx / widthPx,
    rotation: layer.rotation,
  };
}

export async function rasterizeTextLayers(
  scene: Scene,
  outputWidth: number,
  scale: number,
): Promise<TextLayerAsset[]> {
  const textLayers = scene.layers.filter(
    (layer): layer is TextLayer => layer.kind === "text" && layer.visible,
  );
  if (textLayers.length === 0) return [];
  await ensureFonts(scene);
  return textLayers.map((layer) =>
    rasterizeTextLayer(layer, outputWidth, scale),
  );
}
