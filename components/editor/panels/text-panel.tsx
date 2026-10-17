"use client";

import type { ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FONT_OPTIONS } from "@/lib/fonts";
import {
  TEXT_LAYOUT_PRESETS,
  TEXT_PRESET_IDS,
  TEXT_PRESETS,
  applyTextLayoutPreset,
  applyTextPreset,
  createTextLayer,
  type TextPresetId,
} from "@/lib/editor/text-presets";
import { FONT_WEIGHTS, type TextAlign, type TextLayer } from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";

const ALIGN_OPTIONS: {
  value: TextAlign;
  label: string;
  icon: typeof AlignLeft;
}[] = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align center", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
];

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium">{children}</span>;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="color"
        value={value}
        aria-label={label}
        className="h-6 w-10 cursor-pointer rounded border bg-transparent"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextPanel() {
  const scene = useEditorStore((state) => state.scene);
  const hasImage = useEditorStore((state) => state.scene.image !== null);
  const selectedLayerId = useUiStore((state) => state.selectedLayerId);
  const selectLayer = useUiStore((state) => state.selectLayer);
  const addLayer = useEditorStore((state) => state.addLayer);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);

  const selected = scene.layers.find(
    (layer): layer is TextLayer =>
      layer.id === selectedLayerId && layer.kind === "text",
  );

  function addText(preset: TextPresetId) {
    if (!hasImage) return;
    addLayer(createTextLayer(preset));
  }

  function updateStyle(patch: Partial<TextLayer["style"]>, transient = false) {
    if (!selected) return;
    updateLayer(
      selected.id,
      (layer) =>
        layer.kind === "text"
          ? { ...layer, style: { ...layer.style, ...patch } }
          : layer,
      { transient },
    );
  }

  function applyLayout(id: (typeof TEXT_LAYOUT_PRESETS)[number]["id"]) {
    const result = applyTextLayoutPreset(scene, id, selected?.id ?? null);
    setScene(() => result.scene);
    selectLayer(result.layerId);
  }

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <Label>Add text</Label>
        <div className="grid grid-cols-2 gap-1">
          {TEXT_PRESET_IDS.map((id) => (
            <Button
              key={id}
              type="button"
              size="xs"
              variant="outline"
              disabled={!hasImage}
              onClick={() => addText(id)}
            >
              <Plus aria-hidden />
              {TEXT_PRESETS[id].label}
            </Button>
          ))}
        </div>
        {hasImage ? null : (
          <p className="text-muted-foreground text-[10px]">
            Add a screenshot first — text sits on the canvas.
          </p>
        )}
      </section>

      {selected ? (
        <>
          <section className="space-y-2 border-t pt-3">
            <Label>Preset</Label>
            <div className="grid grid-cols-2 gap-1">
              {TEXT_PRESET_IDS.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="xs"
                  variant={
                    selected.style.size === TEXT_PRESETS[id].style.size
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() =>
                    updateLayer(selected.id, (layer) =>
                      layer.kind === "text"
                        ? applyTextPreset(layer, id)
                        : layer,
                    )
                  }
                >
                  {TEXT_PRESETS[id].label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t pt-3">
            <Label>Layout</Label>
            <div className="flex flex-wrap gap-1">
              {TEXT_LAYOUT_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => applyLayout(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t pt-3">
            <Label>Type</Label>
            <select
              value={selected.style.font}
              aria-label="Font"
              className="border-input bg-background h-7 w-full rounded-lg border px-2 text-xs"
              onChange={(event) =>
                updateStyle({
                  font: event.target.value as TextLayer["style"]["font"],
                })
              }
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label} · {font.category}
                </option>
              ))}
            </select>

            <div className="flex gap-1">
              {FONT_WEIGHTS.map((weight) => (
                <Button
                  key={weight}
                  type="button"
                  size="xs"
                  variant={
                    selected.style.weight === weight ? "secondary" : "outline"
                  }
                  aria-pressed={selected.style.weight === weight}
                  onClick={() => updateStyle({ weight })}
                >
                  {weight}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Size</span>
              <span>{selected.style.size}px</span>
            </div>
            <Slider
              value={[selected.style.size]}
              min={8}
              max={400}
              step={1}
              aria-label="Text size"
              onValueChange={([value]) => updateStyle({ size: value }, true)}
              onValueCommit={() => commitScene()}
            />

            <ColorField
              label="Color"
              value={selected.style.color}
              onChange={(color) => updateStyle({ color })}
            />

            <div className="flex gap-1">
              {ALIGN_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="xs"
                    variant={
                      selected.style.align === option.value
                        ? "secondary"
                        : "outline"
                    }
                    aria-label={option.label}
                    aria-pressed={selected.style.align === option.value}
                    onClick={() => updateStyle({ align: option.value })}
                  >
                    <Icon aria-hidden />
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Line height</span>
              <span>{selected.style.lineHeight.toFixed(2)}</span>
            </div>
            <Slider
              value={[selected.style.lineHeight]}
              min={0.8}
              max={2}
              step={0.05}
              aria-label="Line height"
              onValueChange={([value]) =>
                updateStyle({ lineHeight: value }, true)
              }
              onValueCommit={() => commitScene()}
            />

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Letter spacing</span>
              <span>{selected.style.letterSpacing.toFixed(2)}em</span>
            </div>
            <Slider
              value={[selected.style.letterSpacing]}
              min={-0.1}
              max={0.5}
              step={0.01}
              aria-label="Letter spacing"
              onValueChange={([value]) =>
                updateStyle({ letterSpacing: value }, true)
              }
              onValueCommit={() => commitScene()}
            />
          </section>

          <section className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>Background pill</Label>
              <Button
                type="button"
                size="xs"
                variant={selected.style.background ? "secondary" : "outline"}
                aria-pressed={selected.style.background !== null}
                onClick={() =>
                  updateStyle({
                    background: selected.style.background
                      ? null
                      : { color: "#ffffff", radius: 32, padding: 16 },
                  })
                }
              >
                {selected.style.background ? "On" : "Off"}
              </Button>
            </div>
            {selected.style.background ? (
              <>
                <ColorField
                  label="Pill color"
                  value={selected.style.background.color}
                  onChange={(color) =>
                    updateStyle({
                      background: { ...selected.style.background!, color },
                    })
                  }
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Radius</span>
                  <span>{selected.style.background.radius}px</span>
                </div>
                <Slider
                  value={[selected.style.background.radius]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Pill radius"
                  onValueChange={([value]) =>
                    updateStyle(
                      {
                        background: {
                          ...selected.style.background!,
                          radius: value,
                        },
                      },
                      true,
                    )
                  }
                  onValueCommit={() => commitScene()}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Padding</span>
                  <span>{selected.style.background.padding}px</span>
                </div>
                <Slider
                  value={[selected.style.background.padding]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Pill padding"
                  onValueChange={([value]) =>
                    updateStyle(
                      {
                        background: {
                          ...selected.style.background!,
                          padding: value,
                        },
                      },
                      true,
                    )
                  }
                  onValueCommit={() => commitScene()}
                />
              </>
            ) : null}
          </section>

          <section className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>Text shadow</Label>
              <Button
                type="button"
                size="xs"
                variant={selected.style.shadow ? "secondary" : "outline"}
                aria-pressed={selected.style.shadow !== null}
                onClick={() =>
                  updateStyle({
                    shadow: selected.style.shadow
                      ? null
                      : { color: "#000000", blur: 20, y: 4 },
                  })
                }
              >
                {selected.style.shadow ? "On" : "Off"}
              </Button>
            </div>
            {selected.style.shadow ? (
              <>
                <ColorField
                  label="Shadow color"
                  value={selected.style.shadow.color}
                  onChange={(color) =>
                    updateStyle({
                      shadow: { ...selected.style.shadow!, color },
                    })
                  }
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Blur</span>
                  <span>{selected.style.shadow.blur}px</span>
                </div>
                <Slider
                  value={[selected.style.shadow.blur]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Shadow blur"
                  onValueChange={([value]) =>
                    updateStyle(
                      {
                        shadow: {
                          ...selected.style.shadow!,
                          blur: value,
                        },
                      },
                      true,
                    )
                  }
                  onValueCommit={() => commitScene()}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Offset Y</span>
                  <span>{selected.style.shadow.y}px</span>
                </div>
                <Slider
                  value={[selected.style.shadow.y]}
                  min={-100}
                  max={100}
                  step={1}
                  aria-label="Shadow offset Y"
                  onValueChange={([value]) =>
                    updateStyle(
                      {
                        shadow: {
                          ...selected.style.shadow!,
                          y: value,
                        },
                      },
                      true,
                    )
                  }
                  onValueCommit={() => commitScene()}
                />
              </>
            ) : null}
          </section>
        </>
      ) : (
        <p className="text-muted-foreground border-t pt-3 text-[10px]">
          Select a text layer on the canvas or in Layers to edit its properties.
        </p>
      )}
    </div>
  );
}
