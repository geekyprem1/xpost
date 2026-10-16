import { z } from "zod";
import {
  ANCHOR_IDS,
  ASPECT_IDS,
  CORNER_IDS,
  FRAME_IDS,
  MEDIA_PROVIDERS,
  OVERLAY_IDS,
  SHADOW_IDS,
  STYLE_IDS,
} from "./types";

export const SCENE_VERSION = 1;

const OVERLAY_OPTIONS = ["none", ...OVERLAY_IDS] as const;

const mediaRefSchema = z.object({
  provider: z.enum(MEDIA_PROVIDERS),
  id: z.string(),
  url: z.string(),
  previewUrl: z.string().optional(),
  credit: z.object({ name: z.string(), url: z.string() }).optional(),
});

const backgroundSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("solid"), color: z.string() }),
  z.object({
    kind: z.literal("gradient"),
    stops: z
      .array(z.object({ color: z.string(), at: z.number().min(0).max(1) }))
      .min(2),
    angle: z.number().min(0).max(360),
  }),
  z.object({ kind: z.literal("mesh"), presetId: z.string() }),
  z.object({
    kind: z.literal("image"),
    src: mediaRefSchema,
    blur: z.number().min(0).max(100),
  }),
  z.object({ kind: z.literal("video"), src: mediaRefSchema }),
]);

export const sceneSchema = z.object({
  version: z.literal(SCENE_VERSION),
  canvas: z.object({
    aspect: z.enum(ASPECT_IDS),
    baseWidth: z.number().min(1),
  }),
  image: z
    .object({
      path: z.string(),
      width: z.number().min(1),
      height: z.number().min(1),
    })
    .nullable(),
  background: backgroundSchema,
  frame: z.object({
    kind: z.enum(FRAME_IDS),
    fit: z.enum(["contain", "cover"]).optional(),
  }),
  style: z.object({
    preset: z.enum(STYLE_IDS),
    corner: z.enum(CORNER_IDS),
    shadow: z.enum(SHADOW_IDS),
  }),
  transform: z.object({
    zoom: z.number().min(50).max(200),
    tiltX: z.number().min(-30).max(30),
    tiltY: z.number().min(-30).max(30),
    anchor: z.enum(ANCHOR_IDS),
    offset: z.object({ x: z.number(), y: z.number() }),
    padding: z.number().min(0).max(200),
  }),
  layout: z.object({
    radius: z.number().min(0).max(48),
    shadow: z.number().min(0).max(100),
  }),
  sunlight: z.object({
    overlay: z.enum(OVERLAY_OPTIONS),
    strength: z.number().min(0).max(100),
    angle: z.number().min(0).max(360),
    softness: z.number().min(0).max(100),
    temperature: z.number().min(-100).max(100),
    grain: z.number().min(0).max(100),
  }),
  watermark: z.boolean(),
});

export type Scene = z.infer<typeof sceneSchema>;
export type SceneBackground = z.infer<typeof backgroundSchema>;
export type SceneImage = NonNullable<Scene["image"]>;
export type SceneSunlight = Scene["sunlight"];
