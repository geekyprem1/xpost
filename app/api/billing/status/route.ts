import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { editorAccess } from "@/lib/billing/catalog";

export const instant = false;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to view billing." },
      { status: 401 },
    );
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("ai_credits, lifetime_editor, created_at, credit_debt")
    .eq("id", user.id)
    .single();
  if (error)
    return Response.json(
      { error: "Billing is temporarily unavailable." },
      { status: 503 },
    );
  const id = new URL(request.url).searchParams.get("order");
  let order = null;
  if (id) {
    if (!z.uuid().safeParse(id).success)
      return Response.json({ error: "Invalid order." }, { status: 400 });
    const { data, error: orderError } = await supabase
      .from("billing_orders")
      .select("id, product_key, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (orderError)
      return Response.json(
        { error: "Unable to check payment." },
        { status: 503 },
      );
    if (!data)
      return Response.json({ error: "Order not found." }, { status: 404 });
    order = data;
  }
  return Response.json(
    { profile, access: editorAccess(profile), order },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
