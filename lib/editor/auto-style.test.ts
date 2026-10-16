import { describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import { autoSceneFromColors, buildGradientFromColors } from "./auto-style";

describe("buildGradientFromColors", () => {
  it("colors se stops luminance order mein banata hai", () => {
    const background = buildGradientFromColors(["#111111", "#888888", "#eeeeee"]);
    expect(background.kind).toBe("gradient");
    if (background.kind !== "gradient") return;
    expect(background.stops).toHaveLength(3);
    expect(background.stops[0]).toEqual({ color: "#111111", at: 0 });
    expect(background.stops[1]).toEqual({ color: "#888888", at: 0.5 });
    expect(background.stops[2]).toEqual({ color: "#eeeeee", at: 1 });
    expect(background.angle).toBe(45);
  });

  it("single color se flat gradient", () => {
    const background = buildGradientFromColors(["#ff00aa"]);
    expect(background.kind).toBe("gradient");
    if (background.kind !== "gradient") return;
    expect(background.stops).toEqual([
      { color: "#ff00aa", at: 0 },
      { color: "#ff00aa", at: 1 },
    ]);
  });

  it("empty colors pe fallback gradient", () => {
    const background = buildGradientFromColors([]);
    expect(background.kind).toBe("gradient");
    if (background.kind !== "gradient") return;
    expect(background.stops).toHaveLength(2);
  });

  it("4 se zyada colors truncate karta hai", () => {
    const background = buildGradientFromColors([
      "#000000",
      "#333333",
      "#666666",
      "#999999",
      "#cccccc",
    ]);
    if (background.kind !== "gradient") return;
    expect(background.stops).toHaveLength(4);
  });
});

describe("autoSceneFromColors", () => {
  it("background/padding/shadow/radius set karta hai", () => {
    const scene = createDefaultScene();
    const next = autoSceneFromColors(scene, ["#101020", "#ff00aa"]);
    expect(next.background.kind).toBe("gradient");
    expect(next.transform.padding).toBe(110);
    expect(next.layout.radius).toBe(28);
    expect(next.layout.shadow).toBe(55);
    expect(next.style.shadow).toBe("spread");
    expect(next.watermark).toBe(true);
    expect(scene.transform.padding).toBe(100);
  });

  it("zoom/anchor/offset/tilt ko touch nahi karta", () => {
    const scene = createDefaultScene();
    scene.transform.zoom = 150;
    scene.transform.anchor = "top-left";
    scene.transform.tiltX = 10;
    const next = autoSceneFromColors(scene, ["#101020", "#ff00aa"]);
    expect(next.transform.zoom).toBe(150);
    expect(next.transform.anchor).toBe("top-left");
    expect(next.transform.tiltX).toBe(10);
  });
});
