import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultScene, type RedactLayer } from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";
import { requestImageReplace } from "./replace-image";

const element = {
  naturalWidth: 800,
  naturalHeight: 600,
} as HTMLImageElement;
const blob = new Blob(["image"], { type: "image/png" });

const redactLayer = (): RedactLayer => ({
  id: "redact-1",
  kind: "redact",
  visible: true,
  locked: false,
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.2,
  mode: "solid",
  strength: 100,
  color: "#000000",
});

describe("requestImageReplace", () => {
  beforeEach(() => {
    useEditorStore.getState().replaceScene(createDefaultScene());
    useEditorStore.temporal.getState().clear();
    useUiStore.setState({ pendingImage: null });
    useUiStore.getState().setAnnotationTool(null);
    useUiStore.getState().setRedactTool(null);
    useUiStore.getState().setCropTool(false);
  });

  it("layers hone pe pending image rakhta hai, current image nahi badalta", () => {
    const scene = createDefaultScene();
    scene.layers = [redactLayer()];
    useEditorStore.getState().replaceScene(scene);

    requestImageReplace({
      element,
      url: "blob:pending",
      name: "new.png",
      blob,
    });

    expect(useUiStore.getState().pendingImage?.url).toBe("blob:pending");
    expect(useEditorStore.getState().imageElement).toBeNull();
    expect(useEditorStore.getState().scene.layers).toHaveLength(1);
    useUiStore.setState({ pendingImage: null });
  });

  it("layers na ho to image direct apply hoti hai", () => {
    requestImageReplace({
      element,
      url: "blob:direct",
      name: "new.png",
      blob,
    });

    expect(useUiStore.getState().pendingImage).toBeNull();
    expect(useEditorStore.getState().imageElement).toBe(element);
    expect(useEditorStore.getState().scene.image?.path).toBe("local/new.png");
  });
});
