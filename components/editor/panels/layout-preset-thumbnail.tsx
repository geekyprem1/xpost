"use client";

import { useEffect, useRef } from "react";
import type { LayoutPreset } from "@/lib/editor/layout-presets";
import { computeCardLayout } from "@/lib/renderer";
import { createDefaultScene } from "@/lib/scene";

export function LayoutPresetThumbnail({
  preset,
  active,
  onSelect,
}: {
  preset: LayoutPreset;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scene = createDefaultScene();
    scene.canvas.baseWidth = canvas.width;
    scene.canvas.aspect = "16:10";
    scene.style.shadow = "none";
    scene.transform = {
      ...scene.transform,
      ...preset.transform,
      offset: { ...preset.transform.offset },
    };

    const layout = computeCardLayout(scene, 1, { width: 1600, height: 1000 });
    ctx.fillStyle = "#131318";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--brand-wing").trim();
    ctx.beginPath();
    ctx.roundRect(
      layout.imageRect.x,
      layout.imageRect.y,
      layout.imageRect.width,
      layout.imageRect.height,
      layout.imageRadiusPx
    );
    ctx.fill();
  }, [preset]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={preset.name}
      aria-pressed={active}
      title={preset.name}
      className={`flex flex-col gap-1 rounded-md border p-1 transition-all ${
        active ? "ring-2 ring-ring" : "hover:opacity-85"
      }`}
    >
      <canvas ref={canvasRef} width={96} height={60} className="block w-full rounded-sm" />
      <span className="text-[10px] leading-none text-muted-foreground">
        {preset.name}
      </span>
    </button>
  );
}
