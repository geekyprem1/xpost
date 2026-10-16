"use client";

import { useEffect, useRef } from "react";
import { composeFrameCanvas, loadFrameImages } from "@/lib/renderer/frame-canvas";
import { getFrameConfig, getFrameMetrics } from "@/lib/renderer/frames";
import type { FrameId } from "@/lib/scene";

export function FrameThumbnail({
  kind,
  label,
  active,
  onSelect,
}: {
  kind: FrameId;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
    await loadFrameImages();
    if (cancelled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(3, 3);

    const config = getFrameConfig(kind);
    if (!config) {
      ctx.fillStyle = "#3a3a48";
      ctx.beginPath();
      ctx.roundRect(18, 14, 96 - 36, 72 - 28, 6);
      ctx.fill();
      ctx.restore();
      return;
    }

    const phone = config.kindHint === "phone";
    const laptop = config.kindHint === "laptop";
    const tablet = config.kindHint === "tablet";
    const screenH = phone ? 57 : tablet ? 54 : laptop ? 40 : 36;
    const screenW = config.screenAspect ? screenH * config.screenAspect : 66;
    const composed = composeFrameCanvas(kind, screenW * 3, screenH * 3);
    if (!composed) { ctx.restore(); return; }
    const s = screenW / 1000;
    const metrics = getFrameMetrics(config);
    const x = (96 - composed.width / 3) / 2;
    const y = (72 - composed.height / 3) / 2;

    ctx.fillStyle = "#eaedf3";
    ctx.beginPath();
    ctx.roundRect(
      x + metrics.left * s,
      y + metrics.top * s,
      screenW,
      screenH,
      config.screenRadius * s
    );
    ctx.fill();
    ctx.drawImage(composed, x, y, composed.width / 3, composed.height / 3);
    ctx.restore();
    };
    void draw().catch(console.error);
    return () => { cancelled = true; };
  }, [kind]);

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
      <canvas ref={canvasRef} width={288} height={216} className="block aspect-[4/3] w-full rounded-sm" />
      <span className="text-[10px] leading-none text-muted-foreground">{label}</span>
    </button>
  );
}
