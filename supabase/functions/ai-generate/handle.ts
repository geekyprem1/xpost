import { z } from "npm:zod@4.6.7";
import { createAiHandler } from "../_shared/ai-flow.ts";
import { buildGenerateMessages } from "../_shared/prompts.ts";

export const generateSchema = z.object({
  projectId: z.string().uuid().optional(),
  prompt: z.string().trim().max(500).optional(),
  image: z.string().min(64).max(1_800_000),
});

export type GenerateInput = z.infer<typeof generateSchema>;

export const handle = createAiHandler<GenerateInput>({
  schema: generateSchema,
  action: () => "generate",
  projectId: (data) => data.projectId ?? null,
  inputFor: (data) => ({ prompt: data.prompt ?? null }),
  messages: (data) =>
    buildGenerateMessages({
      prompt: data.prompt ?? null,
      imageDataUrl: data.image,
    }),
});
