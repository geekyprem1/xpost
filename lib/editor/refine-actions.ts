export const REFINE_ACTIONS = [
  "improve-format",
  "better-hook",
  "bold-keywords",
  "bullet-points",
  "add-cta",
  "punchier",
  "add-emojis",
  "shorter",
  "pro-tone",
] as const;

export type RefineAction = (typeof REFINE_ACTIONS)[number];

export const REFINE_ACTION_LABELS: Record<RefineAction, string> = {
  "improve-format": "Improve format",
  "better-hook": "Better hook",
  "bold-keywords": "Bold key words",
  "bullet-points": "Bullet points",
  "add-cta": "Add CTA",
  punchier: "Punchier",
  "add-emojis": "Add emojis",
  shorter: "Shorter",
  "pro-tone": "Pro tone",
};
