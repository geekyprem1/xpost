import { handleOptions, withCors } from "../_shared/cors.ts";
import { withSupabase } from "../_shared/supabase.ts";
import { handle } from "./handle.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  const wrapped = withSupabase(handle);
  return withCors(request, await wrapped(request));
});
