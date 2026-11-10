import { afterEach, describe, expect, it, vi } from "vitest";
import type DodoPayments from "dodopayments";
import type { SupabaseClient } from "@supabase/supabase-js";
import { editorAccess, isProductKey } from "./catalog";
import { billingScene, useBillingStore } from "./access-store";
import { refundedAmount, fulfilDodoPayment } from "./fulfilment";
import { createDefaultScene } from "@/lib/scene";
import { startImageExport, startGifExport } from "@/lib/renderer/export-client";

afterEach(() => useBillingStore.getState().setProfile(null));

describe("billing rules", () => {
  it("ends the 24-hour trial at the exact boundary, while lifetime survives", () => {
    const profile = {
      lifetime_editor: false,
      created_at: "2026-10-22T00:00:00Z",
    };
    const end = Date.parse("2026-10-23T00:00:00Z");
    expect(editorAccess(profile, end - 1).pro).toBe(true);
    expect(editorAccess(profile, end).pro).toBe(false);
    expect(
      editorAccess({ ...profile, lifetime_editor: true }, end + 100000).pro,
    ).toBe(true);
    expect(editorAccess(null).pro).toBe(false);
    expect(editorAccess({ ...profile, created_at: "invalid" }).pro).toBe(false);
    expect(isProductKey("__proto__")).toBe(false);
  });

  it("forces basic frames, static backgrounds and watermark without changing saved scene", () => {
    const scene = createDefaultScene();
    scene.frame.kind = "browser";
    scene.watermark = false;
    scene.background = {
      kind: "image",
      src: { url: "https://example.com/bg.png" },
      blur: 0,
    } as typeof scene.background;
    const free = billingScene(scene, false);
    expect(free.frame.kind).toBe("screenshot");
    expect(free.background.kind).toBe("solid");
    expect(free.watermark).toBe(true);
    expect(scene.frame.kind).toBe("browser");
    expect(billingScene(scene, true)).toBe(scene);
  });

  it("enforces free export scale and rejects animation through the export API", async () => {
    const runMain = vi.fn(async () => ({
      blob: new Blob(),
      width: 1,
      height: 1,
      ms: 1,
    }));
    const scene = createDefaultScene();
    scene.watermark = false;
    await startImageExport(
      scene,
      {},
      { format: "png", scale: 3 },
      {},
      { supported: () => false, runMain },
    ).promise;
    expect(runMain.mock.calls[0]).toEqual([
      expect.objectContaining({ watermark: true }),
      {},
      { format: "png", scale: 1 },
    ]);
    await expect(
      startGifExport(
        scene,
        {},
        {
          maxWidth: 1280,
          maxHeight: 1080,
          fps: 15,
          durationSeconds: 5,
          maxFrames: 75,
          dither: false,
        },
      ).promise,
    ).rejects.toThrow("Lifetime Editor");
  });
});

const payment = {
  status: "succeeded",
  payment_id: "pay_test",
  checkout_session_id: "cks_test",
  currency: "USD",
  total_amount: 999,
  metadata: {
    app: "shotlark",
    order_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    user_id: "user-a",
  },
  product_cart: [{ product_id: "prod_lifetime", quantity: 1 }],
  refunds: [],
} as unknown as DodoPayments.Payment;

function mockAdmin() {
  const rpc = vi.fn(async () => ({ error: null }));
  const single = vi.fn(async () => ({
    data: { user_id: "user-a", product_id: "prod_lifetime", price_cents: 999 },
    error: null,
  }));
  const eq = vi.fn(() => ({ single }));
  return {
    client: {
      from: () => ({ select: () => ({ eq }) }),
      rpc,
    } as unknown as SupabaseClient,
    rpc,
  };
}

describe("payment fulfilment", () => {
  it("validates ownership and product before requesting an atomic grant", async () => {
    const { client, rpc } = mockAdmin();
    await fulfilDodoPayment(client, payment, "test_mode");
    expect(rpc).toHaveBeenCalledWith(
      "sync_dodo_order",
      expect.objectContaining({
        p_order_id: payment.metadata.order_id,
        p_refunded_amount: 0,
        p_total_amount: 999,
      }),
    );
    await expect(
      fulfilDodoPayment(
        client,
        {
          ...payment,
          metadata: { ...payment.metadata, user_id: "other-user" },
        },
        "test_mode",
      ),
    ).rejects.toThrow("owner");
    await expect(
      fulfilDodoPayment(client, { ...payment, total_amount: 1 }, "test_mode"),
    ).rejects.toThrow("price mismatch");
    await expect(
      fulfilDodoPayment(
        client,
        { ...payment, product_cart: [{ product_id: "wrong", quantity: 1 }] },
        "test_mode",
      ),
    ).rejects.toThrow("product");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("reconciles succeeded refunds only and rejects incomplete financial data", () => {
    const refund = {
      status: "succeeded",
      amount: 100,
      currency: "USD",
    } as DodoPayments.RefundListItem;
    expect(
      refundedAmount({
        ...payment,
        refund_status: "partial",
        refunds: [refund, { ...refund, status: "failed" }],
      }),
    ).toBe(100);
    expect(refundedAmount({ ...payment, refund_status: "full" })).toBe(999);
    expect(() =>
      refundedAmount({ ...payment, refund_status: "partial" }),
    ).toThrow("missing");
    expect(() =>
      refundedAmount({ ...payment, refunds: [{ ...refund, amount: 1000 }] }),
    ).toThrow("exceeds");
  });

  it("does not fulfil unrelated payments and revokes a lost dispute in full", async () => {
    const { client, rpc } = mockAdmin();
    await fulfilDodoPayment(client, { ...payment, metadata: {} }, "test_mode");
    expect(rpc).not.toHaveBeenCalled();
    await fulfilDodoPayment(client, payment, "test_mode", true);
    expect(rpc).toHaveBeenCalledWith(
      "sync_dodo_order",
      expect.objectContaining({ p_refunded_amount: 999 }),
    );
  });
});
