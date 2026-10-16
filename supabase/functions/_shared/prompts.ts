import type { ChatContentPart, ChatMessage } from "./openrouter.ts";

export const SYSTEM_PROMPT = [
  "You are an expert X (Twitter) ghostwriter for a tool that turns screenshots into X posts.",
  "Given an image (usually a screenshot of an app, code, design, or product) and an optional topic, write a single X post that makes people stop scrolling.",
  "Rules:",
  "- Output ONLY the post text. No quotes, no preamble like \"Here's your post\", no markdown, no headings.",
  "- Keep it within 280 characters unless the topic clearly needs more.",
  "- Punchy hook in the first line, short lines, max 1-2 hashtags, at most 1-2 emojis.",
  "- Never invent facts that are not supported by the image or the topic.",
  "- Always write in English, even when the image or user instructions use another language.",
  "- Do not include URLs unless the user provided one.",
].join("\n");

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

export const REFINE_INSTRUCTIONS: Record<RefineAction, string> = {
  "improve-format":
    "Improve the layout: clear line breaks, short lines, scannable structure. Keep the meaning.",
  "better-hook":
    "Rewrite the first line as a much stronger hook that creates curiosity. Keep the rest mostly as is.",
  "bold-keywords":
    "Bold 1–3 key words using Unicode bold characters (e.g. 𝗯𝗼𝗹𝗱). Only 1–3 words, never whole lines.",
  "bullet-points":
    "Convert the key points into a compact bullet list using • or -. Keep it short.",
  "add-cta":
    "Add a short, natural call to action at the end (e.g. a question or an invitation to try it). No links.",
  punchier:
    "Make it punchier: remove filler words, use stronger verbs, tighter rhythm. Keep the same message.",
  "add-emojis":
    "Add tasteful emojis: max 2–3, placed where they add meaning. Do not overdo it.",
  shorter:
    "Make it significantly shorter while keeping the core message. Target under 200 characters.",
  "pro-tone":
    "Rewrite in a more professional, confident tone. No slang, no hype words, no emojis.",
};

export function buildGenerateMessages(input: {
  prompt: string | null;
  imageDataUrl: string;
}): ChatMessage[] {
  const instruction = input.prompt?.trim()
    ? `Topic / instruction from the user: ${input.prompt.trim()}\n\nWrite an X post for this image.`
    : "Write an X post for this image.";
  const parts: ChatContentPart[] = [
    { type: "text", text: instruction },
    { type: "image_url", image_url: { url: input.imageDataUrl } },
  ];
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: parts },
  ];
}

export function buildRefineMessages(input: {
  action?: RefineAction | null;
  freeform?: string | null;
  currentText: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  const history = (input.history ?? []).slice(-10);
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }
  if (input.action) {
    messages.push({
      role: "user",
      content: [
        "Current X post:",
        input.currentText,
        "",
        `Instruction: ${REFINE_INSTRUCTIONS[input.action]}`,
        "Output ONLY the improved post text.",
      ].join("\n"),
    });
  } else {
    messages.push({
      role: "user",
      content: [
        "Current X post:",
        input.currentText,
        "",
        `User request: ${input.freeform?.trim() ?? ""}`,
        "Apply the request and output ONLY the updated post text.",
      ].join("\n"),
    });
  }
  return messages;
}

export function cleanPostText(text: string): string {
  let output = text.trim();
  output = output.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  output = output.replace(
    /^(?:here(?:'| i)s|sure|okay|of course)[^\n:]*:\s*/i,
    ""
  );
  output = output.replace(
    /^(?:sure|okay|of course|here(?:'| i)s)[^\n]*\n{2,}/i,
    ""
  );
  const quotePairs: Array<[string, string]> = [
    ['"', '"'],
    ["“", "”"],
    ["'", "'"],
  ];
  for (const [open, close] of quotePairs) {
    if (output.startsWith(open) && output.endsWith(close) && output.length > 2) {
      output = output.slice(1, -1).trim();
      break;
    }
  }
  output = output.replace(/\n{3,}/g, "\n\n");
  return output.trim();
}
