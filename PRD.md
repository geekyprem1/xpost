# Shotlark — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | Shotlark |
| Version | v1.6 (MVP) |
| Date | 16 Oct 2026 |
| Status | Draft |
| Scope | Free beta — billing / paid plans v2 mein (§14) |
| Stack | Next.js 16 + Supabase + OpenRouter |

> **Launch se pehle pending:** `shotlark.com` / `shotlark.app` kharidna (16 Oct 2026 ko dono unregistered the), X handle availability, aur trademark search (USPTO + IP India). Doc mein domain ki jagah `<APP_URL>` placeholder hai.

---

## 1. Overview

Shotlark ek web SaaS hai jo creators ko 3 kaam ek jagah karne deta hai:

1. **Beautify** — screenshot / image ko background, mockup frame, glass style, sunlight effects ke saath premium visual banana.
2. **Write** — AI (OpenRouter) se image dekh ke X post likhwana aur one-click refine karna (hook, CTA, emojis, tone).
3. **Publish** — connected X account pe image + text seedha post karna, ya PNG/JPG/WebP/GIF/MP4 download karna.

**One-liner:** "Screenshot se scroll-stopping X post tak — ek hi jagah."

## 2. Problem

- Creators ko visual banane ke liye ek tool (Figma/Canva/Shots.so), caption ke liye doosra (ChatGPT), aur posting ke liye teesra (X) kholna padta hai.
- Raw screenshots X feed mein boring dikhte hain, engagement kam aata hai.
- Achha hook / format likhna time leta hai.

## 3. Target Users

| Persona | Need |
|---|---|
| Indie hackers / SaaS founders | Product screenshots ko launch posts mein badalna |
| Tech / AI news creators | Fast, eye-catching news visuals + caption |
| Marketers / social media managers | Brand-consistent visuals, quick posting |
| Developers | Code / terminal screenshots share karna |

## 4. Goals & Success Metrics

| Goal | Metric | MVP Target (first 90 days) |
|---|---|---|
| Activation | Signup → first export | ≥ 50% |
| AI usage | Users jo ≥1 AI post generate karein | ≥ 40% |
| Publishing | Exports jo X pe post hue (API + share) | ≥ 20% |
| Retention | Week-4 retention (signup ke 4 hafte baad active) | ≥ 20% |
| Unit cost | X API + OpenRouter spend / active user / month | Track weekly, budget alert |
| Performance | Editor load (LCP) | < 2.5s |

**Non-goals (v1):** Billing / paid plans (v2), scheduling, multi-platform posting (LinkedIn/IG), team workspaces, mobile app, threads (multi-post), "Sign in with X".

## 5. Plans & Usage Limits (v1: free beta)

v1 mein koi payment ya paid plan nahi hai. Saare editor features sab users ke liye unlocked hain. Limit sirf un cheezon pe hai jinka asli paisa lagta hai (AI aur X API).

| Feature | v1 (sab users) |
|---|---|
| Export | PNG, JPG, WebP, GIF, MP4 — 1×, 2×, 3× |
| Backgrounds | Sab: gradients, solid, Pexels photos/videos, in-house premium set |
| Frames, Style, Sunlight (all 20), Position, Layout, Auto | Sab |
| Watermark | "Made with Shotlark" badge default ON, user off kar sakta hai |
| AI credits | 30 / month |
| Post to X via API | 10 posts / month |
| Share to X (manual) | Unlimited (koi API cost nahi) |

- Saare limits `app_config` table mein hain, taaki bina deploy change ho sakein.
- Credit cost: **Generate = 1 credit**, **Refine (chip / chat) = 1 credit**.
- Link wale posts X limit mein **5 posts ke barabar** count honge (weight configurable).
- Pexels content kabhi paywall ke peeche nahi (Pexels API guidelines core functionality replicate karne se mana karte hain). Billing aane pe bhi paid value apne assets + features mein rakhna.

### 5.1 Unit Economics (zaroori)

X API **pay-per-use** hai (koi free tier / subscription nahi). Official pricing (Oct 2026):

| X API action | Cost |
|---|---|
| Post create | $0.015 / request |
| Post create (URL ke saath) | $0.200 / request |
| Media metadata (alt text) | $0.005 / request |
| User read (connect pe profile fetch) | $0.010 / resource |

Media upload pricing page pe alag listed nahi hai — build ke waqt Developer Console mein verify karo.

v1 mein revenue nahi hai, isliye ye saara cost aap bharoge:

