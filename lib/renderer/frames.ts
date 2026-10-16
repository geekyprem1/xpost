import type { FrameId } from "@/lib/scene";
import framesConfig from "./frames.json";

export const FRAME_DESIGN_WIDTH = 1000;

export type FrameBezel = {
  top?: number;
  left: number;
  right: number;
  bottom: number;
};

export type FrameConfig = {
  name: string;
  kindHint: "window" | "phone" | "laptop" | "tablet";
  imageSrc?: string;
  screenAspect?: number;
  margin?: number;
  barHeight?: number;
  baseHeight?: number;
  baseOverhang?: number;
  bezel: FrameBezel;
  radius: number;
  screenRadius: number;
  barColor?: string;
  bodyColor: string;
  borderColor: string;
  lidColor?: string;
  pillColor?: string;
  accentColor?: string;
  bezelColor?: string;
  edgeColor?: string;
  baseColor?: string;
  dots?: boolean;
  pill?: boolean;
  prompt?: boolean;
  accent?: boolean;
  island?: boolean;
  islandWidth?: number;
  islandHeight?: number;
  camera?: boolean;
};

const CONFIGS = framesConfig as unknown as Record<string, FrameConfig>;

export function getFrameConfig(kind: FrameId): FrameConfig | null {
  if (kind === "screenshot") return null;
  return CONFIGS[kind] ?? null;
}

export function getFrameMetrics(config: FrameConfig) {
  const overhang = config.baseOverhang ?? 0;
  const margin = config.margin ?? 0;
  return {
    top: (config.bezel.top ?? 0) + (config.barHeight ?? 0) + margin,
    left: config.bezel.left + overhang + margin,
    right: config.bezel.right + overhang + margin,
    bottom: config.bezel.bottom + (config.baseHeight ?? 0) + margin,
  };
}
