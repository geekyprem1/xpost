# Shotlark — Tasks

| Field | Value |
|---|---|
| Based on | `PRD.md` v1.4, `ARCHITECTURE.md` v1.3 |
| Date | 16 Oct 2026 |
| Timeline | 12 weeks (M1–M6) |

**Legend:** `[ ]` todo · `[x]` done · **[USER]** = aapko khud karna hai (accounts, keys, payments) · Refs = PRD requirement IDs / ARCHITECTURE sections.

> 🔒 API keys / secrets chat mein kabhi paste mat karna. Unhe khud `.env.local`, Vercel env ya Supabase Dashboard mein daalna.

## Progress

| Milestone | Weeks | Status |
|---|---|---|
| M0 — Accounts & setup (USER) | Week 1 ke saath | Not started |
| M1 — Foundation + POC | 1–2 | In progress |
| M2 — Editor | 3–5 | In progress |
| M3 — Export | 6 | Not started |
| M4 — AI Studio | 7–8 | Not started |
| M5 — X Integration | 9–10 | Not started |
| M6 — Launch | 11–12 | Not started |

## Definition of Done (har task ke liye)

- Lint, typecheck, build pass.
- Logic wale code (credits, limits, crypto, scene, presets) ke tests.
- Code mein koi secret nahi; server-only modules mein `import 'server-only'`.
- Interactive UI keyboard se use ho sake, icon buttons pe `aria-label`.
- Related PRD requirement IDs pure hon.

---

## M0 — Accounts & Setup [USER]

M1 ke saath parallel. Har item kis task se pehle chahiye, wo "Needed by" mein hai.

| ID | Task | Needed by |
|---|---|---|
| U1 | `shotlark.com` kharido (`.app` optional); X handle (`@shotlark` ya similar) reserve karo; trademark search (USPTO + IP India) | M6 (domain jaldi lo) |
| U2 | GitHub repo banao | T1.1 |
| U3 | Node.js LTS + Supabase CLI install. Docker optional — sirf agar local pe DB tests chalane hon (CI mein already hota hai) | T1.2 |
| U4 | Supabase: **1 project** (local, preview, production sab isi pe), target users ke paas wala region. Auth → URL Configuration (ARCH §11.2) | T1.2 |
| U5 | Vercel account + repo connect | T1.7 |
| U6 | Google Cloud OAuth client (Web) — redirect URI Supabase callback; Supabase Dashboard mein Google provider on | Pre-launch (deferred — abhi nahi) |
| U7 | Cloudflare Turnstile widget (hostnames: `127.0.0.1` + production domain); secret Supabase Dashboard → Auth → CAPTCHA mein | Pre-launch (deferred — abhi nahi) |
| U8 | OpenRouter account — ek API key, credit limit ke saath; Supabase Edge Function secrets mein set | T4.2 |
| U9 | Pexels API key — Supabase Edge Function secrets mein set | T2.4 |
| U10 | X Developer account → app (Web App, OAuth 2.0), callback URLs: `http://127.0.0.1:3000/api/x/callback` + production; API credits kharido, spending limit + auto-recharge | T5.2 |
| U11 | PostHog + Sentry projects | T6.4 |
| U12 | Privacy Policy + Terms content review (lawyer recommended) | T6.3 |
| U13 | GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` | T1.7 |
| U14 | Custom SMTP provider (auth emails) — default Supabase SMTP sirf 2 emails/hour aur sirf team members ko bhejta hai | T6.7 |
| U15 | Launch se pehle Supabase Pro plan (pausing nahi + daily backups) | T6.7 |

---

## M1 — Foundation + POC (Week 1–2) ✅ complete (T1.7 CI pending U2/U5/U13)

### T1.1 Project scaffold
- [x] Next.js 16 (App Router, TypeScript strict), Tailwind CSS, shadcn/ui init
- [x] ESLint + Prettier, path aliases, `typecheck` script
- [x] Folder structure (ARCHITECTURE §3), `server-only` package
- [x] `.env.example` (sirf variable names — ARCHITECTURE §9.2)
- [x] Saari dependencies exact versions pe pinned

**Done when:** `npm run lint`, `npm run typecheck`, `npm run build` pass; dev server pe khaali app shell khule.
**Refs:** ARCH §3, §9.2

### T1.2 Supabase database
- [x] `supabase init`
- [ ] **[USER]** `supabase login` + `supabase link` (DB password aap khud daaloge)
- [x] `config.toml` sirf CI ke temporary DB ke liye; project ki Auth settings Dashboard se (U4, U6, U7)
- [x] Migration `schema`: saari tables + indexes (PRD §10)
- [x] Migration `security`: RLS, explicit grants, column-level grants, storage policies (PRD §10.2)
- [x] Migration `functions`: `handle_new_user`, `consume_credits`, `refund_credits`, `hit_rate_limit`, `reserve_x_post`, `claim_x_token_refresh`, `reset_monthly_credits`, `cleanup_housekeeping` (ARCH §7.3)
- [x] Migration `storage`: buckets `uploads`, `exports` (private), `assets` (public) — size + MIME limits (ARCH §7.4)
- [x] Migration `config`: `app_config` defaults (seed real project pe nahi chalta — ARCH §11.1)
- [x] `seed.sql`: sirf test fixtures
- [x] pgTAP tests (CI ke temporary DB pe — T1.7):
  - [x] User A, user B ka data nahi padh sakta (har table)
  - [x] Client `ai_credits` update nahi kar sakta
  - [x] Client `x_accounts` ke token columns select nahi kar sakta
  - [x] `consume_credits` / `refund_credits` authenticated role se execute nahi hote; negative amount reject
  - [x] Credits 0 pe `INSUFFICIENT_CREDITS`
  - [x] `reserve_x_post` limit pe `X_POST_LIMIT_REACHED`; link post weight 5
  - [x] Signup pe profile + 30 credits
- [ ] `supabase db push` se project pe apply

**Done when:** Migrations project pe apply hon (Dashboard mein tables, policies, buckets dikhein); pgTAP tests CI mein green (T1.7).
**Refs:** PRD §10, ARCH §7, §11.1

### T1.3 Auth
- [x] `@supabase/ssr` browser + server clients; admin client (`server-only`, secret key)
- [x] `proxy.ts`: session refresh + `(app)` routes protect
- [x] `/login`: email magic link only (Google button + Turnstile deferred — U6/U7 pre-launch pe)
- [x] `/auth/callback` (OAuth code exchange), `/auth/confirm` (`token_hash` → `verifyOtp`) + safety-net (`/?code=` → `/auth/callback`)
- [ ] Magic link email template `/auth/confirm` link pe update — pending (Dashboard); abhi default template bhi kaam karta hai safety-net ke wajah se
- [x] Logout; server components / route handlers mein `auth.getUser()` check

**Done when:** `http://127.0.0.1:3000` pe magic link login kaam kare (default SMTP sirf team member emails pe, 2/hour — development ke liye kaafi); logged-out user `/editor` pe jaaye to `/login` redirect; naye user ka profile 30 credits ke saath bane.
**Updated (17 Oct):** Email/password sign-in and sign-up added. Removed the AUTH_ENABLED bypass: /editor and /account always require authentication. Logged-out redirects verified locally; email confirmation and real-account sign-in still need live verification.
**Refs:** PRD AUTH-1, AUTH-2; ARCH §8.1