- Example: 1,000 active users × 10 posts/month (bina link) = **$150/month** sirf X API. Sab link wale posts hon to har user ke max 2 (5× weight) → **$400/month**.
- Cost control:
  - per-user monthly limits (upar), server pe enforce;
  - X Developer Console mein **spending limit + auto-recharge**;
  - OpenRouter API key pe **credit limit**;
  - har post ka cost `posts.cost_usd` aur har AI call ka cost `ai_generations.cost_usd` mein log;
  - weekly spend review.
- Multi-account se free credits farm karne se rokne ke liye signup pe CAPTCHA + rate limits (AUTH-1).

## 6. User Flow

```
Landing → Sign in (Google / Email magic link)
  → Editor (empty state: Drop / Paste / Upload image)
  → Customize (Background, Frame, Style, Position, Layout, Sunlight, Auto)
  → AI Post Generator (generate → refine)
  → Connect X (one-time) → Post to X
     OR  Download  /  Share to X (manual)
```

## 7. Functional Requirements

### 7.1 Auth & Account

| ID | Requirement |
|---|---|
| AUTH-1 | Supabase Auth: Google OAuth, Email magic link. Signup/login pe CAPTCHA (Cloudflare Turnstile — Supabase Auth mein built-in support). X sirf posting ke liye alag "Connect X" (§7.11) se — login ke liye nahi. |
| AUTH-2 | Signup pe `profiles` row auto-create (DB trigger, §10); `ai_credits` = `app_config` ki monthly limit. |
| AUTH-3 | Top bar: avatar, username, credits badge, theme toggle (light/dark). |
| AUTH-4 | Account page (`/account`): AI credits left + reset date, credits history (`credit_transactions`), AI generations history (`ai_generations`), profile. X posts/connected-X wale parts API drop ke saath hate (PRD §7.11). |
| AUTH-5 | Delete account (server route `/api/account/delete`): Storage files delete (user prefix), `auth.users` delete (cascade → profiles, generations, etc.). |

### 7.2 Editor Canvas

| ID | Requirement |
|---|---|
| ED-1 | Image input: drag & drop, paste (Ctrl+V), file picker. Max 10 MB; PNG/JPG/WebP. |
| ED-2 | Canvas live preview, top-left mein output size (e.g. `1500 × 1125`). |
| ED-3 | Bottom floating toolbar: Replace image, Remove, Background, Frame, Style, Position, Layout, Sunlight, Auto, AI Post Generator. |
| ED-4 | Har tool ek popover panel kholta hai; ek waqt pe ek panel open. |
| ED-5 | Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), min 50 steps. |
| ED-6 | Editor state autosave `projects` table mein (debounce 2s). |
| ED-7 | v1 mein koi PRO lock nahi. AI credits ya X post limit khatam hone pe clear message + reset date. |

### 7.3 Background

| ID | Requirement |
|---|---|
| BG-1 | Tabs: Motion, Premium (in-house curated set), Search, Photo, Wallpaper, Mesh. |
| BG-2 | Filter chips: Liquid, Vibrant, Minimal, Dark. |
| BG-3 | Motion search with category chips (Abstract, Gradient, Neon, Fluid, Smoke, Particles, Clouds, Ocean) + shuffle. |
| BG-4 | Stock media API via Edge Function proxy (key hidden), responses 24h cache. **Providers: Pixabay (primary, decision 16 Oct — Pexels ne naye keys pause kiye hain) + Pexels (code ready, keys resume hote hi)**. Pixabay: free instant key, 100 req/min, videos direct embed allowed. |
| BG-5 | Attribution: panel mein "Provided by Pixabay" / "Provided by Pexels" link (provider ke hisaab se) + creator credit (link ke saath). |
| BG-6 | Solid color + custom gradient picker. |
| BG-7 | Image-derived background: blur / dominant colors. |
| BG-8 | Canvas export ke liye video/image CORS-enabled hone chahiye. CDN CORS M1 POC mein verify; nahi mile to poster fallback (already) ya selected media apne Storage pe cache (Pixabay photos ka permanent hotlink unke terms mein allowed nahi — storage cache follow-up). |

### 7.4 Frame (Mockup)

