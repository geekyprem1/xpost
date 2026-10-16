import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import {
  DEFAULT_AI_MODELS,
  createAiHandler,
  loadAiModels,
  runAiStream,
} from "./ai-flow.ts";
import type { SupabaseContext } from "./supabase.ts";
import { z } from "npm:zod@4.6.7";

const encoder = new TextEncoder();

function sseResponse(payloads: unknown[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const payload of payloads) {
        controller.enqueue(
          encoder.encode(
            payload === "[DONE]"
              ? "data: [DONE]\n\n"
              : `data: ${JSON.stringify(payload)}\n\n`
          )
        );
      }
      controller.close();
    },
  });
  return new Response(stream, { status });
}

function successChunks(): unknown[] {
  return [
    { model: "m/one", choices: [{ delta: { content: "Great post" } }] },
    { choices: [{ delta: {}, finish_reason: "stop" }] },
    { usage: { prompt_tokens: 50, completion_tokens: 10, cost: 0.0001 } },
    "[DONE]",
  ];
}

function fakeAdmin(options: {
  allowed?: boolean;
  consumeError?: string | null;
  remaining?: number;
  configModels?: unknown;
}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const inserts: Array<Record<string, unknown>> = [];
  const admin = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      if (name === "hit_rate_limit") {
        return { data: options.allowed ?? true, error: null };
      }
      if (name === "consume_credits") {
        return options.consumeError
          ? { data: null, error: { message: options.consumeError } }
          : { data: options.remaining ?? 29, error: null };
      }
      return { data: null, error: null };
    },
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row);
        return { error: null };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data:
              options.configModels === undefined
                ? null
                : { value: options.configModels },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { admin, rpcCalls, inserts };
}

async function readEvents(response: Response): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

function streamOptions(admin: SupabaseClient, fetchFn: typeof fetch) {
  return {
    userId: "user-1",
    admin,
    action: "generate",
    projectId: null,
    input: { prompt: "test" },
    messages: [],
    models: ["m/one"],
    apiKey: "key",
    appUrl: "https://a",
    appTitle: "t",
    fetchFn,
  };
}

Deno.test("runAiStream: success — deltas, done credits, log success, no refund", async () => {
  const { admin, rpcCalls, inserts } = fakeAdmin({ remaining: 29 });
  const fetchFn = (async () => sseResponse(successChunks())) as typeof fetch;
  const response = await runAiStream(streamOptions(admin, fetchFn));
  assertEquals(response.headers.get("Content-Type"), "text/event-stream");
  const events = await readEvents(response);
  assertEquals(events[0], { type: "delta", delta: "Great post" });
  const done = events.find((event) => event.type === "done") as {
    credits: number;
    usage: { completionTokens: number; costUsd: number };
  };
  assertEquals(done.credits, 29);
  assertEquals(done.usage.completionTokens, 10);
  assertEquals(done.usage.costUsd, 0.0001);

  assertEquals(
    rpcCalls.map((call) => call.name),
    ["hit_rate_limit", "consume_credits"]
  );
  assertEquals(rpcCalls[1].args.p_reason, "generate");
  assertEquals(inserts.length, 1);
  assertEquals(inserts[0].status, "success");
  assertEquals(inserts[0].model, "m/one");
  assertEquals(inserts[0].prompt_tokens, 50);
  assertEquals(inserts[0].cost_usd, 0.0001);
});

Deno.test("runAiStream: rate limited → 429, consume nahi hota", async () => {
  const { admin, rpcCalls } = fakeAdmin({ allowed: false });
  const response = await runAiStream(
    streamOptions(admin, (async () => sseResponse([])) as typeof fetch)
  );
  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.error.code, "RATE_LIMITED");
  assertEquals(rpcCalls.length, 1);
});

Deno.test("runAiStream: credits khatam → 429 INSUFFICIENT_CREDITS", async () => {
  const { admin, inserts } = fakeAdmin({ consumeError: "INSUFFICIENT_CREDITS" });
  const response = await runAiStream(
    streamOptions(admin, (async () => sseResponse([])) as typeof fetch)
  );
  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.error.code, "INSUFFICIENT_CREDITS");
  assertEquals(inserts.length, 0);
});

Deno.test("runAiStream: empty output → refund + refunded log + SSE error", async () => {
  const { admin, rpcCalls, inserts } = fakeAdmin({});
  const fetchFn = (async () =>
    sseResponse([{ choices: [{ delta: {}, finish_reason: "stop" }] }, "[DONE]"])) as typeof fetch;
  const response = await runAiStream(streamOptions(admin, fetchFn));
  const events = await readEvents(response);
  assertEquals(events.at(-1)?.type, "error");
  assertEquals(events.at(-1)?.code, "EMPTY_OUTPUT");
  assertEquals(rpcCalls.at(-1)?.name, "refund_credits");
  assertEquals(inserts[0].status, "refunded");
});

Deno.test("runAiStream: upstream error → refund + SSE error", async () => {
  const { admin, rpcCalls, inserts } = fakeAdmin({});
  const fetchFn = (async () =>
    new Response(JSON.stringify({ error: { message: "upstream down" } }), {
      status: 502,
    })) as typeof fetch;
  const response = await runAiStream(streamOptions(admin, fetchFn));
  const events = await readEvents(response);
  assertEquals(events.at(-1)?.type, "error");
  assertEquals(events.at(-1)?.code, "UPSTREAM_ERROR");
  assertEquals(rpcCalls.at(-1)?.name, "refund_credits");
  assertEquals(inserts[0].status, "refunded");
});

Deno.test("loadAiModels: app_config se models, warna defaults", async () => {
  const configured = fakeAdmin({ configModels: ["x/y", "z/w"] });
  assertEquals(await loadAiModels(configured.admin), ["x/y", "z/w"]);
  const empty = fakeAdmin({});
  assertEquals(await loadAiModels(empty.admin), DEFAULT_AI_MODELS);
});

Deno.test("createAiHandler: api key missing → 503, invalid body → 422", async () => {
  const handler = createAiHandler(
    {
      schema: z.object({ text: z.string().min(3) }),
      action: () => "test",
      projectId: () => null,
      inputFor: () => ({}),
      messages: () => [],
    },
    { apiKey: () => null }
  );
  const ctx = fakeAdmin({});
  const noKey = await handler(
    { userId: "u", supabase: ctx.admin, supabaseAdmin: ctx.admin } as SupabaseContext,
    new Request("http://x", { method: "POST", body: JSON.stringify({ text: "abc" }) })
  );
  assertEquals(noKey.status, 503);

  const withKey = createAiHandler(
    {
      schema: z.object({ text: z.string().min(3) }),
      action: () => "test",
      projectId: () => null,
      inputFor: () => ({}),
      messages: () => [],
    },
    { apiKey: () => "key" }
  );
  const bad = await withKey(
    { userId: "u", supabase: ctx.admin, supabaseAdmin: ctx.admin } as SupabaseContext,
    new Request("http://x", { method: "POST", body: JSON.stringify({ text: "a" }) })
  );
  assertEquals(bad.status, 422);
});
