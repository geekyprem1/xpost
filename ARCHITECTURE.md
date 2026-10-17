# Shotlark — Architecture

| Field | Value |
|---|---|
| Version | v1.5 |
| Date | 17 Oct 2026 |
| Based on | `PRD.md` v1.7 |
| Status | Draft — renderer decided: khud ka WebGL2 layer (T1.5 POC, AD-2). v1.5: Scene v2 + layers design (§4.4, §5.7, AD-13…AD-15) — **approved 17 Oct 2026 (T8.0)** |

---

## 1. Principles

1. **Client-heavy:** Editing, rendering aur export browser mein — server cost zero, fast feedback.
2. **Server sirf trust / secrets / cost ke liye:** AI calls, X posting, Pexels proxy, limits, cleanup.
3. **Database rules enforce karta hai:** credits, X limits, rate limits Postgres functions mein (atomic, race-safe). Client sirf display karta hai.
4. **Secure by default:** har table pe RLS + explicit grants; secret keys sirf server pe; X tokens encrypted.
5. **Cost guardrails built-in:** har AI call / X post ka cost log; per-user limits; provider-level spend caps.
6. **Kam vendors:** Supabase + Vercel managed services; extra infra (Redis, queues) v1 mein nahi.

## 2. System Context

```
Browser (Next.js client: Editor · Renderer · Export worker · AI Studio)
 │
 ├─ HTTPS + session cookie ──► Vercel: Next.js 16
 │                               ├─ Pages (marketing, editor, account)
 │                               ├─ proxy.ts (Supabase session refresh)
 │                               └─ Route handlers: /api/x/*, /api/account/delete
 │                                     ├─ secret key ──► Supabase (DB, Storage)
 │                                     └─ OAuth token ──► X API v2
 │
 ├─ supabase-js (publishable key + user JWT, RLS) ──► Supabase
 │                               ├─ Auth (Google, magic link, CAPTCHA)
 │                               ├─ Postgres (RLS, functions, pg_cron, Vault)
 │                               └─ Storage (uploads, exports, assets)
 │
 ├─ fetch + user JWT ──► Supabase Edge Functions
 │                               ├─ ai-generate / ai-refine ──► OpenRouter
 │                               ├─ pexels-search ──► Pexels API
 │                               └─ uploads-cleanup (pg_cron → pg_net se)
 │
 ├─ media load (CORS) ──► Pexels CDN, Supabase Storage
 └─ telemetry ──► PostHog (analytics), Sentry (errors)
```

## 3. Repository Structure

```
shotlark/
├─ app/
│  ├─ (marketing)/                 # static: landing, privacy, terms
│  │  ├─ page.tsx
│  │  ├─ privacy/page.tsx
│  │  └─ terms/page.tsx
│  ├─ (auth)/login/page.tsx
│  ├─ auth/
│  │  ├─ callback/route.ts         # OAuth code → session
│  │  └─ confirm/route.ts          # magic link token_hash → session
│  ├─ (app)/                       # login required
│  │  ├─ editor/page.tsx           # naya project
│  │  ├─ editor/[projectId]/page.tsx
│  │  └─ account/page.tsx
│  └─ api/
│     ├─ x/connect/route.ts
│     ├─ x/callback/route.ts
│     ├─ x/post/route.ts
│     ├─ x/disconnect/route.ts
│     └─ account/delete/route.ts
├─ components/
│  ├─ ui/                          # shadcn/ui
│  ├─ editor/                      # Canvas, TopBar, Toolbar, panels/*
│  ├─ ai-studio/                   # PreviewCard, Chat, Chips, Counter
│  └─ export/                      # DownloadModal, ProgressDialog
├─ lib/
│  ├─ scene/                       # Scene types, defaults, zod schema, migrations
│  ├─ layers/                      # v1.5: raster.ts, text-layout.ts, composite.ts (main thread)
│  ├─ fonts/                       # v1.5: OFL font registry + ensureFonts (files: public/fonts/)
│  ├─ store/                       # zustand stores (editor, ui, ai)
│  ├─ renderer/                    # Renderer interface + layers + implementation
│  ├─ export/                      # image / gif / mp4 encoders, X presets
│  ├─ supabase/                    # browser.ts, server.ts, admin.ts (server-only)
│  ├─ x/                           # oauth, tokens, media, posts (server-only)
│  ├─ crypto/                      # aes-gcm (server-only)
│  ├─ text/                        # twitter-text wrapper, unicode bold
│  └─ analytics/                   # posthog wrapper
├─ workers/
│  └─ export.worker.ts             # OffscreenCanvas + encoders
├─ public/assets/                  # frames, overlays, thumbnails (chhote files)
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                  # DB schema ka source of truth (app_config defaults, buckets bhi)
│  ├─ seed.sql                     # sirf CI test fixtures — real project pe nahi chalta
│  ├─ tests/                       # pgTAP
│  └─ functions/
│     ├─ _shared/                  # cors, errors, validate, rate-limit, openrouter
│     ├─ ai-generate/index.ts
│     ├─ ai-refine/index.ts
│     ├─ pexels-search/index.ts
│     └─ uploads-cleanup/index.ts
├─ proxy.ts                        # Next.js 16 convention (pehle middleware.ts)
├─ .github/workflows/ci.yml        # PR checks + main pe Supabase deploy (§11.3)
├─ .env.example                    # sirf variable names, values kabhi nahi
└─ package.json                    # dependencies exact versions pe pinned
```

