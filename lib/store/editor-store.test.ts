import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultScene, MAX_LAYERS, type TextLayer } from "@/lib/scene";
import { redoEditor, undoEditor, useEditorStore } from "./editor-store";
import { useUiStore } from "./ui-store";

const textLayer = (
  id = "text-1",
  overrides: Partial<TextLayer> = {},
): TextLayer => ({
  id,
  kind: "text",
  visible: true,
  locked: false,
  x: 0.5,
  y: 0.5,
  width: 0.6,
  rotation: 0,
  text: "Screenshot ready",
  style: {
    font: "inter",
    weight: 600,
    size: 64,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.1,
    letterSpacing: 0,
    background: null,
    shadow: null,
  },
  ...overrides,
});

describe("editor store", () => {
  beforeEach(() => {
    useEditorStore.getState().replaceScene(createDefaultScene());
    useEditorStore.temporal.getState().clear();
    useUiStore.getState().selectLayer(null);
  });

  it("setScene history entry banata hai aur undo/redo kaam karte hain", () => {
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, watermark: false }));
    expect(useEditorStore.getState().scene.watermark).toBe(false);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    redoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("transient sets + commitScene = ek hi history entry (pre-gesture state)", () => {
    const set = (zoom: number) =>
      useEditorStore
        .getState()
        .setScene(
          (scene) => ({ ...scene, transform: { ...scene.transform, zoom } }),
          { transient: true },
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
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, watermark: false }));
    useEditorStore.getState().setScene((scene) => ({
      ...scene,
      style: { ...scene.style, corner: "round" },
    }));
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(2);

    useEditorStore
      .getState()
      .setScene(
        (scene) => ({ ...scene, transform: { ...scene.transform, zoom: 120 } }),
        { transient: true },
      );
    useEditorStore
      .getState()
      .setScene(
        (scene) => ({ ...scene, transform: { ...scene.transform, zoom: 130 } }),
        { transient: true },
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
      useEditorStore.getState().setScene((scene) => ({
        ...scene,
        layout: { ...scene.layout, shadow: i % 101 },
      }));
    }
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(50);
  });

  it("replaceScene history clear karta hai", () => {
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, watermark: false }));
    useEditorStore.getState().replaceScene(createDefaultScene());
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
  });

  const setZoom = (zoom: number) =>
    useEditorStore
      .getState()
      .setScene(
        (scene) => ({ ...scene, transform: { ...scene.transform, zoom } }),
        { transient: true },
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
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, watermark: false }));
    expect(useEditorStore.temporal.getState().isTracking).toBe(true);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(2);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    expect(useEditorStore.getState().scene.transform.zoom).toBe(140);
    undoEditor();
    expect(useEditorStore.getState().scene.transform.zoom).toBe(100);
  });

  it("gesture ke bina commitScene no-op hai aur redo stack nahi mitata", () => {
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, watermark: false }));
    undoEditor();
    useEditorStore.getState().commitScene();
    useEditorStore.getState().setImageError("x");
    expect(useEditorStore.temporal.getState().futureStates.length).toBe(1);
    redoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("image changes history mein nahi jaate aur undo image ko desync nahi karta", () => {
    const element = { naturalWidth: 10, naturalHeight: 20 } as HTMLImageElement;
    useEditorStore
      .getState()
      .setScene((scene) => ({ ...scene, watermark: false }));
    useEditorStore.getState().setImage(element, "blob:a", "a.png");
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);
    undoEditor();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
    expect(useEditorStore.getState().scene.image?.path).toBe("local/a.png");
    expect(useEditorStore.getState().imageElement).toBe(element);
  });

  it("setImage clearLayers ke saath layers aur layer history clear karta hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);
    const element = { naturalWidth: 10, naturalHeight: 20 } as HTMLImageElement;

    useEditorStore
      .getState()
      .setImage(element, "blob:clear", "clear.png", undefined, {
        clearLayers: true,
      });

    expect(useEditorStore.getState().scene.layers).toEqual([]);
    expect(useUiStore.getState().selectedLayerId).toBeNull();
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);
    expect(useEditorStore.getState().scene.image?.path).toBe("local/clear.png");
  });

  it("setImage default pe layers keep karta hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    const element = { naturalWidth: 10, naturalHeight: 20 } as HTMLImageElement;

    useEditorStore.getState().setImage(element, "blob:keep", "keep.png");

    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a"]);
    expect(useUiStore.getState().selectedLayerId).toBe("a");
  });

  it("addLayer history entry banata hai, select karta hai aur undo/redo chalta hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a"]);
    expect(useUiStore.getState().selectedLayerId).toBe("a");
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);

    undoEditor();
    expect(useEditorStore.getState().scene.layers).toEqual([]);
    redoEditor();
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a"]);
  });

  it("addLayer index pe insert karta hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    useEditorStore.getState().addLayer(textLayer("b"));
    useEditorStore.getState().addLayer(textLayer("middle"), 1);
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a", "middle", "b"]);
  });

  it("addLayer max layers ke baad no-op hai", () => {
    for (let index = 0; index < MAX_LAYERS; index++)
      useEditorStore.getState().addLayer(textLayer(`layer-${index}`));
    const scene = useEditorStore.getState().scene;

    useEditorStore.getState().addLayer(textLayer("overflow"));

    expect(useEditorStore.getState().scene).toBe(scene);
    expect(useEditorStore.getState().scene.layers.length).toBe(MAX_LAYERS);
  });

  it("updateLayer transient gesture ek hi history entry banata hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    useEditorStore.temporal.getState().clear();

    const move = (x: number) =>
      useEditorStore
        .getState()
        .updateLayer("a", (layer) => ({ ...layer, x }), { transient: true });
    move(0.2);
    move(0.35);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);

    useEditorStore.getState().commitScene();
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);

    undoEditor();
    const undone = useEditorStore.getState().scene.layers[0];
    expect(undone.kind === "text" ? undone.x : null).toBe(0.5);
    redoEditor();
    const redone = useEditorStore.getState().scene.layers[0];
    expect(redone.kind === "text" ? redone.x : null).toBe(0.35);
  });

  it("updateLayer missing id, no-op aur kind change ignore karta hai", () => {
    useEditorStore.getState().updateLayer("missing", (layer) => layer);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);

    useEditorStore.getState().addLayer(textLayer("a"));
    useEditorStore.temporal.getState().clear();

    useEditorStore.getState().updateLayer("a", (layer) => layer);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(0);

    const scene = useEditorStore.getState().scene;
    useEditorStore
      .getState()
      .updateLayer(
        "a",
        (layer) => ({ ...layer, kind: "redact" }) as unknown as typeof layer,
      );
    expect(useEditorStore.getState().scene).toBe(scene);
  });

  it("removeLayer layer hatata hai aur uska selection clear karta hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    useEditorStore.getState().addLayer(textLayer("b"));
    expect(useUiStore.getState().selectedLayerId).toBe("b");

    useEditorStore.getState().removeLayer("b");

    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a"]);
    expect(useUiStore.getState().selectedLayerId).toBeNull();

    undoEditor();
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a", "b"]);
  });

  it("reorderLayer z-order badalta hai aur undo se wapas aata hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    useEditorStore.getState().addLayer(textLayer("b"));
    useEditorStore.getState().addLayer(textLayer("c"));

    useEditorStore.getState().reorderLayer("a", 2);
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["b", "c", "a"]);

    undoEditor();
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("selection history ka hissa nahi hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    useEditorStore.getState().addLayer(textLayer("b"));
    useUiStore.getState().selectLayer("a");

    undoEditor();

    expect(useUiStore.getState().selectedLayerId).toBe("a");
    expect(
      useEditorStore.getState().scene.layers.map((layer) => layer.id),
    ).toEqual(["a"]);
  });

  it("replaceScene selection clear karta hai", () => {
    useEditorStore.getState().addLayer(textLayer("a"));
    expect(useUiStore.getState().selectedLayerId).toBe("a");

    useEditorStore.getState().replaceScene(createDefaultScene());

    expect(useUiStore.getState().selectedLayerId).toBeNull();
  });
});
