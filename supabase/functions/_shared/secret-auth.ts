export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index++) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export function isAuthorizedCronRequest(
  request: Request,
  expected: string | null | undefined
): boolean {
  if (!expected || expected.length === 0) return false;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (provided.length === 0) return false;
  return timingSafeEqual(provided, expected);
}
