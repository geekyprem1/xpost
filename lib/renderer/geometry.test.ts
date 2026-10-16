import { describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import {
  ANCHOR_POINTS,
  STYLE_PARAMS,
  boundingRect,
  computeCardLayout,
  computeOutputSize,
  cornerRadiusPx,
  fitSize,
  projectTiltedCorners,
  shadowParams,
} from "./geometry";

describe("computeOutputSize", () => {
  it("aspect ratio se height nikalta hai", () => {
    const scene = createDefaultScene();
    scene.canvas.aspect = "16:9";
    expect(computeOutputSize(scene, 1)).toEqual({ width: 1500, height: 844 });
    expect(computeOutputSize(scene, 2)).toEqual({ width: 3000, height: 1688 });
  });

  it("auto + image size se height nikalta hai", () => {
    const scene = createDefaultScene();
    expect(computeOutputSize(scene, 1, { width: 1600, height: 1000 })).toEqual({
      width: 1500,
      height: 938,
    });
  });

  it("auto + image nahi to 4:3 fallback", () => {
    expect(computeOutputSize(createDefaultScene(), 1)).toEqual({
      width: 1500,
      height: 1125,
    });
  });
});

describe("cornerRadiusPx", () => {
  it("corner presets radius ko scale karte hain", () => {
    const scene = createDefaultScene();
    scene.layout.radius = 30;
    scene.style.corner = "curved";
    expect(cornerRadiusPx(scene, 1)).toBe(30);
    scene.style.corner = "sharp";
    expect(cornerRadiusPx(scene, 1)).toBeCloseTo(9);
    scene.style.corner = "round";
    expect(cornerRadiusPx(scene, 2)).toBeCloseTo(102);
  });
});

describe("shadowParams", () => {
  it("none pe koi shadow nahi", () => {
    const scene = createDefaultScene();
    scene.style.shadow = "none";
    expect(shadowParams(scene, 1)).toEqual({ spreadPx: 0, alpha: 0, offsetYPx: 0 });
  });

  it("spread > hug hota hai aur intensity ke saath badhta hai", () => {
    const scene = createDefaultScene();
    scene.layout.shadow = 50;
    scene.style.shadow = "hug";
    const hug = shadowParams(scene, 1);
    scene.style.shadow = "spread";
    const spread = shadowParams(scene, 1);
    expect(spread.spreadPx).toBeGreaterThan(hug.spreadPx);
    scene.layout.shadow = 100;
    expect(shadowParams(scene, 1).spreadPx).toBeGreaterThan(spread.spreadPx);
  });
});

describe("computeCardLayout", () => {
  it("default scene mein image center pe hoti hai", () => {
    const scene = createDefaultScene();
    const layout = computeCardLayout(scene, 1);
    const centerX = layout.imageRect.x + layout.imageRect.width / 2;
    const centerY = layout.imageRect.y + layout.imageRect.height / 2;
    expect(centerX).toBeCloseTo(layout.output.width / 2);
    expect(centerY).toBeCloseTo(layout.output.height / 2);
  });

  it("zoom image size double karta hai", () => {
    const scene = createDefaultScene();
    const base = computeCardLayout(scene, 1);
    scene.transform.zoom = 200;
    const zoomed = computeCardLayout(scene, 1);
    expect(zoomed.imageRect.width).toBeCloseTo(base.imageRect.width * 2);
    expect(zoomed.imageRect.height).toBeCloseTo(base.imageRect.height * 2);
  });

  it("anchor aur offset image ko move karte hain", () => {
    const scene = createDefaultScene();
    scene.transform.anchor = "top-left";
    scene.transform.offset = { x: 10, y: 20 };
    const layout = computeCardLayout(scene, 1);
    const padding = scene.transform.padding;
    expect(layout.imageRect.x + layout.imageRect.width / 2).toBeCloseTo(padding + 10);
    expect(layout.imageRect.y + layout.imageRect.height / 2).toBeCloseTo(padding + 20);
  });

  it("glass style plate image se bada hota hai", () => {
    const scene = createDefaultScene();
    scene.style.preset = "glass-light";
    const layout = computeCardLayout(scene, 1);
    const pad = STYLE_PARAMS["glass-light"].padPx;
    expect(layout.plateRect.x).toBeCloseTo(layout.imageRect.x - pad);
    expect(layout.plateRect.width).toBeCloseTo(layout.imageRect.width + pad * 2);
  });

  it("image fit content area ke andar rehti hai", () => {
    const scene = createDefaultScene();
    const imageSize = { width: 1600, height: 1000 };
    const layout = computeCardLayout(scene, 1, imageSize);
    expect(layout.imageRect.width).toBeLessThanOrEqual(layout.contentRect.width + 0.01);
    expect(layout.imageRect.height).toBeLessThanOrEqual(layout.contentRect.height + 0.01);
    const aspect = layout.imageRect.width / layout.imageRect.height;
    expect(aspect).toBeCloseTo(1600 / 1000);
  });
});

describe("fitSize", () => {
  it("contain fit karta hai", () => {
    expect(fitSize({ width: 100, height: 100 }, { width: 200, height: 100 })).toEqual({
      width: 100,
      height: 50,
    });
    expect(fitSize({ width: 100, height: 100 }, { width: 50, height: 200 })).toEqual({
      width: 25,
      height: 100,
    });
  });
});

describe("tilt projection", () => {
  it("tilt 0 pe same rect milta hai", () => {
    const rect = { x: 100, y: 50, width: 200, height: 100 };
    const corners = projectTiltedCorners(rect, 0, 0, 1600);
    const bounds = boundingRect(corners);
    expect(bounds.x).toBeCloseTo(100);
    expect(bounds.y).toBeCloseTo(50);
    expect(bounds.width).toBeCloseTo(200);
    expect(bounds.height).toBeCloseTo(100);
  });

  it("tilt se corners move hote hain aur bounds positive rehta hai", () => {
    const rect = { x: 0, y: 0, width: 400, height: 300 };
    const corners = projectTiltedCorners(rect, 15, -20, 1600);
    const bounds = boundingRect(corners);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    expect(Math.abs(centerX - 200)).toBeLessThan(30);
    expect(Math.abs(centerY - 150)).toBeLessThan(30);
  });
});

describe("anchor points", () => {
  it("saare 9 anchor valid hain", () => {
    expect(Object.keys(ANCHOR_POINTS)).toHaveLength(9);
    expect(ANCHOR_POINTS.center).toEqual({ x: 0.5, y: 0.5 });
  });
});
