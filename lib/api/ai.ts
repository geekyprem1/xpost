import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createSseParser } from "./sse";

export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
  model: string | null;
};

export type AiStreamOutcome =
  | { ok: true; text: string; credits: number | null; usage: AiUsage | null }
  | { ok: false; code: string; message: string };

type ServerEvent =
  | { type: "delta"; delta?: string }
  | { type: "done"; usage?: AiUsage; credits?: number | null }
  | { type: "error"; code?: string; message?: string };

async function streamAi(
  endpoint: "ai-generate" | "ai-refine",
  body: Record<string, unknown>,
  onDelta: (delta: string) => void,
): Promise<AiStreamOutcome> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Sign in to use AI Studio. Sign-in is currently unavailable.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify(body),
      },
    );
  } catch {
    return {
      ok: false,
      code: "NETWORK",
      message: "Network error. Please try again.",
    };
  }

  if (!response.ok || !response.body) {
    let code = "HTTP_ERROR";
    let message = `AI request fail (${response.status}).`;
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      if (payload.error?.code) code = payload.error.code;
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // non-JSON error body
    }
    return { ok: false, code, message };
  }

  const parser = createSseParser();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let text = "";
  let credits: number | null = null;
  let usage: AiUsage | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const payload of parser.push(
        decoder.decode(value, { stream: true }),
      )) {
        let event: ServerEvent;
        try {
          event = JSON.parse(payload) as ServerEvent;
        } catch {
          continue;
        }
        if (event.type === "delta" && typeof event.delta === "string") {
          text += event.delta;
          onDelta(event.delta);
        } else if (event.type === "done") {
          credits = event.credits ?? null;
          usage = event.usage ?? null;
        } else if (event.type === "error") {
          return {
            ok: false,
            code: event.code ?? "UPSTREAM_ERROR",
            message:
              event.message ?? "The AI request failed. Please try again.",
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { ok: true, text, credits, usage };
}

export function generatePost(
  params: { projectId?: string; prompt?: string; image: string },
  onDelta: (delta: string) => void,
): Promise<AiStreamOutcome> {
  return streamAi(
    "ai-generate",
    { projectId: params.projectId, prompt: params.prompt, image: params.image },
    onDelta,
  );
}

export function refinePost(
  params: {
    projectId?: string;
    currentText: string;
    action?: string;
    freeform?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  },
  onDelta: (delta: string) => void,
): Promise<AiStreamOutcome> {
  return streamAi("ai-refine", params, onDelta);
}
