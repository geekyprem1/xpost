import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import type { z } from "npm:zod@4.6.7";
import { errorResponse } from "./errors.ts";
import {
  streamChatCompletion,
  type ChatMessage,
  type StreamChatResult,
} from "./openrouter.ts";
import { parseJsonBody } from "./validate.ts";
import { checkRateLimit } from "./rate-limit.ts";
import type { SupabaseContext } from "./supabase.ts";

export const DEFAULT_AI_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
];

export const AI_RATE_LIMIT = { maxHits: 20, windowSec: 60 };

export type AiGenerationStatus = "success" | "failed" | "refunded";

export async function loadAiModels(admin: SupabaseClient): Promise<string[]> {
  try {
    const { data } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "ai.models")
      .maybeSingle();
    const raw = (data as { value?: unknown } | null)?.value;
    if (Array.isArray(raw)) {
      const models = raw.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      );
      if (models.length > 0) return models;
    }
  } catch {
    // config missing — defaults
  }
  return DEFAULT_AI_MODELS;
}

export type AiStreamOptions = {
  userId: string;
  admin: SupabaseClient;
  action: string;
  projectId: string | null;
  input: Record<string, unknown>;
  messages: ChatMessage[];
  models: string[];
  apiKey: string;
  appUrl: string;
  appTitle: string;
  fetchFn?: typeof fetch;
};

export async function runAiStream(options: AiStreamOptions): Promise<Response> {
  const allowed = await checkRateLimit(
    options.admin,
    options.userId,
    "ai",
    AI_RATE_LIMIT.maxHits,
    AI_RATE_LIMIT.windowSec,
  );
  if (!allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many AI requests. Please try again in a minute.",
    );
  }

  const { data: remaining, error: consumeError } = await options.admin.rpc(
    "consume_credits",
    { p_user_id: options.userId, p_amount: 1, p_reason: options.action },
  );
  if (consumeError) {
    const message = String(consumeError.message ?? "");
    if (message.includes("INSUFFICIENT_CREDITS")) {
      return errorResponse(
        "INSUFFICIENT_CREDITS",
        "Your AI credits are exhausted. Please wait until your reset date.",
      );
    }
    return errorResponse(
      "UPSTREAM_ERROR",
      message || "Unable to deduct a credit",
    );
  }

  const logGeneration = async (
    status: AiGenerationStatus,
    result?: StreamChatResult,
  ) => {
    try {
      await options.admin.from("ai_generations").insert({
        user_id: options.userId,
        project_id: options.projectId,
        action: options.action,
        model: result?.usage.model ?? options.models[0],
        input: options.input,
        output: result?.text ?? null,
        prompt_tokens: result?.usage.promptTokens ?? null,
        completion_tokens: result?.usage.completionTokens ?? null,
        cost_usd: result?.usage.costUsd ?? null,
        status,
      });
    } catch {
      // logging best-effort hai
    }
  };

  const refund = async (reason: string) => {
    try {
      await options.admin.rpc("refund_credits", {
        p_user_id: options.userId,
        p_amount: 1,
        p_reason: reason,
      });
    } catch {
      // refund failure caller ko SSE error se dikhega
    }
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // client disconnect
        }
      };
      try {
        const result = await streamChatCompletion({
          apiKey: options.apiKey,
          models: options.models,
          messages: options.messages,
          appUrl: options.appUrl,
          appTitle: options.appTitle,
          fetchFn: options.fetchFn,
          onDelta: (delta) => send({ type: "delta", delta }),
        });
        if (result.text.trim().length === 0) {
          await refund(`${options.action}_empty`);
          await logGeneration("refunded", result);
          send({
            type: "error",
            code: "EMPTY_OUTPUT",
            message:
              "The AI returned an empty response. Your credit has been refunded.",
          });
        } else {
          await logGeneration("success", result);
          send({
            type: "done",
            usage: result.usage,
            credits: typeof remaining === "number" ? remaining : null,
          });
        }
      } catch (error) {
        await refund(`${options.action}_failed`);
        await logGeneration("refunded");
        send({
          type: "error",
          code: "UPSTREAM_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "The AI request failed. Your credit has been refunded.",
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}

export type AiEndpointConfig<T> = {
  schema: z.ZodType<T>;
  action: (data: T) => string;
  projectId: (data: T) => string | null;
  inputFor: (data: T) => Record<string, unknown>;
  messages: (data: T) => ChatMessage[];
};

export type AiEndpointDeps = {
  fetchFn?: typeof fetch;
  apiKey?: () => string | null;
  appUrl?: () => string;
};

export function createAiHandler<T>(
  config: AiEndpointConfig<T>,
  deps: AiEndpointDeps = {},
) {
  return async (ctx: SupabaseContext, request: Request): Promise<Response> => {
    const parsed = await parseJsonBody(request, config.schema);
    if (!parsed.ok) return parsed.response;
    const apiKey = (
      deps.apiKey ?? (() => Deno.env.get("OPENROUTER_API_KEY") ?? null)
    )();
    if (!apiKey) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "The AI service is not configured",
      );
    }
    const models = await loadAiModels(ctx.supabaseAdmin);
    return runAiStream({
      userId: ctx.userId,
      admin: ctx.supabaseAdmin,
      action: config.action(parsed.data),
      projectId: config.projectId(parsed.data),
      input: config.inputFor(parsed.data),
      messages: config.messages(parsed.data),
      models,
      apiKey,
      appUrl: (
        deps.appUrl ?? (() => Deno.env.get("APP_URL") ?? "https://shotlark.app")
      )(),
      appTitle: "Shotlark",
      fetchFn: deps.fetchFn,
    });
  };
}
