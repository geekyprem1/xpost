import type { OverlayId } from "@/lib/scene";

export const OVERLAY_TEXTURE_SIZE = 512;

export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function fill(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
}

function softLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function softShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

type Painter = (
  ctx: CanvasRenderingContext2D,
  size: number,
  random: () => number,
) => void;

export const SUNLIGHT_PAINTERS: Record<OverlayId, Painter> = {
  morning: (ctx, size) => {
    fill(ctx, size, "#7d7d7d");
    softLight(ctx, size * 0.22, size * 0.16, size * 1.1, 0.5);
  },
  golden: (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.45, "#9a9a9a");
    gradient.addColorStop(1, "#5f5f5f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  },
  noon: (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.55, "#848484");
    gradient.addColorStop(1, "#606060");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  },
  shade: (ctx, size) => {
    fill(ctx, size, "#6c6c6c");
    softLight(ctx, size * 0.5, size * 0.28, size * 0.72, 0.36);
  },
  sunset: (ctx, size) => {
    const gradient = ctx.createLinearGradient(size * 0.1, size, size * 0.9, 0);
    gradient.addColorStop(0, "#e8e8e8");
    gradient.addColorStop(0.5, "#828282");
    gradient.addColorStop(1, "#575757");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  },
  dusk: (ctx, size) => {
    fill(ctx, size, "#5a5a5a");
    softLight(ctx, size * 0.5, size * 0.85, size * 0.85, 0.32);
  },
  studio: (ctx, size) => {
    fill(ctx, size, "#6f6f6f");
    softLight(ctx, size * 0.24, size * 0.24, size * 0.62, 0.45);
    softLight(ctx, size * 0.8, size * 0.5, size * 0.55, 0.35);
    softShadow(ctx, size * 0.5, size, size * 0.7, 0.25);
  },
  overcast: (ctx, size) => {
    fill(ctx, size, "#808080");
    softLight(ctx, size * 0.5, size * 0.12, size * 0.9, 0.18);
  },
  blush: (ctx, size) => {
    fill(ctx, size, "#767676");
    softLight(ctx, size * 0.5, size * 0.44, size * 0.58, 0.4);
    softShadow(ctx, 0, 0, size * 0.5, 0.2);
  },
  leaves: (ctx, size, random) => {
    fill(ctx, size, "#848484");
    for (let index = 0; index < 14; index++) {
      const x = random() * size;
      const y = random() * size;
      const radius = size * (0.08 + random() * 0.14);
      if (random() > 0.4) {
        softLight(ctx, x, y, radius, 0.26);
      } else {
        softShadow(ctx, x, y, radius, 0.24);
      }
    }
  },
  window: (ctx, size) => {
    fill(ctx, size, "#6e6e6e");
    const left = size * 0.18;
    const top = size * 0.12;
    const right = size * 0.82;
    const bottom = size * 0.88;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    const bar = size * 0.02;
    ctx.fillRect(size * 0.5 - bar / 2, top, bar, bottom - top);
    ctx.fillRect(left, size * 0.5 - bar / 2, right - left, bar);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.lineWidth = size * 0.03;
    ctx.strokeRect(left, top, right - left, bottom - top);
  },
  palm: (ctx, size, random) => {
    fill(ctx, size, "#767676");
    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate((30 * Math.PI) / 180);
    for (let index = 0; index < 9; index++) {
      const offset = (index - 4) * size * 0.13;
      const height = size * (0.25 + random() * 0.5);
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.beginPath();
      ctx.ellipse(offset, 0, size * 0.035, height / 2, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    softLight(ctx, size * 0.3, size * 0.3, size * 0.5, 0.22);
  },
  blinds: (ctx, size) => {
    fill(ctx, size, "#7a7a7a");
    const band = size / 10;
    for (let index = 0; index < 10; index++) {
      const y = index * band;
      const gradient = ctx.createLinearGradient(0, y, 0, y + band);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.1)");
      gradient.addColorStop(0.75, "rgba(0, 0, 0, 0.3)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.42)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, size, band);
    }
  },
  slice: (ctx, size) => {
    fill(ctx, size, "#6a6a6a");
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.75, 0);
    ctx.lineTo(size * 0.35, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();
  },
  arch: (ctx, size) => {
    fill(ctx, size, "#6e6e6e");
    const width = size * 0.52;
    const left = (size - width) / 2;
    const top = size * 0.14;
    const height = size * 0.74;
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(left, top + height);
    ctx.lineTo(left, top + width / 2);
    ctx.arc(size * 0.5, top + width / 2, width / 2, Math.PI, 0);
    ctx.lineTo(left + width, top + height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = size * 0.025;
    ctx.stroke();
  },
  panes: (ctx, size) => {
    fill(ctx, size, "#6c6c6c");
    const cols = 3;
    const rows = 2;
    const gap = size * 0.035;
    const cellW = (size - gap * (cols + 1)) / cols;
    const cellH = (size - gap * (rows + 1)) / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillRect(
          gap + col * (cellW + gap),
          gap + row * (cellH + gap),
          cellW,
          cellH,
        );
      }
    }
  },
  lattice: (ctx, size) => {
    fill(ctx, size, "#888888");
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = size * 0.012;
    const extent = size * 0.78;
    const step = size / 14;
    for (let offset = -extent; offset <= extent; offset += step) {
      ctx.beginPath();
      ctx.moveTo(offset, -extent);
      ctx.lineTo(offset, extent);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-extent, offset);
      ctx.lineTo(extent, offset);
      ctx.stroke();
    }
    ctx.restore();
  },
  dapple: (ctx, size, random) => {
    fill(ctx, size, "#7c7c7c");
    for (let index = 0; index < 42; index++) {
      const x = random() * size;
      const y = random() * size;
      const radius = size * (0.025 + random() * 0.05);
      softLight(ctx, x, y, radius, 0.3);
      softShadow(ctx, x + radius * 0.7, y + radius * 0.5, radius * 1.05, 0.22);
    }
  },
  curtain: (ctx, size, random) => {
    fill(ctx, size, "#7b7b7b");
    const band = size / 12;
    for (let index = 0; index < 12; index++) {
      const x = index * band;
      const wobble = Math.sin(index * 1.7) * size * 0.015;
      const gradient = ctx.createLinearGradient(x, 0, x + band, 0);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.26)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.32)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.26)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + wobble, 0, band, size);
    }
    softLight(ctx, size * 0.5, size * 0.15, size * 0.8, 0.15 + random() * 0.05);
  },
};

const cache = new Map<string, HTMLCanvasElement>();

export function createSunlightOverlayCanvas(id: OverlayId): HTMLCanvasElement {
  const cached = cache.get(id);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = OVERLAY_TEXTURE_SIZE;
  canvas.height = OVERLAY_TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create a 2D rendering context");
  SUNLIGHT_PAINTERS[id](
    ctx,
    OVERLAY_TEXTURE_SIZE,
    createRandom(hashString(id)),
  );
  cache.set(id, canvas);
  return canvas;
}
