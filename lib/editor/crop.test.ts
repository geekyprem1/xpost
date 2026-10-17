import { describe, expect, it } from "vitest";
import { FULL_CROP } from "@/lib/scene";
import { cropAspectRatio, cropFromCorner, moveCrop } from "./crop";

const source = { width: 1600, height: 1000 };

describe("cropFromCorner", () => {
  it("free crop se/nw corners se banti hai", () => {
    expect(
      cropFromCorner(FULL_CROP, "se", { x: 0.5, y: 0.4 }, null, source),
    ).toMatchObject({ x: 0, y: 0, w: 0.5, h: 0.4 });

    expect(
      cropFromCorner(FULL_CROP, "nw", { x: 0.2, y: 0.3 }, null, source),
    ).toMatchObject({ x: 0.2, y: 0.3, w: 0.8, h: 0.7 });
  });

  it("aspect lock output ratio ko follow karta hai", () => {
    const square = cropFromCorner(
      FULL_CROP,
      "se",
      { x: 0.5, y: 0.5 },
      1,
      source,
    );
    expect(square.w).toBeCloseTo(0.5);
    expect(square.h).toBeCloseTo(0.8);
    expect(square.w * source.width).toBeCloseTo(square.h * source.height);

    const wide = cropFromCorner(
      FULL_CROP,
      "se",
      { x: 0.9, y: 0.9 },
      16 / 9,
      source,
    );
    expect(wide.w * source.width).toBeCloseTo(
      (wide.h * source.height * 16) / 9,
      4,
    );
  });

  it("crop ko image edges tak expand kiya ja sakta hai", () => {
    const start = { x: 0.2, y: 0.2, w: 0.5, h: 0.5 };
    const result = cropFromCorner(start, "nw", { x: 0, y: 0 }, null, source);
    expect(result).toMatchObject({ x: 0, y: 0, w: 0.7, h: 0.7 });

    const se = cropFromCorner(start, "se", { x: 1, y: 1 }, null, source);
    expect(se).toMatchObject({ x: 0.2, y: 0.2, w: 0.8, h: 0.8 });
  });

  it("minimum size clamp hota hai", () => {
    const result = cropFromCorner(
      FULL_CROP,
      "se",
      { x: 0.001, y: 0.001 },
      null,
      source,
    );
    expect(result.w).toBeGreaterThanOrEqual(0.02);
    expect(result.h).toBeGreaterThanOrEqual(0.02);
  });

  it("moveCrop rect ko move karta hai aur edges pe clamp karta hai", () => {
    const start = { x: 0.2, y: 0.3, w: 0.4, h: 0.3 };
    const moved = moveCrop(start, { x: 0.1, y: 0.2 });
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.5);
    expect(moved.w).toBeCloseTo(0.4);
    expect(moved.h).toBeCloseTo(0.3);
    expect(moveCrop(start, { x: -1, y: 1 })).toMatchObject({
      x: 0,
      y: 0.7,
      w: 0.4,
      h: 0.3,
    });
  });
});

describe("cropAspectRatio", () => {
  it("free null deta hai aur presets ratio", () => {
    expect(cropAspectRatio("free")).toBeNull();
    expect(cropAspectRatio("1:1")).toBe(1);
    expect(cropAspectRatio("4:5")).toBeCloseTo(0.8);
    expect(cropAspectRatio("16:9")).toBeCloseTo(16 / 9);
  });
});
