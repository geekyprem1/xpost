import { FRAME_IDS, type FrameId } from "@/lib/scene";
import { FRAME_DESIGN_WIDTH, getFrameConfig, getFrameMetrics } from "./frames";
import type { FrameConfig } from "./frames";

const frameImages = new Map<string, ImageBitmap>();
let frameAssetsPromise: Promise<void> | null = null;

export function loadFrameImages(): Promise<void> {
  if (!frameAssetsPromise) {
    const paths = [...new Set(FRAME_IDS.map((id) => getFrameConfig(id)?.imageSrc).filter((src): src is string => Boolean(src)))];
    frameAssetsPromise = Promise.all(paths.map(async (src) => {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Unable to load device mockup: " + src);
      frameImages.set(src, await createImageBitmap(await response.blob()));
    })).then(() => undefined).catch((error) => {
      frameAssetsPromise = null;
      throw error;
    });
  }
  return frameAssetsPromise;
}

type Canvas2D = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas2D(
  width: number,
  height: number
): { canvas: Canvas2D; ctx: Ctx2D } | null {
  const canvas: Canvas2D =
    typeof document === "undefined" && typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) return null;
  return { canvas, ctx };
}

function drawWindowFrame(
  ctx: Ctx2D,
  config: FrameConfig,
  s: number,
  width: number,
  height: number,
  screenTop: number
) {
  const radius = config.radius * s;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fillStyle = config.bodyColor;
  ctx.fill();
  if (config.barHeight && config.barHeight > 0) {
    ctx.clip();
    ctx.fillStyle = config.barColor ?? config.bodyColor;
    ctx.fillRect(0, 0, width, screenTop);
    ctx.fillStyle = config.borderColor;
    ctx.fillRect(0, screenTop - Math.max(1, s), width, Math.max(1, s));
  }
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(0.75, 0.75, width - 1.5, height - 1.5, radius);
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.stroke();

  if (config.dots) {
    const cy = screenTop / 2;
    const r = Math.max(2, 5.5 * s);
    const colors = ["#ff5f57", "#febc2e", "#28c840"];
    colors.forEach((color, index) => {
      ctx.beginPath();
      ctx.arc(16 * s + index * 20 * s + r, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  if (config.accent) {
    ctx.beginPath();
    ctx.arc(screenTop / 2, screenTop / 2, Math.max(2, screenTop * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = config.accentColor ?? "#8b5cf6";
    ctx.fill();
  }

  if (config.pill) {
    const pillH = Math.max(3, screenTop * 0.44);
    const pillW = width * 0.46;
    const offset = config.accent ? screenTop * 0.5 : 0;
    ctx.beginPath();
    ctx.roundRect(
      (width - pillW) / 2 + offset,
      (screenTop - pillH) / 2,
      pillW,
      pillH,
      pillH / 2
    );
    ctx.fillStyle = config.pillColor ?? "#26262e";
    ctx.fill();
  }

  if (config.prompt) {
    ctx.font = `600 ${Math.max(9, screenTop * 0.36)}px ui-monospace, monospace`;
    ctx.fillStyle = "rgba(158, 158, 178, 0.9)";
    ctx.textBaseline = "middle";
    ctx.fillText(">_", 16 * s, screenTop / 2);
  }
}

function drawPhoneFrame(
  ctx: Ctx2D,
  config: FrameConfig,
  s: number,
  width: number,
  height: number,
  originX: number,
  originY: number,
  screenWidth: number,
  screenHeight: number
) {
  const edgeColor = config.edgeColor ?? "#33333d";
  const bezelLeft = config.bezel.left * s;
  const bezelTop = (config.bezel.top ?? 0) * s;
  const bodyLeft = originX - bezelLeft;
  const bodyTop = originY - bezelTop;
  const bodyWidth = width - bodyLeft * 2;
  const bodyHeight = height - bodyTop * 2;
  // Radius short-side se proportional (wide screens pe giant squircle na bane)
  const radius = Math.min(config.radius * s, Math.min(bodyWidth, bodyHeight) * 0.16);

  // Side buttons (body ke bahar — margin ke andar, real device jaisa silhouette)
  const buttonWidth = Math.min(Math.max(2, 5 * s), Math.max(2, bodyLeft * 0.85));
  if (config.kindHint === "phone") {
    const drawButton = (
      side: "left" | "right",
      topFraction: number,
      heightFraction: number
    ) => {
      const buttonHeight = bodyHeight * heightFraction;
      const y = bodyTop + bodyHeight * topFraction;
      const x =
        side === "left"
          ? bodyLeft - buttonWidth * 0.7
          : bodyLeft + bodyWidth - buttonWidth * 0.3;
      ctx.beginPath();
      ctx.roundRect(x, y, buttonWidth, buttonHeight, buttonWidth * 0.45);
      ctx.fillStyle = edgeColor;
      ctx.fill();
    };
    drawButton("left", 0.14, 0.03); // action button
    drawButton("left", 0.22, 0.06); // volume up
    drawButton("left", 0.3, 0.06); // volume down
    drawButton("right", 0.24, 0.09); // power
  }

  ctx.beginPath();
  ctx.roundRect(bodyLeft, bodyTop, bodyWidth, bodyHeight, radius);
  const metal = ctx.createLinearGradient(bodyLeft, 0, bodyLeft + bodyWidth, 0);
  metal.addColorStop(0, edgeColor);
  metal.addColorStop(0.03, "#d6d8dd");
  metal.addColorStop(0.08, "#242428");
  metal.addColorStop(0.92, "#18181c");
  metal.addColorStop(1, edgeColor);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(originX, originY, screenWidth, screenHeight, config.screenRadius * s);
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = Math.max(1, s);
  ctx.stroke();


}

function drawLaptopFrame(
  ctx: Ctx2D,
  config: FrameConfig,
  s: number,
  width: number,
  height: number,
  originX: number,
  originY: number,
  screenWidth: number
) {
  const baseHeight = (config.baseHeight ?? 64) * s;
  const bodyBottom = height - baseHeight;
  const bodyLeft = originX - config.bezel.left * s;
  const bodyWidth = screenWidth + (config.bezel.left + config.bezel.right) * s;
  const radius = Math.min(
    config.radius * s,
    Math.min(bodyWidth, bodyBottom) * 0.16
  );

  // Silver lid (agar config mein hai) — real MacBook jaisa
  if (config.lidColor) {
    ctx.beginPath();
    ctx.roundRect(bodyLeft, 0, bodyWidth, bodyBottom, [
      radius,
      radius,
      radius * 0.35,
      radius * 0.35,
    ]);
    ctx.fillStyle = config.lidColor;
    ctx.fill();
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
  }

  // Black bezel — silver lid ke andar inset (real MacBook me outer silver rim
  // + andar black bezel hota hai; lidColor na ho to poora lid bezel hai)
  const edge = config.lidColor ? 6 * s : 0;
  ctx.beginPath();
  ctx.roundRect(
    bodyLeft + edge,
    edge,
    bodyWidth - edge * 2,
    bodyBottom - edge * 2,
    config.lidColor ? radius * 0.8 : radius
  );
  ctx.fillStyle = config.bodyColor;
  ctx.fill();
  if (!config.lidColor) {
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
  }

  // Hinge (lid ke bottom pe darker line)
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(bodyLeft, bodyBottom - Math.max(1, 1.5 * s), bodyWidth, Math.max(1, 1.5 * s));

  ctx.beginPath();
  ctx.roundRect(0, bodyBottom, width, height - bodyBottom, [
    radius * 0.3,
    radius * 0.3,
    radius * 0.6,
    radius * 0.6,
  ]);
  ctx.fillStyle = config.baseColor ?? "#212129";
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fillRect(0, bodyBottom, width, Math.max(1, s));
  ctx.beginPath();
  ctx.roundRect(0, bodyBottom, width, height - bodyBottom, [
    radius * 0.3,
    radius * 0.3,
    radius * 0.6,
    radius * 0.6,
  ]);
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.stroke();

  if (config.camera) {
    ctx.beginPath();
    ctx.arc(width / 2, originY / 2, Math.max(1.5, 3.2 * s), 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a22";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, originY / 2, Math.max(0.8, 1.4 * s), 0, Math.PI * 2);
    ctx.fillStyle = "#3d3d49";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.roundRect(0, bodyBottom, width, baseHeight, [
    radius * 0.3,
    radius * 0.3,
    radius * 0.6,
    radius * 0.6,
  ]);
  ctx.fillStyle = config.baseColor ?? "#212129";
  ctx.fill();
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.stroke();

  const grooveW = width * 0.14;
  const grooveH = baseHeight * 0.34;
  ctx.beginPath();
  ctx.roundRect((width - grooveW) / 2, bodyBottom, grooveW, grooveH, grooveH * 0.5);
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fill();
}

export function composeFrameCanvas(
  kind: FrameId,
  screenWidth: number,
  screenHeight: number
): Canvas2D | null {
  const config = getFrameConfig(kind);
  if (!config || screenWidth <= 0 || screenHeight <= 0) return null;
  const s = screenWidth / FRAME_DESIGN_WIDTH;
  const metrics = getFrameMetrics(config);
  const width = Math.max(1, Math.round(screenWidth + (metrics.left + metrics.right) * s));
  const height = Math.max(1, Math.round(screenHeight + (metrics.top + metrics.bottom) * s));
  const created = createCanvas2D(width, height);
  if (!created) return null;
  const { canvas, ctx } = created;

  if (config.imageSrc) {
    const image = frameImages.get(config.imageSrc);
    if (!image) return null;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  const originX = metrics.left * s;
  const originY = metrics.top * s;

  if (config.kindHint === "window") {
    drawWindowFrame(ctx, config, s, width, height, originY);
  } else if (config.kindHint === "phone" || config.kindHint === "tablet") {
    drawPhoneFrame(ctx, config, s, width, height, originX, originY, screenWidth, screenHeight);
  } else {
    drawLaptopFrame(ctx, config, s, width, height, originX, originY, screenWidth);
  }

  // Screen hole cut — iske bina chrome poora rectangle bhar deta hai aur
  // andar screenshot dikhta hi nahi. fillStyle OPAQUE set karna zaroori hai,
  // warna painter ka last semi-transparent fillStyle cut ko adhoora kar deta hai.
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect(originX, originY, screenWidth, screenHeight, config.screenRadius * s);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  if (config.island) {
    const w = (config.islandWidth ?? 152) * s;
    const h = (config.islandHeight ?? 34) * s;
    const y = originY + 24 * s;
    ctx.fillStyle = "#050507";
    ctx.beginPath();
    ctx.roundRect((width - w) / 2, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = "#182235";
    ctx.beginPath();
    ctx.arc(width / 2 + w * 0.32, y + h / 2, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  if (config.kindHint === "phone" || config.kindHint === "tablet") {
    ctx.fillStyle = "rgba(28,28,32,0.75)";
    ctx.beginPath();
    ctx.roundRect(originX + screenWidth * 0.34, originY + screenHeight - 22 * s, screenWidth * 0.32, 5 * s, 3 * s);
    ctx.fill();
  }
  if (config.kindHint === "tablet") {
    ctx.fillStyle = "#26354a";
    ctx.beginPath();
    ctx.arc(width / 2, originY / 2, 5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (config.kindHint === "laptop") {
    ctx.fillStyle = "#08080b";
    ctx.beginPath();
    ctx.roundRect(width / 2 - 48 * s, originY - 2 * s, 96 * s, 22 * s, [0, 0, 6 * s, 6 * s]);
    ctx.fill();
  }
  return canvas;
}
