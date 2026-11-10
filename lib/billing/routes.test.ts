import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  verify: vi.fn(),
  retrieve: vi.fn(),
  fulfil: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({}),
}));
vi.mock("@/lib/billing/dodo", () => ({
  createDodoClient: () => ({ payments: { retrieve: mocks.retrieve } }),
  billingReturnUrl: () => "https://example.com/account",
}));
vi.mock("@/lib/billing/dodo-webhook", () => ({
  verifyDodoWebhook: mocks.verify,
}));
vi.mock("@/lib/billing/fulfilment", () => ({
  fulfilDodoPayment: mocks.fulfil,
}));

import { POST as checkout } from "../../app/api/billing/checkout/route";
import { POST as webhook } from "../../app/api/billing/webhook/route";

beforeEach(() => {
  mocks.user = null;
  mocks.verify.mockReset();
  mocks.retrieve.mockReset();
  mocks.fulfil.mockReset();
  vi.stubEnv("DODO_PAYMENTS_ENABLED", "true");
  vi.stubEnv("DODO_PAYMENTS_API_KEY", "test");
  vi.stubEnv("DODO_PAYMENTS_WEBHOOK_KEY", "test");
});
afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown, origin = "https://example.com") =>
  new Request("https://example.com/api/billing/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("checkout boundary", () => {
  it("rejects cross-origin requests and requires a verified user", async () => {
    expect((await checkout(request({}, "https://evil.example"))).status).toBe(
      403,
    );
    expect((await checkout(request({}))).status).toBe(401);
  });
  it("rejects client-selected prices and credits", async () => {
    mocks.user = { id: "user-a", email: "a@example.com" };
    const response = await checkout(
      request({
        product: "lifetime",
        attempt: crypto.randomUUID(),
        price: 1,
        credits: 9999,
      }),
    );
    expect(response.status).toBe(400);
  });
  it("fails closed when billing is disabled", async () => {
    mocks.user = { id: "user-a", email: "a@example.com" };
    vi.stubEnv("DODO_PAYMENTS_ENABLED", "false");
    expect((await checkout(request({}))).status).toBe(503);
  });
});

describe("webhook acknowledgement", () => {
  const delivery = () =>
    new Request("https://example.com/api/billing/webhook", {
      method: "POST",
      body: "signed body",
    });
  it("does not process an invalid signature", async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    expect((await webhook(delivery())).status).toBe(401);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it("requests retries when durable fulfilment fails", async () => {
    mocks.verify.mockReturnValue({
      type: "payment.succeeded",
      data: { payment_id: "pay_test" },
    });
    mocks.retrieve.mockResolvedValue({ payment_id: "pay_test" });
    mocks.fulfil.mockRejectedValue(new Error("Database offline"));
    expect((await webhook(delivery())).status).toBe(500);
  });
  it("reconciles successful refunds from current provider state", async () => {
    mocks.verify.mockReturnValue({
      type: "refund.succeeded",
      data: { payment_id: "pay_test" },
    });
    mocks.retrieve.mockResolvedValue({ payment_id: "pay_test" });
    mocks.fulfil.mockResolvedValue(undefined);
    expect((await webhook(delivery())).status).toBe(200);
    expect(mocks.retrieve).toHaveBeenCalledWith("pay_test");
    expect(mocks.fulfil).toHaveBeenCalledTimes(1);
  });
});