| ID | Requirement |
|---|---|
| FR-1 | Essentials: Screenshot (no frame), Browser. |
| FR-2 | Phone: iPhone 18 Pro, iPhone 18 Pro Max (Sep 2026 launch), iPhone 17, iPhone Air. iPhone 18 / Air 2 / 18e (spring 2027 expected) baad mein. |
| FR-3 | Computer: MacBook Pro 14", 16". |
| FR-4 | Window: Card, Dark Bar, Safari, Arc UI, Terminal, Glass. |
| FR-5 | Frames data-driven config (JSON: asset, screen rect, corner radius) — naya device bina code change add ho. |
| FR-6 | Frames khud ke SVG ya properly licensed assets; Apple ke design resources use karo to unki license terms follow karo. |

### 7.5 Style

| ID | Requirement |
|---|---|
| ST-1 | Styles: Default, Glass Light, Glass Dark, Liquid Glass, Inset Light, Inset Dark, Outline, Border, Border Dark. |
| ST-2 | Corner: Sharp, Curved, Round. |
| ST-3 | Shadow: None, Hug, Spread. |

### 7.6 Position

| ID | Requirement |
|---|---|
| PO-1 | Zoom slider (50–200%) + presets 75/100/125/150%. |
| PO-2 | Tilt (3D rotateX/rotateY, ±30°). |
| PO-3 | Position: 9-point anchor grid + free drag. |
| PO-4 | Padding slider (0–200px). |
| PO-5 | Layout presets (Center, Hero, Left, Right, Bottom-peek…) thumbnail ke saath. |
| PO-6 | Reset button. |

### 7.7 Layout

| ID | Requirement |
|---|---|
| LA-1 | Aspect ratios: Auto, 2:1, 16:9, 16:10, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16, MBP 14", MBP 16". |
| LA-2 | Radius slider (0–48px), Shadow slider (0–100). |
| LA-3 | Default base width 1500px; scale multiplier download pe apply. X pe post ke liye alag render (EX-8). |

### 7.8 Sunlight

| ID | Requirement |
|---|---|
| SL-1 | Overlays: None, Morning, Golden, Noon, Shade, Sunset, Dusk, Studio, Overcast, Blush, Leaves, Window, Palm, Blinds, Slice, Arch, Panes, Lattice, Dapple, Curtain. |
| SL-2 | Strength slider (0–100%). |
| SL-3 | Adjust (collapsible): angle, softness, color temperature. |
| SL-4 | Grain slider (Off–100). |
| SL-5 | Implementation: overlay shadow maps (PNG/SVG) + blend modes (multiply/screen) — renderer mein (EX-3). |

### 7.9 Auto

| ID | Requirement |
|---|---|
| AU-1 | One-click: image ke dominant colors se matching background, padding, shadow, radius auto-set. Client-side, credit free. |

### 7.10 AI Post Studio (OpenRouter)

| ID | Requirement |
|---|---|
| AI-1 | Right side panel: header "AI Post Studio", close, expand, copy button. |
| AI-2 | **X Preview card**: connected X account ka name, handle, verified badge, "now", post text, rendered image, X action icons (reply, repost, like, views, bookmark, share). X connect nahi hai to placeholder profile. |
| AI-3 | **Generate post**: rendered image (vision model) + optional user prompt/topic → X post text. 1 credit. |
| AI-4 | Quick refine chips: Improve format, Better hook, Bold key words, Bullet points, Add CTA, Punchier, Add emojis, Shorter, Pro tone. 1 credit each. |
| AI-5 | Free-form chat "Ask AI to adjust the post…" — last 10 messages context mein. |
| AI-6 | **Edit & format**: manual edit; Bold/Italic Unicode conversion (X markdown support nahi karta). ⚠️ Screen readers Unicode bold theek se nahi padhte aur X search mein ye match nahi hota — sirf 1–3 keywords pe, UI mein ye warning dikhao. |
| AI-7 | Character counter X ki weighted counting se (`twitter-text` library): URL = 23 chars, emoji/CJK = 2 chars. Default 280; Premium long-post toggle (API se long post support build ke waqt verify). |
| AI-8 | Streaming response (SSE) taaki text type hota dikhe. |
| AI-9 | Credits khatam → "limit reached" message + reset date; check server pe (client trust nahi). |
| AI-10 | Provider error / empty output pe credit refund. |
| AI-11 | AI ke liye image **client-side** compress (max 1024px JPEG) karke bhejo — Edge Function ka CPU limit 2s/request hai, server pe image processing nahi. |
| AI-12 | Post mein URL ho to "Link post" badge + X limit weight (5×) dikhao. |
| AI-13 | (Nice-to-have) AI-generated **alt text** image ke liye, user edit kar sake; X pe media metadata ke saath bhejo. |

