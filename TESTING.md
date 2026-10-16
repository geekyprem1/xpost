# Shotlark — Manual Test Guide (sab check karne ke liye)

## 1. Start karo

```bash
npm install                 # agar fresh clone
npm run dev                 # http://localhost:3000
```

- Port 3000 busy ho (BookNexa?) to wo band karo — humara CORS/callbacks 3000 pe set hain
- Browser: Chrome/Edge recommended (MP4 export WebCodecs ke liye)

**Login (sirf AI + Pixabay ke liye — gate OFF hai, editor bina login khulta hai):**

**Rasta A — instant (email/rate-limit ke bina, recommended):**
```bash
node scripts/dev-login.mjs tumhara@email.com
```
Jo link print hoga wo browser mein kholo → session ready ✓

**Rasta B — normal email wala:**
`http://localhost:3000/login` → email → magic link inbox se click
⚠️ Supabase default email limit: **2 emails/hour** — bar bar mat karo

> Login ke baad AI Studio aur Pixabay search chalenge. Baaki sab (editor, presets, frames, styles, export, share buttons) bina login bhi chalta hai.

---

## 2. Checklist (tick karte jao)

### A. Editor basics
- [ ] Image upload: click / drag-drop / Ctrl+V paste — teenon se
- [ ] Image delete (`Remove image`), dobara upload
- [ ] Canvas pe image ko **drag** karo (offset move) — Ctrl+Z se undo ho
- [ ] **Zoom** slider, **Tilt X/Y** sliders
- [ ] Aspect: kuch presets try karo (16:9, 1:1, 9:16) — canvas size label badle
- [ ] Padding / Radius / Shadow sliders
- [ ] **Ctrl+Z / Ctrl+Shift+Z** (undo/redo) — 10+ steps
- [ ] Page reload karo — scene **autosave** se wapas aani chahiye (image dobara upload karni padegi, scene settings rahengi)

### B. Background
- [ ] **Premium / Wallpaper** tabs — gradient thumbnails apply karo
- [ ] **Mesh** tab — mesh presets
- [ ] Custom: **Solid** + color picker, **Gradient** (stops add/remove + angle)
- [ ] **"Screenshot se colors"** — image ka gradient aa jaye
- [ ] **Motion tab** (Pixabay): chip "ocean waves" → **real results** aayen → koi video select karo → canvas pe **motion chalna chahiye**
- [ ] **Photo tab**: chip "workspace" → photo select → background image lage
- [ ] Provider chips: **Pixabay** (default) / Pexels (note dikhe "keys pause hain")
- [ ] Shuffle button — naya random search
- [ ] Attribution: "Provided by Pixabay" + creator name link dikhe
- [ ] Dobara wahi search (24h cache) — turant aaye

### C. Frames / Style / Sunlight / Auto
- [ ] **Frame**: Browser, iPhone, MacBook, Terminal etc. — sab lagte hain, tilt ke saath ghoomte bhi hain
- [ ] **Style**: 9 styles (Glass Light/Dark, Outline, Border...) 
- [ ] **Sunlight**: overlays (blinds, window, golden...) + strength/angle/softness/temperature + **Grain**
- [ ] **Auto**: in-house presets (one-click looks)

### D. Export (Download button)
- [ ] **PNG 2×** → download → file kholo (3000×1875 aani chahiye), status mein `X-ready ✓`
- [ ] **JPG / WebP** × 1×/3×
- [ ] **Watermark ON/OFF** → file size/logo difference
- [ ] **Copy PNG** → clipboard (paste karke check karo — Notepad/Photoshop)
- [ ] Motion background ke saath: **GIF** export (chale, file size dikhe)
- [ ] Motion background ke saath: **Video (MP4)** export (~5-10s lagenge) → file chale
- [ ] MP4 ke dauraan **Cancel** dabao — turant ruk jaye, koi download na ho
- [ ] Bina motion bg ke GIF/Video **disabled** dikhein + hint

### E. AI Studio (right panel — toolbar ka Bot icon)
- [ ] Panel khule, **preview image** load ho, X card dikhe
- [ ] **Generate** (optional topic likh ke) — text **type hota hua** aaye (streaming), ~3-8s
- [ ] **9 refine chips** — koi ek dabao (e.g. "Shorter") → text refine ho
- [ ] **Chat**: "make it funnier" bhejo → history (You/AI) dikhe
- [ ] **Bold/Italic** buttons → 𝗨𝗻𝗶𝗰𝗼𝗱𝗲 ban jaye + warning dikhe
- [ ] **Counter** sahi (URL daalo → 23 chars count + "Link post" badge)
- [ ] **Credits badge** (top bar) har AI action pe kam ho (30 → 29 → 28...)
- [ ] **X pe kholo** → naya tab x.com compose pre-filled text ke saath khule
- [ ] **Text copy** → clipboard; **Image copy** → X compose mein paste karke dekho; **Image download**
- [ ] Login nahi kiya to "login chahiye" message aaye (crash na ho)

### F. Account + misc
- [ ] Avatar menu → **Account** → `/account`: credits, reset date, history, generations dikhein
- [ ] Theme toggle (light/dark) — dono theek lagte hain
- [ ] **Sign out** → dobara login
- [ ] ⚠️ **Delete account mat dabana** unless testing ke liye alag account ho — ye **permanent** hai

---

## 3. Troubleshooting

| Problem | Fix |
|---|---|
| "Pixabay API key configured nahi hai" | Supabase → Edge Functions → Secrets mein `PIXABAY_API_KEY` check |
| "OpenRouter key configured nahi hai" | wahi, `OPENROUTER_API_KEY` |
| "AI Studio ke liye login chahiye" | `/login` se login karo (magic link) |
| Magic link nahi aa raha | rate limit (2/hour) — thoda ruko; spam folder dekho |
| Export slow | bade scale (3×) + 12MP canvas normal hai; MP4/GIF 5-15s |
| Kuch aur atke | screenshot bhej dena (console errors ke saath) |

## 4. Background mein jo chal raha hai (cron)

- Har ghante: `cleanup_housekeeping` (rate limits, expired cache)
- Roz 00:30 UTC: `reset_monthly_credits`
- Roz 01:00 UTC: `uploads-cleanup` (30 din purane uploads + 24h staged exports delete)
- Check: SQL Editor → `select jobname, schedule, active from cron.job;`
