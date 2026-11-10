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

## Deploying from GitHub (Cloudflare Workers Builds)

Push to `main` → Cloudflare builds and deploys automatically. Setup is in the
dashboard (the GitHub connection needs an OAuth handshake the CLI cannot do):

1. Dashboard → **Workers & Pages** → `shotlark` → **Settings** → **Builds**
2. **Connect** → GitHub → authorize the Cloudflare GitHub App if prompted
3. Pick repo **`geekyprem1/xpost`**, branch **`main`**
4. Build command: `node scripts/worker.mjs build`
5. Deploy command: `npx wrangler deploy`

Nothing else is required for the build to be correct:

- `next.config.ts` detects Cloudflare CI through the `WORKERS_CI` variable
  (set automatically by Workers Builds) and the wrapper also sets
  `CLOUDFLARE_BUILD=1`, so Cache Components stays off on this target.
- `NEXT_PUBLIC_*` values come from the committed **`.env.production`** (public
  values only — they ship in the client bundle anyway).
- Server secrets are already stored on the Worker (`wrangler secret list`), and
  Workers Builds reuses them — they are not needed at build time.

> `.env.production` must never contain a secret. If you add a new
> `NEXT_PUBLIC_*` value, add it there; anything server-only goes through
> `wrangler secret put`.

Local CLI deploys (`npm run deploy:worker`) keep working exactly as before and
are useful for hotfixes; a Git-triggered build will simply overwrite the same
Worker.

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
