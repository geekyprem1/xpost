export const BILLING_PRODUCTS = {
  lifetime: {
    name: "Lifetime Editor",
    priceCents: 999,
    credits: 100,
    env: "DODO_PRODUCT_LIFETIME",
  },
  credits100: {
    name: "100 AI credits",
    priceCents: 299,
    credits: 100,
    env: "DODO_PRODUCT_CREDITS_100",
  },
  credits500: {
    name: "500 AI credits",
    priceCents: 899,
    credits: 500,
    env: "DODO_PRODUCT_CREDITS_500",
  },
} as const;
export type ProductKey = keyof typeof BILLING_PRODUCTS;
export const TRIAL_HOURS = 24;
export const STARTING_CREDITS = 5;

export function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && Object.hasOwn(BILLING_PRODUCTS, value);
}

export type BillingProfile = { lifetime_editor: boolean; created_at: string };
export function editorAccess(profile: BillingProfile | null, now = Date.now()) {
  if (!profile) return { pro: false, lifetime: false, trialEndsAt: null };
  const trialEndsAt = Date.parse(profile.created_at) + TRIAL_HOURS * 3600_000;
  return {
    pro: profile.lifetime_editor || now < trialEndsAt,
    lifetime: profile.lifetime_editor,
    trialEndsAt: Number.isFinite(trialEndsAt) ? trialEndsAt : null,
  };
}
