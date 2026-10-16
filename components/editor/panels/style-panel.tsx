"use client";

import { StyleThumbnail } from "@/components/editor/panels/style-thumbnail";
import { Button } from "@/components/ui/button";
import {
  CORNER_IDS,
  SHADOW_IDS,
  STYLE_IDS,
  type CornerId,
  type ShadowId,
  type StyleId,
} from "@/lib/scene";
import { useEditorStore } from "@/lib/store";

const STYLE_LABELS: Record<StyleId, string> = {
  default: "Default",
  "glass-light": "Glass Light",
  "glass-dark": "Glass Dark",
  "liquid-glass": "Liquid Glass",
  "inset-light": "Inset Light",
  "inset-dark": "Inset Dark",
  outline: "Outline",
  border: "Border",
  "border-dark": "Border Dark",
};

const CORNER_LABELS: Record<CornerId, string> = {
  sharp: "Sharp",
  curved: "Curved",
  round: "Round",
};

const SHADOW_LABELS: Record<ShadowId, string> = {
  none: "None",
  hug: "Hug",
  spread: "Spread",
};

export function StylePanel() {
  const style = useEditorStore((state) => state.scene.style);
  const setScene = useEditorStore((state) => state.setScene);

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <span className="text-xs font-medium">Style</span>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_IDS.map((id) => (
            <StyleThumbnail
              key={id}
              styleId={id}
              label={STYLE_LABELS[id]}
              active={style.preset === id}
              onSelect={() =>
                setScene((scene) => ({
                  ...scene,
                  style: { ...scene.style, preset: id },
                }))
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Corner</span>
        <div className="flex gap-1">
          {CORNER_IDS.map((id) => (
            <Button
              key={id}
              type="button"
              size="xs"
              variant={style.corner === id ? "secondary" : "outline"}
              aria-pressed={style.corner === id}
              onClick={() =>
                setScene((scene) => ({
                  ...scene,
                  style: { ...scene.style, corner: id },
                }))
              }
            >
              {CORNER_LABELS[id]}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Shadow</span>
        <div className="flex gap-1">
          {SHADOW_IDS.map((id) => (
            <Button
              key={id}
              type="button"
              size="xs"
              variant={style.shadow === id ? "secondary" : "outline"}
              aria-pressed={style.shadow === id}
              onClick={() =>
                setScene((scene) => ({
                  ...scene,
                  style: { ...scene.style, shadow: id },
                }))
              }
            >
              {SHADOW_LABELS[id]}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
