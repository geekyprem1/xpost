import { z } from "npm:zod@4.6.7";
import { createAiHandler } from "../_shared/ai-flow.ts";
import { REFINE_ACTIONS, buildRefineMessages } from "../_shared/prompts.ts";

export const refineSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    currentText: z.string().trim().min(1).max(2000),
    action: z.enum(REFINE_ACTIONS).optional(),
    freeform: z.string().trim().max(500).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(2000),
        }),
      )
      .max(10)
      .optional(),
  })
  .refine(
    (data) =>
      Boolean(data.action) !==
      Boolean(data.freeform && data.freeform.length > 0),
    { message: "Provide either an action or a freeform instruction" },
  );

export type RefineInput = z.infer<typeof refineSchema>;

export const handle = createAiHandler<RefineInput>({
  schema: refineSchema,
  action: (data) => (data.action ? `refine:${data.action}` : "refine:chat"),
  projectId: (data) => data.projectId ?? null,
  inputFor: (data) => ({
    action: data.action ?? null,
    freeform: data.freeform ?? null,
    currentText: data.currentText,
  }),
  messages: (data) =>
    buildRefineMessages({
      action: data.action ?? null,
      freeform: data.freeform ?? null,
      currentText: data.currentText,
      history: data.history,
    }),
});
