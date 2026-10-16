import { z } from "npm:zod@4.6.7";
import { handleOptions, withCors } from "../_shared/cors.ts";
import { errorResponse, jsonResponse } from "../_shared/errors.ts";
import { withSupabase, type SupabaseContext } from "../_shared/supabase.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import {
  buildCacheKey,
  normalizePhoto,
  normalizeVideo,
  type PexelsItem,
  type PexelsSearchPayload,
} from "./normalize.ts";

const querySchema = z.object({
  query: z.string().trim().min(2).max(80),
  type: z.enum(["photo", "video"]).default("video"),
  page: z.coerce.number().int().min(1).max(20).default(1),
  perPage: z.coerce.number().int().min(4).max(40).default(24),
  orientation: z.enum(["landscape", "portrait", "square"]).default("landscape"),
});

export const RATE_LIMIT = { maxHits: 60, windowSec: 60 };
export const CACHE_TTL_SECONDS = 24 * 60 * 60;

export type PexelsSearchResult = {
  items: PexelsItem[];
  page: number;
  hasMore: boolean;
};

export type HandleDeps = {
  withUser: (
    handler: (ctx: SupabaseContext, request: Request) => Promise<Response>,
  ) => (request: Request) => Promise<Response>;
  fetchFn: typeof fetch;
  now: () => number;
  apiKey: () => string | undefined;
};

type SearchParams = z.infer<typeof querySchema>;

async function searchPexels(
  params: SearchParams,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<PexelsSearchResult> {
  const base =
    params.type === "photo"
      ? "https://api.pexels.com/v1/search"
      : "https://api.pexels.com/videos/search";
  const url = new URL(base);
  url.searchParams.set("query", params.query);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("per_page", String(params.perPage));
  url.searchParams.set("orientation", params.orientation);

  const response = await fetchFn(url, { headers: { Authorization: apiKey } });
  if (!response.ok) {
    throw new Error(`Pexels API error (${response.status})`);
  }
  const payload = (await response.json()) as PexelsSearchPayload;
  const items =
    params.type === "photo"
      ? (payload.photos ?? []).map(normalizePhoto)
      : (payload.videos ?? [])
          .map(normalizeVideo)
          .filter((item): item is PexelsItem => item !== null);
  return { items, page: params.page, hasMore: Boolean(payload.next_page) };
}

export function createHandle(overrides: Partial<HandleDeps> = {}) {
  const deps: HandleDeps = {
    withUser: overrides.withUser ?? withSupabase,
    fetchFn: overrides.fetchFn ?? fetch,
    now: overrides.now ?? (() => Date.now()),
    apiKey: overrides.apiKey ?? (() => Deno.env.get("PEXELS_API_KEY")),
  };

  async function run(
    ctx: SupabaseContext,
    request: Request,
  ): Promise<Response> {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid search params", {
        issues: parsed.error.issues.map((issue) => issue.message),
      });
    }
    const params = parsed.data;

    const allowed = await checkRateLimit(
      ctx.supabaseAdmin,
      ctx.userId,
      "pexels",
      RATE_LIMIT.maxHits,
      RATE_LIMIT.windowSec,
    );
    if (!allowed) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many requests. Please try again in a minute.",
      );
    }

    const cacheKey = buildCacheKey(params);
    const cached = await ctx.supabaseAdmin
      .from("pexels_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    const row = cached.data as {
      response: PexelsSearchResult;
      expires_at: string;
    } | null;
    if (row && new Date(row.expires_at).getTime() > deps.now()) {
      return jsonResponse({ ...row.response, cached: true });
    }

    const apiKey = deps.apiKey();
    if (!apiKey) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Pexels search is not configured",
      );
    }

    try {
      const result = await searchPexels(params, apiKey, deps.fetchFn);
      const expiresAt = new Date(
        deps.now() + CACHE_TTL_SECONDS * 1000,
      ).toISOString();
      await ctx.supabaseAdmin.from("pexels_cache").upsert({
        cache_key: cacheKey,
        response: result,
        expires_at: expiresAt,
      });
      return jsonResponse({ ...result, cached: false });
    } catch (reason) {
      console.error(
        "pexels-search failed:",
        reason instanceof Error ? reason.message : String(reason),
      );
      return errorResponse("UPSTREAM_ERROR", "Pexels request failed");
    }
  }

  return async function handle(request: Request): Promise<Response> {
    const options = handleOptions(request);
    if (options) return options;
    const response = await deps.withUser(run)(request);
    return withCors(request, response);
  };
}

export const handle = createHandle();
