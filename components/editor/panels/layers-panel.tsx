"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { layerKindLabel, type Layer } from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";

function defaultName(layer: Layer, layers: Layer[]): string {
  const label = layerKindLabel(layer);
  const sameKind = layers.filter((item) => layerKindLabel(item) === label);
  return `${label} ${sameKind.indexOf(layer) + 1}`;
}

export function LayersPanel() {
  const layers = useEditorStore((state) => state.scene.layers);
  const selectedLayerId = useUiStore((state) => state.selectedLayerId);
  const selectLayer = useUiStore((state) => state.selectLayer);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const removeLayer = useEditorStore((state) => state.removeLayer);
  const reorderLayer = useEditorStore((state) => state.reorderLayer);
  const commitScene = useEditorStore((state) => state.commitScene);

  if (layers.length === 0) {
    return (
      <div className="space-y-1">
        <span className="text-xs font-medium">Layers</span>
        <p className="text-muted-foreground text-xs">
          No layers yet. Text, annotations and redactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Layers</span>
        <span className="text-muted-foreground text-[10px]">
          {layers.length} / 50
        </span>
      </div>
      <ul className="space-y-1.5" aria-label="Layers">
        {[...layers].reverse().map((layer) => {
          const index = layers.indexOf(layer);
          const name = layer.name || defaultName(layer, layers);
          const selected = layer.id === selectedLayerId;
          const canMoveForward = index < layers.length - 1;
          const canMoveBackward = index > 0;

          return (
            <li
              key={layer.id}
              className={`rounded-lg border p-2 transition-colors ${
                selected ? "border-primary/60 bg-accent/40" : ""
              }`}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => selectLayer(layer.id)}
                  aria-pressed={selected}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-xs font-medium">
                    {name}
                  </span>
                  <span className="text-muted-foreground block text-[10px]">
                    {layerKindLabel(layer)}
                    {layer.visible ? "" : " · hidden"}
                  </span>
                </button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`${layer.visible ? "Hide" : "Show"} ${name}`}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={() =>
                    updateLayer(layer.id, (current) => ({
                      ...current,
                      visible: !current.visible,
                    }))
                  }
                >
                  {layer.visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`${layer.locked ? "Unlock" : "Lock"} ${name}`}
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() =>
                    updateLayer(layer.id, (current) => ({
                      ...current,
                      locked: !current.locked,
                    }))
                  }
                >
                  {layer.locked ? (
                    <Lock aria-hidden />
                  ) : (
                    <LockOpen aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Bring ${name} forward`}
                  title="Bring forward"
                  disabled={!canMoveForward}
                  onClick={() => reorderLayer(layer.id, index + 1)}
                >
                  <ChevronUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Send ${name} backward`}
                  title="Send backward"
                  disabled={!canMoveBackward}
                  onClick={() => reorderLayer(layer.id, index - 1)}
                >
                  <ChevronDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Delete ${name}`}
                  title="Delete layer"
                  disabled={layer.locked}
                  onClick={() => removeLayer(layer.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <Input
                value={layer.name ?? ""}
                placeholder={name}
                aria-label={`Rename ${name}`}
                maxLength={80}
                disabled={layer.locked}
                className="mt-1.5 h-7 text-xs"
                onChange={(event) =>
                  updateLayer(
                    layer.id,
                    (current) => ({
                      ...current,
                      name: event.target.value || undefined,
                    }),
                    { transient: true },
                  )
                }
                onBlur={() => commitScene()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-[10px]">
        Delete · Ctrl+D duplicate · arrows nudge · Ctrl+[ / ] layer order
      </p>
    </div>
  );
}
