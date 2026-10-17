import { FONT_IDS, type FontId, type Scene } from "@/lib/scene";

export type FontCategory = "sans" | "serif" | "mono" | "handwritten";

export type FontFaceSource = {
  file: string;
  weight: string;
};

export type FontDefinition = {
  id: FontId;
  family: string;
  category: FontCategory;
  faces: FontFaceSource[];
  license: string;
};

const face = (file: string, weight: string): FontFaceSource => ({
  file: `/fonts/${file}`,
  weight,
});

export const FONTS: Record<FontId, FontDefinition> = {
  inter: {
    id: "inter",
    family: "Inter",
    category: "sans",
    faces: [face("inter.woff2", "400 800")],
    license: "/fonts/inter-OFL.txt",
  },
  "space-grotesk": {
    id: "space-grotesk",
    family: "Space Grotesk",
    category: "sans",
    faces: [face("space-grotesk.woff2", "400 700")],
    license: "/fonts/space-grotesk-OFL.txt",
  },
  "playfair-display": {
    id: "playfair-display",
    family: "Playfair Display",
    category: "serif",
    faces: [face("playfair-display.woff2", "400 900")],
    license: "/fonts/playfair-display-OFL.txt",
  },
  lora: {
    id: "lora",
    family: "Lora",
    category: "serif",
    faces: [face("lora.woff2", "400 700")],
    license: "/fonts/lora-OFL.txt",
  },
  "jetbrains-mono": {
    id: "jetbrains-mono",
    family: "JetBrains Mono",
    category: "mono",
    faces: [face("jetbrains-mono.woff2", "400 800")],
    license: "/fonts/jetbrains-mono-OFL.txt",
  },
  "ibm-plex-mono": {
    id: "ibm-plex-mono",
    family: "IBM Plex Mono",
    category: "mono",
    faces: [
      face("ibm-plex-mono-400.woff2", "400"),
      face("ibm-plex-mono-500.woff2", "500"),
      face("ibm-plex-mono-600.woff2", "600"),
      face("ibm-plex-mono-700.woff2", "700"),
    ],
    license: "/fonts/ibm-plex-mono-OFL.txt",
  },
  caveat: {
    id: "caveat",
    family: "Caveat",
    category: "handwritten",
    faces: [face("caveat.woff2", "400 700")],
    license: "/fonts/caveat-OFL.txt",
  },
  "bricolage-grotesque": {
    id: "bricolage-grotesque",
    family: "Bricolage Grotesque",
    category: "sans",
    faces: [face("bricolage-grotesque.woff2", "400 800")],
    license: "/fonts/bricolage-grotesque-OFL.txt",
  },
};

export const FONT_OPTIONS = FONT_IDS.map((id) => ({
  id,
  label: FONTS[id].family,
  category: FONTS[id].category,
}));

export function fontStack(id: FontId): string {
  return `"${FONTS[id].family}", sans-serif`;
}

const loading = new Map<FontId, Promise<void>>();

export function ensureFont(id: FontId): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = loading.get(id);
  if (existing) return existing;

  const font = FONTS[id];
  const promise = Promise.all(
    font.faces.map(async (source) => {
      const fontFace = new FontFace(font.family, `url("${source.file}")`, {
        weight: source.weight,
        style: "normal",
        display: "swap",
      });
      await fontFace.load();
      document.fonts.add(fontFace);
    }),
  )
    .then(() => undefined)
    .catch((error: unknown) => {
      loading.delete(id);
      throw error;
    });
  loading.set(id, promise);
  return promise;
}

export async function ensureFonts(scene: Scene): Promise<void> {
  const ids = new Set<FontId>();
  for (const layer of scene.layers) {
    if (layer.kind === "text" && layer.visible) ids.add(layer.style.font);
  }
  await Promise.all([...ids].map(ensureFont));
}
