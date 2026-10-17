import { describe, expect, it } from "vitest";
import { autoTrimRect, type RgbaImage } from "./auto-trim";

function makeImage(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const [r, g, b] = pixel(x, y);
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("autoTrimRect", () => {
  it("uniform white border detect karke content crop deta hai", () => {
    const image = makeImage(10, 10, (x, y) =>
      x >= 3 && x <= 6 && y >= 3 && y <= 6 ? [20, 20, 30] : [255, 255, 255],
    );
    expect(autoTrimRect(image)).toEqual({
      x: 0.3,
      y: 0.3,
      w: 0.4,
      h: 0.4,
    });
  });

  it("non-uniform corners pe null", () => {
    const image = makeImage(10, 10, (x, y) =>
      x === 0 && y === 0 ? [200, 0, 0] : [255, 255, 255],
    );
    expect(autoTrimRect(image)).toBeNull();
  });

  it("poori image uniform ho to null", () => {
    expect(autoTrimRect(makeImage(8, 8, () => [240, 240, 240]))).toBeNull();
  });

  it("tolerance ke andar border variations ignore hoti hain", () => {
    const image = makeImage(12, 12, (x, y) => {
      if (x >= 4 && x <= 7 && y >= 4 && y <= 7) return [10, 10, 10];
      return x % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    });
    const rect = autoTrimRect(image, 8);
    expect(rect).not.toBeNull();
    expect(rect).toMatchObject({ x: 4 / 12, y: 4 / 12 });
  });

  it("chhoti image pe null", () => {
    expect(autoTrimRect(makeImage(2, 2, () => [255, 255, 255]))).toBeNull();
  });
});
