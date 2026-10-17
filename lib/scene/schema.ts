import { z } from "zod";
import {
  ANCHOR_IDS,
  ASPECT_IDS,
  CORNER_IDS,
  FONT_IDS,
  FRAME_IDS,
  MEDIA_PROVIDERS,
  OVERLAY_IDS,
  REDACT_MODES,
  SHADOW_IDS,
  STYLE_IDS,
  TEXT_ALIGNS,
} from "./types";

export const SCENE_VERSION = 2;
export const MAX_LAYERS = 50;
export const MAX_TEXT_LENGTH = 500;

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

const pointSchema = z.object({ x: z.number(), y: z.number() });

const layerBase = {
  id: z.string().min(1),
  name: z.string().max(80).optional(),
  visible: z.boolean(),
  locked: z.boolean(),
};

const textLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("text"),
  x: z.number(),
  y: z.number(),
  width: z.number().min(0.01).max(1),
  rotation: z.number().min(-180).max(180),
  text: z.string().max(MAX_TEXT_LENGTH),
  style: z.object({
    font: z.enum(FONT_IDS),
    weight: z.union([
      z.literal(400),
      z.literal(500),
      z.literal(600),
      z.literal(700),
      z.literal(800),
    ]),
    size: z.number().min(8).max(400),
    color: z.string(),
    align: z.enum(TEXT_ALIGNS),
    lineHeight: z.number().min(0.8).max(2),
    letterSpacing: z.number().min(-0.1).max(0.5),
    background: z
      .object({
        color: z.string(),
        radius: z.number().min(0).max(100),
        padding: z.number().min(0).max(100),
      })
      .nullable(),
    shadow: z
      .object({
        color: z.string(),
        blur: z.number().min(0).max(100),
        y: z.number().min(-100).max(100),
      })
      .nullable(),
  }),
});

const annotationShapeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("arrow"),
    from: pointSchema,
    to: pointSchema,
    bend: z.number().min(-1).max(1),
    head: z.boolean(),
  }),
  z.object({
    type: z.literal("rect"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(0.001).max(1),
    h: z.number().min(0.001).max(1),
    radius: z.number().min(0).max(0.5),
  }),
  z.object({
    type: z.literal("ellipse"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(0.001).max(1),
    h: z.number().min(0.001).max(1),
  }),
  z.object({
    type: z.literal("highlight"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(0.001).max(1),
    h: z.number().min(0.001).max(1),
  }),
  z.object({
    type: z.literal("step"),
    x: z.number(),
    y: z.number(),
    size: z.number().min(0.01).max(0.2),
    n: z.number().int().min(1).max(999),
  }),
  z.object({
    type: z.literal("emoji"),
    x: z.number(),
    y: z.number(),
    size: z.number().min(0.01).max(0.3),
    char: z.string().min(1).max(16),
  }),
]);

const annotationLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("annotation"),
  shape: annotationShapeSchema,
  color: z.string(),
  stroke: z.number().min(0).max(0.05),
});

const redactLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("redact"),
  x: z.number(),
  y: z.number(),
  w: z.number().min(0.001).max(1),
  h: z.number().min(0.001).max(1),
  mode: z.enum(REDACT_MODES),
  strength: z.number().min(0).max(100),
  color: z.string(),
});

export const layerSchema = z.discriminatedUnion("kind", [
  textLayerSchema,
  annotationLayerSchema,
  redactLayerSchema,
]);

export type Layer = z.infer<typeof layerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type AnnotationLayer = z.infer<typeof annotationLayerSchema>;
export type RedactLayer = z.infer<typeof redactLayerSchema>;
export type AnnotationShape = z.infer<typeof annotationShapeSchema>;
export type TextLayerStyle = TextLayer["style"];

export const sceneSchema = z.object({
  version: z.literal(SCENE_VERSION),
  layers: z.array(layerSchema).max(MAX_LAYERS),
  canvas: z.object({
    aspect: z.enum(ASPECT_IDS),
    baseWidth: z.number().min(1),
  }),
  image: z
    .object({
      path: z.string(),
      width: z.number().min(1),
      height: z.number().min(1),
      crop: z
        .object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          w: z.number().min(0.01).max(1),
          h: z.number().min(0.01).max(1),
        })
        .refine(
          (crop) => crop.x + crop.w <= 1.0001 && crop.y + crop.h <= 1.0001,
          "Crop rect must stay inside the source image.",
        )
        .optional(),
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
