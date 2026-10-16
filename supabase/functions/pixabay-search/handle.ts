import { z } from "npm:zod@4.6.7";
import { handleOptions, withCors } from "../_shared/cors.ts";
import { errorResponse, jsonResponse } from "../_shared/errors.ts";
import { withSupabase, type SupabaseContext } from "../_shared/supabase.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import {
  buildPixabayCacheKey,
  normalizePixabayPhoto,
  normalizePixabayVideo,
  type PixabayItem,
  type PixabayPhoto,
  type PixabaySearchPayload,
  type PixabayVideo,
} from "./normalize.ts";

const querySchema = z.object({
  query: z.string().trim().min(2).max(100),
  type: z.enum(["photo", "video"]).default("video"),
  page: z.coerce.number().int().min(1).max(20).default(1),
  perPage: z.coerce.number().int().min(3).max(100).default(24),
  orientation: z.enum(["landscape", "portrait", "square"]).default("landscape"),
});

export const RATE_LIMIT = { maxHits: 60, windowSec: 60 };
export const CACHE_TTL_SECONDS = 24 * 60 * 60;

export type PixabaySearchResult = {
  items: PixabayItem[];
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

function orientationParam(
  orientation: "landscape" | "portrait" | "square",
): string {
  if (orientation === "landscape") return "horizontal";
  if (orientation === "portrait") return "vertical";
  return "all";
}

async function searchPixabay(
  params: SearchParams,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<PixabaySearchResult> {
  const base =
    params.type === "photo"
      ? "https://pixabay.com/api/"
      : "https://pixabay.com/api/videos/";
  const url = new URL(base);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", params.query);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("per_page", String(params.perPage));
  url.searchParams.set("safesearch", "true");
  if (params.type === "photo") {
    url.searchParams.set("image_type", "photo");
    const orientation = orientationParam(params.orientation);
    if (orientation !== "all") url.searchParams.set("orientation", orientation);
  }

  const response = await fetchFn(url);
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `Pixabay API error (${response.status})${bodyText ? `: ${bodyText.slice(0, 120)}` : ""}`,
    );
  }
  const payload = (await response.json()) as PixabaySearchPayload;
  const hits = Array.isArray(payload.hits) ? payload.hits : [];
  const items =
    params.type === "photo"
      ? hits.map((hit) => normalizePixabayPhoto(hit as PixabayPhoto))
      : hits
          .map((hit) => normalizePixabayVideo(hit as PixabayVideo))
          .filter((item): item is PixabayItem => item !== null);
  const totalHits =
    typeof payload.totalHits === "number" ? payload.totalHits : 0;
  return {
    items,
    page: params.page,
    hasMore: totalHits > params.page * params.perPage,
  };
}

export function createHandle(overrides: Partial<HandleDeps> = {}) {
  const deps: HandleDeps = {
    withUser: overrides.withUser ?? withSupabase,
    fetchFn: overrides.fetchFn ?? fetch,
    now: overrides.now ?? (() => Date.now()),
    apiKey: overrides.apiKey ?? (() => Deno.env.get("PIXABAY_API_KEY")),
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
      "pixabay",
      RATE_LIMIT.maxHits,
      RATE_LIMIT.windowSec,
    );
    if (!allowed) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many requests. Please try again in a minute.",
      );
    }

    const cacheKey = buildPixabayCacheKey(params);
    const cached = await ctx.supabaseAdmin
      .from("pexels_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    const row = cached.data as {
      response: PixabaySearchResult;
      expires_at: string;
    } | null;
    if (row && new Date(row.expires_at).getTime() > deps.now()) {
      return jsonResponse({ ...row.response, cached: true });
    }

    const apiKey = deps.apiKey();
    if (!apiKey) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Pixabay search is not configured",
      );
    }

    try {
      const result = await searchPixabay(params, apiKey, deps.fetchFn);
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
      // Never echo reason.message: network errors include the request URL,
      // which carries the API key in its query string.
      const detail = reason instanceof Error ? reason.message : String(reason);
      console.error("pixabay-search failed:", detail.replace(/key=[^&\s)]+/g, "key=REDACTED"));
      return errorResponse("UPSTREAM_ERROR", "Pixabay request failed");
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
