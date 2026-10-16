import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.118.0";
import { errorResponse } from "./errors.ts";

export type SupabaseContext = {
  userId: string;
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
};

function projectUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL missing");
  return url;
}

function publishableKey(): string {
  return (
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    ""
  );
}

function secretKey(): string {
  return (
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    ""
  );
}

export function createAdminClient(): SupabaseClient {
  return createClient(projectUrl(), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type UserHandler = (
  ctx: SupabaseContext,
  request: Request
) => Promise<Response>;

export function withSupabase(handler: UserHandler) {
  return async (request: Request): Promise<Response> => {
    const authHeader = request.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return errorResponse("UNAUTHENTICATED", "Missing bearer token");
    }
    const token = authHeader.slice("Bearer ".length);
    const supabase = createClient(projectUrl(), publishableKey(), {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return errorResponse("UNAUTHENTICATED", "Invalid or expired token");
    }
    return handler(
      { userId: data.user.id, supabase, supabaseAdmin: createAdminClient() },
      request
    );
  };
}
