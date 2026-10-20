import { describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import {
  BrandLimitError,
  MAX_BRAND_COLORS,
  MAX_SAVED_STYLES,
  addBrandColor,
  addSavedStyle,
  applyStyleSnapshot,
  brandGradient,
  captureStyle,
  createEmptyBrandKit,
  hasCustomWatermark,
  nextStyleName,
  normalizeHexColor,
  parseBrandKit,
  removeBrandColor,
  removeSavedStyle,
  renameSavedStyle,
  styleMatches,
  watermarkContentKey,
  watermarkPlacementFor,
  DEFAULT_BRAND_WATERMARK,
} from "./brand-kit";

function styledScene() {
  const scene = createDefaultScene();
  scene.canvas.aspect = "1:1";
  scene.background = {
    kind: "gradient",
    angle: 90,
    stops: [
      { color: "#112233", at: 0 },
      { color: "#445566", at: 1 },
    ],
  };
  scene.frame = { kind: "browser" };
  scene.style = { preset: "default", corner: "round", shadow: "spread" };
  scene.transform = {
    zoom: 120,
    tiltX: 10,
    tiltY: -5,
    anchor: "top-center",
    offset: { x: 12, y: -8 },
    padding: 60,
  };
  scene.layout = { radius: 12, shadow: 70 };
  scene.sunlight = { ...scene.sunlight, overlay: "none", grain: 20 };
  return scene;
}

describe("saved styles (BK-1)", () => {
  it("captureStyle + applyStyleSnapshot look copy karte hain, screenshot/layers/watermark nahi", () => {
    const source = styledScene();
    const snapshot = captureStyle(source);

    const target = createDefaultScene();
    target.image = {
      path: "local/a.png",
      width: 800,
      height: 600,
      crop: { x: 0.1, y: 0, w: 0.8, h: 1 },
    };
    target.layers = [
      {
        id: "t1",
        kind: "text",
        visible: true,
        locked: false,
        x: 0.5,
        y: 0.2,
        width: 0.6,
        rotation: 0,
        text: "Hello",
        style: {
          font: "inter",
          weight: 700,
          size: 64,
          color: "#ffffff",
          align: "center",
          lineHeight: 1.2,
          letterSpacing: 0,
          background: null,
          shadow: null,
        },
      },
    ];
    target.watermark = false;

    const next = applyStyleSnapshot(target, snapshot);
    expect(next.canvas.aspect).toBe("1:1");
    expect(next.canvas.baseWidth).toBe(target.canvas.baseWidth);
    expect(next.background).toEqual(source.background);
    expect(next.frame).toEqual(source.frame);
    expect(next.transform).toEqual(source.transform);
    expect(next.layout).toEqual(source.layout);
    expect(next.image).toBe(target.image);
    expect(next.layers).toBe(target.layers);
    expect(next.watermark).toBe(false);
    expect(styleMatches(next, snapshot)).toBe(true);
    expect(styleMatches(target, snapshot)).toBe(false);
  });

  it("snapshot deep copy hai — scene badalne pe saved style nahi badalta", () => {
    const scene = styledScene();
    const snapshot = captureStyle(scene);
    scene.transform.offset.x = 999;
    expect(snapshot.transform.offset.x).toBe(12);
    const applied = applyStyleSnapshot(createDefaultScene(), snapshot);
    applied.transform.offset.x = 5;
    expect(snapshot.transform.offset.x).toBe(12);
  });

  it("add / rename / delete + max 10 limit", () => {
    let kit = createEmptyBrandKit();
    const snapshot = captureStyle(styledScene());
    for (let i = 0; i < MAX_SAVED_STYLES; i++) {
      kit = addSavedStyle(kit, { id: `s${i}`, name: "", snapshot, now: i });
    }
    expect(kit.styles).toHaveLength(MAX_SAVED_STYLES);
    expect(kit.styles[0].name).toBe("My style 1");
    expect(() =>
      addSavedStyle(kit, { id: "x", name: "One more", snapshot, now: 0 }),
    ).toThrow(BrandLimitError);

    kit = renameSavedStyle(kit, "s1", "   Launch   look  ");
    expect(kit.styles[1].name).toBe("Launch look");
    expect(renameSavedStyle(kit, "s1", "   ").styles[1].name).toBe(
      "Launch look",
    );

    kit = removeSavedStyle(kit, "s1");
    expect(kit.styles).toHaveLength(MAX_SAVED_STYLES - 1);
    expect(kit.styles.some((style) => style.id === "s1")).toBe(false);
  });

  it("nextStyleName taken naam skip karta hai", () => {
    const snapshot = captureStyle(createDefaultScene());
    const kit = addSavedStyle(createEmptyBrandKit(), {
      id: "a",
      name: "My style 2",
      snapshot,
      now: 0,
    });
    expect(nextStyleName(kit.styles)).toBe("My style 3");
  });
});

describe("brand colors (BK-3)", () => {
  it("normalize: short hex, case, missing #; invalid → null", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbcc");
    expect(normalizeHexColor("7C5CFF")).toBe("#7c5cff");
    expect(normalizeHexColor("red")).toBeNull();
    expect(normalizeHexColor("#12345")).toBeNull();
  });

  it("dedupe + max 6 + remove", () => {
    let colors: string[] = [];
    colors = addBrandColor(colors, "#FF0000");
    colors = addBrandColor(colors, "#ff0000");
    expect(colors).toEqual(["#ff0000"]);
    for (let i = 1; i < 10; i++) {
      colors = addBrandColor(colors, `#00000${i}`);
    }
    expect(colors).toHaveLength(MAX_BRAND_COLORS);
    expect(removeBrandColor(colors, "#FF0000")).not.toContain("#ff0000");
    expect(addBrandColor(colors, "nope")).toBe(colors);
  });

  it("brandGradient: < 2 colors null, warna evenly spaced (max 4)", () => {
    expect(brandGradient(["#111111"])).toBeNull();
    const gradient = brandGradient([
      "#111111",
      "#222222",
      "#333333",
      "#444444",
      "#555555",
    ]);
    expect(gradient?.stops.map((stop) => stop.at)).toEqual([
      0,
      1 / 3,
      2 / 3,
      1,
    ]);
    expect(gradient?.stops).toHaveLength(4);
  });
});