**Prompt design (system prompt outline):**
- Role: expert X ghostwriter.
- Output: sirf post text, no quotes/preamble.
- Rules: strong first-line hook, short lines, max 280 weighted chars (unless long-post), max 1–2 hashtags, **URL tabhi jab user de**, user-requested tone.
- Refine: current post + action instruction → revised post.
- User input ko system prompt se alag message mein rakho (prompt injection).

### 7.11 X (Twitter) Integration

> **Decision (16 Oct): X API se posting DROPPED.** OAuth/token/media-upload/tweet API wala flow nahi banega — cost, complexity aur maintainability ke liye. Posting manual share flow se hoga: text pre-filled intent + image copy/download, user khud X compose mein attach karke post karega. API-based requirements (X-1…X-13) archive mein hain; `x_accounts`/`posts` tables + X functions DB mein dormant rahenge (future option).

| ID | Requirement |
|---|---|
| XF-1 | **X pe kholo:** `https://x.com/intent/post?text=…` naya tab mein — text pre-filled. Image intent se attach nahi hoti, user khud attach karega. |
| XF-2 | **Text copy:** ek click mein post text clipboard mein (weighted counter + link badge ke saath dikhta rahe). |
| XF-3 | **Image copy / download:** rendered post image clipboard mein (PNG) ya download — X compose mein paste/attach karke post. |
| XF-4 | **Manual-posting limits (X khud enforce karta hai):** image JPG/PNG/WebP ≤ 5 MB; GIF ≤ 15 MB, ≤ 1280×1080, ≤ 350 frames, w×h×frames ≤ 300M; video ≤ 1280×1024, H.264, 30 fps, yuv420p, aspect 1:3–3:1. Export ke `X-ready ✓` checks (T3.6) yehi limits use karte hain. |
| XF-5 | Koi X API call, OAuth, token storage ya server-side post nahi. X connect UI ki jagah placeholder profile + share actions. |

<details>
<summary>Archive — dropped API requirements (X-1…X-13, decision 16 Oct)</summary>

| ID | (Dropped) Requirement |
|---|---|
| X-1 | X Developer Console Web App (confidential), OAuth 2.0 PKCE, scopes tweet.read/write, users.read, media.write, offline.access |
| X-2 | `/api/x/connect` — state + code_verifier encrypted cookie → authorize redirect |
| X-3 | `/api/x/callback` — 30s exchange, AES-256-GCM tokens → `x_accounts` |
| X-4 | `GET /2/users/me` cache |
| X-5 | Token refresh + rotated refresh token save + `claim_x_token_refresh` lease |
| X-6 | Image: separate render JPG/WebP ≤ 5 MB → `/2/media/upload` |
| X-7 | GIF: ≤ 15 MB, ≤ 1280×1080, ≤ 350 frames → chunked upload |
| X-8 | Video: chunked upload, initialize/append/finalize + status poll |
| X-9 | `POST /2/tweets` (text + media_ids), media reject handling |
| X-10 | Monthly post limit server-side (`posts` count + link weight) |
| X-11 | "View on X" link + `posts` log (media_type, has_url, cost_usd) |
| X-12 | API error mapping (rate limit, duplicate, token revoked, media rejected, credits) |
| X-13 | Disconnect: `/2/oauth2/revoke` + row delete |

</details>

### 7.12 Export / Download

