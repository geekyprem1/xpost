import type { Scene } from "./schema";
import motionPresets from "@/lib/backgrounds/motion-presets.json";

export function createDefaultScene(): Scene {
  const motion = motionPresets.find((preset) => preset.id === "loop-13")!;
  return {
    version: 2,
    layers: [],
    canvas: { aspect: "auto", baseWidth: 1500 },
    image: null,
    background: {
      kind: "video",
      src: {
        provider: "curated",
        id: motion.id,
        url: motion.url,
        previewUrl: motion.previewUrl,
        credit: { ...motion.credit },
      },
    },
    frame: { kind: "screenshot" },
    style: { preset: "default", corner: "curved", shadow: "hug" },
    transform: {
      zoom: 100,
      tiltX: 0,
      tiltY: 0,
      anchor: "center",
      offset: { x: 0, y: 0 },
      padding: 100,
    },
    layout: { radius: 24, shadow: 40 },
    sunlight: {
      overlay: "none",
      strength: 0,
      angle: 45,
      softness: 50,
      temperature: 0,
      grain: 0,
    },
    watermark: true,
  };
}
