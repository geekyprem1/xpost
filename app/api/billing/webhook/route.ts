import { verifyDodoWebhook } from "@/lib/billing/dodo-webhook";
import { createDodoClient } from "@/lib/billing/dodo";
import { fulfilDodoPayment } from "@/lib/billing/fulfilment";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const instant = false;

export async function POST(request: Request) {
  if (
    !process.env.DODO_PAYMENTS_WEBHOOK_KEY ||
    !process.env.DODO_PAYMENTS_API_KEY
  ) {
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }
  const body = await request.text();
  if (body.length > 1024 * 1024) return new Response(null, { status: 413 });
  let event;
  try {
    event = verifyDodoWebhook(body, request.headers);
  } catch {
    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  try {
    let paymentId: string;
    if (event.type === "payment.succeeded") paymentId = event.data.payment_id;
    else if (event.type === "refund.succeeded" || event.type === "dispute.lost")
      paymentId = event.data.payment_id;
    else return Response.json({ received: true });
    // Re-read current provider state so reordered delivery cannot restore a refund.
    const payment = await createDodoClient().payments.retrieve(paymentId);
    await fulfilDodoPayment(
      createSupabaseAdminClient(),
      payment,
      process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode",
      event.type === "dispute.lost",
    );
    return Response.json({ received: true });
  } catch {
    console.error("Dodo fulfilment failed; delivery will be retried.");
    return Response.json({ error: "Please retry delivery." }, { status: 500 });
  }
}
