import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getSession } }),
}));

import { searchMedia, searchPexels } from "./pexels";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  getSession.mockReset();
});

describe("searchPexels", () => {
  it("session na ho to UNAUTHENTICATED, fetch nahi hota", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const outcome = await searchPexels({ query: "ocean", type: "video" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe("UNAUTHENTICATED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("success response map hota hai + auth header jaata hai", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: "1",
              provider: "pexels",
              type: "video",
              width: 1920,
              height: 1080,
              url: "https://videos.pexels.com/a.mp4",
              previewUrl: "https://images.pexels.com/a.jpg",
              credit: { name: "Creator", url: "https://www.pexels.com/@creator" },
            },
          ],
          page: 1,
          hasMore: true,
          cached: false,
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const outcome = await searchPexels({ query: "ocean", type: "video" });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.items).toHaveLength(1);
      expect(outcome.items[0].url).toBe("https://videos.pexels.com/a.mp4");
      expect(outcome.hasMore).toBe(true);
    }
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
  });

  it("error response ka code/message pass hota hai", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many" } }),
          { status: 429 }
        )
      )
    );
    const outcome = await searchPexels({ query: "ocean", type: "video" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe("RATE_LIMITED");
      expect(outcome.message).toBe("Too many");
    }
  });

  it("fetch throw ho to NETWORK error", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("failed");
      })
    );
    const outcome = await searchPexels({ query: "ocean", type: "video" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe("NETWORK");
  });

  it("provider ke hisaab se endpoint chalta hai", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return new Response(
          JSON.stringify({ items: [], page: 1, hasMore: false, cached: false }),
          { status: 200 }
        );
      })
    );
    await searchMedia({ provider: "pixabay", query: "ocean", type: "video" });
    await searchMedia({ provider: "pexels", query: "ocean", type: "video" });
    await searchPexels({ query: "ocean", type: "video" });
    expect(calls[0]).toContain("/functions/v1/pixabay-search");
    expect(calls[1]).toContain("/functions/v1/pexels-search");
    expect(calls[2]).toContain("/functions/v1/pexels-search");
  });

  it("pixabay items provider ke saath pass hote hain", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: "125",
                provider: "pixabay",
                type: "video",
                width: 1920,
                height: 1080,
                url: "https://cdn.pixabay.com/video/125_medium.mp4",
                previewUrl: "https://cdn.pixabay.com/video/125_medium.jpg",
                credit: { name: "Coverr", url: "https://pixabay.com/users/Coverr-1/" },
              },
            ],
            page: 1,
            hasMore: false,
            cached: false,
          }),
          { status: 200 }
        )
      )
    );
    const outcome = await searchMedia({ provider: "pixabay", query: "ocean", type: "video" });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.items[0].provider).toBe("pixabay");
      expect(outcome.items[0].url).toContain("pixabay.com");
    }
  });
});
