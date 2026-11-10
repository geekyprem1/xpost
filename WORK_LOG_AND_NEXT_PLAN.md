# Shotlark — Kaam ka status aur aage ka plan

**Updated:** 22 October 2026  
**Project:** `C:\Users\user\Documents\x poster saas`

## 1. Abhi overall status kya hai?

Core editor pehle se bana hua hai. Recent work mein high-quality sharing, screenshot ke hisaab se one-time pricing, Dodo Payments integration, trial/access rules aur legal-page improvements implement kiye hain.

**Code ready hone aur production par active hone mein farq hai:** hosted Supabase migration, Dodo dashboard configuration, production deployment aur actual payment test abhi pending hain. Dodo approval ke liye bhi refund policy aur live website/support details final karni hain.

Latest changes abhi local working tree mein hain; commit/push/deploy nahi hue. Is work se pehle `git push origin main` chalaya tha aur us waqt repository already up to date thi.

## 2. Pehle se kya bana hua tha?

- Screenshot upload, drag/drop aur paste.
- Backgrounds, frames, styles, layout aur lighting controls.
- Text layers, annotations, manual redaction, crop aur auto-trim.
- Brand kit, custom watermark aur platform sizes.
- Image, GIF aur video export engine.
- AI generation/refinement, credits aur X compose sharing.
- Projects dashboard, cloud save, offline cache aur conflict handling.
- Classic editor aur separate `/editor-v2` shell.

**User ne Projects/Layers ki manual QA complete hone ki confirmation di hai.** Isko bina kisi naye issue ke dobara pending mat maana jaaye. Recent billing/access changes ki focused testing alag pending hai.

## 3. Is conversation mein kya implement kiya?

### A. High-quality image sharing

- AI panel ka image download/copy ab chhote 1024px AI preview se nahi, actual export renderer se hota hai.
- JPEG normally 2× par prepare hota hai; 5 MB limit cross hone par quality/scale step down hota hai.
- Clipboard PNG mein 2× → 1.5× → 1× fallback hai.
- Scene, screenshot, watermark aur paid/trial access badalne par share cache invalidate hota hai.
- AI panel open hone aur 600ms idle ke baad share image prepare hoti hai.
- `Copy image & open X` button add kiya: clipboard write aur X compose opening same click mein start hote hain.
- Clipboard fail ho to JPEG download hota hai aur attachment hint dikhta hai.
- Oversized PNG hone par JPEG download aur text-only Open in X available rehte hain.
- Actual AI requests ke liye chhota capture alag rakha hai.

Main files: `lib/editor/share-image.ts`, `lib/editor/use-share-images.ts`, `components/editor/right-panel.tsx`.

### B. Pricing model — user ke screenshot ke hisaab se

| Offer | Price | Kya milta hai |
| --- | --- | --- |
| Free trial | $0 | Account creation se 24-hour full editor trial + 5 AI credits |
| Lifetime Editor | $9.99 one-time | Paid editor access + 100 AI credits |
| Credit pack | $2.99 one-time | 100 AI credits |
| Credit pack | $8.99 one-time | 500 AI credits |

- Prices USD, tax-inclusive configuration ke liye hain.
- Credits expire nahi hote; generation/refinement ek credit use karte hain.
- Credit packs editor features unlock nahi karte.
- Recurring subscription nahi hai; trial automatic paid purchase mein convert nahi hota.
- Trial ke baad basic static editor/export watermark ke saath available hai.
- Frames, photo/motion backgrounds, clean/high-resolution aur animated exports trial/lifetime access se gated hain.
- Existing credit balances retain hote hain. New accounts ke liye 5 credits hain.
- Purana monthly reset migration ke baad no-op ho jaata hai, taaki paid credits erase na hon.
- Reference ki Creem branding ko Dodo Payments se replace kiya. Reference ka “20 premium photos” count advertise nahi kiya; existing photo-search backgrounds use hote hain.

**Yeh one-time model purane roadmap ke monthly/yearly Pro subscription plan ko replace karta hai.**

### C. Dodo Payments implementation

