import { describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import { LAYOUT_PRESETS, applyLayoutPreset, isPresetActive } from "./layout-presets";

describe("layout presets", () => {
  it("saare ids unique hain", () => {
    const ids = LAYOUT_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("applyLayoutPreset transform set karta hai aur tilt preserve karta hai", () => {
    const scene = createDefaultScene();
    scene.transform.tiltX = 12;
    const hero = LAYOUT_PRESETS.find((preset) => preset.id === "hero");
    expect(hero).toBeDefined();
    const next = applyLayoutPreset(scene, hero!);
    expect(next.transform.zoom).toBe(122);
    expect(next.transform.anchor).toBe("bottom-center");
    expect(next.transform.offset).toEqual({ x: 0, y: 60 });
    expect(next.transform.padding).toBe(90);
    expect(next.transform.tiltX).toBe(12);
    expect(scene.transform.zoom).toBe(100);
  });

  it("offsets copy hote hain (shared reference nahi)", () => {
    const scene = createDefaultScene();
    const preset = LAYOUT_PRESETS[0];
    const next = applyLayoutPreset(scene, preset);
    next.transform.offset.x = 999;
    expect(preset.transform.offset.x).toBe(0);
  });

  it("default scene center preset pe active hoti hai", () => {
    const scene = createDefaultScene();
    const center = LAYOUT_PRESETS.find((preset) => preset.id === "center")!;
    expect(isPresetActive(scene, center)).toBe(true);
    const left = LAYOUT_PRESETS.find((preset) => preset.id === "left")!;
    expect(isPresetActive(scene, left)).toBe(false);
  });

  it("zoom aur padding bounds ke andar hain", () => {
    for (const preset of LAYOUT_PRESETS) {
      expect(preset.transform.zoom, preset.id).toBeGreaterThanOrEqual(50);
      expect(preset.transform.zoom, preset.id).toBeLessThanOrEqual(200);
      expect(preset.transform.padding, preset.id).toBeGreaterThanOrEqual(0);
      expect(preset.transform.padding, preset.id).toBeLessThanOrEqual(200);
    }
  });
});