Server-only modules (`lib/supabase/admin.ts`, `lib/x/*`, `lib/crypto/*`) ki pehli line `import 'server-only'` — galti se client bundle mein import ho to build fail ho.

## 4. Frontend

### 4.1 Routes

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/` | Static | Public | Landing |
| `/privacy`, `/terms` | Static | Public | Legal |
| `/login` | Client | Public | Google + magic link (Turnstile CAPTCHA) |
| `/auth/callback` | Route handler | — | OAuth `code` → session |
| `/auth/confirm` | Route handler | — | Magic link `token_hash` verify (doosre browser/device pe bhi kaam karta hai) |
| `/editor`, `/editor/[projectId]` | Client-heavy | Required | Editor + AI Studio |
| `/account` | Server + client | Required | Usage, X account, delete account |

`proxy.ts` har request pe Supabase session refresh karta hai aur logged-out user ko `(app)` routes se `/login` bhejta hai. Asli auth check server components / route handlers mein bhi hota hai (`auth.getUser()`), sirf proxy pe bharosa nahi.

### 4.2 State

| Store | Contents | Persist |
|---|---|---|
| `editorStore` (Zustand) | `Scene` document | `projects.editor_state` (autosave) |
| History (zundo middleware) | Scene snapshots, undo/redo ≥ 50 | Memory |
| `uiStore` | Open panel, modals, theme | Theme → localStorage |
| `aiStore` | Messages, streaming state, post text | `projects.post_text` |
| Server state | Profile (credits, reset date), X account, usage | supabase-js hooks |

- Slider drag = ek history entry (pointerup pe commit).
- Autosave debounce 2s; fail pe retry + "Unsaved changes" indicator.

### 4.3 Scene Document (v1)

```ts
type Scene = {
  version: 1;
  canvas: { aspect: AspectId; baseWidth: 1500 };          // height aspect se nikalti hai
  image: { path: string; width: number; height: number } | null;
  background:
    | { kind: 'solid'; color: string }
    | { kind: 'gradient'; stops: { color: string; at: number }[]; angle: number }
    | { kind: 'mesh'; presetId: string }
    | { kind: 'image'; src: MediaRef; blur: number }
    | { kind: 'video'; src: MediaRef };                    // motion background
  frame: { kind: FrameId };                                // 'screenshot' | 'browser' | 'iphone-18-pro' ...
  style: { preset: StyleId; corner: 'sharp' | 'curved' | 'round'; shadow: 'none' | 'hug' | 'spread' };
  transform: {
    zoom: number; tiltX: number; tiltY: number;
    anchor: AnchorId; offset: { x: number; y: number }; padding: number;
  };
  layout: { radius: number; shadow: number };
  sunlight: {
    overlay: OverlayId | 'none'; strength: number; angle: number;
    softness: number; temperature: number; grain: number;
  };
  watermark: boolean;
};

type MediaRef = {
  provider: 'pexels' | 'curated' | 'upload';
  id: string;
  url: string;
  credit?: { name: string; url: string };                  // Pexels attribution
};
```

- `version` se purane projects migrate hote hain (`lib/scene/migrations.ts`).
- Load pe zod validation; corrupt state → defaults + Sentry warning.

### 4.4 Scene v2 — Layers (v1.5, PRD LY / TX / AN / RD)

Scene v1 ke saare fields same rehte hain (v1 type upar thoda purana hai — source of truth `lib/scene/schema.ts`; e.g. `frame.fit`, `MediaRef.previewUrl`, provider `pixabay`). v2 sirf ye add karta hai:

```ts
type SceneV2 = Omit<SceneV1, 'version'> & {
  version: 2;
  layers: Layer[];                       // array order = z-order (pehla = sabse neeche)
};

type LayerBase = {
  id: string;                            // crypto.randomUUID()
  name?: string;                         // layers list mein; default kind se ("Text 1")
  visible: boolean;
  locked: boolean;
};

// ── Canvas space: background ke upar, screenshot / frame se independent ──
type TextLayer = LayerBase & {
  kind: 'text';
  x: number; y: number;                  // box ka center, 0–1 (canvas width / height ka fraction)
  width: number;                         // wrap width, 0–1 of canvas width; height content se nikalti hai
  rotation: number;                      // degrees, -180…180
  text: string;                          // ≤ 500 chars, multi-line, emoji ok
  style: {
    font: FontId;                        // lib/fonts registry (8 OFL fonts)
    weight: 400 | 500 | 600 | 700 | 800;
    size: number;                        // design px @ baseWidth 1500 (output scale ke saath scale)
    color: string;
    align: 'left' | 'center' | 'right';
    lineHeight: number;                  // 0.8–2
    letterSpacing: number;               // em, -0.1…0.5
    background: { color: string; radius: number; padding: number } | null;   // badge / pill
    shadow: { color: string; blur: number; y: number } | null;
  };
};

// ── Image space: screenshot ke source pixels pe — zoom / tilt / drag / frame ke saath chalte hain ──
// Coordinates 0–1 of UNCROPPED source image (crop CR-1 badalne pe annotations hilte nahi).
// Lengths (stroke, size) = fraction of source image width.
type AnnotationLayer = LayerBase & {
  kind: 'annotation';
  shape:
    | { type: 'arrow'; from: Pt; to: Pt; bend: number /* -1…1, 0 = straight */; head: boolean }
    | { type: 'rect'; x: number; y: number; w: number; h: number; radius: number }
    | { type: 'ellipse'; x: number; y: number; w: number; h: number }
    | { type: 'highlight'; x: number; y: number; w: number; h: number }  // semi-transparent marker
    | { type: 'step'; x: number; y: number; size: number; n: number }     // numbered badge
    | { type: 'emoji'; x: number; y: number; size: number; char: string };
  color: string;
  stroke: number;
};

