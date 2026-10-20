import { describe, expect, it } from "vitest";
import {
  DEFAULT_WATERMARK_PLACEMENT,
  clampWatermarkOpacity,
  watermarkRect,
} from "./watermark-placement";

describe("watermarkRect", () => {
  it("default = purana bottom-right (36px height, 30px margin) — regression", () => {
    const rect = watermarkRect(1500, 1000, 1, 4, DEFAULT_WATERMARK_PLACEMENT);
    expect(rect).toEqual({
      x: 1500 - 30 - 144,
      y: 1000 - 30 - 36,
      width: 144,
      height: 36,
    });
  });

  it("har corner + scale ke saath proportional (preview = export)", () => {
    for (const scale of [0.5, 1, 2, 3]) {
      const tl = watermarkRect(1500 * scale, 1000 * scale, scale, 3, {
        corner: "top-left",
        size: 1,
        opacity: 1,
      });
      expect(tl.x).toBeCloseTo(30 * scale);
      expect(tl.y).toBeCloseTo(30 * scale);
      const tr = watermarkRect(1500 * scale, 1000 * scale, scale, 3, {
        corner: "top-right",
        size: 1,
        opacity: 1,
      });
      expect(tr.x + tr.width).toBeCloseTo(1500 * scale - 30 * scale);
      const bl = watermarkRect(1500 * scale, 1000 * scale, scale, 3, {
        corner: "bottom-left",
        size: 1,
        opacity: 1,
      });
      expect(bl.y + bl.height).toBeCloseTo(1000 * scale - 30 * scale);
      expect(bl.height / scale).toBeCloseTo(36);
    }
  });

  it("size 0.5–2 clamp; bahut chaudi badge canvas ke andar shrink", () => {
    expect(
      watermarkRect(1500, 1000, 1, 2, {
        corner: "top-left",
        size: 5,
        opacity: 1,
      }).height,
    ).toBe(72);
    expect(
      watermarkRect(1500, 1000, 1, 2, {
        corner: "top-left",
        size: 0.1,
        opacity: 1,
      }).height,
    ).toBe(18);
    const wide = watermarkRect(400, 400, 1, 20, {
      corner: "bottom-right",
      size: 2,
      opacity: 1,
    });
    expect(wide.width).toBe(340);
    expect(wide.height).toBeCloseTo(17);
    expect(wide.x).toBe(30);
  });

  it("opacity clamp", () => {
    expect(clampWatermarkOpacity(1.5)).toBe(1);
    expect(clampWatermarkOpacity(-1)).toBe(0);
    expect(clampWatermarkOpacity(Number.NaN)).toBe(0);
  });
});
