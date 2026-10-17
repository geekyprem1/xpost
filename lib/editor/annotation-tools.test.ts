import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOTATION_STYLE,
  buildAnnotationLayer,
  nextStepNumber,
} from "./annotation-tools";
import {
  createDefaultScene,
  sceneSchema,
  type AnnotationLayer,
} from "@/lib/scene";

const inScene = (layer: AnnotationLayer) => ({
  ...createDefaultScene(),
  layers: [layer],
});

describe("annotation tools", () => {
  it("arrow straight + curved bana sakte hain", () => {
    const straight = buildAnnotationLayer(
      "arrow",
      { x: 0.1, y: 0.2 },
      { x: 0.8, y: 0.7 },
      DEFAULT_ANNOTATION_STYLE,
      createDefaultScene(),
    )!;
    expect(straight.shape).toMatchObject({
      type: "arrow",
      bend: 0,
      head: true,
    });
    expect(sceneSchema.safeParse(inScene(straight)).success).toBe(true);

    const curved = buildAnnotationLayer(
      "arrow",
      { x: 0.1, y: 0.2 },
      { x: 0.8, y: 0.7 },
      { ...DEFAULT_ANNOTATION_STYLE, bend: 0.6, head: false },
      createDefaultScene(),
    )!;
    expect(curved.shape.type === "arrow" && curved.shape.bend).toBe(0.6);
    expect(curved.shape.type === "arrow" && curved.shape.head).toBe(false);
  });

  it("rect / ellipse / highlight drag se banti hain (reverse drag bhi)", () => {
    for (const tool of ["rect", "ellipse", "highlight"] as const) {
      const layer = buildAnnotationLayer(
        tool,
        { x: 0.8, y: 0.7 },
        { x: 0.2, y: 0.1 },
        { ...DEFAULT_ANNOTATION_STYLE, color: "#3b82f6" },
        createDefaultScene(),
      )!;
      expect(layer.color).toBe("#3b82f6");
      expect(layer.shape).toMatchObject({
        x: 0.2,
        y: 0.1,
        w: expect.closeTo(0.6),
        h: expect.closeTo(0.6),
      });
      expect(sceneSchema.safeParse(inScene(layer)).success).toBe(true);
    }
  });

  it("chhota drag annotation nahi banata", () => {
    for (const tool of ["arrow", "rect", "ellipse", "highlight"] as const) {
      expect(
        buildAnnotationLayer(
          tool,
          { x: 0.5, y: 0.5 },
          { x: 0.502, y: 0.502 },
          DEFAULT_ANNOTATION_STYLE,
          createDefaultScene(),
        ),
      ).toBeNull();
    }
  });

  it("step auto-increment hota hai aur emoji sticker banti hai", () => {
    const scene = createDefaultScene();
    const first = buildAnnotationLayer(
      "step",
      { x: 0.2, y: 0.2 },
      { x: 0.2, y: 0.2 },
      DEFAULT_ANNOTATION_STYLE,
      scene,
    )!;
    scene.layers = [first];
    const second = buildAnnotationLayer(
      "step",
      { x: 0.4, y: 0.4 },
      { x: 0.4, y: 0.4 },
      DEFAULT_ANNOTATION_STYLE,
      scene,
    )!;
    expect(nextStepNumber(scene.layers)).toBe(2);
    expect(first.shape.type === "step" && first.shape.n).toBe(1);
    expect(second.shape.type === "step" && second.shape.n).toBe(2);

    const emoji = buildAnnotationLayer(
      "emoji",
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { ...DEFAULT_ANNOTATION_STYLE, emoji: "🚀" },
      scene,
    )!;
    expect(emoji.shape).toMatchObject({ type: "emoji", char: "🚀" });
    expect(sceneSchema.safeParse(inScene(emoji)).success).toBe(true);
  });

  it("coordinates 0–1 mein clamp hoti hain aur stroke limit hoti hai", () => {
    const layer = buildAnnotationLayer(
      "rect",
      { x: -1, y: 2 },
      { x: 3, y: -4 },
      { ...DEFAULT_ANNOTATION_STYLE, stroke: 1 },
      createDefaultScene(),
    )!;
    expect(layer.shape).toMatchObject({ x: 0, y: 0, w: 1, h: 1 });
    expect(layer.stroke).toBe(0.05);
  });
});