type RedactLayer = LayerBase & {
  kind: 'redact';
  x: number; y: number; w: number; h: number;   // image space, 0–1
  mode: 'pixelate' | 'blur' | 'solid';
  strength: number;                              // 0–100
  color: string;                                 // solid ke liye
};

type Layer = TextLayer | AnnotationLayer | RedactLayer;
type Pt = { x: number; y: number };
```

**Rules:**
- **Space kind se tay hota hai** (text → canvas, annotation / redact → image) — alag `space` field nahi, taaki invalid combos ban hi na sakein.
- **Limits:** max 50 layers, text ≤ 500 chars; zod mein enforce.
- **Migration v1 → v2:** `{ ...scene, version: 2, layers: [] }` (`SCENE_MIGRATIONS[1]`). Har load path `migrateScene()` se guzrega — **LocalDraft abhi seedha `sceneSchema.parse` karta hai, wo T8.1 mein `migrateScene` pe shift** (warna purane drafts toot jayenge). Projects (`editor_state`) bhi isi se.
- **History:** layers scene ka hissa hain → zundo undo / redo automatically. Drag / resize / slider = gesture API (ek entry). Text typing = edit session (focus → blur / Esc) ek entry.
- **Selection** (`selectedLayerId`, edit mode, active tool) `uiStore` mein — history / persist mein nahi.
- `scene.image` remove karne pe image-space layers rehte hain (hidden), naya screenshot aane pe wapas — user confirm ("Annotations rakhein?") T8.4 mein.

## 5. Rendering & Export Engine

### 5.1 Layer pipeline (peeche → aage)

1. Background — solid / gradient / mesh / image + blur / video frame
2. Shadow — style shadow + layout shadow
3. Frame — device ya window chrome
4. Screenshot — zoom, anchor/offset, padding, corner radius, perspective tilt
5. Style effects — glass (peeche ke background ka blur), border / outline / inset
6. Sunlight — shadow map, blend mode, strength, angle, temperature
7. Grain — noise
8. Watermark — agar ON

**v1.5 (Scene v2) — actual code order** (`renderer.ts` `render()`), layers ke saath:

1. Glass background pass (sirf glass styles) → Background
2. Shadow → Plate (style)
3. Screenshot — ab **image composite** texture (source + redact + annotations, §5.7) — tilt mesh same
4. Frame
5. **Canvas layers (text)** — naya `drawLayers()`, z-order mein, per-layer quad (position, rotation, opacity)
6. Sunlight → Grain (text pe bhi light / grain padta hai — photo jaisa look)
7. Watermark (hamesha sabse upar)

### 5.2 Renderer

```ts
interface Renderer {
  init(target: HTMLCanvasElement | OffscreenCanvas): Promise<void>;
  render(scene: Scene, opts: { scale: number; timeSec?: number; videoFrame?: CanvasImageSource }): void;
  dispose(): void;
}
```

- **Ek hi implementation** preview aur export dono ke liye — jo dikhe wahi export ho.
- **Decided (T1.5 POC, 16 Oct 2026): khud ka minimal WebGL2 layer.** POC mein validated: gradient/video background, glass blur (FBO blur pass), rounded corners + soft shadow (SDF), perspective tilt (subdivided homography mesh), Pexels image/video CORS ✓, export 2× 345 ms / 3× 162 ms (target < 3s). PixiJS v8 ki zarurat nahi padi — aage filtering/abstraction chahiye ho to is core ke upar evaluate karenge.
- **Fallback:** DOM + `html-to-image` — POC mein chala (407/182 ms, video frame capture bhi hua) par fidelity browser-to-browser vary karti hai (`backdrop-filter`); primary nahi chuna.
- Evidence, caveats aur pending browser matrix: §13 (AD-2) + §14.

### 5.3 Preview loop

- Static scene: sirf change pe re-render (dirty flag).
- Motion background: `requestAnimationFrame` loop; `<video muted loop playsinline crossOrigin="anonymous">` texture.
- Tab hidden ya `prefers-reduced-motion` → video pause.
- Preview DPR-aware display size pe; export full resolution pe.

### 5.4 Export pipeline

| Output | Kahan | Kaise |
|---|---|---|
| PNG / JPG / WebP | Main thread ya worker | `render(scale)` → `toBlob` / `convertToBlob` |
| MP4 | `export.worker.ts` | Mediabunny se background video decode → har frame render (OffscreenCanvas) → WebCodecs `VideoEncoder` (H.264) → Mediabunny MP4 mux |
| GIF | `export.worker.ts` | 15 fps frames → palette quantize → gifenc |

- Progress + cancel UI; worker crash pe readable error.
- Encode support Mediabunny ke codec-check utilities se feature-detect; support na ho to `ffmpeg.wasm` single-thread fallback (dynamic import, sirf zarurat pe load).
- Copy to clipboard: PNG blob → `navigator.clipboard.write`.

### 5.5 X post presets (PRD EX-8)

| Media | Target |
|---|---|
| Image | JPG (quality ~0.9), 1× ya 2×; 5 MB se bada ho to quality/scale step-down loop |
| GIF | ≤ 1280×1080, 15 fps, ≤ 350 frames, w × h × frames ≤ 300M, ≤ 15 MB (zarurat pe fps/size kam) |
| MP4 | ≤ 1280×1024 (4:3 → 1280×960), H.264, 30 fps, yuv420p, 5–10s |

### 5.6 Assets

- Frames, overlays, thumbnails: `public/assets/` (Vercel CDN). Frames ka config `frames.json` (asset, screen rect, corner radius).
- Curated motion videos (bade files): Storage `assets` bucket (public).
- Pexels media: CDN se direct load (CORS M1 POC mein verify); fail ho to selected media `assets/pexels-cache/` mein copy.
- Watermark text ke liye font `FontFace` API se load karke hi render.

### 5.7 Layers rendering (v1.5)

**Ek hi rasterizer, main thread pe** — `lib/layers/raster.ts` (Canvas2D; HTMLCanvas ya OffscreenCanvas dono). Fonts sirf main thread pe load hote hain; worker ko fonts kabhi nahi chahiye (AD-14).

**A. Image composite (annotation + redact):**

```
source bitmap ──► redact layers (pixelate / blur / solid — source pixels pe)
              ──► annotation layers (z-order)
              ──► composite canvas ──► "screenshot" texture / BakedAssets.screenshot
