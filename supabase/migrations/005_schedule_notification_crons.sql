-- ============================================================
-- 005_schedule_notification_crons.sql
-- Idempotent — safe to re-run.
--
-- Enables pg_cron + pg_net and registers the 3 schedules that trigger
-- the `notifications` Edge Function. The CRON_SECRET bearer token is
-- deliberately NOT written here in plaintext (this file is committed to
-- an open-source repo) — instead it's read from Supabase Vault at
-- execution time via `vault.decrypted_secrets`.
--
-- ONE-TIME MANUAL STEP (run this yourself in the SQL Editor — do not
-- commit the real value to any file):
--   select vault.create_secret('<your-CRON_SECRET-value>', 'cron_secret');
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('budget-alerts-daily') where exists (select 1 from cron.job where jobname = 'budget-alerts-daily');
select cron.unschedule('weekly-digest')       where exists (select 1 from cron.job where jobname = 'weekly-digest');
select cron.unschedule('monthly-digest')      where exists (select 1 from cron.job where jobname = 'monthly-digest');

select cron.schedule('budget-alerts-daily', '0 3 * * *', $$
  select net.http_post(
    url := 'https://pqaehnscdhmgnwiqapiy.supabase.co/functions/v1/notifications?type=budget',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);

select cron.schedule('weekly-digest', '0 3 * * 1', $$
  select net.http_post(
    url := 'https://pqaehnscdhmgnwiqapiy.supabase.co/functions/v1/notifications?type=weekly',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);

select cron.schedule('monthly-digest', '0 3 1 * *', $$
  select net.http_post(
    url := 'https://pqaehnscdhmgnwiqapiy.supabase.co/functions/v1/notifications?type=monthly',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);
