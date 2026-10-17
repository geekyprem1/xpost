"use client";

import {
  Grid2x2,
  ShieldOff,
  Square,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { RedactMode } from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";

const MODES: { id: RedactMode; label: string; icon: LucideIcon }[] = [
  { id: "pixelate", label: "Pixelate", icon: Grid2x2 },
  { id: "blur", label: "Blur", icon: Waves },
  { id: "solid", label: "Solid", icon: Square },
];

export function RedactPanel() {
  const hasImage = useEditorStore((state) => state.scene.image !== null);
  const tool = useUiStore((state) => state.redactTool);
  const setTool = useUiStore((state) => state.setRedactTool);
  const style = useUiStore((state) => state.redactStyle);
  const setStyle = useUiStore((state) => state.setRedactStyle);

  function selectMode(mode: RedactMode) {
    if (tool === mode) {
      setTool(null);
      return;
    }
    setStyle({ mode });
    setTool(mode);
  }

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <span className="text-xs font-medium">Redact</span>
        <div className="grid grid-cols-3 gap-1">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const active = tool === mode.id;
            return (
              <Button
                key={mode.id}
                type="button"
                size="xs"
                variant={active ? "secondary" : "outline"}
                aria-pressed={active}
                disabled={!hasImage}
                onClick={() => selectMode(mode.id)}
              >
                <Icon aria-hidden />
                {mode.label}
              </Button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-[10px]">
          {hasImage
            ? "Drag a region over the screenshot. Esc exits the tool."
            : "Add a screenshot first."}
        </p>
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Strength</span>
          <span className="text-muted-foreground">{style.strength}%</span>
        </div>
        <Slider
          value={[style.strength]}
          min={0}
          max={100}
          step={1}
          aria-label="Redact strength"
          onValueChange={([value]) => setStyle({ strength: value })}
        />
        {style.mode === "blur" && style.strength < 30 ? (
          <p className="text-[10px] text-amber-500">
            Weak blur — original text may still be readable. Increase strength.
          </p>
        ) : null}
      </section>

      {style.mode === "solid" ? (
        <section className="flex items-center justify-between border-t pt-3 text-xs">
          <span className="font-medium">Fill color</span>
          <input
            type="color"
            value={style.color}
            aria-label="Redaction fill color"
            className="h-6 w-10 cursor-pointer rounded border bg-transparent"
            onChange={(event) => setStyle({ color: event.target.value })}
          />
        </section>
      ) : null}

      <p className="text-muted-foreground border-t pt-3 text-[10px]">
        <ShieldOff aria-hidden className="mr-1 inline size-3" />
        Redaction is baked into exports and the AI preview — original pixels
        never leave the browser.
      </p>
    </div>
  );
}