| ID | Requirement |
|---|---|
| EX-1 | Download modal: Type (Image / GIF / Video), Format (PNG / JPG / WebP), Scale (1× / 2× / 3× — sirf images; GIF/MP4 apni fixed limits se encode hote hain), Watermark toggle (`scene.watermark` ko set karta hai). |
| EX-2 | GIF & Video sirf motion background pe; warna disabled + hint "GIF and video need a motion background". |
| EX-3 | **Renderer:** Recommended — ek hi **WebGL2** compositor jo preview aur export dono kare (deterministic output); Canvas 2D perspective tilt / fast glass blur nahi kar sakta. DOM capture (`html-to-image`) mein glass (`backdrop-filter`), 3D tilt, blend modes aur `<video>` frames browser-to-browser alag ya slow render ho sakte hain — sirf fallback. M1 POC (T1.5) mein compare karke final. |
| EX-4 | **Video:** WebCodecs `VideoEncoder` + MP4 muxer (e.g. Mediabunny), frame-by-frame canvas render, Web Worker mein. **GIF:** palette quantization encoder (e.g. gifenc). Fallback: `ffmpeg.wasm` single-thread (multi-thread build ke liye cross-origin isolation / COOP+COEP chahiye, jo third-party images/videos load hona tod sakta hai). 5–10s loop. |
| EX-5 | Watermark: chhota "Made with Shotlark" badge (logo + name, bottom-right). Default ON; `scene.watermark` single source of truth — Download modal ka toggle wahi set karta hai. |
| EX-6 | Filename: `shotlark-{timestamp}.{ext}`. |
| EX-7 | Copy to clipboard (PNG). |
| EX-8 | **X post render** automatic: X-6/X-7/X-8 ki limits ke hisaab se alag encode (size, resolution, format), download settings se independent. |

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Editor LCP < 2.5s; slider changes 60fps; image export (2×) < 3s on mid-range laptop. |
| Responsiveness | Desktop-first (≥1280px). Tablet usable. Mobile: view-only + "use desktop" notice (v1). |
| Accessibility | WCAG 2.1 AA: toolbar/popovers keyboard navigation, focus rings, icon buttons pe `aria-label`, contrast ≥ 4.5:1, `prefers-reduced-motion` respect (motion backgrounds pause). |
| Theming | Dark (default) + Light. |
| Browser support | Latest Chrome, Edge, Firefox, Safari. WebCodecs feature-detect + fallback (EX-4). |
| Reliability | AI/X calls pe retry with backoff (sirf idempotent steps); 99.5% uptime target. |
| Privacy | Uploads private bucket mein; 30 din baad unsaved uploads auto-delete (cron). Images OpenRouter + upstream model providers ko jaati hain → Privacy Policy mein disclose; OpenRouter settings mein training / data-logging wale providers disable. |
| Legal | Launch se pehle Privacy Policy + Terms of Service. |

## 9. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (latest 16.4.x patch — Oct 2026 mein critical RCE fix aaya hai, hamesha latest patch pe raho) + TypeScript + Tailwind CSS + shadcn/ui |
| State | Zustand (editor state) + undo/redo middleware |
| Rendering/Export | WebGL2 compositor (Canvas 2D nahi — EX-3, ARCH AD-2) + WebCodecs + MP4 muxer, GIF encoder (EX-3, EX-4) |
| Auth | Supabase Auth (`@supabase/ssr` for Next.js cookies) + CAPTCHA |
| Database | Supabase Postgres + Row Level Security + column-level grants |
| Storage | Supabase Storage (`uploads` private, `exports` private, `assets` public) |
| Server — Supabase Edge Functions | AI (generate/refine), Pexels proxy, uploads cleanup |
| Scheduled jobs | pg_cron (SQL functions) + pg_net (Edge Function trigger) |
| Server — Next.js Route Handlers (Node runtime) | X OAuth, X posting, disconnect, delete account |
| Rate limiting | Postgres-based counters (`hit_rate_limit`, ARCHITECTURE §7.3) — Edge Functions mein built-in nahi |
| Supabase keys | Naye publishable (`sb_publishable_…`) + secret (`sb_secret_…`) keys — legacy `anon` / `service_role` end-2026 tak deprecated |
| AI | OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) |
| Backgrounds | Pexels API (photos/videos) |
| Hosting | Vercel (frontend + route handlers) + Supabase Cloud (ek hi project) |
| Analytics | PostHog |
| Errors | Sentry |

### 9.1 OpenRouter Usage

- API key **sirf server** pe (Edge Function secret `OPENROUTER_API_KEY`), key pe credit limit set.
- Headers: `Authorization: Bearer <key>`, `HTTP-Referer: <APP_URL>` (planned `https://shotlark.com`; app attribution ke liye required), `X-OpenRouter-Title: Shotlark` (purana `X-Title` bhi chalta hai).
- Models `app_config` mein configurable:
  - `ai.models.generate` — vision-capable models (image + text input).
  - `ai.models.refine` — sasta/fast text models.
  - Fallback ke liye OpenRouter ka native **`models` array** (priority order) — pehla fail ho to OpenRouter khud agla try karta hai.
- Har response mein `usage` (tokens + `cost`) automatically aata hai — streaming mein last SSE chunk mein. Ise `ai_generations` mein log karo.
- Edge Function limits: CPU 2s/request (async I/O count nahi hota), wall clock 150s (Free) / 400s (paid), response 150s ke andar shuru hona chahiye — streaming ke liye theek.

## 10. Data Model (Supabase Postgres)

