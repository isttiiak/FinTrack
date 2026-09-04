-- ============================================================
-- FinTrack — Add 'Dutch Bangla Bank' to the account CHECK constraints
-- TODO.md §3.11
--
-- lib/constants.ts's ACCOUNTS list (and therefore every account picker
-- in the app) has included 'Dutch Bangla Bank' since it was added, but
-- the live DB's CHECK constraints on `account` were never updated to
-- match — 008_recurring_transactions.sql's recurring_rules table got
-- the current list when it was created, everything from 001/002 didn't.
-- Picking "Dutch Bangla Bank" as the account on any of the five tables
-- below passes client-side validation and then fails the INSERT/UPDATE
-- against Postgres.
--
-- investment_payments and investment_returns aren't named in TODO.md's
-- §3.11 (only transactions/person_ledger/ledger_payments are), but they
-- have the exact same stale list from 002_investment_fixes.sql — found
-- while writing this migration, fixed here too rather than leaving a
-- known instance of the same bug unfixed.
--
-- Each unnamed inline CHECK on a single column gets Postgres's default
-- "<table>_<column>_check" name, so DROP CONSTRAINT IF EXISTS is safe to
-- re-run even if that assumption were ever wrong (it would just no-op,
-- and the ADD CONSTRAINT below would then fail loudly instead of
-- silently leaving the old constraint in place).
-- ============================================================

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_check CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Dutch Bangla Bank', 'Other'
  ));

ALTER TABLE public.person_ledger
  DROP CONSTRAINT IF EXISTS person_ledger_account_check;
ALTER TABLE public.person_ledger
  ADD CONSTRAINT person_ledger_account_check CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Dutch Bangla Bank', 'Other'
  ));

ALTER TABLE public.ledger_payments
  DROP CONSTRAINT IF EXISTS ledger_payments_account_check;
ALTER TABLE public.ledger_payments
  ADD CONSTRAINT ledger_payments_account_check CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Dutch Bangla Bank', 'Other'
  ));

ALTER TABLE public.investment_payments
  DROP CONSTRAINT IF EXISTS investment_payments_account_check;
ALTER TABLE public.investment_payments
  ADD CONSTRAINT investment_payments_account_check CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Dutch Bangla Bank', 'Other'
  ));

ALTER TABLE public.investment_returns
  DROP CONSTRAINT IF EXISTS investment_returns_account_check;
ALTER TABLE public.investment_returns
  ADD CONSTRAINT investment_returns_account_check CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Dutch Bangla Bank', 'Other'
  ));
