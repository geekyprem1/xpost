"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { ScreenCapture } from "@/components/editor/screen-capture";
import { Button } from "@/components/ui/button";
import { useImageActions } from "@/lib/image/use-image-actions";
import { useEditorStore } from "@/lib/store";

export function V2ImagePanel() {
  const image = useEditorStore((state) => state.scene.image);
  const { openPicker, removeImage } = useImageActions();

  return (
    <div className="space-y-4">
      <div className="border-border bg-muted/30 rounded-xl border border-dashed p-4 text-center">
        <ImagePlus
          className="text-muted-foreground mx-auto size-6"
          aria-hidden
        />
        <p className="mt-2 text-sm font-medium">
          {image ? "Replace screenshot" : "Add a screenshot"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          PNG, JPG or WebP · up to 10 MB
        </p>
        <Button className="mt-3 w-full" type="button" onClick={openPicker}>
          <ImagePlus aria-hidden />
          {image ? "Choose another image" : "Upload image"}
        </Button>
      </div>

      <div className="border-border bg-card flex items-center justify-between rounded-xl border px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium">Capture a screen</p>
          <p className="text-muted-foreground text-[11px]">
            Select a region from any window.
          </p>
        </div>
        <ScreenCapture />
      </div>

      {image ? (
        <div className="border-border bg-card flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">
              {image.path.replace(/^local\//, "")}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {image.width} × {image.height} px
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Remove image"
            title="Remove image"
            onClick={removeImage}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ) : null}

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Tip: drag & drop an image, or paste with{" "}
        <kbd className="border-border bg-muted rounded border px-1 py-0.5 text-[10px]">
          Ctrl / ⌘ V
        </kbd>{" "}
        anywhere on the canvas.
      </p>
    </div>
  );
}
