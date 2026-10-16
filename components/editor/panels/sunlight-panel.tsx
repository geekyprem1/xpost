"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SunlightOverlayThumbnail } from "@/components/editor/panels/sunlight-overlay-thumbnail";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { OVERLAY_IDS, type OverlayId } from "@/lib/scene";
import { useEditorStore } from "@/lib/store";

const OVERLAY_LABELS: Record<OverlayId, string> = {
  morning: "Morning",
  golden: "Golden",
  noon: "Noon",
  shade: "Shade",
  sunset: "Sunset",
  dusk: "Dusk",
  studio: "Studio",
  overcast: "Overcast",
  blush: "Blush",
  leaves: "Leaves",
  window: "Window",
  palm: "Palm",
  blinds: "Blinds",
  slice: "Slice",
  arch: "Arch",
  panes: "Panes",
  lattice: "Lattice",
  dapple: "Dapple",
  curtain: "Curtain",
};

export function SunlightPanel() {
  const sunlight = useEditorStore((state) => state.scene.sunlight);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);
  const [adjustOpen, setAdjustOpen] = useState(false);

  function update(partial: Partial<typeof sunlight>, transient = false) {
    setScene(
      (scene) => ({ ...scene, sunlight: { ...scene.sunlight, ...partial } }),
      { transient }
    );
  }

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <span className="text-xs font-medium">Overlay</span>
        <div className="grid grid-cols-4 gap-1.5">
          <SunlightOverlayThumbnail
            overlay="none"
            label="None"
            active={sunlight.overlay === "none"}
            onSelect={() => update({ overlay: "none" })}
          />
          {OVERLAY_IDS.map((id) => (
            <SunlightOverlayThumbnail
              key={id}
              overlay={id}
              label={OVERLAY_LABELS[id]}
              active={sunlight.overlay === id}
              onSelect={() => update({ overlay: id })}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Strength</span>
          <span className="text-muted-foreground">{sunlight.strength}%</span>
        </div>
        <Slider
          value={[sunlight.strength]}
          min={0}
          max={100}
          step={1}
          aria-label="Strength"
          onValueChange={([value]) => update({ strength: value }, true)}
          onValueCommit={() => commitScene()}
        />
      </section>

      <section className="space-y-2 border-t pt-3">
        <Button
          type="button"
          size="xs"
          variant="outline"
          aria-expanded={adjustOpen}
          onClick={() => setAdjustOpen((value) => !value)}
        >
          <SlidersHorizontal aria-hidden />
          Adjust
        </Button>
        {adjustOpen ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-12 text-[10px] text-muted-foreground">
                Angle {sunlight.angle}°
              </span>
              <Slider
                value={[sunlight.angle]}
                min={0}
                max={360}
                step={1}
                aria-label="Angle"
                className="flex-1"
                onValueChange={([value]) => update({ angle: value }, true)}
                onValueCommit={() => commitScene()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-[10px] text-muted-foreground">
                Soft {sunlight.softness}
              </span>
              <Slider
                value={[sunlight.softness]}
                min={0}
                max={100}
                step={1}
                aria-label="Softness"
                className="flex-1"
                onValueChange={([value]) => update({ softness: value }, true)}
                onValueCommit={() => commitScene()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-[10px] text-muted-foreground">
                Temp {sunlight.temperature}
              </span>
              <Slider
                value={[sunlight.temperature]}
                min={-100}
                max={100}
                step={1}
                aria-label="Temperature"
                className="flex-1"
                onValueChange={([value]) => update({ temperature: value }, true)}
                onValueCommit={() => commitScene()}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Grain</span>
          <span className="text-muted-foreground">
            {sunlight.grain === 0 ? "Off" : sunlight.grain}
          </span>
        </div>
        <Slider
          value={[sunlight.grain]}
          min={0}
          max={100}
          step={1}
          aria-label="Grain"
          onValueChange={([value]) => update({ grain: value }, true)}
          onValueCommit={() => commitScene()}
        />
      </section>
    </div>
  );
}
