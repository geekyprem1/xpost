import { z } from "npm:zod@4.6.7";
import { errorResponse } from "./errors.ts";

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  { ok: true; data: z.infer<T> } | { ok: false; response: Response }
> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse("VALIDATION_ERROR", "Invalid JSON body"),
    };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse("VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues.map((issue) => issue.message),
      }),
    };
  }
  return { ok: true, data: parsed.data };
}
