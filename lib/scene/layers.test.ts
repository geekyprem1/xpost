import { describe, expect, it } from "vitest";
import {
  duplicateLayer,
  getLayerBounds,
  layerKindLabel,
  moveLayerBy,
  withLayerBounds,
} from "./layers";
import type { AnnotationLayer, RedactLayer, TextLayer } from "./schema";

const textLayer = (): TextLayer => ({
  id: "text-1",
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

const redactLayer = (): RedactLayer => ({
  id: "redact-1",
  kind: "redact",
  visible: true,
  locked: false,
  x: 0.1,
  y: 0.2,
  w: 0.3,
  h: 0.1,
  mode: "blur",
  strength: 50,
  color: "#000000",
});

const arrowLayer = (): AnnotationLayer => ({
  id: "arrow-1",
  kind: "annotation",
  visible: true,
  locked: false,
  shape: {
    type: "arrow",
    from: { x: 0.2, y: 0.3 },
    to: { x: 0.6, y: 0.7 },
    bend: 0,
    head: true,
  },
  color: "#ff3355",
  stroke: 0.004,
});

const rectLayer = (): AnnotationLayer => ({
  ...arrowLayer(),
  id: "rect-1",
  shape: { type: "rect", x: 0.1, y: 0.1, w: 0.4, h: 0.3, radius: 0.02 },
});

const stepLayer = (): AnnotationLayer => ({
  ...arrowLayer(),
  id: "step-1",
  shape: { type: "step", x: 0.5, y: 0.5, size: 0.06, n: 1 },
});

describe("moveLayerBy", () => {
  it("text aur redact ko uske space mein move karta hai", () => {
    const text = moveLayerBy(textLayer(), 0.1, -0.2) as TextLayer;
    expect(text.x).toBeCloseTo(0.6);
    expect(text.y).toBeCloseTo(0.3);

    const redact = moveLayerBy(redactLayer(), 0.05, 0.05) as RedactLayer;
    expect(redact.x).toBeCloseTo(0.15);
    expect(redact.y).toBeCloseTo(0.25);
  });

  it("arrow ke dono points aur box shapes ko move karta hai", () => {
    const arrow = moveLayerBy(arrowLayer(), 0.1, 0.1) as AnnotationLayer;
    expect(arrow.shape.type === "arrow" && arrow.shape.from.x).toBeCloseTo(0.3);
    expect(arrow.shape.type === "arrow" && arrow.shape.to.y).toBeCloseTo(0.8);

    const rect = moveLayerBy(rectLayer(), -0.1, 0.2) as AnnotationLayer;
    expect(rect.shape.type === "rect" && rect.shape.x).toBeCloseTo(0);
    expect(rect.shape.type === "rect" && rect.shape.y).toBeCloseTo(0.3);
  });
});

describe("layer bounds", () => {
  it("har shape ke bounds nikalta hai", () => {
    expect(getLayerBounds(textLayer())).toBeNull();
    expect(getLayerBounds(redactLayer())).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.3,
      h: 0.1,
    });
    expect(getLayerBounds(rectLayer())).toEqual({
      x: 0.1,
      y: 0.1,
      w: 0.4,
      h: 0.3,
    });
    expect(getLayerBounds(stepLayer())).toEqual({
      x: 0.47,
      y: 0.47,
      w: 0.06,
      h: 0.06,
    });
    const arrowBounds = getLayerBounds(arrowLayer())!;
    expect(arrowBounds.x).toBeCloseTo(0.2);
    expect(arrowBounds.y).toBeCloseTo(0.3);
    expect(arrowBounds.w).toBeCloseTo(0.4);
    expect(arrowBounds.h).toBeCloseTo(0.4);
  });

  it("bounds se redact aur rect resize hota hai", () => {
    const redact = withLayerBounds(redactLayer(), {
      x: 0.2,
      y: 0.2,
      w: 0.5,
      h: 0.4,
    }) as RedactLayer;
    expect(redact).toMatchObject({ x: 0.2, y: 0.2, w: 0.5, h: 0.4 });

    const rect = withLayerBounds(rectLayer(), {
      x: 0.2,
      y: 0.2,
      w: 0.1,
      h: 0.2,
    }) as AnnotationLayer;
    expect(rect.shape).toMatchObject({ x: 0.2, y: 0.2, w: 0.1, h: 0.2 });
  });

  it("minimum size clamp hota hai aur text/arrow resize nahi hote", () => {
    const tiny = withLayerBounds(redactLayer(), {
      x: 0,
      y: 0,
      w: 0,
      h: -1,
    }) as RedactLayer;
    expect(tiny.w).toBeGreaterThan(0);
    expect(tiny.h).toBeGreaterThan(0);
    expect(withLayerBounds(textLayer(), { x: 0, y: 0, w: 1, h: 1 })).toBeNull();
    expect(
      withLayerBounds(arrowLayer(), { x: 0, y: 0, w: 1, h: 1 }),
    ).toBeNull();
  });

  it("step/emoji center aur size bounds se update karta hai", () => {
    const step = withLayerBounds(stepLayer(), {
      x: 0.2,
      y: 0.1,
      w: 0.2,
      h: 0.1,
    }) as AnnotationLayer;
    expect(step.shape.type === "step" && step.shape.x).toBeCloseTo(0.3);
    expect(step.shape.type === "step" && step.shape.y).toBeCloseTo(0.15);
    expect(step.shape.type === "step" && step.shape.size).toBeCloseTo(0.2);
  });
});

describe("duplicateLayer", () => {
  it("naya id, offset aur copy name deta hai", () => {
    const source = { ...textLayer(), name: "Headline" };
    const copy = duplicateLayer(source, 0.1, 0.1) as TextLayer;
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe("Headline copy");
    expect(copy.x).toBeCloseTo(0.6);
    expect(copy.y).toBeCloseTo(0.6);
  });

  it("layer labels kind/shape se aate hain", () => {
    expect(layerKindLabel(textLayer())).toBe("Text");
    expect(layerKindLabel(redactLayer())).toBe("Redact");
    expect(layerKindLabel(arrowLayer())).toBe("Arrow");
    expect(layerKindLabel(rectLayer())).toBe("Rectangle");
    expect(layerKindLabel(stepLayer())).toBe("Step");
  });
});
