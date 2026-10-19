"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { LOOKS } from "@/lib/looks/looks";
import { LookPreview } from "./look-preview";
import { DesktopMock } from "./mock-screens";
import { useOpenInEditor } from "./open-in-editor";

const FEATURED = LOOKS.filter((look) => look.aspect === "16:10");
const AUTOPLAY_MS = 5000;

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/** Before/after compare slider that cycles through featured looks. */
export function LooksShowcase() {
  const { openWithLook } = useOpenInEditor();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [split, setSplit] = useState(42);
  const [paused, setPaused] = useState(false);
  const look = FEATURED[index];
  const autoplay = !paused && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % FEATURED.length),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [autoplay, index]);

  function step(delta: number) {
    setIndex(
      (current) => (current + delta + FEATURED.length) % FEATURED.length,
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="showcase-frame relative overflow-hidden rounded-[1.75rem] p-1.5 sm:rounded-[2.25rem] sm:p-2">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.4rem] sm:rounded-[1.8rem]">
          <LookPreview
            key={look.id}
            look={look}
            playing={!reducedMotion}
            priority
            className="motion-safe:animate-in motion-safe:fade-in size-full motion-safe:duration-500"
          />
          {/* Before: the raw screenshot, clipped to the left of the handle. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          >
            <DesktopMock />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            style={{ left: `${split}%` }}
          >
            <span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#242334] shadow-lg">
              <ChevronLeft className="size-4" />
              <ChevronRight className="-ml-1 size-4" />
            </span>
          </div>
          <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            Before
          </span>
          <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            After
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(event) => setSplit(Number(event.target.value))}
            aria-label="Compare the screenshot before and after the look"
            className="compare-range absolute inset-0 size-full cursor-ew-resize opacity-0"
          />
        </div>

        <div className="flex flex-col gap-3 px-3 pt-3 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div aria-live="polite" className="min-w-0">
            <p className="truncate font-semibold">{look.name}</p>
            <p className="text-muted-foreground text-sm">{look.caption}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-sm tabular-nums">
              {index + 1} / {FEATURED.length}
            </span>
            <IconButton label="Previous look" onClick={() => step(-1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </IconButton>
            <IconButton
              label={paused ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setPaused((value) => !value)}
              pressed={paused}
            >
              {paused ? (
                <Play className="size-4" aria-hidden />
              ) : (
                <Pause className="size-4" aria-hidden />
              )}
            </IconButton>
            <IconButton label="Next look" onClick={() => step(1)}>
              <ChevronRight className="size-4" aria-hidden />
            </IconButton>
            <button
              type="button"
              onClick={() => openWithLook(look.id)}
              className="bg-foreground text-background ml-2 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-85"
            >
              Use this look
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="hover:bg-foreground/5 text-foreground inline-flex size-11 items-center justify-center rounded-full transition-colors"
    >
      {children}
    </button>
  );
}
