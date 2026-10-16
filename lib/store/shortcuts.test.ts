import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import { useEditorStore } from "./editor-store";
import { handleUndoRedoKey, isEditableTarget } from "./shortcuts";

type KeyEventInput = Parameters<typeof handleUndoRedoKey>[0];

function keyEvent(overrides: Partial<KeyEventInput>): KeyEventInput {
  return {
    key: "z",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    preventDefault: () => undefined,
    ...overrides,
  };
}

describe("undo/redo shortcuts", () => {
  beforeEach(() => {
    useEditorStore.getState().replaceScene(createDefaultScene());
    useEditorStore.temporal.getState().clear();
  });

  it("Ctrl+Z undo karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    const preventDefault = vi.fn();

    const handled = handleUndoRedoKey(keyEvent({ ctrlKey: true, preventDefault }));

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(useEditorStore.getState().scene.watermark).toBe(true);
  });

  it("Ctrl+Shift+Z redo karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    handleUndoRedoKey(keyEvent({ ctrlKey: true }));
    expect(useEditorStore.getState().scene.watermark).toBe(true);

    handleUndoRedoKey(keyEvent({ ctrlKey: true, shiftKey: true }));
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("Cmd+Z (mac) bhi undo karta hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    const handled = handleUndoRedoKey(keyEvent({ metaKey: true }));
    expect(handled).toBe(true);
    expect(useEditorStore.getState().scene.watermark).toBe(true);
  });

  it("modifier ke bina ignore hota hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    const handled = handleUndoRedoKey(keyEvent({}));
    expect(handled).toBe(false);
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("editable target (input) pe shortcut ignore hota hai", () => {
    useEditorStore.getState().setScene((scene) => ({ ...scene, watermark: false }));
    const handled = handleUndoRedoKey(
      keyEvent({ ctrlKey: true, target: { tagName: "INPUT" } as unknown as EventTarget })
    );
    expect(handled).toBe(false);
    expect(useEditorStore.getState().scene.watermark).toBe(false);
  });

  it("isEditableTarget sahi detect karta hai", () => {
    expect(isEditableTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
    expect(
      isEditableTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)
    ).toBe(true);
    expect(isEditableTarget({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget({} as unknown as EventTarget)).toBe(false);
  });
});
