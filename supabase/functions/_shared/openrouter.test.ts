import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  OPENROUTER_URL,
  OpenRouterError,
  createSseParser,
  streamChatCompletion,
} from "./openrouter.ts";

const encoder = new TextEncoder();

function sseResponse(chunks: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function dataChunk(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

Deno.test("createSseParser: chunks split + multiple events + [DONE]", () => {
  const parser = createSseParser();
  assertEquals(parser.push("data: {a"), []);
  assertEquals(parser.push("}\ndata: [DONE]\n"), ["{a}", "[DONE]"]);
  assertEquals(parser.push(": comment\nevent: ping\ndata: b\n"), ["b"]);
  assertEquals(parser.push("data: c\r\n"), ["c"]);
});

Deno.test("streamChatCompletion: deltas + usage capture + headers", async () => {
  const deltas: string[] = [];
  const chunks = [
    dataChunk({ model: "model/x", choices: [{ delta: { content: "Hello" } }] }),
    dataChunk({ choices: [{ delta: { content: " world" } }] }),
    dataChunk({
      choices: [{ delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 120, completion_tokens: 40, cost: 0.00042 },
    }),
    "data: [DONE]\n\n",
  ];
  const captured: { init: RequestInit | null } = { init: null };
  const fetchFn = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    captured.init = init ?? null;
    return sseResponse(chunks);
  }) as typeof fetch;

  const result = await streamChatCompletion({
    apiKey: "test-key",
    models: ["model/a", "model/b"],
    messages: [{ role: "user", content: "hi" }],
    appUrl: "https://shotlark.app",
    appTitle: "Shotlark",
    fetchFn,
    onDelta: (delta) => deltas.push(delta),
  });

  assertEquals(result.text, "Hello world");
  assertEquals(result.finishReason, "stop");
  assertEquals(result.usage.promptTokens, 120);
  assertEquals(result.usage.completionTokens, 40);
  assertEquals(result.usage.costUsd, 0.00042);
  assertEquals(result.usage.model, "model/x");
  assertEquals(deltas, ["Hello", " world"]);

  const headers = (captured.init?.headers ?? {}) as Record<string, string>;
  assertEquals(headers.Authorization, "Bearer test-key");
  assertEquals(headers["HTTP-Referer"], "https://shotlark.app");
  assertEquals(headers["X-Title"], "Shotlark");
  const body = JSON.parse(String(captured.init?.body)) as Record<string, unknown>;
  assertEquals(body.models, ["model/a", "model/b"]);
  assertEquals(body.model, undefined);
  assertEquals(body.stream, true);
  assertEquals(body.usage, { include: true });
});

Deno.test("streamChatCompletion: single model pe model param jaata hai", async () => {
  const captured: { init: RequestInit | null } = { init: null };
  const fetchFn = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    captured.init = init ?? null;
    return sseResponse([dataChunk({ choices: [{ delta: { content: "x" } }] })]);
  }) as typeof fetch;
  await streamChatCompletion({
    apiKey: "k",
    models: ["only/model"],
    messages: [],
    appUrl: "https://a",
    appTitle: "t",
    fetchFn,
  });
  const body = JSON.parse(String(captured.init?.body)) as Record<string, unknown>;
  assertEquals(body.model, "only/model");
  assertEquals(body.models, undefined);
});

Deno.test("streamChatCompletion: upstream error message + status", async () => {
  const fetchFn = (async () =>
    new Response(JSON.stringify({ error: { message: "Insufficient credits" } }), {
      status: 402,
    })) as typeof fetch;
  const error = await assertRejects(
    () =>
      streamChatCompletion({
        apiKey: "k",
        models: ["m"],
        messages: [],
        appUrl: "https://a",
        appTitle: "t",
        fetchFn,
      }),
    OpenRouterError
  );
  assertEquals((error as OpenRouterError).message, "Insufficient credits");
  assertEquals((error as OpenRouterError).status, 402);
});

Deno.test("streamChatCompletion: garbage lines ignore hote hain", async () => {
  const chunks = [
    ": keep-alive\n\n",
    "event: message\ndata: not-json\n\n",
    dataChunk({ choices: [{ delta: { content: "ok" } }] }),
  ];
  const fetchFn = (async () => sseResponse(chunks)) as typeof fetch;
  const result = await streamChatCompletion({
    apiKey: "k",
    models: ["m"],
    messages: [],
    appUrl: "https://a",
    appTitle: "t",
    fetchFn,
  });
  assertEquals(result.text, "ok");
  assert(result.usage.model === null);
});
