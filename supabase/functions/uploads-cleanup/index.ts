import { handleOptions, withCors } from "../_shared/cors.ts";
import { handle } from "./handle.ts";

// NOTE: ye function Supabase ke platform-level JWT gate ke bina chalta hai
// (`--no-verify-jwt` se deploy karo) — apni auth x-cron-secret header se hoti hai.
Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  return withCors(request, await handle(request));
});
