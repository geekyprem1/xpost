"use client";

import { AspectThumbnail } from "@/components/editor/panels/aspect-thumbnail";
import { Slider } from "@/components/ui/slider";
import { ASPECT_RATIOS } from "@/lib/renderer";
import { ASPECT_IDS, type AspectId } from "@/lib/scene";
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

export function LayoutPanel() {
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);
  const { aspect, baseWidth } = scene.canvas;
  const { radius, shadow } = scene.layout;

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <span className="text-xs font-medium">Aspect ratio</span>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_IDS.map((id) => (
            <AspectThumbnail
              key={id}
              ratio={id === "auto" ? null : (ASPECT_RATIOS[id] ?? null)}
              label={ASPECT_LABELS[id]}
              active={aspect === id}
              onSelect={() =>
                setScene((current) => ({
                  ...current,
                  canvas: { ...current.canvas, aspect: id },
                }))
              }
            />
          ))}
        </div>
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
        Base width {baseWidth}px — download scale (1× / 2× / 3×) is applied when
        exporting.
      </p>
    </div>
  );
}
