import type { AspectId, FrameId, OverlayId, Scene } from "@/lib/scene";
import {
  MESH_PRESETS,
  PREMIUM_PRESETS,
  WALLPAPER_PRESETS,
} from "@/lib/backgrounds/presets";
import motionPresets from "@/lib/backgrounds/motion-presets.json";

/**
 * A "look" is a finished composition recipe (frame + canvas + background +
 * style + placement) that can be applied to any screenshot in one step. Used
 * by the marketing gallery and handed into the editor via lib/editor/handoff.
 */
export const LOOK_CATEGORIES = [
  { id: "desktop", name: "MacBook" },
  { id: "iphone", name: "iPhone" },
  { id: "browser", name: "Product promo" },
  { id: "social", name: "Social posts" },
  { id: "motion", name: "Motion" },
] as const;
export type LookCategory = (typeof LOOK_CATEGORIES)[number]["id"];

export type Look = {
  id: string;
  name: string;
  /** Short device / format caption shown next to the name. */
  caption: string;
  category: LookCategory;
  aspect: AspectId;
  frame: FrameId;
  background: Scene["background"];
  style?: Partial<Scene["style"]>;
  transform?: Partial<Omit<Scene["transform"], "offset">>;
  layout?: Partial<Scene["layout"]>;
  sunlight?: { overlay: OverlayId; strength: number; angle?: number };
};

function gradient(id: string): Scene["background"] {
  const preset = [...PREMIUM_PRESETS, ...WALLPAPER_PRESETS].find(
    (item) => item.id === id,
  );
  if (!preset) throw new Error(`Unknown gradient preset: ${id}`);
  return {
    kind: "gradient",
    stops: preset.stops.map((stop) => ({ ...stop })),
    angle: preset.angle,
  };
}

function mesh(id: string): Scene["background"] {
  if (!MESH_PRESETS.some((preset) => preset.id === id))
    throw new Error(`Unknown mesh preset: ${id}`);
  return { kind: "mesh", presetId: id };
}

function motion(id: string): Scene["background"] {
  const preset = motionPresets.find((item) => item.id === id);
  if (!preset) throw new Error(`Unknown motion preset: ${id}`);
  return {
    kind: "video",
    src: {
      provider: "curated",
      id: preset.id,
      url: preset.url,
      previewUrl: preset.previewUrl,
      credit: { ...preset.credit },
    },
  };
}

