import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createDodoClient, billingReturnUrl } from "@/lib/billing/dodo";
import { BILLING_PRODUCTS, isProductKey } from "@/lib/billing/catalog";

export const instant = false;
const inputSchema = z
  .object({ product: z.string(), attempt: z.uuid() })
  .strict();

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email)
    return Response.json({ error: "Sign in to purchase." }, { status: 401 });
  if (process.env.DODO_PAYMENTS_ENABLED !== "true") {
    return Response.json(
      { error: "Payments are not available yet." },
      { status: 503 },
    );
  }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !isProductKey(input.data.product)) {
    return Response.json({ error: "Choose a valid product." }, { status: 400 });
  }
  const key = input.data.product;
  const product = BILLING_PRODUCTS[key];
  const productId = process.env[product.env];
  if (!productId)
    return Response.json(
      { error: "This product is not available yet." },
      { status: 503 },
    );

  try {
    const admin = createSupabaseAdminClient();
    const { data: allowed, error: limitError } = await admin.rpc(
      "hit_rate_limit",
      {
        p_user_id: user.id,
        p_bucket: "billing_checkout",
        p_max_hits: 10,
        p_window_sec: 60,
      },
    );
    if (limitError) throw limitError;
    if (!allowed)
      return Response.json(
        { error: "Please wait a minute before trying again." },
        { status: 429 },
      );
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("lifetime_editor")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (key === "lifetime" && profile.lifetime_editor) {
      return Response.json(
        { error: "You already own the Lifetime Editor." },
        { status: 409 },
      );
    }
    const dodo = createDodoClient();
    const configured = await dodo.products.retrieve(productId);
    const price = configured.price;
    if (
      price.type !== "one_time_price" ||
      price.currency !== "USD" ||
      price.price !== product.priceCents ||
      price.pay_what_you_want ||
      price.purchasing_power_parity ||
      price.discount ||
      price.discount_bps ||
      !price.tax_inclusive
    ) {
      console.error("Dodo product does not match catalog:", key);
      return Response.json(
        { error: "This product is temporarily unavailable." },
        { status: 503 },
      );
    }
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode";
    let query = admin
      .from("billing_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", environment);
    query =
      key === "lifetime"
        ? query.eq("product_key", key).eq("status", "pending")
        : query.eq("id", input.data.attempt);
    const { data: existing, error: existingError } = await query.maybeSingle();
    if (existingError) throw existingError;
    let order = existing;
    if (!order) {
      const { data, error } = await admin
        .from("billing_orders")
        .insert({
          id: input.data.attempt,
          user_id: user.id,
          product_key: key,
          product_id: productId,
          environment,
          credits: product.credits,
          price_cents: product.priceCents,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505")
          return Response.json(
            { error: "A checkout is already being prepared. Try again." },
            { status: 409 },
          );
        throw error;
      }
      order = data;
    }
    if (
      order.product_key !== key ||
      order.product_id !== productId ||
      order.status !== "pending"
    ) {
      return Response.json(
        { error: "Start a new checkout for this purchase." },
        { status: 409 },
      );
    }
    if (order.checkout_url) return Response.json({ url: order.checkout_url });
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_dodo_checkout",
      { p_order_id: order.id },
    );
    if (claimError) throw claimError;
    if (!claimed)
      return Response.json(
        { error: "Your checkout is being prepared. Try again in a moment." },
        { status: 409 },
      );
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user.email,
        name: user.user_metadata?.full_name ?? undefined,
      },
      metadata: { app: "shotlark", order_id: order.id, user_id: user.id },
      return_url: billingReturnUrl(order.id),
      feature_flags: {
        allow_currency_selection: false,
        allow_discount_code: false,
      },
    });
    if (!session.checkout_url) throw new Error("Checkout URL missing");
    const { error: saveError } = await admin
      .from("billing_orders")
      .update({
        checkout_session_id: session.session_id,
        checkout_url: session.checkout_url,
      })
      .eq("id", order.id)
      .eq("user_id", user.id);
    if (saveError) throw saveError;
    return Response.json({ url: session.checkout_url });
  } catch (error) {
    console.error(
      "Checkout setup failed:",
      error instanceof Error
        ? error.message
        : "database or configuration error",
    );
    return Response.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 503 },
    );
  }
}
