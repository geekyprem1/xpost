# Dodo approval readiness — 22 October 2026

Status: **not ready to submit yet**. This is a repository audit; the deployed site, support inbox and Dodo dashboard have not been verified.

Source: [Dodo Account Verification — Preparing Your Website](https://docs.dodopayments.com/miscellaneous/verification-process#preparing-your-website).

## Website checklist

| Item | Repository status | Remaining work |
| --- | --- | --- |
| Product homepage | Present, `/` | Publish and verify actual production URL without signing in |
| Pricing | Present, `/pricing` and homepage | Confirm deployed prices and products match the Dodo form |
| Terms | Present, `/terms` | Owner review of commercial terms and public operator details |
| Privacy | Present, `/privacy` | Owner review; corrected legacy direct-X-posting claims |
| Refund and Cancellation Policy | Existing `/terms#payments-and-refunds` explains the process and no recurring subscription | Owner must choose eligibility/window; dedicated policy page pending that decision |
| Contact route | Added `/contact`; `support@shotlark.pro` | Confirm inbox is active and monitored; no email was sent during this audit |
| Consistent policy navigation | Shared footer on homepage, pricing, contact, Terms and Privacy | Refund link currently points to the Terms section; move to dedicated page when policy is finalized |
| Digital fulfilment | Explained on Contact page | Verify that a real test purchase activates access/credits |
| Public live website | Unverified | `NEXT_PUBLIC_APP_URL` is blank locally; confirm production domain and HTTPS |

The support email domain suggests `shotlark.pro`, but this is not confirmed as the production URL. A web lookup could not open that address; this does not establish that the site is down.

## Before submitting the product form

- Finalize refund eligibility/window and publish the Refund/Cancellation page.
- Confirm support inbox and public operator details; use the same product/business identity in the form and site.
- Deploy these changes to the correct HTTPS production domain and test all public policy links without an account.
- Verify Google sign-in, trial access and that the reviewer can actually use the editor. Provide demo access if the review team requests it.
- Describe the product and delivery accurately: browser-based screenshot editing, AI post writing, one-time editor licence and separate AI usage credits; automatic access after payment confirmation.
- Complete the required Dodo product information, identity and bank verification forms; registered entities also need business verification. Keep identity/bank documents in Dodo's dashboard, not repository files or chat.

## Before accepting payments

- Apply `20261022090000_dodo_billing.sql` to hosted Supabase; deploy the updated AI functions.
- Configure three correctly priced Dodo products, mode-specific API/webhook keys, product IDs, `NEXT_PUBLIC_APP_URL`, and webhook events. See `DODO_PAYMENTS.md`.
- Run real Dodo test-mode purchases for lifetime and both packs; check cancellation, duplicate delivery and refunds. Automated tests are already green, but no provider checkout has been completed in this session.
- Verify production account status and editor access after a payment, and the 24-hour trial boundary.
- Enable live checkout only with live-mode products/credentials and the required Dodo verification completed.

## Remaining product work (not approval blockers by itself)

The user reports Projects/Layers manual QA is completed. Share-image quality, Copy image & open X, and one-time billing have been implemented.

Next: motion share buttons, post versions, post language, editable preview identity, sample screenshots and analytics. Guest mode and Studio V2 polish remain on the roadmap. Templates, camera motion, code-to-image, AI variants, voice samples and auto-redact are later differentiators; referral and Chrome extension are later growth features. These are not prerequisites listed in Dodo's website checklist.

Launch operations still require error monitoring, CI/CD, production auth/email configuration, a security/dependency review, and a smoke test of the latest payment changes. Billing/pricing roadmap entries supersede the older planned recurring Pro subscription.
