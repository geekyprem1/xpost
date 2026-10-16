export const BACKGROUND_TAGS = ["liquid", "vibrant", "minimal", "dark"] as const;
export type BackgroundTag = (typeof BACKGROUND_TAGS)[number];

export type MeshBlob = {
  x: number;
  y: number;
  radius: number;
  color: string;
};

export type MeshPreset = {
  id: string;
  name: string;
  base: string;
  blobs: MeshBlob[];
  tags: BackgroundTag[];
};

export type GradientPreset = {
  id: string;
  name: string;
  stops: { color: string; at: number }[];
  angle: number;
  tags: BackgroundTag[];
};

export const MESH_PRESETS: MeshPreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    base: "#0b1026",
    tags: ["liquid", "dark"],
    blobs: [
      { x: 0.2, y: 0.25, radius: 0.5, color: "#7c5cff" },
      { x: 0.8, y: 0.3, radius: 0.45, color: "#2ec5ff" },
      { x: 0.5, y: 0.85, radius: 0.55, color: "#ff7ac3" },
    ],
  },
  {
    id: "sunset-mesh",
    name: "Sunset",
    base: "#1a0b2e",
    tags: ["vibrant", "liquid"],
    blobs: [
      { x: 0.25, y: 0.3, radius: 0.5, color: "#ff7a59" },
      { x: 0.75, y: 0.2, radius: 0.4, color: "#ffc46b" },
      { x: 0.6, y: 0.85, radius: 0.6, color: "#b14aed" },
    ],
  },
  {
    id: "candy",
    name: "Candy",
    base: "#2a0a3a",
    tags: ["vibrant", "liquid"],
    blobs: [
      { x: 0.2, y: 0.7, radius: 0.5, color: "#ff7ac3" },
      { x: 0.8, y: 0.25, radius: 0.5, color: "#7cb8ff" },
      { x: 0.5, y: 0.5, radius: 0.35, color: "#ffe27a" },
    ],
  },
  {
    id: "ocean",
    name: "Ocean",
    base: "#021b2e",
    tags: ["liquid", "dark"],
    blobs: [
      { x: 0.25, y: 0.3, radius: 0.5, color: "#14b8d4" },
      { x: 0.75, y: 0.7, radius: 0.55, color: "#2563eb" },
      { x: 0.55, y: 0.15, radius: 0.3, color: "#0ea5a0" },
    ],
  },
  {
    id: "ember",
    name: "Ember",
    base: "#1c0b07",
    tags: ["vibrant", "dark"],
    blobs: [
      { x: 0.3, y: 0.7, radius: 0.55, color: "#ff5c33" },
      { x: 0.75, y: 0.3, radius: 0.45, color: "#ff9a3d" },
      { x: 0.15, y: 0.15, radius: 0.3, color: "#7a1f1f" },
    ],
  },
  {
    id: "mint",
    name: "Mint",
    base: "#06251f",
    tags: ["minimal"],
    blobs: [
      { x: 0.3, y: 0.3, radius: 0.55, color: "#3ddc97" },
      { x: 0.75, y: 0.7, radius: 0.5, color: "#7cffcb" },
    ],
  },
  {
    id: "lavender",
    name: "Lavender",
    base: "#17102e",
    tags: ["minimal", "liquid"],
    blobs: [
      { x: 0.25, y: 0.3, radius: 0.5, color: "#a78bfa" },
      { x: 0.7, y: 0.75, radius: 0.55, color: "#d8b4fe" },
    ],
  },
  {
    id: "graphite",
    name: "Graphite",
    base: "#0b0b0f",
    tags: ["minimal", "dark"],
    blobs: [
      { x: 0.35, y: 0.35, radius: 0.5, color: "#27272f" },
      { x: 0.75, y: 0.7, radius: 0.5, color: "#3f3f4a" },
    ],
  },
];

