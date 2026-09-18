-- ============================================================
-- FinTrack — Add a per-user "transaction tracking mode" preference
-- TODO.md — Settings feature: expenses-only vs both income+expenses
--
-- Students/abroad students with no income to log want to hide income
-- entry, summaries and charts app-wide; everyone else keeps the current
-- 'both' behavior (the default, so existing users notice nothing).
--
-- ADD COLUMN IF NOT EXISTS keeps this idempotent/safe to re-run, matching
-- 009_fix_account_check_constraints.sql's convention.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS transaction_mode text NOT NULL DEFAULT 'both';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_transaction_mode_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_transaction_mode_check
  CHECK (transaction_mode IN ('expenses_only', 'both'));
