-- Scheduled jobs (ARCHITECTURE §7.5)
-- reset_monthly_credits: daily 00:30 UTC | cleanup_housekeeping: hourly
-- uploads-cleanup: daily 01:00 UTC via pg_net → Edge Function (secret Vault se)
--
-- NOTE: `uploads-cleanup` function ko `--no-verify-jwt` se deploy karna hai
-- (apni auth x-cron-secret header se hoti hai).
-- Vault secret pehle add karo (SQL Editor, secret value kabhi file/code mein nahi):
--   select vault.create_secret('<random-secret>', 'cron_secret', 'uploads-cleanup secret');
-- Wahi value Edge Functions → Secrets mein `CRON_SECRET` ke naam se daalo.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'reset-monthly-credits',
  '30 0 * * *',
  $$select public.reset_monthly_credits()$$
);

select cron.schedule(
  'cleanup-housekeeping',
  '0 * * * *',
  $$select public.cleanup_housekeeping()$$
);

select cron.schedule(
  'uploads-cleanup',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://vsrvltxktzlyhuilwbop.supabase.co/functions/v1/uploads-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