export const WALLPAPER_PRESETS: GradientPreset[] = [
  {
    id: "dawn",
    name: "Dawn",
    stops: [
      { color: "#ffd9a0", at: 0 },
      { color: "#ff7ac3", at: 1 },
    ],
    angle: 35,
    tags: ["vibrant"],
  },
  {
    id: "midnight",
    name: "Midnight",
    stops: [
      { color: "#0f1230", at: 0 },
      { color: "#5c3b8f", at: 1 },
    ],
    angle: 120,
    tags: ["dark"],
  },
  {
    id: "meadow",
    name: "Meadow",
    stops: [
      { color: "#d9f99d", at: 0 },
      { color: "#34d399", at: 1 },
    ],
    angle: 25,
    tags: ["minimal"],
  },
  {
    id: "sand",
    name: "Sand",
    stops: [
      { color: "#f5e6c8", at: 0 },
      { color: "#e8b98a", at: 1 },
    ],
    angle: 45,
    tags: ["minimal"],
  },
  {
    id: "cosmos",
    name: "Cosmos",
    stops: [
      { color: "#1b1b3a", at: 0 },
      { color: "#6d28d9", at: 0.55 },
      { color: "#ec4899", at: 1 },
    ],
    angle: 160,
    tags: ["vibrant", "dark"],
  },
  {
    id: "ice",
    name: "Ice",
    stops: [
      { color: "#e0f2fe", at: 0 },
      { color: "#93c5fd", at: 1 },
    ],
    angle: 30,
    tags: ["minimal"],
  },
  {
    id: "rose",
    name: "Rose",
    stops: [
      { color: "#ffe4e6", at: 0 },
      { color: "#fb7185", at: 1 },
    ],
    angle: 15,
    tags: ["vibrant"],
  },
  {
    id: "charcoal",
    name: "Charcoal",
    stops: [
      { color: "#111827", at: 0 },
      { color: "#374151", at: 1 },
    ],
    angle: 90,
    tags: ["dark", "minimal"],
  },
];

export const PREMIUM_PRESETS: GradientPreset[] = [
  {
    id: "silk",
    name: "Silk",
    stops: [
      { color: "#f8fafc", at: 0 },
      { color: "#c7d2fe", at: 0.55 },
      { color: "#a5b4fc", at: 1 },
    ],
    angle: 130,
    tags: ["minimal"],
  },
  {
    id: "noir",
    name: "Noir",
    stops: [
      { color: "#09090b", at: 0 },
      { color: "#27272a", at: 0.6 },
      { color: "#52525b", at: 1 },
    ],
    angle: 75,
    tags: ["dark"],
  },
  {
    id: "peach",
    name: "Peach",
    stops: [
      { color: "#fff1e6", at: 0 },
      { color: "#ffd1b3", at: 0.5 },
      { color: "#ff9e7a", at: 1 },
    ],
    angle: 40,
    tags: ["vibrant"],
  },
  {
    id: "forest",
    name: "Forest",
    stops: [
      { color: "#052e16", at: 0 },
      { color: "#166534", at: 0.6 },
      { color: "#4ade80", at: 1 },
    ],
    angle: 155,
    tags: ["dark"],
  },
  {
    id: "berry",
    name: "Berry",
    stops: [
      { color: "#2e1065", at: 0 },
      { color: "#7c3aed", at: 0.55 },
      { color: "#f472b6", at: 1 },
    ],
    angle: 120,
    tags: ["vibrant"],
  },
  {
    id: "cloud",
    name: "Cloud",
    stops: [
      { color: "#f0f9ff", at: 0 },
      { color: "#bae6fd", at: 0.5 },
      { color: "#7dd3fc", at: 1 },
    ],
    angle: 50,
    tags: ["minimal"],
  },
  {
    id: "gold",
    name: "Gold",
    stops: [
      { color: "#1c1917", at: 0 },
      { color: "#78350f", at: 0.6 },
      { color: "#f59e0b", at: 1 },
    ],
    angle: 135,
    tags: ["dark", "vibrant"],
  },
  {
    id: "coral",
    name: "Coral",
    stops: [
      { color: "#fff7ed", at: 0 },
      { color: "#fdba74", at: 0.55 },
      { color: "#f43f5e", at: 1 },
    ],
    angle: 65,
    tags: ["vibrant"],
  },
];

export function filterByTags<T extends { tags: BackgroundTag[] }>(
  items: T[],
  tags: BackgroundTag[]
): T[] {
  if (tags.length === 0) return items;
  return items.filter((item) => tags.some((tag) => item.tags.includes(tag)));
}

export function findMeshPreset(id: string): MeshPreset | null {
  return MESH_PRESETS.find((preset) => preset.id === id) ?? null;
}
