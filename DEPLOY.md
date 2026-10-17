# Deploy Guide (Copy-Paste)

> **Note:** Supabase SQL Editor se sirf DB cheezein hoti hain (migrations — ye aap kar chuke ho).
> **Edge Functions SQL se deploy nahi hote** — unke liye neeche 2 raste hain.

## 1. Edge Functions deploy

### Rasta A — CLI (recommended, 2 commands, Docker ki zarurat nahi)

```bash
npx supabase login
npx supabase functions deploy ai-generate ai-refine pexels-search pixabay-search --project-ref <PROJECT_REF>
npx supabase functions deploy uploads-cleanup --project-ref <PROJECT_REF> --no-verify-jwt
```

> `uploads-cleanup` ko **`--no-verify-jwt`** se deploy karna zaroori hai — ye cron job hai
> (user JWT nahi hota), isliye apni auth `x-cron-secret` header se karta hai.

- `<PROJECT_REF>` = Dashboard → **Project Settings → General → Reference ID** (project URL ka pehla part, e.g. `abcdefghijkl`)
- `login` browser khol dega (GitHub/email se auth)
- Agar link + DB password wala rasta prefer karo: `npx supabase link --project-ref <ref>` pehle chalao (DB password maangega — wahi jo project banate waqt diya tha)

### Rasta B — Dashboard (bina terminal)

Dashboard → **Edge Functions** → **Deploy a new function** → naam do → editor mein code paste karo.
Multi-file functions hain, isliye har function ke files aise jaate hain:

| Function | Files |
|---|---|
| `pexels-search` | `index.ts`, `handle.ts`, `normalize.ts` |
| `pixabay-search` | `index.ts`, `handle.ts`, `normalize.ts` |
| `ai-generate` | `index.ts`, `handle.ts` |
| `ai-refine` | `index.ts`, `handle.ts` |
| `_shared` (sab functions ke saath) | `cors.ts`, `errors.ts`, `supabase.ts`, `rate-limit.ts`, `validate.ts`, `openrouter.ts`, `prompts.ts`, `ai-flow.ts` |

> Files repo ke `supabase/functions/` folder mein hain — editor mein `_shared` folder banake wahi files daal do.
> Bole to main file-by-file paste content bhi de dunga — but CLI ek baar mein sab kar deta hai.

## 2. Secrets (Dashboard se — SQL nahi)

Dashboard → **Project Settings → Edge Functions → Secrets**:

| Secret | Kahan se |
|---|---|
| `PIXABAY_API_KEY` | pixabay.com → signup → [API docs page](https://pixabay.com/api/docs/) pe instant key (recommended — Pexels ne naye keys pause kiye hain) |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys → Create Key |
| `PEXELS_API_KEY` | pexels.com/api — filhaal naye keys **paused** hain; resume hote hi add karo (code ready hai) |
| `CRON_SECRET` | **aap banao** — koi lamba random string (niche §6 dekho). Same value Vault mein bhi jaani hai |

Naam bilkul yehi rakho (code inhi naam se padhta hai). Value chat mein kabhi mat bhejna.

## 5.5 Cron jobs (SQL — manual, ek baar)

1. Random secret banao (PowerShell):
   ```powershell
   -join ((48..57) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
   ```
2. **Wahi value** Edge Functions → Secrets mein `CRON_SECRET` add karo.
3. SQL Editor mein Vault secret add karo (value yahi random string):
   ```sql
   select vault.create_secret('<random-secret>', 'cron_secret', 'uploads-cleanup secret');
   ```
4. SQL Editor mein cron migration chalao — poora SQL:
   `supabase/migrations/20261016090500_cron.sql` (reset_monthly_credits 00:30, cleanup_housekeeping hourly, uploads-cleanup 01:00 via pg_net)
5. Verify: `select jobname, schedule, active from cron.job;` — teenon jobs active dikhne chahiye.
   Agle run ke baad: `select * from cron.job_run_details order by start_time desc limit 5;`

## 3. Optional SQL (Dashboard → SQL Editor)

Sirf ek cheez optional hai — AI models ki list (na chalao to code ke defaults chalenge):

```sql
insert into public.app_config (key, value)
values (
  'ai.models',
  '["google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-3.5-haiku"]'::jsonb
)
on conflict (key) do update set value = excluded.value;
```

Pehla model primary hai, fail hone pe baaki try hote hain (fallback order).
T4.5 (model comparison) ke baad yehi row update hogi.

**Koi naya migration pending nahi hai** — aapke chalaye 5 migrations + marker ke baad kuch bhi DB-side change nahi hua (functions existing tables/RPCs use karte hain: `profiles`, `ai_generations`, `rate_limits`, `pexels_cache`, `consume_credits`, `refund_credits`, `hit_rate_limit`).

## 4. Auth verification

Authentication is always required for `/editor` and `/account`. `/login` supports email/password sign-in and account creation, with magic links as an alternative. `AUTH_ENABLED` no longer disables the login gate.

## 5. Verification (deploy ke baad)

```bash
curl -X OPTIONS "https://<ref>.supabase.co/functions/v1/pexels-search" -i
# 204 + CORS headers aayein
```

Phir app mein: Background → Motion → search (Pexels) aur AI panel → Generate (OpenRouter).
Dono login maangte hain (auth on + session zaroori).
