export type ErrorCode =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INSUFFICIENT_CREDITS"
  | "UPSTREAM_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "NOT_FOUND";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INSUFFICIENT_CREDITS: 429,
  UPSTREAM_ERROR: 502,
  SERVICE_UNAVAILABLE: 503,
  NOT_FOUND: 404,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify({ error: { code, message, ...extra } }), {
    status: STATUS[code],
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