- Official SDK exact version par install/pin kiya.
- Server-only client, test/live mode selection aur configured return URL.
- Authenticated checkout; product, amount aur credits client ke control mein nahi hain.
- Origin check, checkout rate limit aur concurrent checkout claim.
- Dodo product price/currency/settings ko server catalog se validate kiya jaata hai.
- Raw webhook body ki signature aur timestamp verification.
- `payment.succeeded`, `refund.succeeded` aur `dispute.lost` handling.
- Fulfilment se pehle Dodo se current payment state retrieve hoti hai.
- Atomic database transaction mein order, credits aur lifetime access update hote hain.
- Duplicate deliveries dobara credits grant nahi karti; stale events newer refund ko reverse nahi karte.
- Partial/full refunds aur lost disputes credits/access adjust karte hain.
- Already-used refunded credits ke liye debt record hota hai; future credits se settle hota hai.
- Account page payment confirmation poll karti hai; return URL apne aap payment proof nahi hai.
- Google sign-in ke baad purchase visitor pricing page par return kar sakta hai.
- `.env.example` mein Dodo configuration names add kiye; checkout default se disabled hai.

| Area | Files/routes |
| --- | --- |
| Catalog, access aur fulfilment | `lib/billing/` |
| Checkout | `/api/billing/checkout` |
| Signed webhook | `/api/billing/webhook` |
| Account status | `/api/billing/status` |
| Billing UI | `components/billing/` |
| Hosted DB migration pending | `supabase/migrations/20261022090000_dodo_billing.sql` |
| DB tests | `supabase/tests/06_billing_test.sql` |

Editor rendering browser mein hoti hai: editor gates modified clients ke against DRM nahi hain. AI credits aur billing database writes server-controlled hain.

### D. Website, legal pages aur approval audit

- `/pricing` page aur homepage pricing section add kiya.
- `/contact` page add kiya, jisme support aur digital delivery explain hai.
- Terms/Privacy ko one-time purchases, non-expiring credits aur Dodo processing se align kiya.
- Purane X-account connection, access-token aur direct-posting claims correct kiye; current flow X compose kholta hai aur user X par publish karta hai.
- AI generation aur text refinement ke data-sharing descriptions correct kiye.
- Homepage, pricing, contact, Terms aur Privacy par shared footer add kiya.
- Footer mein Pricing, Terms, Privacy, Refunds/Cancellation aur Contact links hain.
- Refund link abhi `/terms#payments-and-refunds` par jaata hai. Dedicated refund policy abhi final nahi hai.
- Effective date 22 October 2026 update ki.

Public contact currently `support@shotlark.pro` hai, lekin inbox active/monitored hai ya nahi, verify nahi hua. Final production URL bhi confirm nahi hua; local `NEXT_PUBLIC_APP_URL` blank mila tha.

## 4. Kya verify ho chuka hai?

| Check | Last recorded result |
| --- | --- |
| App unit/route tests, billing implementation ke baad | 353 passed |
| Supabase database tests | 6 files, 78 assertions passed |
| Typecheck, latest legal/contact changes ke baad | Passed |
| Production build, latest legal/contact changes ke baad | Passed |
| ESLint | 0 errors; 5 existing warnings |
| Git whitespace check | Passed |
| Pricing server response, billing phase mein | HTTP 200; heading aur offers rendered |

Database migration/tests isolated temporary local Supabase instance par chalaye. Doosre running project ko stop/change nahi kiya. Temporary billing test containers/data baad mein remove kar diye.

**Abhi verify nahi hua:** actual Dodo test checkout, production deployment, hosted DB migration, active support inbox, browser visual/mobile check aur latest payment changes ka real-account end-to-end flow. Browser connection available nahi thi. Automated checks ko live payment test na maana jaaye.

## 5. Next plan — priority ke hisaab se

### P0 — Dodo submission ke liye website final karo

- [ ] User se refund eligibility/window final karna.
- [ ] Dedicated Refund/Cancellation page banana aur Terms/footer links align karna.
- [ ] Final HTTPS production URL confirm karna.
- [ ] `support@shotlark.pro` active aur monitored hai, confirm karna.
- [ ] Public legal operator/business details, agar add karne hain, user se lena; invent nahi karna.
- [ ] Latest changes review, commit/push aur correct production domain par deploy karna.
- [ ] Logged-out visitor ke liye homepage, Pricing, Terms, Privacy, Contact aur refund links check karna.
- [ ] Production Google login aur usable trial/editor access check karna.
- [ ] Dodo Product Information Form mein description, prices aur delivery method site se match rakhna.
- [ ] Required identity/bank verification aur applicable business verification Dodo dashboard mein complete karna.