### T1.4 App shell
- [x] Top bar: logo, credits badge, Download button, avatar menu, theme toggle (credits badge abhi static — T1.3 ke baad live; avatar menu placeholder)
- [x] Bottom floating toolbar (saare tool buttons, abhi placeholder panels — Replace/Remove T1.6 tak disabled)
- [x] Popover system: ek waqt pe ek panel, Esc se close, focus management
- [x] Right panel slot (AI Studio ke liye)
- [x] Dark (default) + light theme

**Done when:** Saare toolbar buttons keyboard se reachable; panels sahi open/close hon.
**Refs:** PRD ED-3, ED-4, AUTH-3

### T1.5 Renderer + export POC (decision gate)
- [x] Prototype A: WebGL2 (PixiJS v8 ya raw WebGL2) — custom minimal layer
- [x] Prototype B: DOM + `html-to-image`
- [x] Dono pe test: gradient bg + rounded corners + shadow, glass blur, perspective tilt, Pexels video background
- [x] Pexels CDN CORS check (images + videos canvas pe draw ho, canvas taint na ho) — PASS
- [x] 3× PNG export time naapo — 162 ms (2×: 345 ms), target < 3s
- [x] 5s MP4: WebCodecs + Mediabunny; GIF: gifenc — VP8/WebM path end-to-end verified (headless Chromium mein H.264 encoder nahi mila; real Chrome pe verify karna); GIF 75f/29.9s — slow, M3 mein optimize
- [ ] Chrome, Firefox, Safari pe test — Chromium (headless 153) ✓ 16 Oct; real Chrome + Firefox + Safari manual pending (`/poc/renderer` kholke)
- [x] Result + decision ARCHITECTURE §13 (AD-2) mein likho

**Done when:** Decision documented; chuna hua approach 2× image export < 3s target pura kare (ya fallback plan likha ho).
**Refs:** PRD EX-3, EX-4, BG-8; ARCH §5, §14

### T1.6 Upload flow
- [x] Empty state: drag & drop, paste (Ctrl+V), file picker — client-side ✓ (local object-URL, browser-tested)
- [x] Validation: PNG/JPG/WebP, max 10 MB — 7 unit tests ✓
- [ ] Upload `uploads/{uid}/{projectId}/source.{ext}`; `projects` row create; image dimensions save — **auth OFF hai abhi** (AUTH_ENABLED=false); storage upload + persistence auth wapas aane pe
- [ ] Project load by `/editor/[projectId]` — same dependency

**Done when:** Upload ke baad image canvas pe dikhe; page reload pe project wapas load ho. — image canvas pe ✓ (pixel + visual + undo/redo verify); reload-persistence auth pe pending
**Refs:** PRD ED-1, ED-6

