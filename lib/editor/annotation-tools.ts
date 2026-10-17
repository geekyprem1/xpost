import type { AnnotationLayer, Layer, Scene } from "@/lib/scene";

export const ANNOTATION_TOOLS = [
  { id: "arrow", label: "Arrow", shortcut: "A" },
  { id: "rect", label: "Rectangle", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", shortcut: "O" },
  { id: "highlight", label: "Highlight", shortcut: "H" },
  { id: "step", label: "Number", shortcut: "N" },
  { id: "emoji", label: "Emoji", shortcut: "E" },
] as const;
export type AnnotationToolId = (typeof ANNOTATION_TOOLS)[number]["id"];

export type AnnotationStyle = {
  color: string;
  stroke: number;
  bend: number;
  head: boolean;
  emoji: string;
};

export const ANNOTATION_COLORS = [
  "#ff3355",
  "#ff8a1f",
  "#ffd60a",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ffffff",
  "#111827",
] as const;

export const ANNOTATION_EMOJI = [
  "🔥",
  "✨",
  "✅",
  "❌",
  "👀",
  "💡",
  "🚀",
  "❤️",
] as const;

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  color: "#ff3355",
  stroke: 0.005,
  bend: 0,
  head: true,
  emoji: "🔥",
};

export type AnnotationPoint = { x: number; y: number };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function nextStepNumber(layers: Layer[]): number {
  let max = 0;
  for (const layer of layers) {
    if (layer.kind !== "annotation" || layer.shape.type !== "step") continue;
    max = Math.max(max, layer.shape.n);
  }
  return max + 1;
}

export function buildAnnotationLayer(
  tool: AnnotationToolId,
  start: AnnotationPoint,
  end: AnnotationPoint,
  style: AnnotationStyle,
  scene: Scene,
): AnnotationLayer | null {
  const base = {
    id: crypto.randomUUID(),
    kind: "annotation" as const,
    visible: true,
    locked: false,
    color: style.color,
    stroke: Math.max(0, Math.min(0.05, style.stroke)),
  };

  if (tool === "step") {
    return {
      ...base,
      shape: {
        type: "step",
        x: clamp01(start.x),
        y: clamp01(start.y),
        size: 0.05,
        n: nextStepNumber(scene.layers),
      },
    };
  }

  if (tool === "emoji") {
    return {
      ...base,
      shape: {
        type: "emoji",
        x: clamp01(start.x),
        y: clamp01(start.y),
        size: 0.08,
        char: style.emoji || "🔥",
      },
    };
  }

  const from = { x: clamp01(start.x), y: clamp01(start.y) };
  const to = { x: clamp01(end.x), y: clamp01(end.y) };

  if (tool === "arrow") {
    if (Math.hypot(to.x - from.x, to.y - from.y) < 0.01) return null;
    return {
      ...base,
      shape: {
        type: "arrow",
        from,
        to,
        bend: Math.max(-1, Math.min(1, style.bend)),
        head: style.head,
      },
    };
  }

  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.max(0.005, Math.abs(to.x - from.x));
  const h = Math.max(0.005, Math.abs(to.y - from.y));

  if (Math.hypot(to.x - from.x, to.y - from.y) < 0.01) return null;

  if (tool === "rect") {
    return {
      ...base,
      shape: { type: "rect", x, y, w, h, radius: 0.02 },
    };
  }
  if (tool === "ellipse") {
    return {
      ...base,
      shape: { type: "ellipse", x, y, w, h },
    };
  }
  return {
    ...base,
    shape: { type: "highlight", x, y, w, h },
  };
}
