"use client";

import { useState } from "react";
import { AspectThumbnail } from "@/components/editor/panels/aspect-thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  PLATFORM_SIZES,
  applyCustomSize,
  applyPlatformSize,
  parseCanvasDimension,
  setCanvasAspect,
} from "@/lib/editor/platform-sizes";
import { ASPECT_RATIOS, computeExportSize } from "@/lib/renderer";
import {
  ASPECT_IDS,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  croppedImageSize,
  type AspectId,
} from "@/lib/scene";
import { useEditorStore } from "@/lib/store";

const ASPECT_LABELS: Record<AspectId, string> = {
  auto: "Auto",
  "2:1": "2:1",
  "16:9": "16:9",
  "16:10": "16:10",
  "3:2": "3:2",
  "4:3": "4:3",
  "5:4": "5:4",
  "1:1": "1:1",
  "4:5": "4:5",
  "3:4": "3:4",
  "2:3": "2:3",
  "9:16": "9:16",
  "mbp-14": "MBP 14″",
  "mbp-16": "MBP 16″",
};

function CustomSize() {
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const current = computeExportSize(
    scene,
    1,
    croppedImageSize(
      scene,
      scene.image
        ? { width: scene.image.width, height: scene.image.height }
        : null,
    ),
  );
  // Seeded from the current output; re-mounted (key) when the size changes.
  const [width, setWidth] = useState(String(current.width));
  const [height, setHeight] = useState(String(current.height));
  const w = parseCanvasDimension(width);
  const h = parseCanvasDimension(height);
  const valid = w !== null && h !== null;
  const isCustom = Boolean(scene.canvas.size && !scene.canvas.size.preset);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) setScene((s) => applyCustomSize(s, w, h));
      }}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Custom size</span>
        {isCustom ? (
          <span className="text-muted-foreground">Active</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_CANVAS_SIZE}
          max={MAX_CANVAS_SIZE}
          value={width}
          aria-label="Custom width in pixels"
          aria-invalid={w === null}
          className="h-8 font-mono text-xs"
          onChange={(event) => setWidth(event.target.value)}
        />
        <span aria-hidden className="text-muted-foreground text-xs">
          ×
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_CANVAS_SIZE}
          max={MAX_CANVAS_SIZE}
          value={height}
          aria-label="Custom height in pixels"
          aria-invalid={h === null}
          className="h-8 font-mono text-xs"
          onChange={(event) => setHeight(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={!valid}>
          Apply
        </Button>
      </div>
      <p
        className={
          valid
            ? "text-muted-foreground text-[10px]"
            : "text-destructive text-[10px]"
        }
        role={valid ? undefined : "alert"}
      >
        {MIN_CANVAS_SIZE}–{MAX_CANVAS_SIZE} px each side. 1× download is exactly
        this size.
      </p>
    </form>
  );
}

export function LayoutPanel() {
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);
  const { aspect, baseWidth, size } = scene.canvas;
  const { radius, shadow } = scene.layout;

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <span className="text-xs font-medium">Platform</span>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORM_SIZES.map((preset) => (
            <AspectThumbnail
              key={preset.id}
              ratio={preset.width / preset.height}
              label={preset.label}
              detail={`${preset.width} × ${preset.height}`}
              active={size?.preset === preset.id}
              onSelect={() =>
                setScene((current) => applyPlatformSize(current, preset.id))
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Aspect ratio</span>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_IDS.map((id) => (
            <AspectThumbnail
              key={id}
              ratio={id === "auto" ? null : (ASPECT_RATIOS[id] ?? null)}
              label={ASPECT_LABELS[id]}
              active={!size && aspect === id}
              onSelect={() =>
                setScene((current) => setCanvasAspect(current, id))
              }
            />
          ))}
        </div>
      </section>

      <section className="border-t pt-3">
        <CustomSize
          key={size ? `${size.width}x${size.height}` : `aspect-${aspect}`}
        />
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Corner radius</span>
          <span className="text-muted-foreground">{radius}px</span>
        </div>
        <Slider
          value={[radius]}
          min={0}
          max={48}
          step={1}
          aria-label="Corner radius"
          onValueChange={([value]) =>
            setScene(
              (current) => ({
                ...current,
                layout: { ...current.layout, radius: value },
              }),
              { transient: true },
            )
          }
          onValueCommit={() => commitScene()}
        />
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Shadow</span>
          <span className="text-muted-foreground">{shadow}</span>
        </div>
        <Slider
          value={[shadow]}
          min={0}
          max={100}
          step={1}
          aria-label="Shadow"
          onValueChange={([value]) =>
            setScene(
              (current) => ({
                ...current,
                layout: { ...current.layout, shadow: value },
              }),
              { transient: true },
            )
          }
          onValueCommit={() => commitScene()}
        />
      </section>

      <p className="text-muted-foreground border-t pt-3 text-[10px]">
        {size
          ? `Exact size ${size.width} × ${size.height}px — 2× / 3× downloads are multiples of it.`
          : `Base width ${baseWidth}px — download scale (1× / 2× / 3×) is applied when exporting.`}
      </p>
    </div>
  );
}
