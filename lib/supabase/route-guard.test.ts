import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ claims: null as null | { sub: string } }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({ data: { claims: auth.claims } }) },
  }),
}));
import { proxy } from "../../proxy";

describe("protected routes", () => {
  beforeEach(() => {
    auth.claims = null;
  });

  it.each(["/editor", "/account", "/editor/project", "/projects"])(
    "redirects logged-out %s even with the old bypass flag",
    async (path) => {
      vi.stubEnv("AUTH_ENABLED", "false");
      try {
        const response = await proxy(
          new NextRequest(`http://localhost:3000${path}`),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/login",
        );
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );

  it("allows the login page without a session", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3000/login"),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows an authenticated user into the editor", async () => {
    auth.claims = { sub: "test-user" };
    const response = await proxy(
      new NextRequest("http://localhost:3000/editor"),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users from login to the editor", async () => {
    auth.claims = { sub: "test-user" };
    const response = await proxy(
      new NextRequest("http://localhost:3000/login"),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/editor",
    );
  });
});
