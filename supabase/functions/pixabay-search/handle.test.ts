import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { createHandle, type HandleDeps, type PixabaySearchResult } from "./handle.ts";
import { PHOTO, VIDEO } from "./normalize.test.ts";

const ORIGIN = "http://localhost:3000";

function fakeAdmin(options: {
  rpcAllowed?: boolean;
  cachedRow?: { response: PixabaySearchResult; expires_at: string } | null;
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
  options: { fetchFn?: typeof fetch; apiKey?: string | null } = {}
): Partial<HandleDeps> {
  return {
    withUser: (handler) => (request) =>
      handler({ userId: "user-1", supabase: admin, supabaseAdmin: admin }, request),
    fetchFn:
      options.fetchFn ??
      (async () => {
        throw new Error("fetch call nahi hona chahiye tha");
      }),
    now: () => Date.now(),
    apiKey: () =>
      options.apiKey === undefined ? "test-key" : options.apiKey ?? undefined,
  };
}

const authHeaders = { Authorization: "Bearer test-token", Origin: ORIGIN };

Deno.test("pixabay: OPTIONS preflight", async () => {
  const handle = createHandle(makeDeps(fakeAdmin({ upserts: [] })));
  const response = await handle(
    new Request("http://x/functions/v1/pixabay-search", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN },
    })
  );
  assertEquals(response.status, 204);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

Deno.test("pixabay: invalid params → 422", async () => {
  const handle = createHandle(makeDeps(fakeAdmin({ upserts: [] })));
  const response = await handle(
    new Request("http://x/functions/v1/pixabay-search?query=a", { headers: authHeaders })
  );
  assertEquals(response.status, 422);
  assertEquals((await response.json()).error.code, "VALIDATION_ERROR");
});

Deno.test("pixabay: rate limit → 429", async () => {
  const handle = createHandle(
    makeDeps(fakeAdmin({ rpcAllowed: false, upserts: [] }))
  );
  const response = await handle(
    new Request("http://x/functions/v1/pixabay-search?query=sunset", { headers: authHeaders })
  );
  assertEquals(response.status, 429);
});

Deno.test("pixabay: cache hit", async () => {
  const admin = fakeAdmin({
    upserts: [],
    cachedRow: {
      response: { items: [], page: 1, hasMore: false },
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  const handle = createHandle(makeDeps(admin));
  const response = await handle(
    new Request("http://x/functions/v1/pixabay-search?query=sunset&type=photo", {
      headers: authHeaders,
    })
  );
  assertEquals((await response.json()).cached, true);
});

Deno.test("pixabay: fresh photo search — URL params + upsert", async () => {
  const calls: string[] = [];
  const upserts: Array<Record<string, unknown>> = [];
  const fetchFn = async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({ total: 500, totalHits: 500, hits: [PHOTO] }),
      { status: 200 }
    );
  };
  const handle = createHandle(
    makeDeps(fakeAdmin({ upserts }), { fetchFn: fetchFn as typeof fetch })
  );
  const response = await handle(
    new Request(
      "http://x/functions/v1/pixabay-search?query=sunset&type=photo&page=2&perPage=24",
      { headers: authHeaders }
    )
  );
  const body = await response.json();
  assertEquals(body.cached, false);
  assertEquals(body.items[0].provider, "pixabay");
  assertEquals(body.items[0].url, PHOTO.largeImageURL);
  assertEquals(body.hasMore, true);
  assertEquals(calls[0].includes("/api/?"), true);
  assertEquals(calls[0].includes("image_type=photo"), true);
  assertEquals(calls[0].includes("safesearch=true"), true);
  assertEquals(calls[0].includes("orientation=horizontal"), true);
  assertEquals(calls[0].includes("key=test-key"), true);
  assertEquals(upserts[0].cache_key, "pixabay:v1:photo:landscape:sunset:2:24");
});

Deno.test("pixabay: video search — videos endpoint + normalized", async () => {
  const calls: string[] = [];
  const fetchFn = async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ totalHits: 40, hits: [VIDEO] }), {
      status: 200,
    });
  };
  const handle = createHandle(
    makeDeps(fakeAdmin({ upserts: [] }), { fetchFn: fetchFn as typeof fetch })
  );
  const response = await handle(
    new Request("http://x/functions/v1/pixabay-search?query=ocean", {
      headers: authHeaders,
    })
  );
  const body = await response.json();
  assertEquals(calls[0].includes("/api/videos/?"), true);
  assertEquals(body.items[0].type, "video");
  assertEquals(body.items[0].url, VIDEO.videos.medium?.url);
});

Deno.test("pixabay: upstream error → 502, key missing → 503", async () => {
  const failing = createHandle(
    makeDeps(fakeAdmin({ upserts: [] }), {
      fetchFn: (async () => new Response("rate limited", { status: 429 })) as typeof fetch,
    })
  );
  const failed = await failing(
    new Request("http://x/functions/v1/pixabay-search?query=sunset", { headers: authHeaders })
  );
  assertEquals(failed.status, 502);

  const noKey = createHandle(
    makeDeps(fakeAdmin({ upserts: [] }), { apiKey: null })
  );
  const missing = await noKey(
    new Request("http://x/functions/v1/pixabay-search?query=sunset", { headers: authHeaders })
  );
  assertEquals(missing.status, 503);
});
