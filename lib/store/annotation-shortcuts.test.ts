import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import {
  handleAnnotationShortcutKey,
  resolveAnnotationShortcut,
  type AnnotationShortcutEvent,
} from "./annotation-shortcuts";
import { useEditorStore } from "./editor-store";
import { useUiStore } from "./ui-store";

function key(
  value: string,
  overrides: Partial<AnnotationShortcutEvent> = {},
): AnnotationShortcutEvent {
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

describe("resolveAnnotationShortcut", () => {
  it("A/R/O/H/N/E tools activate karte hain", () => {
    const context = { toolActive: false, hasImage: true };
    expect(resolveAnnotationShortcut(key("a"), context)).toEqual({
      type: "tool",
      tool: "arrow",
    });
    expect(resolveAnnotationShortcut(key("r"), context)).toEqual({
      type: "tool",
      tool: "rect",
    });
    expect(resolveAnnotationShortcut(key("o"), context)).toEqual({
      type: "tool",
      tool: "ellipse",
    });
    expect(resolveAnnotationShortcut(key("h"), context)).toEqual({
      type: "tool",
      tool: "highlight",
    });
    expect(resolveAnnotationShortcut(key("n"), context)).toEqual({
      type: "tool",
      tool: "step",
    });
    expect(resolveAnnotationShortcut(key("e"), context)).toEqual({
      type: "tool",
      tool: "emoji",
    });
  });

  it("B redact shortcut hai aur T text", () => {
    expect(
      resolveAnnotationShortcut(key("b"), {
        toolActive: false,
        hasImage: true,
      }),
    ).toEqual({ type: "redact" });
    expect(
      resolveAnnotationShortcut(key("t"), {
        toolActive: false,
        hasImage: true,
      }),
    ).toEqual({ type: "text" });
  });

  it("Esc active tool exit karta hai", () => {
    expect(
      resolveAnnotationShortcut(key("Escape"), {
        toolActive: true,
        hasImage: true,
      }),
    ).toEqual({ type: "exit" });
    expect(
      resolveAnnotationShortcut(key("Escape"), {
        toolActive: false,
        hasImage: true,
      }),
    ).toBeNull();
  });

  it("modifier keys, editable targets aur image ke bina ignore hota hai", () => {
    const context = { toolActive: false, hasImage: true };
    expect(
      resolveAnnotationShortcut(key("a", { ctrlKey: true }), context),
    ).toBeNull();
    const input = { tagName: "INPUT" } as unknown as EventTarget;
    expect(
      resolveAnnotationShortcut(key("a", { target: input }), context),
    ).toBeNull();
    expect(
      resolveAnnotationShortcut(key("a"), {
        toolActive: false,
        hasImage: false,
      }),
    ).toBeNull();
  });
});

describe("handleAnnotationShortcutKey", () => {
  beforeEach(() => {
    useEditorStore.getState().replaceScene(createDefaultScene());
    useEditorStore.temporal.getState().clear();
    useUiStore.getState().setAnnotationTool(null);
    useUiStore.getState().setRedactTool(null);
  });

  it("tool activate aur same key se toggle off karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({
      ...scene,
      image: { path: "x", width: 10, height: 10 },
    }));
    expect(handleAnnotationShortcutKey(key("a"))).toBe(true);
    expect(useUiStore.getState().annotationTool).toBe("arrow");
    expect(handleAnnotationShortcutKey(key("a"))).toBe(true);
    expect(useUiStore.getState().annotationTool).toBeNull();
  });

  it("Esc tool exit karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({
      ...scene,
      image: { path: "x", width: 10, height: 10 },
    }));
    useUiStore.getState().setAnnotationTool("rect");
    expect(handleAnnotationShortcutKey(key("Escape"))).toBe(true);
    expect(useUiStore.getState().annotationTool).toBeNull();
  });

  it("B blur redact tool toggle karta hai aur Esc exit karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({
      ...scene,
      image: { path: "x", width: 10, height: 10 },
    }));

    expect(handleAnnotationShortcutKey(key("b"))).toBe(true);
    expect(useUiStore.getState().redactTool).toBe("blur");
    expect(useUiStore.getState().redactStyle.mode).toBe("blur");
    expect(useUiStore.getState().annotationTool).toBeNull();

    expect(handleAnnotationShortcutKey(key("Escape"))).toBe(true);
    expect(useUiStore.getState().redactTool).toBeNull();
  });

  it("T se headline text layer add hoti hai", () => {
    useEditorStore.getState().setScene((scene) => ({
      ...scene,
      image: { path: "x", width: 10, height: 10 },
    }));
    useEditorStore.temporal.getState().clear();
    const preventDefault = vi.fn();

    expect(handleAnnotationShortcutKey(key("t", { preventDefault }))).toBe(
      true,
    );

    expect(preventDefault).toHaveBeenCalledOnce();
    const layers = useEditorStore.getState().scene.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].kind).toBe("text");
    expect(useUiStore.getState().selectedLayerId).toBe(layers[0].id);
  });
});