**Refund decision abhi pending hai.** User se issue-based/case-by-case, 7-day ya 14-day policy ki preference poochhi gayi hai. Koi option select nahi hua; koi nayi money-back guarantee assume nahi karni.

### P1 — Payment configuration aur provider testing

- [ ] Hosted Supabase par billing migration apply karna.
- [ ] Updated `ai-generate` aur `ai-refine` functions deploy karna.
- [ ] Dodo dashboard mein 3 one-time products exact catalog settings ke saath banana.
- [ ] API key, webhook signing key, environment, product IDs aur app URL configure karna.
- [ ] HTTPS webhook endpoint aur required events configure karna.
- [ ] Isolated/staging database ya disposable test users par actual Dodo test purchases karna.
- [ ] Lifetime aur dono credit packs ka fulfilment verify karna.
- [ ] Cancellation, duplicate event, refund aur account access/balance changes verify karna.
- [ ] Trial expiry aur free watermark/export rules ka focused browser check karna.
- [ ] Dodo verification complete hone aur successful testing ke baad live keys/products se checkout enable karna.

Detailed commands/settings: [DODO_PAYMENTS.md](DODO_PAYMENTS.md).

### P2 — Launch operations

- [ ] Error monitoring aur cost visibility.
- [ ] Analytics events.
- [ ] CI/CD checks aur deployment workflow.
- [ ] Production auth URLs, Google OAuth aur applicable email/SMTP settings verify karna.
- [ ] Security/dependency review aur production environment checks.
- [ ] Latest UI/payment changes ka mobile, accessibility aur cross-browser smoke test.

### P3 — Next product improvements

1. AI Studio mein direct MP4/GIF share/download buttons.
2. Post versions: purane AI results aur manual edits par back/forward.
3. English/Hindi/Hinglish/Match prompt language selection.
4. Preview name, handle aur avatar editing.
5. Try-a-sample screenshots.
6. Guest flow, agar current protected-editor model ko change karna ho.
7. Studio V2 panel UX, command palette, responsive drawers aur polish.
8. Pending Pixabay selected-photo caching follow-up.

### P4 — Baad ke differentiators aur growth

- Camera motion aur text entrance animations.
- Templates, text cards aur code-to-image.
- AI variants, voice samples, alt text aur post checklist.
- OCR-assisted auto-redact.
- Multi-image layouts, referral aur Chrome extension.

Yeh later features Dodo ke website approval checklist ki prerequisites nahi hain. Pehle approval, payment activation aur launch readiness complete karna plan hai.

## 6. Next session mein kahan se continue karna hai?

1. Is file aur [APPROVAL_READINESS.md](APPROVAL_READINESS.md) ko current handoff maana jaaye.
2. User ke refund policy, live URL aur support inbox answers check karo.
3. P0 ke pending legal/website items complete karo.
4. Phir [DODO_PAYMENTS.md](DODO_PAYMENTS.md) ke through P1 configuration/testing karo.
5. `TASKS.md` full backlog hai, lekin uske older milestone summaries kuch jagah outdated hain; latest billing decision aur is handoff ko dhyan mein rakho.

Secrets, API keys aur identity/bank documents is file ya chat mein add nahi karne. Keys environment settings mein aur verification documents Dodo dashboard mein jayenge.

## Related documents

- [APPROVAL_READINESS.md](APPROVAL_READINESS.md) — website approval gaps aur submission checklist.
- [DODO_PAYMENTS.md](DODO_PAYMENTS.md) — technical payment setup aur activation steps.
- [TESTING.md](TESTING.md) — manual testing checklist.
- [TASKS.md](TASKS.md) — detailed product backlog.
- [Dodo website requirements](https://docs.dodopayments.com/miscellaneous/verification-process#preparing-your-website).
