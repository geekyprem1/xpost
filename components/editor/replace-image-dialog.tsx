"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditorStore, useUiStore } from "@/lib/store";

export function ReplaceImageDialog() {
  const pending = useUiStore((state) => state.pendingImage);

  function apply(clearLayers: boolean) {
    const image = useUiStore.getState().pendingImage;
    if (!image) return;
    useEditorStore
      .getState()
      .setImage(image.element, image.url, image.name, image.blob, {
        clearLayers,
      });
    useUiStore.getState().resolvePendingImage();
  }

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) useUiStore.getState().cancelPendingImage();
      }}
    >
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle>New screenshot</DialogTitle>
        <DialogDescription>
          The previous screenshot still has text, annotations or redactions on
          the canvas. Keep them on the new screenshot, or start fresh?
        </DialogDescription>
        <p className="text-muted-foreground mt-2 text-xs">
          Starting fresh removes all layers and clears the layer history for
          this composition. Your background, frame and style settings stay.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => useUiStore.getState().cancelPendingImage()}
          >
            Cancel
          </Button>
          <Button variant="outline" onClick={() => apply(false)}>
            Keep layers
          </Button>
          <Button onClick={() => apply(true)}>
            Clear &amp; use new screenshot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
