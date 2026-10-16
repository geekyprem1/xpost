import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type MediaProviderId = "pexels" | "pixabay";

export type MediaSearchItem = {
  id: string;
  provider: MediaProviderId;
  type: "photo" | "video";
  width: number;
  height: number;
  url: string;
  previewUrl: string;
  credit: { name: string; url: string };
};

export type PexelsSearchItem = MediaSearchItem;

export type MediaSearchParams = {
  provider?: MediaProviderId;
  query: string;
  type: "photo" | "video";
  page?: number;
  perPage?: number;
  orientation?: "landscape" | "portrait" | "square";
};

export type PexelsSearchParams = Omit<MediaSearchParams, "provider">;

export type MediaSearchOutcome =
  | {
      ok: true;
      items: MediaSearchItem[];
      page: number;
      hasMore: boolean;
      cached: boolean;
    }
  | { ok: false; code: string; message: string };

type MediaSearchPayload = {
  items?: MediaSearchItem[];
  page?: number;
  hasMore?: boolean;
  cached?: boolean;
  error?: { code?: string; message?: string };
};

export async function searchMedia(
  params: MediaSearchParams,
): Promise<MediaSearchOutcome> {
  const endpoint =
    (params.provider ?? "pexels") === "pixabay"
      ? "pixabay-search"
      : "pexels-search";
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message:
        "Sign in to search stock media. Sign-in is currently unavailable.",
    };
  }

  const url = new URL(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
  );
  url.searchParams.set("query", params.query);
  url.searchParams.set("type", params.type);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.perPage) url.searchParams.set("perPage", String(params.perPage));
  if (params.orientation)
    url.searchParams.set("orientation", params.orientation);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
    });
    const payload = (await response
      .json()
      .catch(() => null)) as MediaSearchPayload | null;
    if (!response.ok || !payload || payload.error) {
      return {
        ok: false,
        code: payload?.error?.code ?? "HTTP_ERROR",
        message:
          payload?.error?.message ??
          `Search request fail (${response.status}).`,
      };
    }
    return {
      ok: true,
      items: payload.items ?? [],
      page: payload.page ?? 1,
      hasMore: Boolean(payload.hasMore),
      cached: Boolean(payload.cached),
    };
  } catch {
    return {
      ok: false,
      code: "NETWORK",
      message: "Network error. Please try again.",
    };
  }
}

export function searchPexels(
  params: PexelsSearchParams,
): Promise<MediaSearchOutcome> {
  return searchMedia({ ...params, provider: "pexels" });
}
