import { describe, expect, it } from "vitest";
import { createDefaultScene, sceneSchema, type TextLayer } from "@/lib/scene";
import {
  TEXT_PRESETS,
  applyTextLayoutPreset,
  applyTextPreset,
  createTextLayer,
} from "./text-presets";

describe("text presets", () => {
  it("har preset se valid text layer banti hai", () => {
    for (const id of Object.keys(TEXT_PRESETS) as Array<
      keyof typeof TEXT_PRESETS
    >) {
      const layer = createTextLayer(id);
      expect(layer.kind).toBe("text");
      expect(layer.style).toEqual(TEXT_PRESETS[id].style);
      expect(layer.text).toBe(TEXT_PRESETS[id].defaultText);
      expect(
        sceneSchema.safeParse({
          ...createDefaultScene(),
          layers: [layer],
        }).success,
      ).toBe(true);
    }
  });

  it("unique ids deta hai aur overrides apply karta hai", () => {
    const first = createTextLayer("headline");
    const second = createTextLayer("headline");
    expect(first.id).not.toBe(second.id);

    const custom = createTextLayer("headline", {
      x: 0.2,
      y: 0.3,
      text: "Hello",
    });
    expect(custom).toMatchObject({ x: 0.2, y: 0.3, text: "Hello" });
  });

  it("applyTextPreset style aur width replace karta hai", () => {
    const layer = createTextLayer("headline", { text: "Keep me" });
    const result = applyTextPreset(layer, "badge");
    expect(result.text).toBe("Keep me");
    expect(result.width).toBe(TEXT_PRESETS.badge.width);
    expect(result.style).toEqual(TEXT_PRESETS.badge.style);
  });
});

describe("text layout presets", () => {
  it("naya text layer + screenshot transform ek scene mein deta hai", () => {
    const scene = createDefaultScene();
    const result = applyTextLayoutPreset(scene, "headline-top", null);
    const layer = result.scene.layers.find(
      (item): item is TextLayer => item.id === result.layerId,
    );

    expect(layer?.kind).toBe("text");
    expect(layer?.x).toBe(0.5);
    expect(layer?.y).toBe(0.13);
    expect(result.scene.transform.anchor).toBe("bottom-center");
    expect(result.scene.transform.zoom).toBe(85);
    expect(result.scene.layers).toHaveLength(1);
  });

  it("selected text layer ko add karne ke bajaye reposition karta hai", () => {
    const first = applyTextLayoutPreset(
      createDefaultScene(),
      "headline-top",
      null,
    );
    const scene = {
      ...first.scene,
      layers: first.scene.layers.map((layer) =>
        layer.kind === "text" ? { ...layer, text: "Edited" } : layer,
      ),
    };

    const second = applyTextLayoutPreset(scene, "headline-left", first.layerId);

    expect(second.scene.layers).toHaveLength(1);
    expect(second.layerId).toBe(first.layerId);
    const updated = second.scene.layers[0];
    expect(updated.kind === "text" ? updated.x : null).toBe(0.24);
    expect(updated.kind === "text" ? updated.text : null).toBe("Edited");
    expect(second.scene.transform.offset.x).toBe(190);
  });

  it("badge preset pill style ke saath aata hai", () => {
    const result = applyTextLayoutPreset(createDefaultScene(), "badge", null);
    const layer = result.scene.layers[0];
    expect(layer.kind === "text" && layer.style.background).not.toBeNull();
  });
});
