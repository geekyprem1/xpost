import { describe, expect, it } from "vitest";
import { extractDominantColors } from "./dominant-colors";

function makePixels(
  regions: { color: [number, number, number]; pixels: number }[],
  alpha = 255
): Uint8ClampedArray {
  const total = regions.reduce((sum, region) => sum + region.pixels, 0);
  const data = new Uint8ClampedArray(total * 4);
  let offset = 0;
  for (const region of regions) {
    for (let i = 0; i < region.pixels; i++) {
      data[offset] = region.color[0];
      data[offset + 1] = region.color[1];
      data[offset + 2] = region.color[2];
      data[offset + 3] = alpha;
      offset += 4;
    }
  }
  return data;
}

describe("extractDominantColors", () => {
  it("frequency ke hisaab se colors deta hai", () => {
    const data = makePixels([
      { color: [255, 0, 0], pixels: 100 },
      { color: [0, 0, 255], pixels: 60 },
      { color: [0, 255, 0], pixels: 30 },
    ]);
    const colors = extractDominantColors({ data, width: 10, height: 19 }, 3);
    expect(colors).toHaveLength(3);
    expect(colors).toContain("#ff0000");
    expect(colors).toContain("#0000ff");
    expect(colors).toContain("#00ff00");
  });

  it("count limit respect karta hai", () => {
    const data = makePixels([
      { color: [255, 0, 0], pixels: 50 },
      { color: [0, 255, 0], pixels: 40 },
      { color: [0, 0, 255], pixels: 30 },
    ]);
    expect(extractDominantColors({ data, width: 10, height: 12 }, 2)).toHaveLength(2);
  });

  it("transparent pixels skip karta hai", () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 0,
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);
    expect(extractDominantColors({ data, width: 2, height: 2 })).toEqual(["#0000ff"]);
  });

  it("similar colors ko merge karta hai", () => {
    const data = makePixels([
      { color: [100, 100, 100], pixels: 40 },
      { color: [104, 100, 100], pixels: 40 },
    ]);
    expect(extractDominantColors({ data, width: 10, height: 8 }, 4)).toHaveLength(1);
  });

  it("empty data pe empty array", () => {
    expect(extractDominantColors({ data: new Uint8ClampedArray(0), width: 0, height: 0 })).toEqual([]);
  });

  it("luminance order mein sort karta hai (dark pehle)", () => {
    const data = makePixels([
      { color: [240, 240, 240], pixels: 50 },
      { color: [20, 20, 20], pixels: 40 },
    ]);
    expect(extractDominantColors({ data, width: 10, height: 9 }, 2)).toEqual([
      "#141414",
      "#f0f0f0",
    ]);
  });
});
