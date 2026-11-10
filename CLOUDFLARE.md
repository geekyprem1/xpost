# Deploying Shotlark to Cloudflare Workers

This app runs on both Vercel (primary, unchanged) and Cloudflare Workers via
the OpenNext adapter (`@opennextjs/cloudflare`). Everything below was verified
locally with `wrangler dev`: marketing pages, login, the auth-guard redirect in
`proxy.ts`, and the Supabase-backed billing API all work in the Workers
runtime.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build:worker` | Builds the Worker bundle into `.open-next/` |
| `npm run preview:worker` | Build + `wrangler dev` (local preview at :8787) |
| `npm run deploy:worker` | Build + `wrangler deploy` (production deploy) |

Always use these scripts (not raw `opennextjs-cloudflare build`). The wrapper
(`scripts/worker.mjs`) does three things that the raw command cannot:

1. Points `TEMP`/`TMP` inside the repo — on this machine, foreign binaries
   (esbuild.exe, workerd.exe) are denied writes to the system temp folder.
2. Sets `CLOUDFLARE_BUILD=1` so `next.config.ts` disables
   `cacheComponents`/`partialPrefetching` for this build. The Workers runtime
   (workerd) cannot execute Cache Components — requests hang. The Vercel build
   keeps them, unchanged.
3. Temporarily strips `export const instant = false;` from `app/` route files
   (that segment config is only legal when cacheComponents is enabled) and
   restores them when the build finishes.

If a worker build or preview is killed mid-run, the restore may not have
happened. Run `node scripts/worker.mjs restore` once, or just run any worker
script again — leftover state is detected and restored automatically before
anything else runs.

## First deploy

```bash
npx wrangler login     # opens browser, log in with your Cloudflare account
npm run deploy:worker
```

Then in the Cloudflare dashboard: Workers & Pages → `shotlark` →
Settings → Domains & Routes — `shotlark.pro` and `www.shotlark.pro` are
attached as custom domains (also declared in `wrangler.jsonc`, so deploys
manage them).

## Environment variables & secrets

`wrangler dev` reads `.env.local` automatically. Production does not — set
everything there:

- **Non-secret `NEXT_PUBLIC_*` values**: add them under `"vars"` in
  `wrangler.jsonc`. They are also inlined into the client bundle at build time
  (the build reads `.env.local` locally, so build from a machine that has it).
- **Secrets** (server-only): `npx wrangler secret put SUPABASE_SECRET_KEY`, and
  the same for `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`,
  `TOKEN_ENC_KEY`, `X_POSTING_ENABLED`, `DODO_PAYMENTS_API_KEY`,
  `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT`,
  `DODO_PRODUCT_LIFETIME`, `DODO_PRODUCT_CREDITS_100`, `DODO_PRODUCT_CREDITS_500`.
- After the first deploy, update `NEXT_PUBLIC_APP_URL` (and the Dodo webhook
  URL in the Dodo dashboard) to the Cloudflare domain if you switch traffic
  over.

## Costs / plan requirements (verified)

- Deployed successfully on an account with **Workers Paid** + **Images (basic)**.
  The Worker bundle itself is ~2.4 MB gzipped (static assets upload separately
  and don't count), but the `IMAGES` binding below requires the paid Images
  product, and Workers Paid gives the 10 MB headroom.
- `next/image` optimization uses the `IMAGES` binding in `wrangler.jsonc`
  (Cloudflare Image Transformations, a paid per-usage feature). If you don't
  want it, remove the `images` block from `wrangler.jsonc` and set
  `images: { unoptimized: true }` in `next.config.ts`.
- Supabase, Dodo Payments, and the Supabase Edge Functions are unaffected:
  they are external services and don't care where the frontend runs.

## Known caveats

- OpenNext warns that Node.js middleware support (our `proxy.ts`) is
  experimental on Workers. It works in local testing (auth redirects verified);
  watch it after deploying.
- OpenNext on Windows prints a "not fully compatible" warning. If you see
  odd runtime behavior in local preview, trust production (Linux) more, or use
  WSL.
- Cache Components being off on Workers means no static-shell/partial-prerender
  optimization there. Nothing in the app uses `use cache`, so behavior is
  unaffected; only first-load latency differs slightly from Vercel.
