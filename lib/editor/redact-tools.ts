import type { RedactLayer, RedactMode } from "@/lib/scene";

export type RedactStyle = {
  mode: RedactMode;
  strength: number;
  color: string;
};

export const DEFAULT_REDACT_STYLE: RedactStyle = {
  mode: "pixelate",
  strength: 60,
  color: "#000000",
};

export type RedactPoint = { x: number; y: number };

export function buildRedactLayer(
  start: RedactPoint,
  end: RedactPoint,
  style: RedactStyle,
): RedactLayer | null {
  const x = Math.max(0, Math.min(1, Math.min(start.x, end.x)));
  const y = Math.max(0, Math.min(1, Math.min(start.y, end.y)));
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  if (Math.hypot(w, h) < 0.01) return null;

  return {
    id: crypto.randomUUID(),
    kind: "redact",
    visible: true,
    locked: false,
    x,
    y,
    w: Math.max(0.005, Math.min(1, w)),
    h: Math.max(0.005, Math.min(1, h)),
    mode: style.mode,
    strength: Math.max(0, Math.min(100, style.strength)),
    color: style.color,
  };
}
