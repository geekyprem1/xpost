import "server-only";
import DodoPayments from "dodopayments";

/** Explicit test/live selection prevents accidentally creating live charges. */
export function createDodoClient() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode";
  if (!bearerToken) throw new Error("Dodo Payments API key is not configured.");
  if (environment !== "test_mode" && environment !== "live_mode") {
    throw new Error(
      "DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode.",
    );
  }
  return new DodoPayments({
    bearerToken,
    environment,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    timeout: 15_000,
    maxRetries: 0,
  });
}

export function billingReturnUrl(orderId?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) throw new Error("Application URL is not configured.");
  const url = new URL(configured);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Application URL is invalid.");
  }
  if (
    process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" &&
    url.protocol !== "https:"
  ) {
    throw new Error("Live payments require an HTTPS application URL.");
  }
  // Never build the checkout return URL from client input or a Host header.
  const target = new URL("/account?checkout=returned", url.origin);
  if (orderId) target.searchParams.set("order", orderId);
  return target.toString();
}
