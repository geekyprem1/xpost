import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import { redoEditor, undoEditor, useEditorStore } from "./editor-store";

describe("editor store", () => {
  beforeEach(() => {
    useEditorStore.getState().replaceScene(createDefaultScene());
    useEditorStore.temporal.getState().clear();
  });

  it("setScene history entry banata hai aur undo/redo kaam karte hain", () => {
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    expect(useEditorStore.getState().scene.watermark).toBe(false);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    redoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("transient sets + commitScene = ek hi history entry (pre-gesture state)", () => {
    const set = (zoom: number) =>
      useEditorStore.getState().setScene(
        (scene) => ({ ...scene, transform: { ...scene.transform, zoom } }),
        { transient: true }
      );
    set(110);
    set(120);
    set(130);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);
    useEditorStore.getState().commitScene();
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);
    undoEditor();
    expect(useEditorStore.getState().scene.transform.zoom).toBe(100);
    redoEditor();
    expect(useEditorStore.getState().scene.transform.zoom).toBe(130);
  });

  it("gesture purani history preserve karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, style: { ...scene.style, corner: "round" } }));
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(2);

    useEditorStore
      .getState()
      .setScene(
        (scene) => ({ ...scene, transform: { ...scene.transform, zoom: 120 } }),
        { transient: true }
      );
    useEditorStore
      .getState()
      .setScene(
        (scene) => ({ ...scene, transform: { ...scene.transform, zoom: 130 } }),
        { transient: true }
      );
    useEditorStore.getState().commitScene();
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(3);

    undoEditor();
    expect(useEditorStore.getState().scene.transform.zoom).toBe(100);
    expect(useEditorStore.getState().scene.style.corner).toBe("round");

    undoEditor();
    expect(useEditorStore.getState().scene.style.corner).toBe("curved");
    expect(useEditorStore.getState().scene.watermark).toBe(false);

    redoEditor();
    redoEditor();
    expect(useEditorStore.getState().scene.transform.zoom).toBe(130);
  });

  it("history 50 entries pe cap hoti hai", () => {
    for (let i = 0; i < 60; i++) {
      useEditorStore
        .getState()
        .setScene((scene) => ({ ...scene, layout: { ...scene.layout, shadow: i % 101 } }));
    }
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(50);
  });

  it("replaceScene history clear karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    useEditorStore.getState().replaceScene(createDefaultScene());
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
  });

  const setZoom = (zoom: number) =>
    useEditorStore.getState().setScene(
      (scene) => ({ ...scene, transform: { ...scene.transform, zoom } }),
      { transient: true }
    );

  it("gesture wapas same value pe khatam ho toh entry nahi banti aur history resume hoti hai", () => {
    setZoom(140);
    setZoom(100);
    useEditorStore.getState().commitScene();
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);
    expect(useEditorStore.temporal.getState().isTracking).toBe(true);
  });

  it("commit miss ho jaye toh agla discrete edit gesture close kar deta hai", () => {
    setZoom(140);
    // no commitScene()
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    expect(useEditorStore.temporal.getState().isTracking).toBe(true);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(2);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    expect(useEditorStore.getState().scene.transform.zoom).toBe(140);
    undoEditor();
    expect(useEditorStore.getState().scene.transform.zoom).toBe(100);
  });

  it("gesture ke bina commitScene no-op hai aur redo stack nahi mitata", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    undoEditor();
    useEditorStore.getState().commitScene();
    useEditorStore.getState().setImageError("x");
    expect(useEditorStore.temporal.getState().futureStates.length).toBe(1);
    redoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("image changes history mein nahi jaate aur undo image ko desync nahi karta", () => {
    const element = { naturalWidth: 10, naturalHeight: 20 } as HTMLImageElement;
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    useEditorStore.getState().setImage(element, "blob:a", "a.png");
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    expect(useEditorStore.getState().scene.image?.path).toBe("local/a.png");
    expect(useEditorStore.getState().imageElement).toBe(element);
  });
});
