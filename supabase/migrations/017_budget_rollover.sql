-- ============================================================
-- 017_budget_rollover.sql
-- Idempotent — safe to re-run.
--
-- Opt-in budget rollover (TODO.md §5.7): when on, last month's unspent part
-- of the limit is added to this month's. Off by default, so every existing
-- budget behaves exactly as before. The maths lives in the app
-- (src/lib/budgetRollover.ts) and the notifications Edge Function — this
-- only stores the choice.
-- ============================================================

ALTER TABLE public.budget_limits
  ADD COLUMN IF NOT EXISTS rollover boolean NOT NULL DEFAULT false;
