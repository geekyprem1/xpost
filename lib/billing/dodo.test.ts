import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { billingReturnUrl, createDodoClient } from "./dodo";
import { verifyDodoWebhook } from "./dodo-webhook";

const secret = Buffer.from("shotlark-test-webhook-signing-secret");
const body = JSON.stringify({
  type: "payment.succeeded",
  data: { payment_id: "pay_test" },
});

function signedHeaders(timestamp = Math.floor(Date.now() / 1000)) {
  const id = "msg_test";
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${signature}`,
  });
}

beforeEach(() => {
  vi.stubEnv("DODO_PAYMENTS_API_KEY", "test-only");
  vi.stubEnv("DODO_PAYMENTS_WEBHOOK_KEY", `whsec_${secret.toString("base64")}`);
  vi.stubEnv("DODO_PAYMENTS_ENVIRONMENT", "test_mode");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:3000");
});
afterEach(() => vi.unstubAllEnvs());

describe("Dodo foundation", () => {
  it("selects test mode explicitly and rejects unknown environments", () => {
    expect(createDodoClient().baseURL).toBe("https://test.dodopayments.com");
    vi.stubEnv("DODO_PAYMENTS_ENVIRONMENT", "live");
    expect(createDodoClient).toThrow("test_mode or live_mode");
  });

  it("uses only the configured return origin and requires HTTPS for live mode", () => {
    expect(billingReturnUrl()).toBe(
      "http://127.0.0.1:3000/account?checkout=returned",
    );
    vi.stubEnv("DODO_PAYMENTS_ENVIRONMENT", "live_mode");
    expect(billingReturnUrl).toThrow("HTTPS");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shotlark.example/path");
    expect(billingReturnUrl()).toBe(
      "https://shotlark.example/account?checkout=returned",
    );
  });

  it("verifies an authentic signature", () => {
    expect(verifyDodoWebhook(body, signedHeaders()).type).toBe(
      "payment.succeeded",
    );
  });

  it("rejects altered payloads, expired deliveries, and missing headers", () => {
    expect(() =>
      verifyDodoWebhook(body.replace("pay_test", "pay_fake"), signedHeaders()),
    ).toThrow();
    expect(() =>
      verifyDodoWebhook(
        body,
        signedHeaders(Math.floor(Date.now() / 1000) - 1000),
      ),
    ).toThrow();
    expect(() => verifyDodoWebhook(body, new Headers())).toThrow("Missing");
  });

  it("fails closed when credentials are missing", () => {
    vi.stubEnv("DODO_PAYMENTS_WEBHOOK_KEY", "");
    expect(() => verifyDodoWebhook(body, signedHeaders())).toThrow(
      "not configured",
    );
    vi.stubEnv("DODO_PAYMENTS_API_KEY", "");
    expect(createDodoClient).toThrow("not configured");
  });
});
