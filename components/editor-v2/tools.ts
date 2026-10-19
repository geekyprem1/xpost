export type V2ToolId =
  | "image"
  | "text"
  | "annotate"
  | "redact"
  | "crop"
  | "layers"
  | "background"
  | "frame"
  | "style"
  | "layout"
  | "position"
  | "sunlight"
  | "auto";

export const V2_TOOL_LABELS: Record<V2ToolId, string> = {
  image: "Image",
  text: "Text",
  annotate: "Annotate",
  redact: "Redact",
  crop: "Crop",
  layers: "Layers",
  background: "Background",
  frame: "Frame",
  style: "Style",
  layout: "Layout",
  position: "Position",
  sunlight: "Light",
  auto: "Auto",
};

export const V2_TOOL_GROUPS: {
  label: string;
  tools: V2ToolId[];
}[] = [
  { label: "Media", tools: ["image"] },
  { label: "Add", tools: ["text", "annotate", "redact", "crop", "layers"] },
  {
    label: "Design",
    tools: [
      "background",
      "frame",
      "style",
      "layout",
      "position",
      "sunlight",
      "auto",
    ],
  },
];
