import "server-only";
import { createDodoClient } from "./dodo";

/** The raw body must be passed unchanged; JSON reserialization breaks signatures. */
export function verifyDodoWebhook(body: string, headers: Headers) {
  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    throw new Error("Dodo Payments webhook signing key is not configured.");
  }
  const verifiedHeaders: Record<string, string> = {};
  for (const name of ["webhook-id", "webhook-signature", "webhook-timestamp"]) {
    const value = headers.get(name);
    if (!value) throw new Error("Missing webhook signature headers.");
    verifiedHeaders[name] = value;
  }
  return createDodoClient().webhooks.unwrap(body, { headers: verifiedHeaders });
}
