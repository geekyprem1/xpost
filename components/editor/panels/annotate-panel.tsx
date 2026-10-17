"use client";

import {
  ArrowUpRight,
  Circle,
  Hash,
  Highlighter,
  Smile,
  Square,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ANNOTATION_COLORS,
  ANNOTATION_EMOJI,
  ANNOTATION_TOOLS,
  type AnnotationToolId,
} from "@/lib/editor/annotation-tools";
import { useEditorStore, useUiStore } from "@/lib/store";

const TOOL_ICONS: Record<AnnotationToolId, LucideIcon> = {
  arrow: ArrowUpRight,
  rect: Square,
  ellipse: Circle,
  highlight: Highlighter,
  step: Hash,
  emoji: Smile,
};

export function AnnotatePanel() {
  const hasImage = useEditorStore((state) => state.scene.image !== null);
  const tool = useUiStore((state) => state.annotationTool);
  const setTool = useUiStore((state) => state.setAnnotationTool);
  const style = useUiStore((state) => state.annotationStyle);
  const setStyle = useUiStore((state) => state.setAnnotationStyle);

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <span className="text-xs font-medium">Annotate</span>
        <div className="grid grid-cols-3 gap-1">
          {ANNOTATION_TOOLS.map((item) => {
            const Icon = TOOL_ICONS[item.id];
            const active = tool === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={active ? "secondary" : "outline"}
                aria-pressed={active}
                disabled={!hasImage}
                onClick={() => setTool(active ? null : item.id)}
              >
                <Icon aria-hidden />
                {item.label}
              </Button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-[10px]">
          {hasImage
            ? "Drag on the screenshot to draw. Esc exits the tool."
            : "Add a screenshot first."}
        </p>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Color</span>
        <div className="flex flex-wrap gap-1.5">
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Annotation color ${color}`}
              aria-pressed={style.color.toLowerCase() === color.toLowerCase()}
              className={`size-6 rounded-full border-2 ${
                style.color.toLowerCase() === color.toLowerCase()
                  ? "border-ring"
                  : "border-transparent"
              }`}
              style={{ background: color }}
              onClick={() => setStyle({ color })}
            />
          ))}
          <input
            type="color"
            value={style.color}
            aria-label="Custom annotation color"
            className="h-6 w-8 cursor-pointer rounded border bg-transparent"
            onChange={(event) => setStyle({ color: event.target.value })}
          />
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Stroke</span>
          <span className="text-muted-foreground">
            {Math.max(1, Math.round(style.stroke * 1500))}px
          </span>
        </div>
        <Slider
          value={[style.stroke]}
          min={0.001}
          max={0.02}
          step={0.001}
          aria-label="Annotation stroke"
          onValueChange={([value]) => setStyle({ stroke: value })}
        />
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Arrow</span>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Curve</span>
          <span>{style.bend.toFixed(1)}</span>
        </div>
        <Slider
          value={[style.bend]}
          min={-1}
          max={1}
          step={0.1}
          aria-label="Arrow curve"
          onValueChange={([value]) => setStyle({ bend: value })}
        />
        <Button
          type="button"
          size="xs"
          variant={style.head ? "secondary" : "outline"}
          aria-pressed={style.head}
          onClick={() => setStyle({ head: !style.head })}
        >
          Arrow head {style.head ? "on" : "off"}
        </Button>
      </section>

      {tool === "emoji" ? (
        <section className="space-y-2 border-t pt-3">
          <span className="text-xs font-medium">Sticker</span>
          <div className="flex flex-wrap gap-1">
            {ANNOTATION_EMOJI.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                size="icon-xs"
                variant={style.emoji === emoji ? "secondary" : "outline"}
                aria-label={`Emoji ${emoji}`}
                aria-pressed={style.emoji === emoji}
                onClick={() => setStyle({ emoji })}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-muted-foreground border-t pt-3 text-[10px]">
        A arrow · R rectangle · O ellipse · H highlight · N number · E emoji · T
        text
      </p>
    </div>
  );
}
