"use client";

import { useEffect, useRef } from "react";
import type { GradientPreset, MeshPreset } from "@/lib/backgrounds/presets";

function withAlpha(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawThumbnail(canvas: HTMLCanvasElement, preset: GradientPreset | MeshPreset) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;

  if ("blobs" in preset) {
    ctx.fillStyle = preset.base;
    ctx.fillRect(0, 0, width, height);
    for (const blob of preset.blobs) {
      const cx = blob.x * width;
      const cy = blob.y * height;
      const radius = blob.radius * height * 1.6;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, withAlpha(blob.color, 0.95));
      gradient.addColorStop(1, withAlpha(blob.color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    return;
  }

  const angle = (preset.angle * Math.PI) / 180;
  const length = Math.max(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const gradient = ctx.createLinearGradient(
    cx - (Math.cos(angle) * length) / 2,
    cy - (Math.sin(angle) * length) / 2,
    cx + (Math.cos(angle) * length) / 2,
    cy + (Math.sin(angle) * length) / 2
  );
  for (const stop of preset.stops) {
    gradient.addColorStop(stop.at, stop.color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function BackgroundThumbnail({
  preset,
  active,
  onSelect,
}: {
  preset: GradientPreset | MeshPreset;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawThumbnail(canvas, preset);
  }, [preset]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={preset.name}
      aria-pressed={active}
      title={preset.name}
      className={`overflow-hidden rounded-md border transition-all ${
        active ? "ring-2 ring-ring" : "hover:opacity-85"
      }`}
    >
      <canvas ref={canvasRef} width={96} height={64} className="block w-full" />
    </button>
  );
}
