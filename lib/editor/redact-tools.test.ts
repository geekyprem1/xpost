import { describe, expect, it } from "vitest";
import { createDefaultScene, sceneSchema } from "@/lib/scene";
import { DEFAULT_REDACT_STYLE, buildRedactLayer } from "./redact-tools";

describe("redact tool", () => {
  it("drag se valid redact layer banti hai", () => {
    const layer = buildRedactLayer(
      { x: 0.6, y: 0.5 },
      { x: 0.2, y: 0.1 },
      { mode: "pixelate", strength: 75, color: "#000000" },
    )!;
    expect(layer.kind).toBe("redact");
    expect(layer).toMatchObject({
      x: 0.2,
      y: 0.1,
      w: expect.closeTo(0.4),
      h: expect.closeTo(0.4),
      mode: "pixelate",
      strength: 75,
      color: "#000000",
    });
    expect(
      sceneSchema.safeParse({
        ...createDefaultScene(),
        layers: [layer],
      }).success,
    ).toBe(true);
  });

  it("chhota drag layer nahi banata", () => {
    expect(
      buildRedactLayer(
        { x: 0.5, y: 0.5 },
        { x: 0.505, y: 0.505 },
        DEFAULT_REDACT_STYLE,
      ),
    ).toBeNull();
  });

  it("strength clamp hoti hai aur mode/color copy hote hain", () => {
    const layer = buildRedactLayer(
      { x: 0.1, y: 0.1 },
      { x: 0.4, y: 0.4 },
      { mode: "solid", strength: 250, color: "#ff0000" },
    )!;
    expect(layer.strength).toBe(100);
    expect(layer.mode).toBe("solid");
    expect(layer.color).toBe("#ff0000");
  });

  it("coordinates 0–1 ke andar clamp hoti hain", () => {
    const layer = buildRedactLayer(
      { x: -1, y: -1 },
      { x: 2, y: 2 },
      DEFAULT_REDACT_STYLE,
    )!;
    expect(layer).toMatchObject({ x: 0, y: 0, w: 1, h: 1 });
  });
});