```

- Renderer ko pata hi nahi ki annotations hain — wo bas screenshot texture use karta hai. Isliye zoom, tilt, frame, fit / fill, rounded corners sab automatically sahi.
- **Redact irreversible (RD-2):** composite hi export **aur** AI capture (`capturePostImageForAi` → export path) mein jaata hai; original source sirf store mein rehta hai, kabhi output mein nahi.
- **Resolution:** export pe source native resolution (max 4096 px longest side — texture limit safety). Preview / drag ke dauraan capped 2048 px (fast); pointerup pe full.
- **Cache key:** source id + image-space layers ka JSON. Sirf image-space layer badle tabhi re-composite.
- Layers na hon to composite skip — source seedha (zero overhead, aaj jaisa).

**B. Canvas layers (text):**

- Har text layer alag rasterize: apne box ka size × output scale (DPR / export scale) → texture / ImageBitmap. Height text measure se (`measureText` + line wrap, `lib/layers/text-layout.ts` — pure, tested).
- **Cache key:** layer id + text + style + width + scale. **Move / rotate re-raster nahi karta** — sirf quad transform badalta hai (drag 60 fps).
- `drawLayers()` per-layer quad: center (x · W, y · H), rotation, opacity (CM-6 entrance animation ke liye pehle se ready).
- Font gate: `await ensureFonts(layers)` — font load hone se pehle raster nahi (warna fallback font export mein chala jaata). Export bhi isi ka wait karta hai.

**C. Export protocol (`export-protocol.ts`):**

```ts
type BakedAssets = {
  screenshot?: ImageBitmap | null;       // ab image composite (layers ho to)
  // …existing fields…
  layers?: Array<{ id: string; bitmap: ImageBitmap;
                   cx: number; cy: number; width: number; height: number;  // output px
                   rotation: number }>;
};
```

Main thread export scale pe bake karta hai → transferables → worker `drawLayers()`. Video / GIF: har frame same bitmaps (CM-6 aane pe per-frame opacity / offset).

**D. Interaction (`components/editor/layer-overlay.tsx`):**

- Canvas ke upar DOM overlay — selection box, resize / rotate handles, inline text editor (`<textarea>` same font / size pe). Canvas pe kuch draw nahi hota selection ke liye (export clean).
- **Hit testing:**
  - Canvas space: inverse rotation → box test.
  - Image space: pointer → `imageRect` ke tilted corners (`projectTiltedCorners`) se inverse homography → screenshot UV → shader jaisa fit / fill / device-screen mapping ulta → source UV. Ye mapping `geometry.ts` mein pure function `canvasToSourceUv()` — shader logic ka mirror, unit tests (tilt 0 / 20° / -30°, contain / cover).
- Keyboard: Tab se layers cycle, arrows nudge, Delete, Ctrl+D, Esc — overlay elements focusable + `aria-label`.

## 6. Backend

### 6.1 Kaun kya karta hai

| Concern | Where | Why |
|---|---|---|
| AI generate / refine | Supabase Edge Function | DB ke paas, SSE streaming, OpenRouter key Supabase secrets mein |
| Pexels search | Supabase Edge Function | API key hidden, Postgres cache |
| X OAuth, posting, disconnect | Next.js Route Handler (Node runtime) | OAuth cookies app domain pe chahiye; X secrets + token key ek jagah (Vercel) |
| Account delete | Next.js Route Handler | Storage + X revoke + auth admin delete ek flow mein |
| Credits, X limits, rate limits | Postgres functions | Atomic + race-safe |
| Monthly reset, housekeeping | pg_cron (SQL) | Simple — function deploy nahi chahiye |
| Uploads cleanup | Edge Function (pg_cron → pg_net) | Storage files sirf Storage API se delete hoti hain (SQL delete reject hota hai) |

### 6.2 Edge Functions

- `@supabase/server` ka `withSupabase` wrapper:
  - `ai-generate`, `ai-refine`, `pexels-search`: `auth: 'user'`, `verify_jwt = true`. Reads ke liye `ctx.supabase` (RLS), sirf credit / limit RPCs ke liye `ctx.supabaseAdmin`.
  - `uploads-cleanup`: `auth: 'secret'`, `verify_jwt = false`; pg_cron + pg_net se call, secret key Vault mein.
- `_shared/`: CORS (`ALLOWED_ORIGINS` list: production domain, `http://127.0.0.1:3000`, Vercel preview pattern), error helper, zod validation, rate-limit RPC wrapper, OpenRouter client (streaming parse + `usage` capture).
- Client call: `fetch` + `Authorization: Bearer <access_token>`, response ReadableStream se SSE parse (EventSource POST / custom headers support nahi karta).
- Limits: CPU 2s/request, wall clock 150s (Free) / 400s (paid) → server pe heavy processing nahi, sirf I/O.