```sql
-- Users ka extended profile
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  ai_credits int not null default 30 check (ai_credits >= 0),  -- har mahine reset
  credits_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Connected X accounts (tokens encrypted)
create table public.x_accounts (
  user_id uuid primary key references public.profiles on delete cascade,
  x_user_id text not null,
  username text not null,
  display_name text,
  avatar_url text,
  verified boolean not null default false,
  access_token_enc text not null,
  refresh_token_enc text not null,
  expires_at timestamptz not null,
  scopes text not null,
  refresh_lock_until timestamptz,  -- token refresh lease (parallel refresh race se bachne ke liye)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved editor projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null default 'Untitled',
  source_image_path text,          -- storage path: {user_id}/...
  editor_state jsonb not null,     -- bg, frame, style, position, layout, sunlight
  post_text text,
  updated_at timestamptz not null default now(),  -- moddatetime trigger se update
  created_at timestamptz not null default now()
);

-- AI calls log
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  project_id uuid references public.projects on delete set null,
  action text not null,            -- generate | improve_format | better_hook | chat ...
  model text not null,             -- jo model actually chala (fallback ke baad)
  input jsonb,
  output text,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10,6),
  status text not null default 'success' check (status in ('success','failed','refunded')),
  created_at timestamptz not null default now()
);

-- X posts (limit + cost tracking)
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  project_id uuid references public.projects on delete set null,
  x_post_id text,
  text text not null,
  media_type text check (media_type in ('image','gif','video')),
  has_url boolean not null default false,
  weight int not null default 1 check (weight > 0),  -- link post = 5 (app_config)
  cost_usd numeric(10,4),
  status text not null default 'pending' check (status in ('pending','posted','failed')),
  error text,
  created_at timestamptz not null default now()
);

-- Per-user rate limit counters (fixed window)
create table public.rate_limits (
  user_id uuid not null references public.profiles on delete cascade,
  bucket text not null,            -- ai | pexels | x_post
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);

-- Pexels API response cache (24h)
create table public.pexels_cache (
  cache_key text primary key,      -- endpoint + query + page ka hash
  response jsonb not null,
  expires_at timestamptz not null
);

-- Credits ledger (audit trail)
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  delta int not null,              -- -1 use, +1 refund, monthly reset
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- Remote config (secrets yahan kabhi nahi)
create table public.app_config (
  key text primary key,
  value jsonb not null
);

insert into public.app_config (key, value) values
  ('limits.ai_credits_monthly', '30'),
  ('limits.x_posts_monthly', '10'),
  ('limits.x_link_post_weight', '5'),
  ('credits.cost_generate', '1'),
  ('credits.cost_refine', '1');

-- Indexes
create index on public.projects (user_id, updated_at desc);
create index on public.ai_generations (user_id, created_at desc);
create index on public.posts (user_id, created_at desc);
create index on public.credit_transactions (user_id, created_at desc);

-- Signup pe profile auto-create (credits app_config se)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, ai_credits)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(
      (select (value #>> '{}')::int from public.app_config where key = 'limits.ai_credits_monthly'),
      30
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 10.1 Credit Functions (server-only)

Ye functions **sirf service role** (Edge Function) call kar sakta hai. Edge Function pehle user ka JWT verify karke `user_id` nikalta hai, phir service-role client se RPC call karta hai. Client se direct call blocked hai — warna koi bhi negative amount bhej ke free credits bana leta.

```sql
create or replace function public.consume_credits(p_user_id uuid, p_amount int, p_reason text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Check + deduct ek hi statement mein: parallel requests double-spend nahi kar sakti
  update public.profiles
     set ai_credits = ai_credits - p_amount
   where id = p_user_id
     and ai_credits >= p_amount
  returning ai_credits into v_remaining;

  if v_remaining is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, -p_amount, p_reason);

  return v_remaining;
end;
$$;

create or replace function public.refund_credits(p_user_id uuid, p_amount int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles
     set ai_credits = ai_credits + p_amount
   where id = p_user_id;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, p_amount, p_reason);
end;
$$;