### T1.7 CI + environments
- [ ] GitHub Actions PR job: lint, typecheck, build, Vitest, temporary Supabase (`supabase start` → `supabase db reset` → `supabase test db`), Deno tests (ARCH §11.3)
- [ ] `main` job: same checks → `supabase db push` → `supabase functions deploy --use-api` (U13 secrets)
- [ ] Vercel: previews + production dono wahi Supabase project; previews pe `X_POSTING_ENABLED=false`
- [ ] Supabase Auth Redirect URLs mein Vercel preview wildcard (ARCH §11.2)

**Done when:** PR pe pipeline green (pgTAP included); `main` merge pe migrations project pe apply hon; preview deploy pe Google login chale.
**Refs:** ARCH §11

---

## M2 — Editor (Week 3–5) ✅ complete

### T2.1 Scene model + store
- [x] `lib/scene`: types (ARCH §4.3), defaults, zod schema, `version` migrations scaffold — 13 unit tests
- [x] Zustand store + zundo history (≥ 50 steps; slider drag = ek entry) — gesture pinning (setScene transient + commitScene)
- [x] Ctrl+Z / Ctrl+Shift+Z — editor page pe wired ✓ (browser verify: image add → Ctrl+Z undo → Ctrl+Shift+Z redo)
- [x] Autosave (debounce 2s) + retry + status — controller + tests ready (Supabase save fn T1.3/T1.6 ke baad inject hoga; indicator UI canvas ke saath)

**Done when:** Schema / migration unit tests pass; undo/redo + autosave kaam karein. — 30 tests green (Vitest setup T1.7 CI ke liye ready)
**Refs:** PRD ED-5, ED-6; ARCH §4.2, §4.3

### T2.2 Renderer core
- [x] T1.5 ke decision wala renderer, layer pipeline (ARCH §5.1) — WebGL2: bg (solid/gradient/texture) → shadow → style plate (9 styles, glass = FBO blur) → screenshot (tilt homography mesh) → sunlight → grain → watermark
- [x] Dirty-flag rendering, DPR handling, aspect ratio, output size label — EditorCanvas: scene/size change pe hi render, DPR cap 2, aspect math + `1500 × 1125` label
- [x] Visual fixtures: preview vs export screenshot diff test — `/poc/fixtures`: 4 fixtures, mean diff 0.28–3.13 (mean ≤ 4 = pass)

**Done when:** Fixtures preview aur export mein same render hon. — ✓ 4/4 pass (grain per-pixel noise hai, isliye uska mean thoda zyada — expected; Playwright automation T6.6 mein)
**Refs:** PRD ED-2; ARCH §5.1–5.3

### T2.3 Background panel
- [x] Tabs: Motion, Premium, Search, Photo, Wallpaper, Mesh + filter chips (Liquid, Vibrant, Minimal, Dark) — Motion/Search/Photo T2.4 (Pexels) tak placeholder
- [x] Solid color + gradient picker — Custom: solid + hex, gradient stops (2–4) add/remove/position + angle slider (drag = 1 history entry)
- [x] Image background + blur; image-derived background (dominant colors) — "Screenshot se colors" button ab live ✓ (browser verify); blur-renderer path ready (image assets pe)
- [x] Curated sets (Premium, Mesh, Wallpaper) ke assets + thumbnails — 8+8+8 procedural presets (canvas thumbnails); Mesh ke liye naya WebGL shader

**Done when:** PRD BG-1, BG-2, BG-6, BG-7 pure. — ✓ tabs/chips/custom pure; BG-7 live wiring T1.6 ke image ke saath
**Refs:** PRD §7.3

### T2.4 Pexels integration
- [x] Edge Function `pexels-search`: `withSupabase('user')` + `_shared/{cors,errors,supabase,rate-limit}.ts`, rate limit 60/min, `pexels_cache` (24h), CORS allowlist (wildcard support), normalized response + credit info — 23/23 Deno tests (mocked handler + normalization + CORS + rate-limit + cache hit/expired + upstream 502 + key-missing 503)
- [x] Motion search UI + category chips + shuffle + Photos/Videos toggle — `pexels-pane.tsx` (Search/Photo/Motion tabs), stale-response guard
- [x] "Provided by Pexels" link + creator credit — active background ka credit bhi dikhta hai
- [x] Video background preview loop + poster (previewUrl) — rAF loop sirf video active + !reduced-motion; reduce pe poster static (live verified: hash identical)
- [x] Photo background (`image` kind) renderer wiring + `previewUrl` mediaRef field

- [x] **Pixabay provider (16 Oct, decision)** — `pixabay-search` function (photos+videos, 24h cache `pexels_cache` reuse, safesearch=true, orientation mapping, credit URLs per Pixabay), client `searchMedia` + pane provider chips (Pixabay default) + "Pexels keys paused" note; **15 Deno tests + 2 vitest**; browser-verified (mocked): search → apply video → live frame render, "Provided by Pixabay" + creator credit link
- [ ] **Follow-up:** Pixabay photos ka permanent hotlink unke terms mein allowed nahi — selection pe server-side cache (download → Storage `assets`) add karna hai (auth+storage ke baad); abhi search grid = temporary display (allowed)
- [x] **LIVE verified (16 Oct):** real Pixabay search (24/24 thumbnails load, `cdn.pixabay.com`), video apply → real frame render (pixel gradient se change), creator credit ("BlenderTimer") + "Provided by Pixabay" ✓; REST (profiles) 200 ✓

