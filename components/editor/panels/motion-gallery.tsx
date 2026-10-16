"use client";

import { Check, Play } from "lucide-react";
import presets from "@/lib/backgrounds/motion-presets.json";
import { useEditorStore } from "@/lib/store";

export function MotionGallery() {
  const background = useEditorStore((state) => state.scene.background);
  const setScene = useEditorStore((state) => state.setScene);

  return (
    <section
      className="space-y-3 pt-3"
      aria-label="Ready-to-use motion backgrounds"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Ready to use</span>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-[10px]">
          10 video loops
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const active =
            background.kind === "video" && background.src.url === preset.url;
          return (
            <button
              key={preset.id}
              type="button"
              aria-label={preset.label}
              aria-pressed={active}
              className={`group bg-muted/30 focus-visible:ring-ring relative overflow-hidden rounded-xl border text-left transition-colors outline-none focus-visible:ring-2 ${active ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"}`}
              onPointerEnter={(event) => {
                if (
                  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                )
                  void event.currentTarget
                    .querySelector("video")
                    ?.play()
                    .catch(() => undefined);
              }}
              onPointerLeave={(event) => {
                event.currentTarget.querySelector("video")?.pause();
              }}
              onBlur={(event) => {
                event.currentTarget.querySelector("video")?.pause();
              }}
              onClick={() =>
                setScene((scene) => ({
                  ...scene,
                  background: {
                    kind: "video",
                    src: {
                      provider: "curated",
                      id: preset.id,
                      url: preset.url,
                      previewUrl: preset.previewUrl,
                      credit: preset.credit,
                    },
                  },
                }))
              }
            >
              <video
                src={preset.url}
                poster={preset.previewUrl}
                muted
                loop
                playsInline
                preload="none"
                className="aspect-video w-full object-cover"
                aria-hidden
              />
              <span className="flex items-center justify-between gap-1 px-2 py-2 text-[10px] font-medium">
                <span className="truncate">{preset.label}</span>
                {active ? (
                  <Check
                    className="text-primary size-3 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <Play
                    className="text-muted-foreground size-3 shrink-0"
                    aria-hidden
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-[10px]">
        Built-in clips · hover to preview · click to apply
      </p>
    </section>
  );
}
