"use client";

import { useEffect, useRef } from "react";
import { STYLE_PARAMS } from "@/lib/renderer";
import type { StyleId } from "@/lib/scene";

function rgba(parts: [number, number, number, number]): string {
  return `rgba(${Math.round(parts[0] * 255)}, ${Math.round(parts[1] * 255)}, ${Math.round(
    parts[2] * 255
  )}, ${parts[3]})`;
}

function drawStyleThumbnail(canvas: HTMLCanvasElement, styleId: StyleId) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const params = STYLE_PARAMS[styleId];

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#2a2440");
  background.addColorStop(1, "#43305a");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const px = 12;
  const py = 7;
  const pw = width - 24;
  const ph = height - 14;
  const radius = 7;

  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, radius);
  if (params.glassBlurPx > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.14 + params.glassTint[3]})`;
    ctx.fill();
    ctx.fillStyle = rgba(params.glassTint);
    ctx.fill();
  } else if (params.fill[3] > 0) {
    ctx.fillStyle = rgba(params.fill);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.roundRect(px + 9, py + 9, pw - 18, ph - 18, 4);
  ctx.fillStyle = styleId.includes("dark") ? "#0c0c12" : "#101018";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, radius);
  if (params.insetAlpha > 0) {
    ctx.fillStyle = `rgba(${styleId.includes("dark") ? "0, 0, 0" : "255, 255, 255"}, ${
      params.insetAlpha * 0.5
    })`;
    ctx.fill();
  }
  if (params.borderWidthPx > 0) {
    ctx.lineWidth = Math.min(3.5, params.borderWidthPx * 0.6);
    ctx.strokeStyle = rgba(params.borderColor);
    ctx.stroke();
  }
}

export function StyleThumbnail({
  styleId,
  label,
  active,
  onSelect,
}: {
  styleId: StyleId;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawStyleThumbnail(canvas, styleId);
  }, [styleId]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex flex-col gap-1 rounded-md border p-1 transition-all ${
        active ? "ring-2 ring-ring" : "hover:opacity-85"
      }`}
    >
      <canvas ref={canvasRef} width={96} height={54} className="block w-full rounded-sm" />
      <span className="text-[10px] leading-none text-muted-foreground">{label}</span>
    </button>
  );
}
