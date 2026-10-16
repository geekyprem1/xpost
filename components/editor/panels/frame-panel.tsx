"use client";

import { FrameThumbnail } from "@/components/editor/panels/frame-thumbnail";
import { getFrameConfig } from "@/lib/renderer/frames";
import { Button } from "@/components/ui/button";
import type { FrameId } from "@/lib/scene";
import { useEditorStore } from "@/lib/store";

const FRAME_LABELS: Record<FrameId, string> = {
  screenshot: "Screenshot",
  browser: "Browser",
  "iphone-18-pro": "iPhone 17 Pro",
  "iphone-18-pro-max": "17 Pro Max",
  "iphone-17": "iPhone 16",
  "iphone-air": "iPhone Air",
  "ipad-pro-11": "iPad Pro 11 inch",
  "ipad-pro-13": "iPad Pro 13 inch",
  "macbook-pro-14": "MacBook 14″",
  "macbook-pro-16": "MacBook 16″",
  card: "Card",
  "dark-bar": "Dark Bar",
  safari: "Safari",
  arc: "Arc",
  terminal: "Terminal",
  glass: "Glass",
};

export function FramePanel() {
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const frameKind = scene.frame.kind;

  const groups: Array<{ label: string; ids: FrameId[] }> = [
    { label: "Essentials", ids: ["screenshot", "browser"] },
    {
      label: "Phone",
      ids: ["iphone-18-pro", "iphone-18-pro-max", "iphone-17", "iphone-air"],
    },
    { label: "Tablet", ids: ["ipad-pro-11", "ipad-pro-13"] },
    { label: "Computer", ids: ["macbook-pro-14", "macbook-pro-16"] },
    {
      label: "Window",
      ids: ["card", "dark-bar", "safari", "arc", "terminal", "glass"],
    },
  ];

  return (
    <div className="space-y-3">
      <span className="text-xs font-medium">Frame</span>
      {getFrameConfig(frameKind)?.screenAspect ? (
        <div className="bg-muted/30 space-y-2 rounded-xl border p-3">
          <span className="text-xs font-medium">Image inside device</span>
          <div className="grid grid-cols-2 gap-2">
            {(["contain", "cover"] as const).map((fit) => (
              <Button
                key={fit}
                size="sm"
                variant={
                  (scene.frame.fit ?? "cover") === fit ? "secondary" : "outline"
                }
                aria-pressed={(scene.frame.fit ?? "cover") === fit}
                onClick={() =>
                  setScene((current) => ({
                    ...current,
                    frame: { ...current.frame, fit },
                  }))
                }
              >
                {fit === "contain" ? "Fit full image" : "Fill screen"}
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Fit keeps the full image visible. Fill crops the edges.
          </p>
        </div>
      ) : null}
      {groups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {group.label}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {group.ids.map((kind) => (
              <FrameThumbnail
                key={kind}
                kind={kind}
                label={FRAME_LABELS[kind]}
                active={frameKind === kind}
                onSelect={() =>
                  setScene((scene) => ({
                    ...scene,
                    frame: { ...scene.frame, kind },
                  }))
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
