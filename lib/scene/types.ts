export const ASPECT_IDS = [
  "auto",
  "2:1",
  "16:9",
  "16:10",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
  "mbp-14",
  "mbp-16",
] as const;
export type AspectId = (typeof ASPECT_IDS)[number];

export const FRAME_IDS = [
  "screenshot",
  "browser",
  "iphone-18-pro",
  "iphone-18-pro-max",
  "iphone-17",
  "iphone-air",
  "ipad-pro-11",
  "ipad-pro-13",
  "macbook-pro-14",
  "macbook-pro-16",
  "card",
  "dark-bar",
  "safari",
  "arc",
  "terminal",
  "glass",
] as const;
export type FrameId = (typeof FRAME_IDS)[number];

export const STYLE_IDS = [
  "default",
  "glass-light",
  "glass-dark",
  "liquid-glass",
  "inset-light",
  "inset-dark",
  "outline",
  "border",
  "border-dark",
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const CORNER_IDS = ["sharp", "curved", "round"] as const;
export type CornerId = (typeof CORNER_IDS)[number];

export const SHADOW_IDS = ["none", "hug", "spread"] as const;
export type ShadowId = (typeof SHADOW_IDS)[number];

export const ANCHOR_IDS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const OVERLAY_IDS = [
  "morning",
  "golden",
  "noon",
  "shade",
  "sunset",
  "dusk",
  "studio",
  "overcast",
  "blush",
  "leaves",
  "window",
  "palm",
  "blinds",
  "slice",
  "arch",
  "panes",
  "lattice",
  "dapple",
  "curtain",
] as const;
export type OverlayId = (typeof OVERLAY_IDS)[number];

export const MEDIA_PROVIDERS = ["pexels", "pixabay", "curated", "upload"] as const;
export type MediaProvider = (typeof MEDIA_PROVIDERS)[number];

export type MediaCredit = {
  name: string;
  url: string;
};

export type MediaRef = {
  provider: MediaProvider;
  id: string;
  url: string;
  credit?: MediaCredit;
};
