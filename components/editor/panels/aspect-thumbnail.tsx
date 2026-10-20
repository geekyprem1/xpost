"use client";

import { useEffect, useRef } from "react";

export function AspectThumbnail({
  ratio,
  label,
  detail,
  active,
  onSelect,
}: {
  ratio: number | null;
  label: string;
  /** Optional second line, e.g. "1270 × 760". */
  detail?: string;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.fillStyle = "#131318";
    ctx.fillRect(0, 0, width, height);

    const maxW = width - 20;
    const maxH = height - 14;
    let rectW: number;
    let rectH: number;
    if (ratio === null) {
      rectW = Math.min(maxW, 44);
      rectH = Math.min(maxH, 32);
    } else {
      rectW = maxW;
      rectH = rectW / ratio;
      if (rectH > maxH) {
        rectH = maxH;
        rectW = rectH * ratio;
      }
    }
    const x = (width - rectW) / 2;
    const y = (height - rectH) / 2;

    const brandAccent = getComputedStyle(canvas)
      .getPropertyValue("--brand-wing")
      .trim();
    ctx.beginPath();
    ctx.roundRect(x, y, rectW, rectH, 3);
    if (ratio === null) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = brandAccent;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = brandAccent;
      ctx.fill();
    }
  }, [ratio]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={detail ? `${label}, ${detail}` : `${label} aspect ratio`}
      aria-pressed={active}
      title={detail ? `${label} · ${detail}` : label}
      className={`flex flex-col gap-1 rounded-md border p-1 transition-all ${
        active ? "ring-ring ring-2" : "hover:opacity-85"
      }`}
    >
      <canvas
        ref={canvasRef}
        width={96}
        height={54}
        className="block w-full rounded-sm"
      />
      <span className="text-muted-foreground truncate text-[10px] leading-none">
        {label}
      </span>
      {detail ? (
        <span className="text-muted-foreground/70 font-mono text-[9px] leading-none">
          {detail}
        </span>
      ) : null}
    </button>
  );
}
