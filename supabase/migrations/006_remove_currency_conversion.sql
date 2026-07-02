-- ============================================================
-- 006_remove_currency_conversion.sql
-- Idempotent — safe to re-run.
--
-- Removes the lightweight multi-currency columns added in
-- 004_currency_and_notifications.sql. Decision: the free daily-rate API
-- (open.er-api.com) introduced a small (~0.05-0.1%) gap vs. "live" rates
-- shown elsewhere, and the feature was judged not worth maintaining for a
-- free/open-source personal finance app. See CLAUDE.md Decisions Log
-- (2026-07-02) for the full reasoning — the gap itself was not a bug.
--
-- The other two things 004 added (profiles.notify_* columns and
-- budget_alert_log) are unrelated to currency and are NOT touched here.
-- ============================================================

ALTER TABLE transactions
  DROP COLUMN IF EXISTS original_amount,
  DROP COLUMN IF EXISTS original_currency;
