import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./defaults";
import { MAX_LAYERS, MAX_TEXT_LENGTH, sceneSchema } from "./schema";
import type {
  AnnotationLayer,
  RedactLayer,
  Scene,
  SceneBackground,
  TextLayer,
} from "./schema";

const textLayer = (overrides: Partial<TextLayer> = {}): TextLayer => ({
  id: "text-1",
  kind: "text",
  visible: true,
  locked: false,
  x: 0.5,
  y: 0.5,
  width: 0.6,
  rotation: 0,
  text: "Screenshot ready",
  style: {
    font: "inter",
    weight: 600,
    size: 64,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.1,
    letterSpacing: 0,
    background: null,
    shadow: null,
  },
  ...overrides,
});

const annotationLayer = (shape: AnnotationLayer["shape"]): AnnotationLayer => ({
  id: "annotation-1",
  kind: "annotation",
  visible: true,
  locked: false,
  shape,
  color: "#ff3355",
  stroke: 0.004,
});

const redactLayer = (overrides: Partial<RedactLayer> = {}): RedactLayer => ({
  id: "redact-1",
  kind: "redact",
  visible: true,
  locked: false,
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.1,
  mode: "pixelate",
  strength: 60,
  color: "#000000",
  ...overrides,
});

const withLayers = (layers: Scene["layers"]): Scene => ({
  ...createDefaultScene(),
  layers,
});

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
    scene.sunlight.overlay =
      "wrong-overlay" as unknown as Scene["sunlight"]["overlay"];
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  });

  it("default scene v2 hai aur koi layer nahi", () => {
    const scene = createDefaultScene();
    expect(scene.version).toBe(2);
    expect(scene.layers).toEqual([]);
    expect(sceneSchema.safeParse(scene).success).toBe(true);
  });

  it("text layer valid hota hai aur text limit enforce hoti hai", () => {
    const maxText = textLayer({ text: "x".repeat(MAX_TEXT_LENGTH) });
    expect(sceneSchema.safeParse(withLayers([maxText])).success).toBe(true);

    const tooLong = textLayer({ text: "x".repeat(MAX_TEXT_LENGTH + 1) });
    expect(sceneSchema.safeParse(withLayers([tooLong])).success).toBe(false);
  });

  it("text layer ke invalid font / weight / size reject hote hain", () => {
    const badFont = textLayer();
    badFont.style.font = "comic-sans" as TextLayer["style"]["font"];
    expect(sceneSchema.safeParse(withLayers([badFont])).success).toBe(false);

    const badWeight = textLayer();
    badWeight.style.weight = 300 as TextLayer["style"]["weight"];
    expect(sceneSchema.safeParse(withLayers([badWeight])).success).toBe(false);

    const badSize = textLayer();
    badSize.style.size = 4;
    expect(sceneSchema.safeParse(withLayers([badSize])).success).toBe(false);
  });

  it("saare annotation shapes validate hote hain", () => {
    const shapes: AnnotationLayer["shape"][] = [
      {
        type: "arrow",
        from: { x: 0.1, y: 0.2 },
        to: { x: 0.8, y: 0.7 },
        bend: 0.3,
        head: true,
      },
      { type: "rect", x: 0.1, y: 0.1, w: 0.4, h: 0.3, radius: 0.02 },
      { type: "ellipse", x: 0.2, y: 0.2, w: 0.3, h: 0.2 },
      { type: "highlight", x: 0.1, y: 0.4, w: 0.5, h: 0.08 },
      { type: "step", x: 0.5, y: 0.5, size: 0.05, n: 1 },
      { type: "emoji", x: 0.5, y: 0.5, size: 0.08, char: "🔥" },
    ];
    for (const shape of shapes) {
      expect(
        sceneSchema.safeParse(withLayers([annotationLayer(shape)])).success,
      ).toBe(true);
    }
  });

  it("unknown annotation shape aur out-of-range values reject hote hain", () => {
    const unknown = annotationLayer({
      type: "star",
    } as unknown as AnnotationLayer["shape"]);
    expect(sceneSchema.safeParse(withLayers([unknown])).success).toBe(false);

    const badBend = annotationLayer({
      type: "arrow",
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      bend: 2,
      head: true,
    });
    expect(sceneSchema.safeParse(withLayers([badBend])).success).toBe(false);
  });

  it("redact layer modes aur strength validate hote hain", () => {
    for (const mode of ["pixelate", "blur", "solid"] as const) {
      expect(
        sceneSchema.safeParse(withLayers([redactLayer({ mode })])).success,
      ).toBe(true);
    }
    const badMode = redactLayer({
      mode: "smudge" as RedactLayer["mode"],
    });
    expect(sceneSchema.safeParse(withLayers([badMode])).success).toBe(false);

    const badStrength = redactLayer({ strength: 120 });
    expect(sceneSchema.safeParse(withLayers([badStrength])).success).toBe(
      false,
    );
  });

  it(`max ${MAX_LAYERS} layers tak allow karta hai`, () => {
    const layers = Array.from({ length: MAX_LAYERS }, (_, index) =>
      textLayer({ id: `text-${index}` }),
    );
    expect(sceneSchema.safeParse(withLayers(layers)).success).toBe(true);
    expect(
      sceneSchema.safeParse(
        withLayers([...layers, textLayer({ id: "overflow" })]),
      ).success,
    ).toBe(false);
  });

  it("image crop validate hoti hai (bounds + optional)", () => {
    const scene = createDefaultScene();
    scene.image = {
      path: "a.png",
      width: 100,
      height: 100,
      crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 },
    };
    expect(sceneSchema.safeParse(scene).success).toBe(true);

    scene.image.crop = { x: 0.8, y: 0, w: 0.5, h: 0.5 };
    expect(sceneSchema.safeParse(scene).success).toBe(false);

    scene.image = { path: "a.png", width: 100, height: 100 };
    expect(sceneSchema.safeParse(scene).success).toBe(true);
  });

  it("unknown layer kind reject hota hai", () => {
    const scene = withLayers([
      { ...textLayer(), kind: "sticker" } as unknown as TextLayer,
    ]);
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  });
});
