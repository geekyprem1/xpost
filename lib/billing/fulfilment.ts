import type DodoPayments from "dodopayments";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function refundedAmount(
  payment: Pick<
    DodoPayments.Payment,
    "refund_status" | "refunds" | "total_amount" | "currency"
  >,
) {
  if (payment.refund_status === "full") return payment.total_amount;
  let total = 0;
  for (const refund of payment.refunds) {
    if (refund.status !== "succeeded") continue;
    if (
      refund.amount == null ||
      !Number.isSafeInteger(refund.amount) ||
      refund.amount < 0 ||
      (refund.currency && refund.currency !== payment.currency)
    )
      throw new Error("Invalid refund amount or currency");
    total += refund.amount;
  }
  if (total > payment.total_amount) throw new Error("Refund exceeds payment");
  if (payment.refund_status === "partial" && total === 0)
    throw new Error("Partial refund details missing");
  return total;
}

export async function fulfilDodoPayment(
  admin: SupabaseClient,
  payment: DodoPayments.Payment,
  environment: string,
  disputed = false,
) {
  if (payment.metadata?.app !== "shotlark") return;
  if (payment.status !== "succeeded") throw new Error("Payment is not settled");
  const id = z.uuid().parse(payment.metadata.order_id);
  const { data: order, error } = await admin
    .from("billing_orders")
    .select("user_id, product_id, price_cents")
    .eq("id", id)
    .single();
  if (error || !order) throw new Error("Order not found");
  // A deleted user's receipt is retained without granting access to another user.
  if (order.user_id && order.user_id !== payment.metadata.user_id)
    throw new Error("Order owner mismatch");
  const cart = payment.product_cart;
  if (
    !cart ||
    cart.length !== 1 ||
    cart[0].product_id !== order.product_id ||
    cart[0].quantity !== 1 ||
    payment.currency !== "USD" ||
    payment.total_amount !== order.price_cents
  )
    throw new Error("Payment product or price mismatch");
  const { error: fulfilError } = await admin.rpc("sync_dodo_order", {
    p_order_id: id,
    p_payment_id: payment.payment_id,
    p_product_id: cart[0].product_id,
    p_session_id: payment.checkout_session_id,
    p_total_amount: payment.total_amount,
    p_currency: payment.currency,
    p_refunded_amount: disputed
      ? payment.total_amount
      : refundedAmount(payment),
    p_environment: environment,
  });
  if (fulfilError) throw new Error("Payment fulfilment failed");
}