### 6.3 Next.js Route Handlers

- `export const runtime = 'nodejs'`; `/api/x/post` pe `maxDuration` set (video processing poll lamba ho sakta hai — Vercel plan ki limit check karo).
- User identity: `@supabase/ssr` server client (cookies) → `auth.getUser()`.
- Privileged DB / Storage: admin client (`SUPABASE_SECRET_KEY`) sirf `server-only` modules mein.
- Media kabhi request body mein nahi (Vercel ka 4.5 MB request body limit). Client pehle Storage `exports/` mein upload karta hai; route sirf path leta hai aur check karta hai ki path `{user_id}/` se shuru ho.
- Feature flag `X_POSTING_ENABLED` — preview deployments mein `false` (real X cost se bachne ke liye).

### 6.4 Error contract

```json
{ "error": { "code": "INSUFFICIENT_CREDITS", "message": "…", "resetAt": "2026-11-16T00:00:00Z" } }
```

| Code | HTTP | Kab |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Session / JWT missing ya invalid |
| `VALIDATION_ERROR` | 422 | Input zod validation fail |
| `RATE_LIMITED` | 429 | Per-minute rate limit |
| `INSUFFICIENT_CREDITS` | 429 | Monthly AI credits khatam (+ `resetAt`) |
| `X_POST_LIMIT_REACHED` | 429 | Monthly X limit khatam (+ `resetAt`) |
| `X_NOT_CONNECTED` | 409 | X account connect nahi |
| `X_RECONNECT_REQUIRED` | 409 | Token revoked / refresh fail |
| `X_DUPLICATE` | 409 | X ne duplicate post reject kiya |
| `X_MEDIA_REJECTED` | 422 | X ne media reject kiya |
| `UPSTREAM_ERROR` | 502 | OpenRouter / X / Pexels error |
| `SERVICE_UNAVAILABLE` | 503 | X API credits khatam / spending limit hit, ya `X_POSTING_ENABLED=false` |

## 7. Data

### 7.1 Source of truth

Schema `supabase/migrations/` mein; reference SQL PRD §10 mein. Rules:

- Har table pe RLS enabled.
- **Explicit grants** — Supabase ke default grants pe bharosa nahi. Missing grant pe permission error aata hai (service role ko bhi), isliye har naye table ki migration mein grants likho.
- Sab DB functions: `security definer`, `set search_path = ''`, execute sirf `service_role` (trigger function ko chhod ke).

### 7.2 Tables

| Table | Purpose | Client access |
|---|---|---|
| `profiles` | User + `ai_credits` + `credits_reset_at` | Read own; update sirf name/avatar |
| `x_accounts` | X profile + encrypted tokens + refresh lease | Read own, sirf public columns |
| `projects` | Scene + post text | Own CRUD |
| `ai_generations` | AI call log + cost | Read own |
| `posts` | X posts: weight, status, cost | Read own |
| `credit_transactions` | Credits ledger | Read own |
| `app_config` | Limits, models, credit costs | Read |
| `rate_limits` | Per-user fixed-window counters | None |
| `pexels_cache` | Pexels responses, 24h | None |

### 7.3 DB functions

| Function | Caller | Behaviour |
|---|---|---|
| `handle_new_user()` | Trigger on `auth.users` insert | Profile + monthly credits (`app_config` se) |
| `consume_credits(user, amount, reason)` | Edge Function | Atomic check + deduct; warna `INSUFFICIENT_CREDITS` |
| `refund_credits(user, amount, reason)` | Edge Function | AI failure pe credits wapas |
| `hit_rate_limit(user, bucket, max_hits, window_sec)` → bool | Edge Functions, route handlers | `insert … on conflict do update set hits = hits + 1`; `hits ≤ max_hits` to true |
| `reserve_x_post(user, text, media_type, has_url, project)` → post_id | `/api/x/post` | Profile row lock → period mein (pending + posted) weights + naya weight ≤ limit → `pending` row insert; warna `X_POST_LIMIT_REACHED` |
| `claim_x_token_refresh(user)` → bool | Token service | `refresh_lock_until` null / expired ho to `now() + 30s` set karke true; warna false (caller thoda ruk ke fresh token padhe) |
| `reset_monthly_credits()` | pg_cron daily | Period khatam → `ai_credits` reset, `credits_reset_at = now()`, ledger entry |
| `cleanup_housekeeping()` | pg_cron hourly | 15 min purane `pending` posts → `failed`; purane `rate_limits` + expired `pexels_cache` delete |

- **Usage period:** `credits_reset_at` se 1 mahina. AI credits aur X posts dono isi period pe chalte hain → UI pe ek hi "reset date".
- `posts` ka final status (`posted` / `failed`) route admin client se seedha update karta hai. `failed` posts limit mein count nahi hote.

### 7.4 Storage

| Bucket | Access | Path | Limits | Retention |
|---|---|---|---|---|
| `uploads` | Private (RLS: own folder) | `{user_id}/{project_id}/source.{ext}` | 10 MB; png / jpeg / webp | Project ke saath; orphan files 30 din baad delete |
| `exports` | Private (RLS: own folder) | `{user_id}/x/{uuid}.{ext}` | 20 MB; jpeg / png / webp / gif / mp4 | X post ke baad turant delete; bache hue 24h baad |
| `assets` | Public read | `curated/…`, `pexels-cache/…` | — | Permanent |

