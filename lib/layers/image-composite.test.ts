import { describe, expect, it } from "vitest";
import type { AnnotationLayer, RedactLayer, TextLayer } from "@/lib/scene";
import {
  imageSpaceCacheKey,
  imageSpaceLayers,
  pixelBlockSize,
  redactBlurPx,
} from "./image-composite";

const annotation = (id: string): AnnotationLayer => ({
  id,
  kind: "annotation",
  visible: true,
  locked: false,
  shape: {
    type: "arrow",
    from: { x: 0.1, y: 0.1 },
    to: { x: 0.8, y: 0.8 },
    bend: 0,
    head: true,
  },
  color: "#ff3355",
  stroke: 0.005,
});

const redactLayer = (id: string): RedactLayer => ({
  id,
  kind: "redact",
  visible: true,
  locked: false,
  x: 0.1,
  y: 0.15,
  w: 0.4,
  h: 0.2,
  mode: "pixelate",
  strength: 60,
  color: "#000000",
});

const textLayer = (id: string): TextLayer => ({
  id,
  kind: "text",
  visible: true,
  locked: false,
  x: 0.5,
  y: 0.5,
  width: 0.6,
  rotation: 0,
  text: "Hello",
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

describe("image composite cache", () => {
  it("sirf visible image-space layers rakhta hai", () => {
    const hidden = { ...annotation("hidden"), visible: false };
    const layers = [annotation("a"), textLayer("t"), hidden];
    expect(imageSpaceLayers(layers)).toEqual([annotation("a")]);
  });

  it("cache key annotations ke change pe badalta hai, text change pe nahi", () => {
    const first = annotation("a");
    const base = imageSpaceCacheKey([first, textLayer("t")]);

    expect(imageSpaceCacheKey([first, textLayer("t")])).toBe(base);
    expect(
      imageSpaceCacheKey([{ ...first, color: "#3b82f6" }, textLayer("t")]),
    ).not.toBe(base);
    expect(
      imageSpaceCacheKey([first, { ...textLayer("t"), text: "Changed" }]),
    ).toBe(base);
  });

  it("layer order key ka hissa hai", () => {
    expect(imageSpaceCacheKey([annotation("a"), annotation("b")])).not.toBe(
      imageSpaceCacheKey([annotation("b"), annotation("a")]),
    );
  });

  it("redact layer key ka hissa hai aur hidden redact ignore hota hai", () => {
    const base = imageSpaceCacheKey([redactLayer("r")]);
    expect(
      imageSpaceCacheKey([{ ...redactLayer("r"), strength: 90 }]),
    ).not.toBe(base);
    expect(imageSpaceLayers([{ ...redactLayer("r"), visible: false }])).toEqual(
      [],
    );
  });
});

describe("redaction strength helpers", () => {
  it("pixel block size strength ke saath badhta hai aur minimum 2 hai", () => {
    const weak = pixelBlockSize(0, 400, 200);
    const strong = pixelBlockSize(100, 400, 200);
    expect(weak).toBeGreaterThanOrEqual(2);
    expect(strong).toBeGreaterThan(weak);
    expect(pixelBlockSize(100, 40, 20)).toBeGreaterThanOrEqual(2);
  });

  it("blur radius strength ke saath badhta hai", () => {
    expect(redactBlurPx(10, 400, 200)).toBeGreaterThanOrEqual(1);
    expect(redactBlurPx(100, 400, 200)).toBeGreaterThan(
      redactBlurPx(10, 400, 200),
    );
  });
});
