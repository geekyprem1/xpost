import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./defaults";
import { sceneSchema } from "./schema";
import type { Scene, SceneBackground } from "./schema";

describe("scene schema", () => {
  it("default scene valid hoti hai", () => {
    expect(sceneSchema.safeParse(createDefaultScene()).success).toBe(true);
  });

  it("range ke bahar zoom reject hota hai", () => {
    const scene = createDefaultScene();
    scene.transform.zoom = 500;
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  });

  it("saare background kinds validate hote hain", () => {
    const backgrounds: SceneBackground[] = [
      { kind: "solid", color: "#000000" },
      {
        kind: "gradient",
        stops: [
          { color: "#000000", at: 0 },
          { color: "#ffffff", at: 1 },
        ],
        angle: 90,
      },
      { kind: "mesh", presetId: "aurora" },
      {
        kind: "image",
        src: { provider: "pexels", id: "1", url: "https://example.com/a.jpg" },
        blur: 20,
      },
      {
        kind: "video",
        src: {
          provider: "curated",
          id: "2",
          url: "https://example.com/b.mp4",
          credit: { name: "Someone", url: "https://pexels.com/@someone" },
        },
      },
    ];
    for (const background of backgrounds) {
      const scene = createDefaultScene();
      scene.background = background;
      expect(sceneSchema.safeParse(scene).success).toBe(true);
    }
  });

  it("unknown background kind reject hota hai", () => {
    const scene = createDefaultScene();
    scene.background = { kind: "nope" } as unknown as SceneBackground;
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  });

  it("galat overlay reject hota hai", () => {
    const scene = createDefaultScene();
    scene.sunlight.overlay = "wrong-overlay" as unknown as Scene["sunlight"]["overlay"];
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  });
});