Size + MIME limits bucket config (`file_size_limit`, `allowed_mime_types`) mein bhi set — sirf client validation pe bharosa nahi. Private files ke liye signed URLs (1h).

### 7.5 Scheduled jobs

| Job | Schedule | Mechanism |
|---|---|---|
| `reset_monthly_credits()` | Daily 00:30 UTC | pg_cron → SQL |
| `cleanup_housekeeping()` | Hourly | pg_cron → SQL |
| `uploads-cleanup` | Daily 01:00 UTC | pg_cron → pg_net → Edge Function (secret key Vault se) |

## 8. Key Flows

### 8.1 Sign in

```
Google:  /login → signInWithOAuth → Google → Supabase → /auth/callback?code
         → exchangeCodeForSession → /editor
Email:   /login (email + Turnstile token) → signInWithOtp → email link
         → /auth/confirm?token_hash&type=email → verifyOtp → /editor
Signup:  auth.users insert → handle_new_user() → profiles (30 credits)
```

CAPTCHA email flow pe lagta hai; Google OAuth pe Google khud verification karta hai.

### 8.2 AI generate (SSE)

```
Client   canvas → 1024px JPEG (base64)
         POST ai-generate { projectId, image, prompt }  + Bearer JWT
Edge     withSupabase('user') → zod → hit_rate_limit('ai', 20, 60)
         → consume_credits(1)            ── fail → 429 INSUFFICIENT_CREDITS
         → OpenRouter chat/completions (stream: true, models: [...])
         → tokens SSE se client ko (live typing)
         → last chunk: usage (tokens, cost) → insert ai_generations
         → error / empty output → refund_credits(1), status = 'refunded'
```

### 8.3 X share (no API — decision 16 Oct)

```
Client   Text ready (weighted counter + X-ready checks)
         → "X pe kholo": window.open https://x.com/intent/post?text=…
           (text pre-filled; image intent se attach nahi hoti)
         → "Text copy"  : navigator.clipboard.writeText
         → "Image copy" : capture blob → ClipboardItem(image/png)
         → "Download"   : worker export → blob → file (user attach karega)
Koi server call nahi, koi X token nahi, koi API cost nahi.
```

Dropped API flows (OAuth connect `/api/x/*`, token service, media upload, `/2/tweets`)
ka DB footprint (`x_accounts`, `posts`, X functions) dormant hai — future option.

### 8.4 Post to X _(dropped)_

X API se direct posting **nahi** hogi (PRD §7.11 decision). Upar wala share flow hi
posting ka pura rasta hai. Purana flow (staged media → `/2/media/upload` →
`/2/tweets`) archive mein — implement nahi hoga jab tak decision badle.

### 8.5 Download

Sirf client: Download modal → worker → blob → file download / clipboard. Server call nahi (sirf analytics event).

## 9. Security

### 9.1 Keys & trust boundaries

| Credential | Kahan | Access |
|---|---|---|
| Publishable key (`sb_publishable_…`) | Browser | Sirf jo RLS + grants allow karein |
| User JWT | Browser → Supabase / Edge Functions | User-scoped (RLS) |
| Secret key (`sb_secret_…`) | Vercel server env, Edge runtime (injected), Vault (cron) | Full access — kabhi client pe nahi |
| X OAuth tokens | `x_accounts` (encrypted) | Sirf Next.js server decrypt kare |

Legacy `anon` / `service_role` keys use nahi karne — Supabase inhe end-2026 tak deprecate kar raha hai.

### 9.2 Environment variables

| Variable | Where | Public |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Vercel | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel | Yes |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel | Yes |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Vercel | Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel | Yes |
| `SUPABASE_SECRET_KEY` | Vercel (server) | No |
| `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI` | Vercel (server) | No |
| `TOKEN_ENC_KEY` (32 bytes, base64) | Vercel (server) | No |
| `X_POSTING_ENABLED` | Vercel (server) | No |
| `OPENROUTER_API_KEY`, `PEXELS_API_KEY` | Supabase Edge secrets | No |
| `APP_URL` | Supabase Edge secrets (OpenRouter referer) | — |
| `ALLOWED_ORIGINS` | Supabase Edge secrets (CORS allowlist) | — |
| Turnstile secret, Google OAuth secret | Supabase Dashboard → Auth settings | No |
| Cron ke liye secret key | Supabase Vault | No |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` | GitHub Actions secrets (CI deploy) | No |

`.env.example` mein sirf names. Real values kabhi git mein nahi. Local `.env.local` (gitignored) mein wahi ek project ke values — yaani local machine pe production ki secret key hoti hai, isliye ise kabhi share / commit mat karo.

### 9.3 Encryption

- AES-256-GCM, har encryption pe random 12-byte IV. Format: `v1.<iv>.<ciphertext+tag>` (base64url) — `v1` prefix se baad mein key rotation possible.
- AAD (associated data) = purpose (`x-token`, `oauth-state`) — ek purpose ka ciphertext doosri jagah valid nahi hoga.

### 9.4 Web security

- CSP: `img-src` / `media-src` → self, Supabase Storage, `images.pexels.com`, `videos.pexels.com`, `pbs.twimg.com` (X avatars), `lh3.googleusercontent.com` (Google avatars). `connect-src` → Supabase, PostHog, Sentry. Worker / WASM ke liye zaroori directives POC ke baad final.
- Edge Function CORS sirf `ALLOWED_ORIGINS` (production domain, `http://127.0.0.1:3000`, Vercel previews) — ek hi project teeno environments serve karta hai. CORS auth nahi hai; har request ko valid user JWT phir bhi chahiye.
- OAuth cookies: httpOnly, Secure, SameSite=Lax, 10 min, one-time.
- Next.js aur dependencies latest security patch pe; CI mein dependency audit.

