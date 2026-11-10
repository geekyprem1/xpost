# Dodo Payments setup

## Current implementation

- Official `dodopayments` SDK, pinned in `package.json`.
- Server-only client in `lib/billing/dodo.ts`; defaults to `test_mode`.
- Fixed return URL from `NEXT_PUBLIC_APP_URL`, with HTTPS required in live mode.
- Raw-body webhook verification in `lib/billing/dodo-webhook.ts`, including signature and timestamp validation through the official SDK.
- Tests cover valid, tampered, expired and unsigned payloads, missing keys, and environment configuration.

Implemented: authenticated checkout, signed webhook fulfilment, atomic payment/credit ledger, duplicate/reordered event handling, partial/full refunds and lost disputes, `/pricing`, homepage pricing, account payment confirmation, trial expiry, free watermark/1× export, and premium frame/photo/motion/export gates.

## Products (22 Oct decision)

| Product | USD, tax-inclusive, one-time | Credits | Environment variable |
| --- | --- | --- | --- |
| Lifetime Editor | $9.99 | 100 + lifetime editor access | `DODO_PRODUCT_LIFETIME` |
| 100 AI credits | $2.99 | 100 | `DODO_PRODUCT_CREDITS_100` |
| 500 AI credits | $8.99 | 500 | `DODO_PRODUCT_CREDITS_500` |

New users receive 5 credits and a 24-hour full editor trial from account creation. Afterward the basic editor remains available with the Shotlark watermark. Credit packs do not unlock premium editor features. There are no subscriptions.

## Configure credentials

Create or open your Dodo Payments account, switch to test mode, and create a test API key. Add it directly to `.env.local` (and later Vercel), never to chat or version control:

```dotenv
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_ENABLED=false
DODO_PRODUCT_LIFETIME=
DODO_PRODUCT_CREDITS_100=
DODO_PRODUCT_CREDITS_500=
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

Create three one-time products in Dodo with the exact prices above, currency USD, tax-inclusive pricing, no discounts, no pay-what-you-want and no purchasing-power-parity pricing. Checkout validates these settings against the server catalog before creating a session. Use the corresponding product IDs in the environment variables.

## Apply database migration

Apply `supabase/migrations/20261022090000_dodo_billing.sql` after all earlier migrations, using Supabase SQL Editor or your normal migration workflow. It adds `billing_orders`, `lifetime_editor`, `credit_debt`, and service-only fulfilment/checkout-claim RPCs. Deploy the updated `ai-generate` and `ai-refine` functions for the new insufficient-credits message.

All AI credits now share a non-expiring balance. Existing balances are retained; new accounts start at 5. `reset_monthly_credits()` becomes a no-op, so the existing cron cannot erase a paid balance. `credits_reset_at` remains only for backwards compatibility. Existing accounts use their original creation time for trial eligibility.

## Webhook and activation

1. Deploy the app with payments disabled and the migration applied.
2. In Dodo, add an HTTPS webhook endpoint: `https://YOUR_DOMAIN/api/billing/webhook`.
3. Subscribe to `payment.succeeded`, `refund.succeeded`, and `dispute.lost`.
4. Put its signing secret in `DODO_PAYMENTS_WEBHOOK_KEY` on Vercel. Keep test/live credentials and product IDs separate.
5. Enable `DODO_PAYMENTS_ENABLED=true` in the test environment and redeploy/restart.
6. Test a completed purchase, cancellation, duplicate delivery, refund and lifetime re-purchase prevention. Use a separate local/staging Supabase database or disposable test users: test payments also grant credits in the configured database.
7. For production, use `live_mode`, live API/signing keys and live product IDs, and set `NEXT_PUBLIC_APP_URL` to your HTTPS domain.

An account return URL is not proof of payment. The account page polls the owned order while the webhook retrieves current payment state from Dodo and commits fulfilment. Failed database writes return HTTP 500 so delivery can retry. Repeated payment events grant only once; older deliveries cannot reverse a newer refund.

Partial refunds revoke bundled credits proportionally (rounded up); a full refund/lost dispute also revokes lifetime access. If refunded credits were already used, a credit debt is recorded and settled by future top-ups or AI failure refunds. These adjustments are shown on the account page. Editor gates operate in the browser because rendering is local; they are not DRM against modified clients. AI credit consumption and billing writes remain server-controlled.

The reference's count of 20 premium photos is not advertised: this build uses the existing photo-search backgrounds. The reference's Creem footer is replaced with Dodo Payments.

## Verification

Automated checks include signature/timestamp validation, checkout auth/origin/allowlist boundaries, trial expiry, export gates, fulfilment validation, and pgTAP purchase/refund/ledger/RLS checks. Real Dodo test checkout and visual browser verification require credentials and a browser connection; they have not been performed in this session.

## References

- [Official SDK](https://github.com/dodopayments/dodopayments-typescript)
- [Checkout Sessions](https://docs.dodopayments.com/api-reference/checkout-sessions/create)
- [Webhook verification](https://docs.dodopayments.com/developer-resources/webhooks)
