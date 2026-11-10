import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePost, refinePost } from "./ai";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getSession } }),
}));

function events(...payloads: unknown[]) {
  return new Response(
    payloads.map((payload) => `data: ${JSON.stringify(payload)}\n\n`).join(""),
    {
      headers: { "Content-Type": "text/event-stream" },
    },
  );
}

describe("AI streaming requests", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("only succeeds after the server's done event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        events(
          { type: "delta", delta: "Hello " },
          { type: "delta", delta: "world" },
          { type: "done", credits: 4 },
        ),
      ),
    );
    const onDelta = vi.fn();
    await expect(
      generatePost({ image: "image" }, onDelta),
    ).resolves.toMatchObject({
      ok: true,
      text: "Hello world",
      credits: 4,
    });
    expect(onDelta.mock.calls).toEqual([["Hello "], ["world"]]);
  });

  it.each([[], [{ type: "delta", delta: "unfinished" }]])(
    "reports an interrupted stream instead of accepting partial text (%j)",
    async (...payloads) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => events(...payloads)),
      );
      await expect(
        refinePost({ currentText: "original", action: "shorter" }, vi.fn()),
      ).resolves.toMatchObject({
        ok: false,
        code: "INCOMPLETE_STREAM",
      });
    },
  );

  it("preserves server error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        events(
          { type: "delta", delta: "partial" },
          { type: "error", code: "UPSTREAM_ERROR", message: "Provider failed" },
        ),
      ),
    );
    await expect(generatePost({ image: "image" }, vi.fn())).resolves.toEqual({
      ok: false,
      code: "UPSTREAM_ERROR",
      message: "Provider failed",
    });
  });

  it("cancels an obsolete request before it can write into the next project", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async () =>
      events(
        { type: "delta", delta: "old project" },
        { type: "delta", delta: " must not reach the next project" },
        { type: "done", credits: 4 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    let postText = "";
    const request = generatePost(
      { image: "image" },
      (delta) => {
        postText += delta;
        // Mirrors the panel's unmount cleanup while another project is opened.
        controller.abort();
        postText = "next project's original text";
      },
      controller.signal,
    );
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(postText).toBe("next project's original text");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("does not start a request if unmounted while session lookup is pending", async () => {
    const controller = new AbortController();
    let finishAuth!: (value: unknown) => void;
    getSession.mockReturnValueOnce(
      new Promise((resolve) => {
        finishAuth = resolve;
      }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = generatePost(
      { image: "image" },
      vi.fn(),
      controller.signal,
    );
    controller.abort();
    finishAuth({ data: { session: { access_token: "test-token" } } });
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