### 9.5 Abuse & cost controls

| Control | Value |
|---|---|
| CAPTCHA | Magic link signup / login (Turnstile) |
| Rate limits (per user) | AI 20/min, Pexels 60/min, X post 3/min |
| Monthly limits | 30 AI credits, 10 X post units (link post = 5) |
| Provider caps | X Developer Console spending limit, OpenRouter key credit limit |
| Monitoring | Daily cost views (§10), weekly review |

## 10. Observability

- **Sentry:** Next.js (client + server) + Edge Functions; har log / error mein `request_id`.
- **PostHog:** PRD §13 events. Properties mein PII ya post text nahi.
- **Logs:** Vercel + Supabase function logs, structured JSON.
- **Cost views:** `admin` schema mein (Data API pe exposed nahi) — daily AI cost, daily X cost, top users by cost. Supabase SQL editor se dekho.

## 11. Environments & Deployment

Sirf **ek Supabase project** hai — local development, Vercel previews aur production sab isi ko use karte hain. Alag staging project nahi.

| Env | Frontend | Supabase | Notes |
|---|---|---|---|
| Local | `next dev` → hamesha `http://127.0.0.1:3000` kholo | Wahi cloud project | X `localhost` callback allow nahi karta, isliye `127.0.0.1` (cookies bhi ek hi host pe rahein). Edge Functions deploy karke test. |
| Preview | Vercel preview deploys | Wahi project | `X_POSTING_ENABLED=false`. X connect previews pe nahi chalega (X ko exact callback URL chahiye). Login ke liye Google use karo. |
| Production | Vercel (`main` branch) | Wahi project | Vercel function region Supabase region ke paas |
| CI | GitHub Actions | Temporary local Supabase (runner ka Docker), har run ke baad khatam | Migrations + pgTAP tests — real project ko touch nahi karta, koi extra project / cost nahi |

### 11.1 Ek project ke rules

1. **Schema sirf migrations se:** har change `supabase/migrations/` (git) mein. Dashboard ke table editor se schema change nahi — warna CI tests aur git mismatch ho jaate hain.
2. **Pehle CI, phir project:** migration PR mein temporary DB pe test hoti hai; `main` merge pe `supabase db push` se project pe lagti hai.
3. **Backward-compatible migrations (expand → contract):** pehle naya column / table add (nullable ya default ke saath) → code deploy → purani cheez agli migration mein hatao. Live production code aur naya preview code ek hi DB pe chalte hain.
4. **Seed project pe nahi chalta:** `app_config` defaults, buckets, extensions — sab migrations mein. `seed.sql` sirf CI test fixtures.
5. **Secrets git mein nahi:** Edge Function secrets aur Vault values Dashboard / CLI se ek baar set hoti hain, migrations mein kabhi nahi.
6. **Test data:** sirf apne test accounts. Launch se pehle test users app ke "Delete account" flow se hatao (taaki Storage files bhi delete hon).
7. **Real cost:** local / preview se bhi AI aur X calls asli paise lagati hain. `X_POSTING_ENABLED` sirf test ke waqt `true`; OpenRouter key pe credit limit.
8. **Launch ke baad backups:** Free plan pe automatic backups nahi hote aur project 1 hafte inactivity pe pause ho jaata hai → launch se pehle Pro plan (daily backups, 7 din). Risky migration se pehle Dashboard → Backups check.

### 11.2 Supabase Auth URL configuration

- Site URL: development mein `http://127.0.0.1:3000`, launch pe production domain.
- Redirect URLs: `http://127.0.0.1:3000/**`, `https://*-<vercel-team>.vercel.app/**` (previews), `https://shotlark.com/**`.
- Turnstile widget hostnames: development ke dauran `127.0.0.1` add; launch se pehle hata do (Cloudflare production sitekeys pe local domains allow na karne ki salah deta hai).
- Auth emails: default Supabase SMTP sirf 2 emails/hour bhejta hai aur sirf project team members ko → launch se pehle custom SMTP zaroori (magic link signup iske bina real users ke liye kaam nahi karega).

### 11.3 CI / CD (GitHub Actions)

| Trigger | Steps |
|---|---|
| Pull request | lint → typecheck → build → Vitest → `supabase start` (temp DB) → `supabase db reset` → `supabase test db` → Deno tests |
| `main` merge | Same checks → `supabase db push` → `supabase functions deploy --use-api` (Docker nahi chahiye) |

Vercel `main` ko apne aap deploy karta hai; migrations backward-compatible hone ki wajah se deploy order se fark nahi padta.

## 12. Testing Strategy

| Layer | Tool | Focus |
|---|---|---|
| Unit | Vitest | Scene schema / migrations, layout math, twitter-text wrapper, Unicode bold, crypto |
| Database | pgTAP (`supabase test db`) — CI ke temporary DB pe (local pe sirf agar Docker installed ho) | RLS isolation, grants, credit + X limit functions |
| Edge Functions | Deno test (CI mein) | Validation, credit / refund paths (OpenRouter mocked) |
| E2E | Playwright | Login → upload → edit → export → AI (mocked) → post (mocked) |
| Visual | Playwright screenshots | Renderer fixtures: preview vs export diff |

CI mein real X / OpenRouter / Pexels kabhi call nahi (paise lagte hain) — sab mocked.

