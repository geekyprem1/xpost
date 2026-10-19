import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // OAuth failures come back as ?error=...&error_description=... with no code.
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error(
      "[auth/callback] provider error:",
      providerError,
      searchParams.get("error_code"),
      searchParams.get("error_description"),
    );
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/editor`);
    }
    console.error("[auth/callback] code exchange failed:", error.message);
  } else {
    console.error("[auth/callback] no code in callback URL");
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
