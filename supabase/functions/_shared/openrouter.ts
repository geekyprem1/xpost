export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatRole = "system" | "user" | "assistant";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: ChatRole;
  content: string | ChatContentPart[];
};

export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
  model: string | null;
};

export type StreamChatOptions = {
  apiKey: string;
  models: string[];
  messages: ChatMessage[];
  appUrl: string;
  appTitle: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  onDelta?: (delta: string) => void;
};

export type StreamChatResult = {
  text: string;
  usage: ChatUsage;
  finishReason: string | null;
};

export class OpenRouterError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

export function createSseParser() {
  let buffer = "";
  return {
    push(chunk: string): string[] {
      buffer += chunk;
      const payloads: string[] = [];
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          if (payload.length > 0) payloads.push(payload);
        }
        newline = buffer.indexOf("\n");
      }
      return payloads;
    },
  };
}

type StreamChunk = {
  model?: string;
  choices?: Array<{
    delta?: { content?: unknown };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
  };
};

export async function streamChatCompletion(
  options: StreamChatOptions,
): Promise<StreamChatResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 60_000,
  );

  const body: Record<string, unknown> = {
    messages: options.messages,
    stream: true,
    usage: { include: true },
    max_tokens: options.maxTokens ?? 400,
    temperature: options.temperature ?? 0.7,
  };
  if (options.models.length > 1) {
    body.models = options.models;
  } else {
    body.model = options.models[0];
  }

  let response: Response;
  try {
    response = await fetchFn(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": options.appUrl,
        "X-Title": options.appTitle,
      },
      body: JSON.stringify(body),
    });
  } catch (reason) {
    clearTimeout(timer);
    const aborted = reason instanceof Error && reason.name === "AbortError";
    throw new OpenRouterError(
      aborted ? "The AI request timed out" : "OpenRouter network error",
    );
  }

  if (!response.ok || !response.body) {
    const bodyText = await response.text().catch(() => "");
    clearTimeout(timer);
    let message = `OpenRouter error (${response.status})`;
    try {
      const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // non-JSON error body
    }
    throw new OpenRouterError(message, response.status);
  }

  const parser = createSseParser();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let text = "";
  let finishReason: string | null = null;
  const usage: ChatUsage = {
    promptTokens: 0,
    completionTokens: 0,
    costUsd: null,
    model: null,
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const payload of parser.push(chunk)) {
        if (payload === "[DONE]") continue;
        let parsed: StreamChunk;
        try {
          parsed = JSON.parse(payload) as StreamChunk;
        } catch {
          continue;
        }
        const choice = parsed.choices?.[0];
        const delta = choice?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          text += delta;
          options.onDelta?.(delta);
        }
        if (typeof choice?.finish_reason === "string") {
          finishReason = choice.finish_reason;
        }
        if (typeof parsed.model === "string") {
          usage.model = parsed.model;
        }
        if (parsed.usage) {
          if (typeof parsed.usage.prompt_tokens === "number") {
            usage.promptTokens = parsed.usage.prompt_tokens;
          }
          if (typeof parsed.usage.completion_tokens === "number") {
            usage.completionTokens = parsed.usage.completion_tokens;
          }
          if (typeof parsed.usage.cost === "number") {
            usage.costUsd = parsed.usage.cost;
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }

  return { text, usage, finishReason };
}
