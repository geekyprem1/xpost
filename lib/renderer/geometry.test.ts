import { describe, expect, it } from "vitest";
import { createDefaultScene, croppedImageSize } from "@/lib/scene";
import {
  ANCHOR_POINTS,
  STYLE_PARAMS,
  boundingRect,
  canvasToDisplayedUv,
  canvasToSourceUv,
  computeCardLayout,
  computeOutputSize,
  cornerRadiusPx,
  fitSize,
  imageQuad,
  projectTiltedCorners,
  quadToUnit,
  shadowParams,
  sourceUvToCanvasPoint,
  unitToQuad,
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

describe("quad mapping", () => {
  const quad: [number, number][] = [
    [100, 50],
    [500, 50],
    [500, 350],
    [100, 350],
  ];

  it("unit square aur screen point ke beech round-trip karta hai", () => {
    const center = quadToUnit(quad, { x: 300, y: 200 });
    expect(center.x).toBeCloseTo(0.5);
    expect(center.y).toBeCloseTo(0.5);

    const point = unitToQuad(quad, { x: 0.25, y: 0.75 });
    expect(point.x).toBeCloseTo(200);
    expect(point.y).toBeCloseTo(275);
  });

  it("tilted quad pe bhi inverse exact hota hai", () => {
    const tilted = projectTiltedCorners(
      { x: 120, y: 60, width: 420, height: 280 },
      20,
      -15,
      1600,
    );
    for (const uv of [
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.8 },
    ]) {
      const point = unitToQuad(tilted, uv);
      const back = quadToUnit(tilted, point);
      expect(back.x).toBeCloseTo(uv.x, 10);
      expect(back.y).toBeCloseTo(uv.y, 10);
    }
  });
});

describe("canvas ↔ source UV mapping", () => {
  const source = { width: 1200, height: 800 };

  function roundTrip(scene: ReturnType<typeof createDefaultScene>) {
    const layout = computeCardLayout(scene, 1, source);
    for (const uv of [
      { x: 0.05, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.95, y: 0.9 },
    ]) {
      const point = sourceUvToCanvasPoint(uv, scene, layout, source, 1);
      const back = canvasToSourceUv(point, scene, layout, source, 1);
      expect(back.x).toBeCloseTo(uv.x, 10);
      expect(back.y).toBeCloseTo(uv.y, 10);
    }
    return layout;
  }

  it("screenshot frame pe source UV center image center pe map hota hai", () => {
    const scene = createDefaultScene();
    scene.frame.kind = "screenshot";
    const layout = roundTrip(scene);
    const center = sourceUvToCanvasPoint(
      { x: 0.5, y: 0.5 },
      scene,
      layout,
      source,
      1,
    );
    expect(center.x).toBeCloseTo(
      layout.imageRect.x + layout.imageRect.width / 2,
    );
    expect(center.y).toBeCloseTo(
      layout.imageRect.y + layout.imageRect.height / 2,
    );
  });

  it("tilt 20° pe inverse mapping exact hoti hai", () => {
    const scene = createDefaultScene();
    scene.frame.kind = "screenshot";
    scene.transform.tiltX = 20;
    scene.transform.tiltY = -10;
    roundTrip(scene);
  });

  it("device screen frames (cover) pe bhi mapping invertible hai", () => {
    const scene = createDefaultScene();
    scene.frame.kind = "iphone-18-pro";
    scene.transform.tiltX = 20;
    roundTrip(scene);
  });

  it("device screen frames (contain) pe bhi mapping invertible hai", () => {
    const scene = createDefaultScene();
    scene.frame.kind = "iphone-18-pro";
    scene.frame.fit = "contain";
    scene.transform.tiltY = 15;
    roundTrip(scene);
    expect(
      imageQuad(scene, computeCardLayout(scene, 1, source), 1),
    ).toHaveLength(4);
  });

  it("crop ke saath source UV mapping round-trip karti hai", () => {
    const scene = createDefaultScene();
    scene.frame.kind = "screenshot";
    scene.image = {
      path: "a.png",
      width: 1200,
      height: 800,
      crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
    };
    const sourceSize = { width: 1200, height: 800 };
    const cropped = croppedImageSize(scene, sourceSize)!;
    const layout = computeCardLayout(scene, 1, cropped);

    for (const uv of [
      { x: 0.3, y: 0.35 },
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.65 },
    ]) {
      const point = sourceUvToCanvasPoint(uv, scene, layout, sourceSize, 1);
      const back = canvasToSourceUv(point, scene, layout, sourceSize, 1);
      expect(back.x).toBeCloseTo(uv.x, 10);
      expect(back.y).toBeCloseTo(uv.y, 10);
    }

    const center = sourceUvToCanvasPoint(
      { x: 0.5, y: 0.5 },
      scene,
      layout,
      sourceSize,
      1,
    );
    expect(center.x).toBeCloseTo(
      layout.imageRect.x + layout.imageRect.width / 2,
    );
    expect(center.y).toBeCloseTo(
      layout.imageRect.y + layout.imageRect.height / 2,
    );
    const local = canvasToDisplayedUv(center, scene, layout, cropped, 1);
    expect(local.x).toBeCloseTo(0.5);
    expect(local.y).toBeCloseTo(0.5);
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
    expect(shadowParams(scene, 1)).toEqual({
      spreadPx: 0,
      alpha: 0,
      offsetYPx: 0,
    });
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
    expect(layout.imageRect.x + layout.imageRect.width / 2).toBeCloseTo(
      padding + 10,
    );
    expect(layout.imageRect.y + layout.imageRect.height / 2).toBeCloseTo(
      padding + 20,
    );
  });

  it("glass style plate image se bada hota hai", () => {
    const scene = createDefaultScene();
    scene.style.preset = "glass-light";
    const layout = computeCardLayout(scene, 1);
    const pad = STYLE_PARAMS["glass-light"].padPx;
    expect(layout.plateRect.x).toBeCloseTo(layout.imageRect.x - pad);
    expect(layout.plateRect.width).toBeCloseTo(
      layout.imageRect.width + pad * 2,
    );
  });

  it("image fit content area ke andar rehti hai", () => {
    const scene = createDefaultScene();
    const imageSize = { width: 1600, height: 1000 };
    const layout = computeCardLayout(scene, 1, imageSize);
    expect(layout.imageRect.width).toBeLessThanOrEqual(
      layout.contentRect.width + 0.01,
    );
    expect(layout.imageRect.height).toBeLessThanOrEqual(
      layout.contentRect.height + 0.01,
    );
    const aspect = layout.imageRect.width / layout.imageRect.height;
    expect(aspect).toBeCloseTo(1600 / 1000);
  });
});

describe("fitSize", () => {
  it("contain fit karta hai", () => {
    expect(
      fitSize({ width: 100, height: 100 }, { width: 200, height: 100 }),
    ).toEqual({
      width: 100,
      height: 50,
    });
    expect(
      fitSize({ width: 100, height: 100 }, { width: 50, height: 200 }),
    ).toEqual({
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