revoke execute on function public.consume_credits(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.refund_credits(uuid, int, text) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, int, text) to service_role;
grant execute on function public.refund_credits(uuid, int, text) to service_role;
```

**Monthly reset (cron, daily):** jinka `credits_reset_at` 1 mahine se purana hai unka `ai_credits` = `limits.ai_credits_monthly`, `credits_reset_at = now()`, ledger mein entry.

Baaki functions — `hit_rate_limit`, `reserve_x_post` (X limit atomic check + `pending` row), `claim_x_token_refresh`, `reset_monthly_credits`, `cleanup_housekeeping` — ARCHITECTURE.md §7.3 mein. Final schema ka source of truth: `supabase/migrations/`.

### 10.2 Row Level Security & Privileges

RLS sirf rows control karta hai, columns nahi — isliye sensitive columns ke liye column-level grants bhi.

```sql
alter table public.profiles enable row level security;
alter table public.x_accounts enable row level security;
alter table public.projects enable row level security;
alter table public.ai_generations enable row level security;
alter table public.posts enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.app_config enable row level security;
alter table public.rate_limits enable row level security;
alter table public.pexels_cache enable row level security;

-- Explicit grants (ARCH §7.1) — default grants pe bharosa nahi
grant select, insert, update, delete on public.projects to authenticated;
grant select on public.ai_generations to authenticated;
grant select on public.posts to authenticated;
grant select on public.credit_transactions to authenticated;
grant select on public.app_config to authenticated;

-- Internal tables: client ka koi access nahi (sirf server)
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.pexels_cache from anon, authenticated;

-- profiles: apni row padho; sirf name/avatar update (credits nahi)
create policy "profiles: own read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: own update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- x_accounts: token columns client ko kabhi nahi milenge
revoke all on public.x_accounts from anon, authenticated;
grant select (user_id, username, display_name, avatar_url, verified) on public.x_accounts to authenticated;
create policy "x_accounts: own read" on public.x_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

-- projects: owner full access
create policy "projects: own all" on public.projects
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- logs: sirf read; writes sirf service role
create policy "ai_generations: own read" on public.ai_generations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "posts: own read" on public.posts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "credit_transactions: own read" on public.credit_transactions
  for select to authenticated using ((select auth.uid()) = user_id);

-- config: sab logged-in users padh sakte
create policy "app_config: read" on public.app_config
  for select to authenticated using (true);

-- Storage: path = {user_id}/{file}
create policy "storage: own files" on storage.objects
  for all to authenticated
  using (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('uploads','exports') and (storage.foldername(name))[1] = (select auth.uid())::text);
```

Note: `x_accounts` pe client ko columns explicitly select karne honge (`select('username, display_name, avatar_url, verified')`); `select *` permission error dega — ye intended hai.

## 11. Server API

| Endpoint | Where | Auth | Purpose |
|---|---|---|---|
| `ai-generate` | Edge Function (SSE) | User JWT | Rate limit → `consume_credits` → OpenRouter → log. Fail pe `refund_credits`. |
| `ai-refine` | Edge Function (SSE) | User JWT | `{ post, action \| message, history }` → revised post. Same credit flow. |
| `pexels-search` | Edge Function | User JWT | Pexels proxy + 24h cache + attribution data. |
| `reset_monthly_credits()` | pg_cron (SQL, daily) | — | Monthly credits reset. |
| `cleanup_housekeeping()` | pg_cron (SQL, hourly) | — | Stale `pending` posts → `failed`, purane rate-limit rows + expired Pexels cache delete. |
| `uploads-cleanup` | Edge Function (pg_cron → pg_net) | Secret key | 30 din purane unsaved uploads + bache hue X media delete (Storage API se — SQL se files delete nahi hoti). |
| `/api/x/connect` | Next.js Route Handler | Supabase session | PKCE + state cookie → X authorize redirect. |
| `/api/x/callback` | Next.js Route Handler | Session + state cookie | Code exchange, encrypt, upsert, `users/me` fetch. |
| `/api/x/post` | Next.js Route Handler | Session | Limit check → token refresh (if needed) → media upload → `POST /2/tweets` → log. |
| `/api/x/disconnect` | Next.js Route Handler | Session | Revoke + delete. |
| `/api/account/delete` | Next.js Route Handler | Session | Files + X revoke + auth user delete. |

Har endpoint: input validation (zod), per-user rate limit (AI: 20 req/min), structured error `{ code, message }`.

## 12. Security

- **Secrets placement:**
  - Supabase Edge Function secrets: `OPENROUTER_API_KEY`, `PEXELS_API_KEY`.
  - Vercel server env (kabhi `NEXT_PUBLIC_` prefix nahi): `X_CLIENT_ID`, `X_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `SUPABASE_SECRET_KEY`.
  - Frontend mein sirf Supabase URL + publishable key. Poori list: ARCHITECTURE.md §9.2.
