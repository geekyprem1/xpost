import { describe, expect, it } from "vitest";
import { applyStyleSnapshot, captureStyle } from "@/lib/brand/brand-kit";
import { applyLook, LOOKS } from "@/lib/looks/looks";
import {
  computeCardLayout,
  computeExportSize,
  computeOutputSize,
  exportRenderScale,
} from "@/lib/renderer/geometry";
import { createDefaultScene, sceneSchema } from "@/lib/scene";
import {
  PLATFORM_SIZES,
  applyCustomSize,
  applyPlatformSize,
  parseCanvasDimension,
  setCanvasAspect,
} from "./platform-sizes";

const IMAGE = { width: 1440, height: 900 };

describe("platform sizes (PS-1, PS-2)", () => {
  it("Product Hunt 1× = exactly 1270 × 760", () => {
    const scene = applyPlatformSize(createDefaultScene(), "product-hunt");
    expect(computeExportSize(scene, 1, IMAGE)).toEqual({
      width: 1270,
      height: 760,
    });
  });

  it("har preset: 1× / 2× / 3× exact multiples, aur renderer layout same pixels deta hai", () => {
    for (const preset of PLATFORM_SIZES) {
      const scene = applyPlatformSize(createDefaultScene(), preset.id);
      expect(sceneSchema.safeParse(scene).success).toBe(true);
      for (const scale of [1, 2, 3]) {
        const expected = {
          width: preset.width * scale,
          height: preset.height * scale,
        };
        const exported = computeExportSize(scene, scale, IMAGE);
        expect(exported, `${preset.id} @${scale}×`).toEqual(expected);
        // Export path renders with scale = output.width / baseWidth — renderer
        // ka apna layout bhi wahi canvas size nikaale (warna stretch / crop).
        const renderScale = exportRenderScale(scene, scale);
        expect(renderScale).toBeCloseTo(
          exported.width / scene.canvas.baseWidth,
        );
        expect(
          computeCardLayout(scene, renderScale, IMAGE).output,
          `${preset.id} layout @${scale}×`,
        ).toEqual(expected);
      }
    }
  });

  it("preview aspect exact size ka ratio follow karta hai", () => {
    const scene = applyPlatformSize(createDefaultScene(), "ig-story");
    const design = computeOutputSize(scene, 1, IMAGE);
    expect(design.width).toBe(1500);
    expect(design.width / design.height).toBeCloseTo(1080 / 1920, 2);
  });

  it("bina size ke purana behaviour same (regression)", () => {
    const scene = setCanvasAspect(createDefaultScene(), "16:9");
    expect(computeExportSize(scene, 2, IMAGE)).toEqual(
      computeOutputSize(scene, 2, IMAGE),
    );
    expect(computeExportSize(scene, 1, IMAGE)).toEqual({
      width: 1500,
      height: 844,
    });
    expect(exportRenderScale(scene, 3)).toBe(3);
  });
});

describe("custom size (PS-3)", () => {
  it("200–4096 validate; out-of-range / NaN scene nahi badalte", () => {
    expect(parseCanvasDimension("1200")).toBe(1200);
    expect(parseCanvasDimension(" 640.4 ")).toBe(640);
    expect(parseCanvasDimension("199")).toBeNull();
    expect(parseCanvasDimension("4097")).toBeNull();
    expect(parseCanvasDimension("abc")).toBeNull();

    const scene = createDefaultScene();
    expect(applyCustomSize(scene, 100, 500)).toBe(scene);
    const custom = applyCustomSize(scene, 1000, 500);
    expect(custom.canvas.size).toEqual({ width: 1000, height: 500 });
    expect(computeExportSize(custom, 2, IMAGE)).toEqual({
      width: 2000,
      height: 1000,
    });
  });

  it("schema size limits enforce karta hai", () => {
    const scene = createDefaultScene();
    expect(
      sceneSchema.safeParse({
        ...scene,
        canvas: { ...scene.canvas, size: { width: 5000, height: 500 } },
      }).success,
    ).toBe(false);
    expect(
      sceneSchema.safeParse({
        ...scene,
        canvas: { ...scene.canvas, size: { width: 500.5, height: 500 } },
      }).success,
    ).toBe(false);
  });
});

describe("aspect / looks / saved styles ke saath", () => {
  it("aspect chunne pe exact size hat jaata hai", () => {
    const sized = applyPlatformSize(createDefaultScene(), "linkedin");
    const next = setCanvasAspect(sized, "1:1");
    expect(next.canvas.size).toBeUndefined();
    expect("size" in next.canvas).toBe(false);
    expect(next.canvas.aspect).toBe("1:1");
  });

  it("look apply karne pe size clear (look ka apna aspect)", () => {
    const sized = applyPlatformSize(createDefaultScene(), "youtube");
    const next = applyLook(sized, LOOKS[0]);
    expect(next.canvas.size).toBeUndefined();
    expect(next.canvas.aspect).toBe(LOOKS[0].aspect);
  });

  it("saved style platform size yaad rakhta hai; bina size wala style size hata deta hai", () => {
    const sized = applyPlatformSize(createDefaultScene(), "og-image");
    const withSize = captureStyle(sized);
    const plain = captureStyle(createDefaultScene());
    expect(
      applyStyleSnapshot(createDefaultScene(), withSize).canvas.size,
    ).toEqual(sized.canvas.size);
    expect(applyStyleSnapshot(sized, plain).canvas.size).toBeUndefined();
  });
});
