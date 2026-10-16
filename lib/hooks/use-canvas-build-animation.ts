"use client";

import { useEffect, type RefObject } from "react";

/** A compositor-driven entrance: no tiles, image encoding or per-frame DOM work. */
export function useCanvasBuildAnimation(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  image: HTMLImageElement | null,
  ready: number,
  reducedMotion: boolean,
) {
  // Font and renderer readiness can change independently of an image replacement.
  const rendererReady = ready > 0;
  useEffect(() => {
    if (!image || !rendererReady || reducedMotion) return;
    let animation: Animation | undefined;
    let sweepAnimation: Animation | undefined;
    let sweep: HTMLDivElement | undefined;
    let canvas: HTMLCanvasElement | null = null;
    let previousWillChange = "";
    const frame = requestAnimationFrame(() => {
      canvas = canvasRef.current;
      if (!canvas || !containerRef.current) return;
      previousWillChange = canvas.style.willChange;
      canvas.style.willChange = "transform, opacity, clip-path";
      animation = canvas.animate(
        [
          {
            opacity: 0,
            transform: "translate3d(0, 42px, 0) scale(0.88)",
            clipPath: "inset(12% 8% 12% 8% round 32px)",
          },
          {
            opacity: 1,
            transform: "translate3d(0, 0, 0) scale(1)",
            clipPath: "inset(0% 0% 0% 0% round 0px)",
          },
        ],
        {
          duration: 1200,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "none",
        },
      );
      const bounds = canvas.getBoundingClientRect();
      const parent = containerRef.current.getBoundingClientRect();
      sweep = document.createElement("div");
      sweep.setAttribute("aria-hidden", "true");
      Object.assign(sweep.style, {
        position: "absolute",
        pointerEvents: "none",
        zIndex: "4",
        left: bounds.left - parent.left + "px",
        top: bounds.top - parent.top + "px",
        width: bounds.width + "px",
        height: bounds.height + "px",
        overflow: "hidden",
        opacity: "0",
        background:
          "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.18) 47%, rgba(255,255,255,0.3) 50%, transparent 75%)",
        backgroundSize: "250% 100%",
      });
      containerRef.current.appendChild(sweep);
      sweepAnimation = sweep.animate(
        [
          { opacity: 0, backgroundPosition: "140% 0", offset: 0 },
          { opacity: 0.7, backgroundPosition: "80% 0", offset: 0.3 },
          { opacity: 0, backgroundPosition: "-60% 0", offset: 1 },
        ],
        { duration: 1000, delay: 250, easing: "ease-out" },
      );
      sweepAnimation.onfinish = () => sweep?.remove();
      animation.onfinish = () => {
        if (canvas) canvas.style.willChange = previousWillChange;
      };
    });
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
      sweepAnimation?.cancel();
      sweep?.remove();
      if (canvas) canvas.style.willChange = previousWillChange;
    };
  }, [canvasRef, containerRef, image, rendererReady, reducedMotion]);
}