export const LOOKS: Look[] = [
  // MacBook
  {
    id: "mac-aurora",
    name: "Aurora desk",
    caption: "MacBook Pro 14″",
    category: "desktop",
    aspect: "16:10",
    frame: "macbook-pro-14",
    background: mesh("aurora"),
    transform: { padding: 70 },
  },
  {
    id: "mac-window-light",
    name: "Window light",
    caption: "MacBook Pro 16″",
    category: "desktop",
    aspect: "16:10",
    frame: "macbook-pro-16",
    background: gradient("sand"),
    transform: { padding: 70 },
    sunlight: { overlay: "window", strength: 55, angle: 35 },
  },
  {
    id: "mac-silk",
    name: "Silk studio",
    caption: "MacBook Pro 14″",
    category: "desktop",
    aspect: "16:10",
    frame: "macbook-pro-14",
    background: gradient("silk"),
    transform: { padding: 70 },
  },
  {
    id: "mac-ember",
    name: "Ember glow",
    caption: "MacBook Pro 16″",
    category: "desktop",
    aspect: "16:10",
    frame: "macbook-pro-16",
    background: mesh("ember"),
    transform: { padding: 70 },
  },

  // iPhone
  {
    id: "iphone-clean",
    name: "Clean white",
    caption: "iPhone 17 Pro",
    category: "iphone",
    aspect: "4:5",
    frame: "iphone-18-pro",
    background: { kind: "solid", color: "#f2f1f5" },
    transform: { padding: 90 },
  },
  {
    id: "iphone-tilted",
    name: "Tilted on black",
    caption: "iPhone 17 Pro Max",
    category: "iphone",
    aspect: "4:5",
    frame: "iphone-18-pro-max",
    background: { kind: "solid", color: "#0b0b0f" },
    transform: { padding: 90, tiltX: 14, tiltY: -16 },
  },
  {
    id: "iphone-blinds",
    name: "Studio blinds",
    caption: "iPhone 17",
    category: "iphone",
    aspect: "4:5",
    frame: "iphone-17",
    background: gradient("peach"),
    transform: { padding: 90 },
    sunlight: { overlay: "blinds", strength: 50, angle: 40 },
  },
  {
    id: "iphone-ocean",
    name: "Deep ocean",
    caption: "iPhone Air",
    category: "iphone",
    aspect: "4:5",
    frame: "iphone-air",
    background: mesh("ocean"),
    transform: { padding: 90 },
  },

  // Product promo
  {
    id: "safari-cloud",
    name: "Safari on cloud",
    caption: "Safari",
    category: "browser",
    aspect: "16:10",
    frame: "safari",
    background: gradient("cloud"),
    style: { shadow: "spread" },
  },
  {
    id: "arc-ember",
    name: "Arc on ember",
    caption: "Arc",
    category: "browser",
    aspect: "16:10",
    frame: "arc",
    background: mesh("ember"),
    style: { shadow: "spread" },
  },
  {
    id: "glass-lavender",
    name: "Glass window",
    caption: "Glass",
    category: "browser",
    aspect: "16:10",
    frame: "glass",
    background: mesh("lavender"),
    style: { shadow: "spread" },
  },
  {
    id: "terminal-noir",
    name: "Terminal noir",
    caption: "Terminal",
    category: "browser",
    aspect: "16:10",
    frame: "terminal",
    background: gradient("noir"),
    style: { shadow: "spread" },
  },

  // Social posts
  {
    id: "social-candy",
    name: "Candy square",
    caption: "Screenshot · 1:1",
    category: "social",
    aspect: "1:1",
    frame: "screenshot",
    background: mesh("candy"),
    style: { shadow: "spread", corner: "round" },
    transform: { padding: 120 },
  },
  {
    id: "social-rose",
    name: "Rose portrait",
    caption: "Card · 4:5",
    category: "social",
    aspect: "4:5",
    frame: "card",
    background: gradient("rose"),
    style: { shadow: "spread" },
    transform: { padding: 120 },
  },
  {
    id: "social-cosmos",
    name: "Cosmos story",
    caption: "Story · 9:16",
    category: "social",
    aspect: "9:16",
    frame: "screenshot",
    background: gradient("cosmos"),
    style: { shadow: "spread", corner: "round" },
    transform: { padding: 110 },
  },
  {
    id: "social-meadow",
    name: "Meadow card",
    caption: "Screenshot · 1:1",
    category: "social",
    aspect: "1:1",
    frame: "screenshot",
    background: gradient("meadow"),
    style: { shadow: "spread", corner: "round" },
    transform: { padding: 120 },
  },

  // Motion
  {
    id: "motion-violet",
    name: "Violet ripples",
    caption: "Browser · MP4",
    category: "motion",
    aspect: "16:10",
    frame: "browser",
    background: motion("loop-23"),
    style: { shadow: "spread" },
  },
  {
    id: "motion-cosmic",
    name: "Cosmic loop",
    caption: "iPhone 17 Pro · MP4",
    category: "motion",
    aspect: "4:5",
    frame: "iphone-18-pro",
    background: motion("loop-07"),
    transform: { padding: 90 },
  },
  {
    id: "motion-silk",
    name: "Purple silk",
    caption: "MacBook Pro 14″ · MP4",
    category: "motion",
    aspect: "16:10",
    frame: "macbook-pro-14",
    background: motion("loop-24"),
    transform: { padding: 70 },
  },
  {
    id: "motion-azure",
    name: "Azure ribbons",
    caption: "Safari · MP4",
    category: "motion",
    aspect: "16:10",
    frame: "safari",
    background: motion("loop-30"),
    style: { shadow: "spread" },
  },
];

export function findLook(id: string): Look | null {
  return LOOKS.find((look) => look.id === id) ?? null;
}

export function looksIn(category: LookCategory): Look[] {
  return LOOKS.filter((look) => look.category === category);
}

/** Applies a look to a scene. The screenshot, crop, layers and text are kept. */
export function applyLook(scene: Scene, look: Look): Scene {
  return {
    ...scene,
    canvas: { ...scene.canvas, aspect: look.aspect },
    frame: { ...scene.frame, kind: look.frame },
    background: structuredClone(look.background),
    style: { ...scene.style, ...look.style },
    transform: {
      ...scene.transform,
      zoom: 100,
      tiltX: 0,
      tiltY: 0,
      anchor: "center",
      offset: { x: 0, y: 0 },
      ...look.transform,
    },
    layout: { ...scene.layout, ...look.layout },
    sunlight: look.sunlight
      ? {
          ...scene.sunlight,
          overlay: look.sunlight.overlay,
          strength: look.sunlight.strength,
          angle: look.sunlight.angle ?? scene.sunlight.angle,
        }
      : { ...scene.sunlight, overlay: "none", strength: 0 },
  };
}
