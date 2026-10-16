const DEFAULT_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"];

export function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  const extra = configured
    ? configured
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
  return [...DEFAULT_ORIGINS, ...extra];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function originMatches(entry: string, origin: string): boolean {
  if (entry === "*") return true;
  if (!entry.includes("*")) return entry === origin;
  const pattern = new RegExp(
    "^" + entry.split("*").map(escapeRegex).join(".*") + "$"
  );
  return pattern.test(origin);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
  const match = getAllowedOrigins().find((entry) => originMatches(entry, origin));
  if (match && origin) {
    headers["Access-Control-Allow-Origin"] = match === "*" ? "*" : origin;
  }
  return headers;
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
