import type { Scene, TextLayer, TextLayerStyle } from "@/lib/scene";

export const TEXT_PRESET_IDS = [
  "headline",
  "subheadline",
  "badge",
  "caption",
] as const;
export type TextPresetId = (typeof TEXT_PRESET_IDS)[number];

export type TextPreset = {
  label: string;
  defaultText: string;
  width: number;
  style: TextLayerStyle;
};

export const TEXT_PRESETS: Record<TextPresetId, TextPreset> = {
  headline: {
    label: "Headline",
    defaultText: "Your headline here",
    width: 0.72,
    style: {
      font: "inter",
      weight: 800,
      size: 96,
      color: "#ffffff",
      align: "center",
      lineHeight: 1.05,
      letterSpacing: -0.02,
      background: null,
      shadow: { color: "#000000", blur: 24, y: 6 },
    },
  },
  subheadline: {
    label: "Subheadline",
    defaultText: "A short subheadline",
    width: 0.64,
    style: {
      font: "inter",
      weight: 600,
      size: 54,
      color: "#ffffff",
      align: "center",
      lineHeight: 1.15,
      letterSpacing: -0.01,
      background: null,
      shadow: null,
    },
  },
  badge: {
    label: "Badge",
    defaultText: "NEW",
    width: 0.3,
    style: {
      font: "space-grotesk",
      weight: 700,
      size: 38,
      color: "#101014",
      align: "center",
      lineHeight: 1,
      letterSpacing: 0.04,
      background: { color: "#ffffff", radius: 48, padding: 18 },
      shadow: null,
    },
  },
  caption: {
    label: "Caption",
    defaultText: "Add a caption",
    width: 0.56,
    style: {
      font: "inter",
      weight: 500,
      size: 30,
      color: "#ffffff",
      align: "center",
      lineHeight: 1.3,
      letterSpacing: 0,
      background: null,
      shadow: { color: "#000000", blur: 12, y: 3 },
    },
  },
};

type TextLayerOverrides = Partial<
  Pick<TextLayer, "x" | "y" | "width" | "text" | "name">
>;

export function createTextLayer(
  presetId: TextPresetId,
  overrides: TextLayerOverrides = {},
): TextLayer {
  const preset = TEXT_PRESETS[presetId];
  return {
    id: crypto.randomUUID(),
    kind: "text",
    visible: true,
    locked: false,
    x: 0.5,
    y: 0.5,
    width: preset.width,
    rotation: 0,
    text: preset.defaultText,
    style: structuredClone(preset.style),
    ...overrides,
  };
}

export function applyTextPreset(
  layer: TextLayer,
  presetId: TextPresetId,
): TextLayer {
  const preset = TEXT_PRESETS[presetId];
  return {
    ...layer,
    width: preset.width,
    style: structuredClone(preset.style),
  };
}

export const TEXT_LAYOUT_PRESETS = [
  { id: "headline-top", label: "Headline top" },
  { id: "headline-left", label: "Headline left" },
  { id: "badge", label: "Badge" },
] as const;
export type TextLayoutPresetId = (typeof TEXT_LAYOUT_PRESETS)[number]["id"];

type TextLayoutPreset = {
  preset: TextPresetId;
  x: number;
  y: number;
  width: number;
  text: string;
  style?: Partial<TextLayerStyle>;
  transform: Partial<Scene["transform"]>;
};

const TEXT_LAYOUT_CONFIG: Record<TextLayoutPresetId, TextLayoutPreset> = {
  "headline-top": {
    preset: "headline",
    x: 0.5,
    y: 0.13,
    width: 0.72,
    text: "Your headline here",
    transform: {
      anchor: "bottom-center",
      padding: 70,
      zoom: 85,
      offset: { x: 0, y: 0 },
    },
  },
  "headline-left": {
    preset: "headline",
    x: 0.24,
    y: 0.5,
    width: 0.38,
    text: "Your headline\nhere",
    style: { size: 76, align: "left" },
    transform: {
      anchor: "center",
      padding: 60,
      zoom: 72,
      offset: { x: 190, y: 0 },
    },
  },
  badge: {
    preset: "badge",
    x: 0.24,
    y: 0.12,
    width: 0.3,
    text: "NEW",
    transform: {
      anchor: "bottom-center",
      padding: 80,
      zoom: 88,
      offset: { x: 0, y: 0 },
    },
  },
};

export function applyTextLayoutPreset(
  scene: Scene,
  presetId: TextLayoutPresetId,
  selectedLayerId: string | null,
): { scene: Scene; layerId: string } {
  const config = TEXT_LAYOUT_CONFIG[presetId];
  const existing = scene.layers.find(
    (layer): layer is TextLayer =>
      layer.id === selectedLayerId && layer.kind === "text",
  );

  const layer: TextLayer = existing
    ? {
        ...existing,
        x: config.x,
        y: config.y,
        width: config.width,
        rotation: 0,
      }
    : (() => {
        const created = createTextLayer(config.preset, {
          x: config.x,
          y: config.y,
          width: config.width,
          text: config.text,
        });
        return {
          ...created,
          style: { ...created.style, ...(config.style ?? {}) },
        };
      })();

  const layers = existing
    ? scene.layers.map((item) => (item.id === layer.id ? layer : item))
    : [...scene.layers, layer];

  return {
    scene: {
      ...scene,
      layers,
      transform: { ...scene.transform, ...config.transform },
    },
    layerId: layer.id,
  };
}