describe("watermark (BK-2)", () => {
  it("custom tabhi jab enabled + text ya logo", () => {
    expect(hasCustomWatermark(DEFAULT_BRAND_WATERMARK)).toBe(false);
    expect(
      hasCustomWatermark({ ...DEFAULT_BRAND_WATERMARK, enabled: true }),
    ).toBe(false);
    expect(
      hasCustomWatermark({
        ...DEFAULT_BRAND_WATERMARK,
        enabled: true,
        text: "  ",
      }),
    ).toBe(false);
    expect(
      hasCustomWatermark({
        ...DEFAULT_BRAND_WATERMARK,
        enabled: true,
        text: "@me",
      }),
    ).toBe(true);
    expect(
      hasCustomWatermark({
        ...DEFAULT_BRAND_WATERMARK,
        enabled: false,
        text: "@me",
      }),
    ).toBe(false);
  });

  it("placement percent → fraction", () => {
    expect(
      watermarkPlacementFor({
        ...DEFAULT_BRAND_WATERMARK,
        corner: "top-left",
        size: 150,
        opacity: 40,
      }),
    ).toEqual({ corner: "top-left", size: 1.5, opacity: 0.4 });
  });

  it("content key placement se independent hai", () => {
    const base = { ...DEFAULT_BRAND_WATERMARK, enabled: true, text: "@me" };
    expect(watermarkContentKey(base)).toBe(
      watermarkContentKey({
        ...base,
        corner: "top-left",
        size: 200,
        opacity: 10,
      }),
    );
    expect(watermarkContentKey(base)).not.toBe(
      watermarkContentKey({ ...base, tone: "light" }),
    );
    expect(watermarkContentKey(base)).not.toBe(
      watermarkContentKey({ ...base, text: "@you" }),
    );
  });
});

describe("parseBrandKit", () => {
  it("garbage / wrong version → empty kit", () => {
    expect(parseBrandKit(null)).toEqual(createEmptyBrandKit());
    expect(parseBrandKit({ version: 99, colors: ["#ffffff"] })).toEqual(
      createEmptyBrandKit(),
    );
  });

  it("invalid style / color drop hota hai, baaki bachta hai", () => {
    const good = addSavedStyle(createEmptyBrandKit(), {
      id: "good",
      name: "Good",
      snapshot: captureStyle(styledScene()),
      now: 1,
    }).styles[0];
    const kit = parseBrandKit({
      version: 1,
      styles: [
        good,
        { id: "bad", name: "Bad", createdAt: 1, snapshot: { aspect: "nope" } },
        good,
      ],
      colors: ["#FFFFFF", "blue", "#000"],
      watermark: { enabled: true, text: "@me" },
    });
    expect(kit.styles.map((style) => style.id)).toEqual(["good"]);
    expect(kit.colors).toEqual(["#ffffff", "#000000"]);
    expect(kit.watermark).toEqual({
      ...DEFAULT_BRAND_WATERMARK,
      enabled: true,
      text: "@me",
    });
  });

  it("non-PNG logo data URL reject hota hai (watermark default)", () => {
    const kit = parseBrandKit({
      version: 1,
      watermark: {
        ...DEFAULT_BRAND_WATERMARK,
        logo: {
          dataUrl: "data:image/svg+xml;base64,AAAA",
          width: 10,
          height: 10,
          name: "x.svg",
        },
      },
    });
    expect(kit.watermark.logo).toBeNull();
  });
});