## 13. Architecture Decisions

| # | Decision | Reason | Alternative |
|---|---|---|---|
| AD-1 | Rendering + export client pe | Server cost zero, privacy, fast | Server-side render |
| AD-2 | **WebGL2 renderer — khud ka minimal layer** (T1.5 POC pass, Chromium) | POC: saare effects pass, Pexels CORS ✓, 2× PNG 345 ms (< 3s target); Canvas 2D perspective tilt / fast blur nahi kar sakta; DOM capture browser-dependent | Canvas 2D, DOM capture, PixiJS v8 |
| AD-3 | Video export: WebCodecs + Mediabunny | Hardware encode, fast | ffmpeg.wasm (sirf fallback) |
| AD-4 | X integration Next.js routes mein | App-domain cookies, Node runtime, X secrets ek jagah | Edge Functions |
| AD-5 | AI Edge Functions mein | DB ke paas, streaming, Supabase secrets | Next.js routes |
| AD-6 | Limits / rate limits Postgres mein | Atomic, extra vendor nahi | Upstash Redis |
| AD-7 | X media Storage se stage | Vercel 4.5 MB body limit | Request body upload |
| AD-8 | New Supabase API keys | Legacy keys end-2026 tak deprecated | `anon` / `service_role` |
| AD-9 | Single monthly credit bucket | v1 mein billing nahi | Monthly + purchased buckets (v2) |
| AD-10 | Next.js 16 `proxy.ts` | `middleware.ts` deprecated | — |
| AD-11 | Ek hi Supabase project (local + preview + production) | Simple setup, ek hi config / bill | Alag staging project |
| AD-12 | DB tests CI ke temporary local Supabase pe | Ek project ke saath bhi migrations safely test hon; local Docker zaroori nahi | Live project pe testing |
| AD-13 | **Layers Canvas2D se rasterize → textures** (text per-layer quad; annotation / redact screenshot composite mein bake) | Ek rasterizer preview + export dono ke liye (fidelity); renderer mein minimum change; image-space layers tilt / frame ke saath free mein sahi | WebGL SDF text (complex, emoji mushkil), DOM capture (browser-dependent — AD-2) |
| AD-14 | **Layer raster sirf main thread pe**, worker ko ImageBitmaps | Worker / OffscreenCanvas mein fonts + 2D text support browsers mein uneven; watermark bhi aise hi bake hota hai | Worker mein `self.fonts` + OffscreenCanvas 2D |
| AD-15 | **Redact source pixels pe bake** (composite), AI capture bhi composite se | Sensitive data na export mein na AI provider tak (RD-2); alag "privacy path" maintain nahi karna | Shader-time redaction (AI capture / export mein bhool sakte the) |

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Renderer fidelity / performance (khaaskar Safari) | High | T1.5 POC ✓ Chromium (AD-2); Safari/Firefox + real Chrome (H.264) manual verify pending; fallback path |
| Pexels CDN CORS | Medium | `assets` bucket mein proxy / cache |
| H.264 encode support browser ke hisaab se alag | Medium | Feature-detect + ffmpeg.wasm fallback |
| X API pricing / policy change | High | Spend cap, limits, cost logs, Share fallback |
| X refresh token race | Medium | Lease lock (`claim_x_token_refresh`) |
| Free beta abuse | Medium | CAPTCHA, rate limits, monthly limits |
| Edge Function CPU limit | Low | Server pe heavy processing nahi |
| Ek hi Supabase project: galat migration ya test seedha live data pe | High | CI temp DB tests, backward-compatible migrations, Pro plan backups, test-data rules (§11.1) |
| Bade screenshot ka image composite (memory / drag lag) | Medium | Preview 2048 px cap, full-res sirf export pe; layers na hon to composite skip (§5.7) |
| Font load se pehle render → export mein galat font | Medium | `ensureFonts` gate preview + export dono mein; fixtures har font pe |
| Scene v2 migration se purane drafts tootna | Medium | Har load path `migrateScene`; v1 fixtures ke saath migration tests (T8.1) |

## 15. Sources (verified 16 Oct 2026)

- Next.js `middleware` → `proxy` rename — https://nextjs.org/docs/messages/middleware-to-proxy
- Supabase API keys (publishable / secret, legacy deprecation) — https://supabase.com/docs/guides/api/api-keys
- Supabase Edge Functions auth (`withSupabase`, `verify_jwt`) — https://supabase.com/docs/guides/functions/auth
- Supabase Storage delete (sirf Storage API) — https://supabase.com/docs/guides/storage/management/delete-objects
- Vercel 4.5 MB request body limit — https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions
- Mediabunny — https://mediabunny.dev/guide/introduction
- Edge Functions deploy bina Docker (`--use-api`) — https://supabase.com/changelog/33613-deploy-edge-functions-from-cli-without-needing-docker-import-files-outside-of-supabase-directory
- Supabase backups (sirf Pro / Team / Enterprise) — https://supabase.com/docs/guides/platform/backups
- Free project pausing — https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase default SMTP limits — https://supabase.com/docs/guides/auth/auth-smtp
- Auth redirect URL wildcards — https://supabase.com/docs/guides/auth/redirect-urls
- X callback URLs (`localhost` nahi, `127.0.0.1` use) — https://developer.twitter.com/ja/docs/basics/apps/guides/callback-urls
- Turnstile local testing — https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Baaki sources (X API, OpenRouter, Pexels, Edge Function limits): PRD §16

Content was rephrased for compliance with licensing restrictions.
