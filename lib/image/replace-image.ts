import { useEditorStore, useUiStore } from "@/lib/store";

export type LoadedImage = {
  element: HTMLImageElement;
  url: string;
  name: string;
  blob: Blob;
};

/**
 * A new screenshot with existing layers needs a decision: keep the previous
 * text/annotations/redactions or start fresh. No layers → apply immediately.
 */
export function requestImageReplace(image: LoadedImage): void {
  if (useEditorStore.getState().scene.layers.length > 0) {
    useUiStore.getState().setPendingImage(image);
    return;
  }
  useEditorStore
    .getState()
    .setImage(image.element, image.url, image.name, image.blob);
}
