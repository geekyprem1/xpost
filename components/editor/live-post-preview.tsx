"use client";

import { useEffect, useRef } from "react";

/** Mirrors the editor's composited video without starting a second video player. */
export function LivePostPreview({ expanded = false }: { expanded?: boolean }) {
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame = 0;
    let lastDraw = -Infinity;
    const draw = (time: number) => {
      const target = previewRef.current;
      const source = document.querySelector<HTMLCanvasElement>(
        "canvas[data-editor-preview]",
      );
      if (
        !document.hidden &&
        target &&
        source &&
        source.width > 0 &&
        source.height > 0 &&
        time - lastDraw >= 1000 / 24
      ) {
        const width = Math.min(800, source.width);
        const height = Math.max(
          1,
          Math.round((width * source.height) / source.width),
        );
        if (target.width !== width || target.height !== height) {
          target.width = width;
          target.height = height;
        }
        const context = target.getContext("2d");
        if (context) {
          context.clearRect(0, 0, width, height);
          context.drawImage(source, 0, 0, width, height);
          lastDraw = time;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="bg-muted/20 relative mt-3 overflow-hidden rounded-xl border">
      <canvas
        ref={previewRef}
        aria-label="Live post preview with animated video background"
        className={
          expanded
            ? "block max-h-[52dvh] w-full object-contain"
            : "block max-h-56 w-full object-contain"
        }
      />
      <span className="absolute right-2 bottom-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">
        Live preview
      </span>
    </div>
  );
}