**Done when:** PRD BG-3, BG-4, BG-5 pure; Pexels key client bundle mein na ho. — ✓ client bundle scan: key/api-url absent (string "PEXELS_API_KEY" kahan bhi nahi); browser-verified (mocked session+route): video background playing (rAF ~44fps, frame-hash badal raha), photo pixel-exact `25,170,85`, attribution links ✓, reduced-motion static ✓
**Live:** deployed ✓ + `PIXABAY_API_KEY` set ✓ + real search/render verified (16 Oct). Sirf `PEXELS_API_KEY` pending (Pexels ne keys paused hain — resume hote hi add karna hai)
**Refs:** PRD §7.3; ARCH §6.2

### T2.5 Frame panel
- [x] `frames.json` config — bezel insets + bar + radius + colors per frame; `getFrameMetrics` renderer & thumbnails dono use karte hain
- [x] 13 frames: Browser, Card, Dark Bar, Safari, Arc, Terminal, Glass + iPhone 18 Pro / Pro Max / 17 / Air + MacBook 14″ / 16″ — canvas-composed chrome (window/phone/laptop painters)
- [x] Renderer: frame layer mesh (tilt ke saath chalti hai), screen-radius alignment, shadow frame bbox pe, texture size-key cache

**Done when:** PRD FR-1…FR-6 pure; naya frame sirf JSON + asset se add ho jaaye. — ✓ naya frame = **sirf JSON entry** (procedural chrome — SVG-asset approach ki jagah ye chuni, kyunki aspect-stretch se chrome distort hota hai); browser: Browser bar pixel-exact (#1c1c23), iPhone bezel visual; 3 tests
**Bug fix (16 Oct, user-report):** do bugs mile the — (1) frame chrome **screen hole cut nahi karta tha** (poora rect body color se bhar jata tha); (2) cut `ctx.fill()` **last fillStyle** use karta tha — laptop mein groove ka `rgba(0,0,0,0.42)` tha isliye hole sirf 42% cut hota (image 45% dim — pixel math se exact confirm: predicted 60,46,117 vs measured 60,47,117). Fix: `destination-out` + explicit **opaque** fillStyle. Saath mein realism: **iPhone side buttons** (margin 14 units + button nubs), **MacBook hinge line + base highlight**, **thumbnails bade** (phone 50×58). Verified: MacBook/iPhone/Terminal sab pe screen pixel **124,92,255 exact** ✓
**Competitor match (16 Oct, Pika-style):** Silver MacBook (`lidColor` — silver rim + black bezel inset + silver base), **Safari light chrome**, **panel categories** (Essentials/Phone/Computer/Window), **light thumbnail screens** (`#eaedf3`) — panel ab competitor jaisa saaf dikhta hai ✓
**Refs:** PRD §7.4

### T2.6 Style panel
- [x] 9 styles (thumbnails ke saath) — canvas thumbnails, saare visually distinct; Glass Light browser-verified (plate ring + pixel change)
- [x] Corner (Sharp / Curved / Round)
- [x] Shadow (None / Hug / Spread)

**Done when:** PRD ST-1…ST-3 pure. — ✓ (style switching pixels bhi verify hue: default → glass → border-dark)
**Refs:** PRD §7.5

### T2.7 Position panel
- [x] Zoom slider (50–200%) + presets 75/100/125/150
- [x] Tilt X/Y sliders (±30°)
- [x] 9-point anchor grid + canvas pe free drag (drag = 1 history entry — gesture API)
- [x] Padding slider (0–200px)
- [x] Layout presets (Center / Hero / Left / Right / Bottom Peek / Top Shelf) — real geometry se rendered thumbnails
- [x] Reset button

**Done when:** PRD PO-1…PO-6 pure. — ✓ browser: anchor + reset pixel-verified (18,22,34 → 190,107,225 → 18,22,34), zoom+drag visual; presets 5 unit tests
**Refs:** PRD §7.6

### T2.8 Layout panel
- [x] Aspect ratios (14) — canvas thumbnails (Auto dashed); browser verify: auto `1500×938` → 1:1 `1500×1500` → 9:16 `1500×2667`
- [x] Radius slider (0–48) + Shadow slider (0–100) — gesture API (drag = 1 entry)
- [x] Base width note (LA-3 context — download scale T3.x mein)

**Done when:** PRD LA-1…LA-3 pure. — ✓ (aspect math label se verify)
**Refs:** PRD §7.7

### T2.9 Sunlight panel
- [x] 19 overlay shadow maps (assets) + "None" option — procedural canvas textures (neutral-0.5 grayscale encoding) + painter thumbnails
- [x] Strength, Adjust (angle, softness, temperature), Grain — gesture sliders + collapsible Adjust
- [x] Renderer: dual-pass blend (screen light + multiply shadow) + overlay rotation (angle ke saath)

**Done when:** PRD SL-1…SL-5 pure. — ✓ browser: blinds 100% pe diagonal stripes (across-stripe diff 236), grain 100 pe per-pixel noise (adjacent diff 37); 3 unit tests
**Refs:** PRD §7.8
**Bonus:** shadcn Slider ab `aria-label` Thumb pe forward karta hai (a11y — T2.12 ke liye bhi)

### T2.10 Auto
- [x] Downscaled image se dominant colors (client-side) → background, padding, shadow, radius — `autoSceneFromImage` (128px sample) + Auto panel; browser verify: pixel math image-colors gradient se exact match; 6 unit tests

**Done when:** PRD AU-1 pura; koi network call nahi. — ✓ (sab client-side; zoom/anchor/offset/tilt untouched)

### T2.11 Motion behaviour
- [x] `requestAnimationFrame` loop sirf motion background pe — `renderScene` callback; loop sirf `background.kind === "video"` pe chalta hai
- [x] Tab hidden / `prefers-reduced-motion` → pause — `document.hidden` skip + `usePrefersReducedMotion` (useSyncExternalStore) guard

**Done when:** Static scene pe idle CPU ~0; reduced-motion setting pe video na chale. — ✓ static pe koi rAF loop nahi (code + browser sanity); live video test T2.4 ke saath
**Refs:** ARCH §5.3; PRD §8 Accessibility

### T2.12 Editor accessibility pass
- [x] Saare panels keyboard navigable, popover focus trap, `aria-label` — Tab-order browser-verified (saare toolbar buttons reachable), panels radix focus-trap, slider aria-labels Thumb pe forward
- [x] Contrast check (axe) — fixes: credits badge sr-only text, `h1` (main landmark ke andar), popover dialogs pe aria-label, empty-state opaque bg

**Done when:** axe mein editor pe koi critical / serious issue nahi. — ✓ **violations 0 · incomplete 0 · passes 32** (axe 4.12.1; tool khud ko injected-img se validate bhi kiya)
**Refs:** PRD §8 Accessibility

---

## M3 — Export (Week 6) ✅ complete

### T3.1 Download modal
- [x] Type / Format / Scale / Watermark toggle — `download-modal.tsx` (radix Dialog component naya), watermark toggle `scene.watermark` set karta hai (EX-5 single source)
- [x] GIF / Video disabled + hint jab motion background na ho

**Done when:** PRD EX-1, EX-2 pure. — ✓ browser-verified **dono states**: gradient bg pe GIF/Video `disabled: true` + hint visible; video bg pe `disabled: false` + hint gone

### T3.2 Image export
- [x] PNG / JPG / WebP × 1× / 2× / 3× — `lib/renderer/export.ts` (fresh WebGL2 renderer output-size pe, assets collected: screenshot/background image/video frame+poster fallback/sunlight/watermark)
- [x] Watermark (font load hone ke baad render), filename `shotlark-{timestamp}.{ext}` — `document.fonts.ready` await; on/off output bytes differ ✓
- [x] Copy to clipboard (PNG) — `navigator.clipboard.write` + graceful error path (headless permission denied → message; real-browser check pending)

**Done when:** PRD EX-5…EX-7 pure; 2× export < 3s (mid-range laptop). — ✓ measured: PNG 2× **3000×1875 · 521 KB · 0.12s**; JPG 1× 1500×938 · 51 KB; filename `shotlark-20261016-184927.png`; video-bg export poster fallback pixel-exact (#cc2244); 3 unit tests (filename/mime)

### T3.3 Export worker
- [x] `export.worker.ts` (OffscreenCanvas + WebGL2) — progress phases (init/render/encode), cancel, error handling; `export-client.ts` — assets main-thread pe ImageBitmaps bake hote hain + transferables, race-based cancel, main-thread fallback (worker/OffscreenCanvas/createImageBitmap na ho to)
- [x] `frame-canvas` worker-safe (OffscreenCanvas fallback), shared `export-protocol.ts` + `export-format.ts`; 6 client tests (fake worker: progress/done/transferables, cancel bake ke dauraan + post-post, error, fallback)

**Done when:** Lamba export UI freeze kiye bina chale aur cancel ho sake. — ✓ browser: PNG 2× worker path (`data-export-via="worker"`, 3000×1875 · 0.23s); 3× export ke dauraan UI responsive (evals chalti rahin), Cancel → "Export cancel ho gaya." + koi download nahi + busy release

### T3.4 MP4 export
- [x] Mediabunny decode (`VideoSampleSink.samplesAtTimestamps`) → per-frame WebGL render → Mediabunny `CanvasSource` (WebCodecs H.264) → MP4 mux — pura worker ke andar
- [x] 5–10s loop — `computeVideoDuration` + `buildLoopTimestamps` (chhoti source loop hoti hai), `capVideoSize` even dims + X-cap; 4 helper tests
- [x] Encoder feature-detect — `canEncodeVideo("avc")`; unsupported pe clear error. **ffmpeg.wasm fallback deferred** (intentional): ~31MB wasm bundle chahiye aur yahan verify nahi ho sakta; Chrome/Edge/Firefox/Safari sab WebCodecs H.264 support karte hain — agar koi purana browser issue aaya to launcher pe add hoga

**Done when:** MP4 Chrome, Firefox, Safari pe export ho aur common players mein chale. — ✓ Chrome (headless) full verified: **1280×800 · 6s · 195 KB · worker · 3.27s**; browser ke apne `<video>` player se decode — duration/dims sahi, play pe currentTime advance; MP4 frame grid pixels preview se match (pink bit-exact, purple/cyan diff ≤4 H.264 compression); video cancel ✓; PNG worker path regression bit-exact ✓
**Browser gotchas (fixed):** (1) OffscreenCanvas with context transfer nahi hota → ImageBitmaps transfer, worker mein canvas compose; (2) Chrome ImageBitmap pe `UNPACK_FLIP_Y_WEBGL` ignore karta hai → worker ke canvas path se flip honored (warna output vertically flipped)
**Refs:** PRD EX-4; ARCH §5.4

### T3.5 GIF export
- [x] 15 fps frames → palette quantization → gifenc — worker mein: Mediabunny decode → per-frame WebGL render → 2D readback (`willReadFrequently`) → `quantize(rgb565)` + `applyPalette` → `writeFrame` (per-frame local palette), pehle frame pe `repeat: 0` (infinite loop); even dims + X caps; `gifFrameDelayMs` helper + 2 tests (invariants: ≤350 frames, ≤300M pixels)
- [x] File size UI pe dikhe — status line `{W} × {H} · {MB} · {s}` (GIF/MP4 dono ke liye)

**Done when:** GIF loop sahi chale; file size UI pe dikhe. — ✓ browser: **1280×800 · 3.67 MB · 6.63s** (worker); header `GIF89a`, Netscape loop extension ✓, **91 frames** (source 6.07s × 15fps — strict `21 F9 04` scan); `<img>` decode ✓ 1280×800; pixels preview se match (3/4 exact, 1 pe quantization diff 1); cancel shared mechanism ✓; gifenc types `types/gifenc.d.ts` mein moved

### T3.6 X presets
- [x] Image: JPG ≤ 5 MB (quality / scale step-down) — `X_IMAGE_ATTEMPTS` + `encodeWithinLimit` walker (injected encode, unit-tested); `checkImagePreset`
- [x] GIF: ≤ 1280×1080, ≤ 350 frames, w × h × frames ≤ 300M, ≤ 15 MB — GIF export ki apni caps yehi hain + `checkGifPreset`
- [x] MP4: ≤ 1280×1024, H.264, 30 fps, yuv420p — export caps + 30fps + aspect 1:3–3:1 check; yuv420p WebCodecs avc ka default
- [x] Har constraint ke unit tests — 12 tests (boundaries, violations, step-down sequence, summary)

**Done when:** Har preset output automated check se X limits ke andar ho. — ✓ **har export pe check automatic chalta hai**: modal status mein `X-ready ✓` ya `X: {issue}` (worker se frames/duration aate hain); browser-verified: PNG 2× → `3000 × 1875 · 521 KB · 0.23s · X-ready ✓`; GIF/MP4 checks unit-tested (real outputs pe bhi pass: GIF 91 frames/3.7MB, MP4 1280×800/6s)
**Refs:** PRD EX-8, X-6…X-8; ARCH §5.5

---

## M4 — AI Studio (Week 7–8)

### T4.1 Edge Function shared libs
- [x] `_shared/`: CORS (`ALLOWED_ORIGINS` — ARCH §6.2) ✓ (T2.4), error contract (ARCH §6.4) ✓, zod validation (`validate.ts` — `parseJsonBody` + 3 tests), rate-limit wrapper ✓
- [x] OpenRouter client: streaming SSE parse (`createSseParser` — split chunks, [DONE], comments), `models` fallback array (single model pe `model`), `usage` capture (tokens + cost + actual model; `usage.include`), attribution headers (`HTTP-Referer`/`X-Title`), timeout, error mapping — 5 tests

**Done when:** Shared libs ke Deno tests pass (OpenRouter mocked). — ✓ 44/44 Deno tests (OpenRouter + validate + pexels sab)
**Refs:** ARCH §6.2, §6.4; PRD §9.1

### T4.2 `ai-generate`
- [x] Flow: ARCH §8.2 (rate limit → consume → stream → log → refund on fail) — `_shared/ai-flow.ts` (`runAiStream` + `createAiHandler` factory) + `ai-generate/` (zod schema: prompt ≤500, image ≤1.8MB base64; image `input` log mein nahi jaati)
- [x] SSE client contract: `{type:"delta"}` / `{type:"done", usage, credits}` / `{type:"error", code}`

**Done when:** Credits sahi kate; failure pe refund ho; `ai_generations` mein model + tokens + cost log ho; tests pass. — ✓ mocked tests (refund/rate-limit/insufficient paths) + **LIVE verified (16 Oct)**: real OpenRouter generate → post text stream hua, `profiles.ai_credits` 30→**29**, `ai_generations` row `{action: "generate", model: "google/gemini-2.5-flash", prompt_tokens: 1992, completion_tokens: 38, cost_usd: 0.000693, status: "success"}`, `credit_transactions` `{delta: -1, reason: "generate"}` ✓
**Live:** deployed ✓ + `OPENROUTER_API_KEY` set ✓ + real generate verified (16 Oct) — koi pending nahi
**Refs:** PRD AI-3, AI-8…AI-10

### T4.3 `ai-refine`
- [x] 9 chip actions + free chat (last 10 messages), same credit flow — `ai-refine/` (schema: action XOR freeform enforce, history ≤ 10; action log `refine:better-hook` etc.)
- [x] `_shared/prompts.ts` — `REFINE_INSTRUCTIONS` 9 actions, `buildRefineMessages` (history cap tested)

**Done when:** PRD AI-4, AI-5 pure. — ✓ function-side pure (schema + messages + flow tests); UI side T4.6 mein (chips + chat) 

### T4.4 Prompts
- [x] System prompt + har action ka instruction (PRD §7.10 prompt design) — `_shared/prompts.ts` (role: expert X ghostwriter, output rules, language mirror, no invented facts)
- [x] URL tabhi jab user de; output cleanup (quotes / preamble hatao) — `cleanPostText` (code fences, "Here's your post:"/"Sure!" preamble, wrapping quotes, blank-line collapse) + `buildGenerateMessages`/`buildRefineMessages` tests

**Done when:** 20 sample images pe output rules follow kare (manual review checklist). — **pending live** (OpenRouter key chahiye); code + cleanup tests ✓

### T4.5 Model selection
- [ ] 3–5 vision models compare: quality, latency, cost (20 sample images)
- [ ] Final models + fallback order `app_config` mein

**Done when:** Decision + numbers PRD §15 (open question 1) mein record.

### T4.6 AI Studio panel UI
- [x] X preview card (AI-2), streaming text, chips, chat input, copy, expand — `right-panel.tsx` full rewrite; preview image parent-triggered capture (event handler, lint-safe); streaming via SSE client (`lib/api/ai.ts` + `lib/api/sse.ts` + test)
- [x] Edit & format mode; Unicode bold / italic + accessibility warning (AI-6) — sans-serif variants (`lib/editor/unicode-format.ts`, 3 tests) + amber warning; selection ke andar apply hota hai
- [x] `twitter-text` weighted counter (AI-7), "Link post" badge (AI-12) — `analyzePostText` (`extractUrlsWithIndices` se URL detect), Long post toggle (25k); 6 tests
- [x] Client-side image compress 1024px JPEG (AI-11) — `capturePostImageForAi` (worker export → 1024 fit → JPEG 0.85 dataURL) + `fitWithin` (3 tests)

**Done when:** PRD AI-1…AI-12 pure; counter X ki counting se match kare (unit tests). — ✓ browser (mocked SSE): progressive streaming (mid-stream sample alag), counter URL ke saath **65/280** (23-char weighting exact), Link post badge, 9 chips → refine stream, chat history (You/AI), bold → 𝗕𝗼𝗹𝗱 + warning, preview card + rendered image + placeholder profile, 134 vitest tests
**Live pending:** OPENROUTER_API_KEY + auth on — tab real generations (mocked verify done)

### T4.7 Credits UX
- [x] Credits badge live update; limit reached state + reset date — `credits-store.ts` (+2 tests), SSE `done` event se badge update, panel open pe `fetchCredits()` (profiles RLS row), `INSUFFICIENT_CREDITS` → 0 + limit box (reset date store se), top-bar badge live

**Done when:** PRD AI-9, ED-7 pure. — ✓ browser (mocked): done credits 5 → badge **"5 credits"** live; 429 → badge **"0 credits"** + "AI credits khatam ho gaye" box; reset date 404 pe path simple hai (auth on hote hi profiles se aayega)

### T4.8 (Nice-to-have) Alt text
- [ ] AI-generated alt text, editable

**Done when:** PRD AI-13 pura.

---

## M5 — X Share (no API) (Week 9) ✅ complete

> **Decision (16 Oct):** X API posting dropped (PRD §7.11 v1.5). OAuth/token/media/API-post wale tasks implement **nahi** honge — DB objects (`x_accounts`, `posts`, X functions) dormant. M5 = share flow + account page.

### T5.1 Share flow
- [x] `x.com/intent/post?text=…` open + text copy + image copy (PNG clipboard) + image download — `lib/editor/x-share.ts` (intent encode, dataUrlToBlob, blobToPng) + panel share row (4 buttons); 3 tests
- [x] Over-limit / empty states; X-ready indicators (T3.6 se already) — over-limit pe amber hint, buttons empty text/image pe disabled

**Done when:** PRD XF-1…XF-4 pure; koi API call nahi. — ✓ browser: intent URL **exact match** (`…/intent/post?text=Big%20news…%F0%9F%9A%80…`), image download `shotlark-post.jpg` + flash note, JPEG→PNG conversion verified (1024×640), clipboard write headless mein NotAllowedError → graceful error (real browser: user gesture pe chalta hai), **koi network call nahi**

### T5.2 Account page + delete
- [x] Account page: credits + reset date, credits history, AI generation history, profile (AUTH-4) — `app/(app)/account/page.tsx` (guest/ready/error states, credits store sync)
- [x] Delete account: Storage files (user prefix — uploads+exports) + `auth.users` delete cascade (AUTH-5) — `app/api/account/delete/route.ts`
- [x] ~~Disconnect X~~ (connect hi nahi hai — drop); top-bar Account menu item ab `/account` link hai

**Done when:** Delete ke baad user ka koi data / file na bache (verify query). — ✓ browser (mocked REST): guest state ("Login nahi hai" + link), ready state (email, credits 27, `signup_bonus` transaction, `refine:better-hook` generation, delete button), delete flow → confirm → redirect `/`
**Live pending:** valid `SUPABASE_SECRET_KEY` + auth on hone par real delete verify (Storage + `auth.users`)

### Dropped (16 Oct, user decision)
- ~~T5.1 Crypto util~~, ~~T5.2 OAuth routes~~, ~~T5.3 Token service~~, ~~T5.4 X media upload~~, ~~T5.5 /api/x/post~~, ~~T5.6 Post UI (API)~~ — X API cost/complexity ke liye. PRD archive mein detail; DB: `x_accounts`/`posts` + X functions dormant.
- ~~Real X posting test note~~ (API dropped)
## M6 — Launch (Week 11–12)

### T6.1 Scheduled jobs
- [x] pg_cron: `reset_monthly_credits` (daily 00:30), `cleanup_housekeeping` (hourly) — migration `20261016090500_cron.sql` **run ho chuki** (Management API se) ✓
- [x] Edge Function `uploads-cleanup` — custom `x-cron-secret` auth (`--no-verify-jwt`), stale uploads (30 din) + staged exports (24h) delete; 10 Deno tests; deployed ✓
- [x] Secrets + Vault — `CRON_SECRET` (Edge secret) + Vault `cron_secret` set ✓; admin client wiring bug fix ke baad **LIVE 200** `{"ok":true,...}` ✓

**Done when:** Project pe jobs chalein aur results verify hon (`cron.job_run_details`). — ✓ **`cron.job` verified**: teenon jobs active (schedule sahi); uploads-cleanup live run 200; job_run_details pehle scheduled run ke baad bhar jayega (01:00 UTC)
**Refs:** ARCH §7.5

### T6.2 Landing page
- [ ] Hero, demo visuals, features, CTA, SEO meta + OG image

**Done when:** Lighthouse: performance + accessibility ≥ 90.

### T6.3 Legal pages
- [ ] Privacy Policy (AI providers ko image / text, Pexels, X data), Terms of Service — **[USER]** content review (U12)

**Done when:** Pages live aur footer se linked.

### T6.4 Analytics + monitoring
- [ ] PostHog events (PRD §13), Sentry (Next.js + Edge Functions)
- [ ] `admin` schema cost views (ARCH §10)

**Done when:** Events dashboard mein dikhein; test error Sentry mein aaye; daily cost view kaam kare.

### T6.5 Security hardening
- [ ] CSP headers (ARCH §9.4), CORS check
- [ ] Supabase Security Advisor clean, secret scan, dependency audit
- [ ] RLS / grants tests review

**Done when:** Koi high / critical finding open na ho.

### T6.6 QA
- [ ] Playwright E2E: login → upload → edit → export → AI (mocked) → post (mocked)
- [ ] Manual cross-browser: Chrome, Edge, Firefox, Safari
- [ ] Accessibility audit (axe + keyboard-only run)
- [ ] Performance: LCP < 2.5s, export timings

**Done when:** E2E green; P0 / P1 bugs zero.

### T6.7 Launch readiness
- [ ] **[USER]** Supabase Pro plan (U15) — Free plan pe 1 hafte inactivity pe pause aur automatic backups nahi
- [ ] **[USER]** Custom SMTP (U14) + Auth email rate limits review
- [ ] Auth Site URL → production domain; Redirect URLs final; Turnstile hostnames se `127.0.0.1` hatao
- [ ] Test data cleanup: test users app ke "Delete account" flow se
- [ ] Vercel production env vars; domain connect
- [ ] X app production callback URL; Pexels unlimited access request
- [ ] Spend limits verify (X Developer Console, OpenRouter)

**Done when:** Production domain pe smoke test pass — non-team email se magic link signup, AI generate, export, X post.

### T6.8 Beta launch
- [ ] Production pe final smoke test, monitoring on
- [ ] Launch post (Shotlark se bana ke!)
- [ ] Pehle hafte daily cost + error review

**Done when:** Public beta live 🚀
