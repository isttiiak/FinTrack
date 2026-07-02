-- ============================================================
-- 004_currency_and_notifications.sql
-- Idempotent — safe to re-run.
--
-- Part 1: multi-currency (lightweight) — transactions gain optional
--   provenance columns. `amount` is unchanged: it always stays in the
--   user's default currency, so every existing sum/chart/AI-context
--   function keeps working untouched.
-- Part 2: notification preferences + a dedup log for budget alerts,
--   used by the new `notifications` Edge Function (see
--   supabase/functions/notifications/index.ts).
-- ============================================================

-- ── Part 1: multi-currency ─────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS original_amount   decimal(12,2),
  ADD COLUMN IF NOT EXISTS original_currency text;

-- ── Part 2: notifications ──────────────────────────────────────
-- NOTE: the user-profile table is `profiles` (not `users` — CLAUDE.md's
-- schema doc had drifted from the actual 001_initial_schema.sql).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_budget_alerts  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_digest  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_monthly_digest boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS budget_alert_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  uuid REFERENCES categories(id) ON DELETE CASCADE,
  alert_month  text NOT NULL,          -- 'YYYY-MM' — one alert per category per month
  sent_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, alert_month)
);
ALTER TABLE budget_alert_log ENABLE ROW LEVEL SECURITY;
-- Written only by the notifications Edge Function (service role key,
-- bypasses RLS) — no public policy needed. Users never read this table
-- directly from the client.

-- ============================================================
-- Manual step — run once after deploying the `notifications` Edge
-- Function and setting its secrets (SUPABASE_SERVICE_ROLE_KEY,
-- RESEND_API_KEY, CRON_SECRET). Enable pg_cron + pg_net first via
-- Supabase Dashboard → Database → Extensions, then replace
-- <FUNCTION_URL> and <CRON_SECRET> below and run:
-- ============================================================
--
-- select cron.schedule('budget-alerts-daily', '0 3 * * *',
--   $$ select net.http_post(url := '<FUNCTION_URL>?type=budget',  headers := jsonb_build_object('Authorization','Bearer <CRON_SECRET>')) $$);
-- select cron.schedule('weekly-digest', '0 3 * * 1',
--   $$ select net.http_post(url := '<FUNCTION_URL>?type=weekly',  headers := jsonb_build_object('Authorization','Bearer <CRON_SECRET>')) $$);
-- select cron.schedule('monthly-digest', '0 3 1 * *',
--   $$ select net.http_post(url := '<FUNCTION_URL>?type=monthly', headers := jsonb_build_object('Authorization','Bearer <CRON_SECRET>')) $$);
