"use client";

import { useState } from "react";
import { Crop, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CROP_ASPECTS, type CropAspectId } from "@/lib/editor/crop";
import { detectAutoTrim } from "@/lib/image/auto-trim";
import { FULL_CROP, getImageCrop, isFullCrop } from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";

export function CropPanel({ onClose }: { onClose?: () => void }) {
  const hasImage = useEditorStore((state) => state.scene.image !== null);
  const scene = useEditorStore((state) => state.scene);
  const imageElement = useEditorStore((state) => state.imageElement);
  const setScene = useEditorStore((state) => state.setScene);
  const cropTool = useUiStore((state) => state.cropTool);
  const setCropTool = useUiStore((state) => state.setCropTool);
  const cropAspect = useUiStore((state) => state.cropAspect);
  const setCropAspect = useUiStore((state) => state.setCropAspect);
  const [message, setMessage] = useState<string | null>(null);

  const crop = getImageCrop(scene);

  function updateCrop(next: typeof crop) {
    setScene((current) =>
      current.image
        ? { ...current, image: { ...current.image, crop: next } }
        : current,
    );
  }

  function autoTrim() {
    if (!imageElement) return;
    const rect = detectAutoTrim(imageElement);
    if (!rect) {
      setMessage("No uniform border found — crop manually.");
      return;
    }
    updateCrop(rect);
    setMessage("Auto-trimmed to the content edges.");
  }

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Crop</span>
          <Button
            type="button"
            size="xs"
            variant={cropTool ? "secondary" : "outline"}
            aria-pressed={cropTool}
            disabled={!hasImage}
            onClick={() => {
              const next = !cropTool;
              setCropTool(next);
              if (next) onClose?.();
            }}
          >
            <Crop aria-hidden />
            {cropTool ? "Done" : "Crop mode"}
          </Button>
        </div>
        <p className="text-muted-foreground text-[10px]">
          {cropTool
            ? "Drag a corner handle inward. Undo restores the previous crop."
            : "Enter crop mode to trim the image; export follows the crop."}
        </p>
      </section>

      <section className="space-y-2 border-t pt-3">
        <span className="text-xs font-medium">Aspect lock</span>
        <div className="flex flex-wrap gap-1">
          {CROP_ASPECTS.map((aspect) => (
            <Button
              key={aspect.id}
              type="button"
              size="xs"
              variant={cropAspect === aspect.id ? "secondary" : "outline"}
              aria-pressed={cropAspect === aspect.id}
              onClick={() => setCropAspect(aspect.id as CropAspectId)}
            >
              {aspect.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex gap-1">
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!hasImage || isFullCrop(crop)}
            onClick={() => updateCrop(FULL_CROP)}
          >
            Reset crop
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!hasImage || !imageElement}
            onClick={autoTrim}
          >
            <Maximize2 aria-hidden />
            Auto-trim
          </Button>
        </div>
        {message ? (
          <p className="text-muted-foreground text-[10px]">{message}</p>
        ) : null}
        <p className="text-muted-foreground text-[10px]">
          Current: {Math.round(crop.w * 100)}% × {Math.round(crop.h * 100)}%
        </p>
      </section>
    </div>
  );
}