- X tokens **AES-256-GCM** (random IV per encryption) se encrypt; decrypt sirf Next.js server pe.
- OAuth `state` + PKCE verifier: encrypted httpOnly cookie, SameSite=Lax, 10 min expiry, ek baar use.
- Credit functions client se callable nahi (§10.1); credits column client update nahi kar sakta (§10.2).
- Signup CAPTCHA + per-user rate limits (free credits farming rokne ke liye).
- Uploads: MIME + size validation, private bucket, signed URLs (expiry 1h).
- Prompt injection: user text alag message mein; AI output sirf plain text render (no HTML).
- Next.js / dependencies hamesha latest security patch pe (Dependabot / Renovate).

## 13. Analytics Events

`signup`, `image_uploaded`, `tool_opened {tool}`, `ai_generate`, `ai_refine {action}`, `limit_reached {type}`, `x_connected`, `x_posted {media_type, has_url}`, `x_post_failed {reason}`, `share_intent_used`, `export {type, format, scale, watermark}`.

## 14. Roadmap

| Phase | Duration | Scope |
|---|---|---|
| **M1 — Foundation + POC** | Week 1–2 | Next.js setup, Supabase Auth + CAPTCHA, schema + RLS, editor shell, upload. **Export POC:** canvas compositor vs html-to-image (glass, tilt, video frames, Pexels CORS), WebCodecs MP4 test. X developer app + API credits + spending limit setup. |
| **M2 — Editor** | Week 3–5 | Background (static + Pexels motion), Frame, Style, Position, Layout, Sunlight, Auto, undo/redo |
| **M3 — Export** | Week 6 | PNG/JPG/WebP + scales, watermark toggle, GIF/MP4, X post render |
| **M4 — AI Studio** | Week 7–8 | OpenRouter Edge Functions, credits system, X preview card, refine chips, chat |
| **M5 — X Integration** | Week 9–10 | X OAuth + posting (image/GIF/video), limits, share fallback, account page |
| **M6 — Launch** | Week 11–12 | Landing page, legal pages, analytics, Sentry, QA, accessibility pass, beta launch |

**v2 — Billing (baad mein):**
- Paid plan decide karo (Lifetime / subscription) aur kaunse features paid honge.
- Payment provider: Stripe India mein invite-only hai → Razorpay ya Merchant of Record (Paddle / Lemon Squeezy — India seller support verify karo).
- `purchases` table + payment webhook (signature verification + idempotency).
- Kharide hue credits ke liye alag bucket, taaki monthly reset unhe na mitaye.
- Refund Policy page.

**v2 — Other ideas:** Post scheduling, threads, LinkedIn/Instagram, brand kits, templates gallery, team workspaces, Chrome extension (one-click screenshot → Shotlark).

## 15. Open Questions

**Resolved (16 Oct 2026):**
- ✅ Beta limits: AI 30 credits + X 10 post units per user per month, link post weight 5×.
- ✅ Beta access: open signup — koi bhi signup kar sakta hai (CAPTCHA + limits ke saath).
- ✅ Ek hi Supabase project — local, Vercel preview aur production sab isi pe (ARCHITECTURE §11).

**Open:**
1. **Default OpenRouter models** — quality vs cost test karke final.
2. **Long posts** — X Premium users ke liye API se long post support build ke waqt verify.
3. **Pexels** — unlimited API access approval + CDN CORS (M1 POC).
4. **Brand** — domain kharidna, X handle, trademark search (top note dekho).

## 16. Sources (verified 16 Oct 2026)

- X API pay-per-use pricing — https://docs.x.com/x-api/getting-started/pricing
- X media limits (image/GIF/video) — https://docs.x.com/x-api/media/quickstart/best-practices
- X OAuth 2.0 scopes, token lifetime, 30s auth code — https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code
- OpenRouter app attribution headers — https://openrouter.ai/docs/app-attribution
- OpenRouter usage accounting — https://openrouter.ai/docs/guides/administration/usage-accounting
- OpenRouter model fallbacks — https://openrouter.ai/docs/guides/routing/model-fallbacks
- Supabase Edge Function limits — https://supabase.com/docs/guides/functions/limits
- Pexels API guidelines — https://www.pexels.com/api/documentation/
- Stripe India invite-only (v2 billing) — https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india
- Next.js 16.4.1 security patch — https://thehackernews.com/2026/10/nextjs-ships-out-of-band-patch-for-two.html
- iPhone 18 Pro / Pro Max launch — https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/

Content was rephrased for compliance with licensing restrictions.
