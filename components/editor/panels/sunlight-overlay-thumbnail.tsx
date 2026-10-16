"use client";

import { useEffect, useRef } from "react";
import { createSunlightOverlayCanvas } from "@/lib/editor/sunlight-overlays";
import type { OverlayId } from "@/lib/scene";

export function SunlightOverlayThumbnail({
  overlay,
  label,
  active,
  onSelect,
}: {
  overlay: OverlayId | "none";
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (overlay === "none") {
      ctx.fillStyle = "#1b1b22";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#3a3a46";
      ctx.beginPath();
      ctx.moveTo(8, canvas.height - 8);
      ctx.lineTo(canvas.width - 8, 8);
      ctx.stroke();
    } else {
      ctx.drawImage(createSunlightOverlayCanvas(overlay), 0, 0, canvas.width, canvas.height);
    }
  }, [overlay]);

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
      <canvas ref={canvasRef} width={72} height={72} className="block w-full rounded-sm" />
      <span className="text-[9px] leading-none text-muted-foreground">{label}</span>
    </button>
  );
}
