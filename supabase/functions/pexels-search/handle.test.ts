import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { originMatches } from "../_shared/cors.ts";
import { createHandle, type HandleDeps, type PexelsSearchResult } from "./handle.ts";
import { PHOTO, VIDEO } from "./normalize.test.ts";

const ORIGIN = "http://localhost:3000";

function fakeAdmin(options: {
  rpcAllowed?: boolean;
  cachedRow?: { response: PexelsSearchResult; expires_at: string } | null;
  upserts: Array<Record<string, unknown>>;
}): SupabaseClient {
  return {
    rpc: async () => ({ data: options.rpcAllowed ?? true, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: options.cachedRow ?? null,
            error: null,
          }),
        }),
      }),
      upsert: async (row: Record<string, unknown>) => {
        options.upserts.push(row);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;
}

function makeDeps(
  admin: SupabaseClient,
  options: {
    fetchFn?: typeof fetch;
    now?: number;
    apiKey?: string | null;
  } = {}
): Partial<HandleDeps> {
  return {
    withUser: (handler) => (request) =>
      handler({ userId: "user-1", supabase: admin, supabaseAdmin: admin }, request),
    fetchFn:
      options.fetchFn ??
      (async () => {
        throw new Error("fetch call nahi hona chahiye tha");
      }),
    now: () => options.now ?? Date.now(),
    apiKey: () =>
      options.apiKey === undefined ? "test-key" : options.apiKey ?? undefined,
  };
}

const authHeaders = { Authorization: "Bearer test-token", Origin: ORIGIN };

Deno.test("OPTIONS preflight: 204 + CORS headers", async () => {
  const handle = createHandle(makeDeps(fakeAdmin({ upserts: [] })));
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN },
    })
  );
  assertEquals(response.status, 204);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

Deno.test("invalid params: 422 VALIDATION_ERROR + CORS", async () => {
  const handle = createHandle(makeDeps(fakeAdmin({ upserts: [] })));
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search?query=a", { headers: authHeaders })
  );
  assertEquals(response.status, 422);
  const body = await response.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

Deno.test("rate limit exceed: 429", async () => {
  const handle = createHandle(
    makeDeps(fakeAdmin({ rpcAllowed: false, upserts: [] }))
  );
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search?query=sunset", { headers: authHeaders })
  );
  assertEquals(response.status, 429);
  assertEquals((await response.json()).error.code, "RATE_LIMITED");
});

Deno.test("cache hit: cached=true, Pexels call nahi hota", async () => {
  const cached: PexelsSearchResult = { items: [], page: 1, hasMore: false };
  const admin = fakeAdmin({
    upserts: [],
    cachedRow: { response: cached, expires_at: new Date(Date.now() + 60_000).toISOString() },
  });
  const handle = createHandle(makeDeps(admin));
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search?query=sunset&type=photo", { headers: authHeaders })
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.cached, true);
});

Deno.test("cache expired: fresh Pexels call + upsert", async () => {
  const calls: string[] = [];
  const upserts: Array<Record<string, unknown>> = [];
  const admin = fakeAdmin({
    upserts,
    cachedRow: {
      response: { items: [], page: 1, hasMore: false },
      expires_at: new Date(Date.now() - 1000).toISOString(),
    },
  });
  const fetchFn = async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ photos: [PHOTO], next_page: 2 }));
  };
  const handle = createHandle(makeDeps(admin, { fetchFn }));
  const response = await handle(
    new Request(
      "http://x/functions/v1/pexels-search?query=sunset&type=photo&page=2&perPage=8",
      { headers: authHeaders }
    )
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.cached, false);
  assertEquals(body.items.length, 1);
  assertEquals(body.items[0].url, "https://images.pexels.com/large2x.jpg");
  assertEquals(body.page, 2);
  assertEquals(body.hasMore, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].includes("/v1/search"), true);
  assertEquals(calls[0].includes("page=2"), true);
  assertEquals(upserts.length, 1);
  assertEquals(upserts[0].cache_key, "v1:photo:landscape:sunset:2:8");
});

Deno.test("default type video: videos endpoint hit hota hai", async () => {
  const calls: string[] = [];
  const fetchFn = async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ videos: [VIDEO] }));
  };
  const handle = createHandle(makeDeps(fakeAdmin({ upserts: [] }), { fetchFn }));
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search?query=ocean", { headers: authHeaders })
  );
  const body = await response.json();
  assertEquals(calls[0].includes("/videos/search"), true);
  assertEquals(body.items[0].type, "video");
  assertEquals(body.items[0].url, "https://videos.pexels.com/hd-1080.mp4");
});

Deno.test("Pexels down: 502 UPSTREAM_ERROR", async () => {
  const fetchFn = async () => new Response("nope", { status: 500 });
  const handle = createHandle(makeDeps(fakeAdmin({ upserts: [] }), { fetchFn }));
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search?query=sunset", { headers: authHeaders })
  );
  assertEquals(response.status, 502);
  assertEquals((await response.json()).error.code, "UPSTREAM_ERROR");
});

Deno.test("api key missing: 503 SERVICE_UNAVAILABLE", async () => {
  const handle = createHandle(
    makeDeps(fakeAdmin({ upserts: [] }), { apiKey: null })
  );
  const response = await handle(
    new Request("http://x/functions/v1/pexels-search?query=sunset", { headers: authHeaders })
  );
  assertEquals(response.status, 503);
  assertEquals((await response.json()).error.code, "SERVICE_UNAVAILABLE");
});

Deno.test("origin matching: exact + wildcard + reject", () => {
  assertEquals(originMatches("http://localhost:3000", "http://localhost:3000"), true);
  assertEquals(
    originMatches("https://*-team.vercel.app", "https://shotlark-team.vercel.app"),
    true
  );
  assertEquals(originMatches("https://*.vercel.app", "https://evil.example.com"), false);
});
