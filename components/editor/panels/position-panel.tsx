"use client";

import { RotateCcw } from "lucide-react";
import { LayoutPresetThumbnail } from "@/components/editor/panels/layout-preset-thumbnail";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  LAYOUT_PRESETS,
  applyLayoutPreset,
  isPresetActive,
} from "@/lib/editor/layout-presets";
import { ANCHOR_IDS, type AnchorId } from "@/lib/scene";
import { useEditorStore } from "@/lib/store";

const ZOOM_PRESETS = [75, 100, 125, 150];

const ANCHOR_LABELS: Record<AnchorId, string> = {
  "top-left": "Top left",
  "top-center": "Top center",
  "top-right": "Top right",
  "center-left": "Center left",
  center: "Center",
  "center-right": "Center right",
  "bottom-left": "Bottom left",
  "bottom-center": "Bottom center",
  "bottom-right": "Bottom right",
};

export function PositionPanel() {
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);
  const transform = scene.transform;

  function update(partial: Partial<typeof transform>, transient = false) {
    setScene(
      (current) => ({
        ...current,
        transform: { ...current.transform, ...partial },
      }),
      { transient },
    );
  }

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Zoom</span>
          <span className="text-muted-foreground">{transform.zoom}%</span>
        </div>
        <Slider
          value={[transform.zoom]}
          min={50}
          max={200}
          step={1}
          aria-label="Zoom"
          onValueChange={([value]) => update({ zoom: value }, true)}
          onValueCommit={() => commitScene()}
        />
        <div className="flex gap-1">
          {ZOOM_PRESETS.map((zoom) => (
            <Button
              key={zoom}
              type="button"
              size="xs"
              variant={transform.zoom === zoom ? "secondary" : "outline"}
              onClick={() => update({ zoom })}
            >
              {zoom}%
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Tilt</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-10 text-[10px]">
            X {transform.tiltX}°
          </span>
          <Slider
            value={[transform.tiltX]}
            min={-30}
            max={30}
            step={1}
            aria-label="Tilt X"
            className="flex-1"
            onValueChange={([value]) => update({ tiltX: value }, true)}
            onValueCommit={() => commitScene()}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-10 text-[10px]">
            Y {transform.tiltY}°
          </span>
          <Slider
            value={[transform.tiltY]}
            min={-30}
            max={30}
            step={1}
            aria-label="Tilt Y"
            className="flex-1"
            onValueChange={([value]) => update({ tiltY: value }, true)}
            onValueCommit={() => commitScene()}
          />
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Position</span>
        <div
          className="grid w-27 grid-cols-3 gap-1"
          role="group"
          aria-label="Anchor"
        >
          {ANCHOR_IDS.map((anchor) => (
            <Button
              key={anchor}
              type="button"
              size="icon-xs"
              variant={transform.anchor === anchor ? "secondary" : "outline"}
              aria-label={ANCHOR_LABELS[anchor]}
              aria-pressed={transform.anchor === anchor}
              onClick={() => update({ anchor })}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground text-[10px]">
          Drag the image on the canvas to reposition it.
        </p>
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Padding</span>
          <span className="text-muted-foreground">{transform.padding}px</span>
        </div>
        <Slider
          value={[transform.padding]}
          min={0}
          max={200}
          step={1}
          aria-label="Padding"
          onValueChange={([value]) => update({ padding: value }, true)}
          onValueCommit={() => commitScene()}
        />
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Layout presets</span>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_PRESETS.map((preset) => (
            <LayoutPresetThumbnail
              key={preset.id}
              preset={preset}
              active={isPresetActive(scene, preset)}
              onSelect={() =>
                setScene((current) => applyLayoutPreset(current, preset))
              }
            />
          ))}
        </div>
      </section>

      <section className="border-t pt-3">
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() =>
            update({
              zoom: 100,
              tiltX: 0,
              tiltY: 0,
              anchor: "center",
              offset: { x: 0, y: 0 },
              padding: 100,
            })
          }
        >
          <RotateCcw aria-hidden />
          Reset position
        </Button>
      </section>
    </div>
  );
}
