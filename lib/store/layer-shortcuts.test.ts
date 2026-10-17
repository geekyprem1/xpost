import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultScene,
  type RedactLayer,
  type TextLayer,
} from "@/lib/scene";
import { useEditorStore } from "./editor-store";
import {
  handleLayerShortcutKey,
  resolveLayerShortcut,
  type LayerShortcutEvent,
} from "./layer-shortcuts";
import { useUiStore } from "./ui-store";

const textLayer = (id = "text-1"): TextLayer => ({
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
});

const redactLayer = (id = "redact-1"): RedactLayer => ({
  id,
  kind: "redact",
  visible: true,
  locked: false,
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.1,
  mode: "pixelate",
  strength: 60,
  color: "#000000",
});

function key(
  value: string,
  overrides: Partial<LayerShortcutEvent> = {},
): LayerShortcutEvent {
  return {
    key: value,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target: null,
    preventDefault: () => {},
    ...overrides,
  };
}

describe("resolveLayerShortcut", () => {
  it("Delete aur Backspace selected layer hatate hain", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer()];
    expect(resolveLayerShortcut(key("Delete"), scene, "text-1")).toEqual({
      type: "remove",
      id: "text-1",
    });
    expect(resolveLayerShortcut(key("Backspace"), scene, "text-1")).toEqual({
      type: "remove",
      id: "text-1",
    });
  });

  it("locked layer ke edits ignore hote hain", () => {
    const scene = createDefaultScene();
    scene.layers = [{ ...textLayer(), locked: true }];
    expect(resolveLayerShortcut(key("Delete"), scene, "text-1")).toBeNull();
    expect(resolveLayerShortcut(key("ArrowRight"), scene, "text-1")).toBeNull();
  });

  it("Ctrl/Cmd+D duplicate karta hai (24 px offset, text output space)", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer()];
    const action = resolveLayerShortcut(
      key("d", { ctrlKey: true }),
      scene,
      "text-1",
    );
    expect(action).toEqual({
      type: "duplicate",
      id: "text-1",
      dx: 24 / 1500,
      dy: 24 / 1125,
    });
    expect(
      resolveLayerShortcut(key("d", { metaKey: true }), scene, "text-1"),
    ).toEqual(action);
    expect(
      resolveLayerShortcut(
        key("d", { ctrlKey: true, altKey: true }),
        scene,
        "text-1",
      ),
    ).toBeNull();
  });

  it("image-space layer nudge source pixels se normalize hota hai", () => {
    const scene = createDefaultScene();
    scene.image = { path: "local/a.png", width: 1000, height: 500 };
    scene.layers = [redactLayer()];
    expect(resolveLayerShortcut(key("ArrowLeft"), scene, "redact-1")).toEqual({
      type: "nudge",
      id: "redact-1",
      dx: -1 / 1000,
      dy: 0,
    });
    expect(
      resolveLayerShortcut(
        key("ArrowDown", { shiftKey: true }),
        scene,
        "redact-1",
      ),
    ).toEqual({ type: "nudge", id: "redact-1", dx: 0, dy: 10 / 500 });
  });

  it("text layer arrow nudge output dimensions se normalize hota hai", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer()];
    expect(
      resolveLayerShortcut(
        key("ArrowRight", { shiftKey: true }),
        scene,
        "text-1",
      ),
    ).toEqual({ type: "nudge", id: "text-1", dx: 10 / 1500, dy: 0 });
    expect(resolveLayerShortcut(key("ArrowUp"), scene, "text-1")).toEqual({
      type: "nudge",
      id: "text-1",
      dx: 0,
      dy: -1 / 1125,
    });
  });

  it("Ctrl+] / Ctrl+[ z-order badalte hain, boundaries pe null", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer("a"), textLayer("b")];
    expect(
      resolveLayerShortcut(key("]", { ctrlKey: true }), scene, "a"),
    ).toEqual({ type: "reorder", id: "a", toIndex: 1 });
    expect(
      resolveLayerShortcut(key("[", { ctrlKey: true }), scene, "b"),
    ).toEqual({ type: "reorder", id: "b", toIndex: 0 });
    expect(
      resolveLayerShortcut(key("]", { ctrlKey: true }), scene, "b"),
    ).toBeNull();
    expect(
      resolveLayerShortcut(key("[", { ctrlKey: true }), scene, "a"),
    ).toBeNull();
  });

  it("Escape deselect karta hai", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer()];
    expect(resolveLayerShortcut(key("Escape"), scene, "text-1")).toEqual({
      type: "deselect",
    });
    expect(resolveLayerShortcut(key("Escape"), scene, null)).toBeNull();
  });

  it("editable target pe koi shortcut nahi chalta", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer()];
    const input = { tagName: "INPUT" } as unknown as EventTarget;
    expect(
      resolveLayerShortcut(key("Delete", { target: input }), scene, "text-1"),
    ).toBeNull();
  });

  it("selection na ho to layer shortcuts nahi chalte", () => {
    const scene = createDefaultScene();
    scene.layers = [textLayer()];
    expect(resolveLayerShortcut(key("Delete"), scene, null)).toBeNull();
    expect(resolveLayerShortcut(key("ArrowRight"), scene, null)).toBeNull();
  });
});

describe("handleLayerShortcutKey", () => {
  beforeEach(() => {
    useEditorStore.getState().replaceScene(createDefaultScene());
    useEditorStore.temporal.getState().clear();
    useUiStore.getState().selectLayer(null);
  });

  it("Delete ko store pe apply karta hai", () => {
    useEditorStore.getState().addLayer(textLayer());
    const preventDefault = vi.fn();

    const handled = handleLayerShortcutKey(key("Delete", { preventDefault }));

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(useEditorStore.getState().scene.layers).toEqual([]);
    expect(useUiStore.getState().selectedLayerId).toBeNull();
  });

  it("duplicate layer ko select karta hai aur history record karta hai", () => {
    useEditorStore.getState().addLayer(textLayer());
    useEditorStore.temporal.getState().clear();

    const handled = handleLayerShortcutKey(key("d", { ctrlKey: true }));

    expect(handled).toBe(true);
    const layers = useEditorStore.getState().scene.layers;
    expect(layers.map((layer) => layer.kind)).toEqual(["text", "text"]);
    expect(layers[0].id).not.toBe(layers[1].id);
    expect(useUiStore.getState().selectedLayerId).toBe(layers[1].id);
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(1);
  });

  it("Escape selection clear karta hai", () => {
    useEditorStore.getState().addLayer(textLayer());
    expect(useUiStore.getState().selectedLayerId).toBe("text-1");

    expect(handleLayerShortcutKey(key("Escape"))).toBe(true);
    expect(useUiStore.getState().selectedLayerId).toBeNull();
  });
});
