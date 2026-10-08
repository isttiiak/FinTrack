-- ============================================================
-- FinTrack — Allow custom payment methods, accounts and relationships
-- docs/AUDIT_2026-10_BUGS.md §1.1
-- Idempotent — safe to re-run.
--
-- The app lets users add their own MFS providers ("MFS - Wise"), bank
-- accounts ("Chase Checking") and relationships ("Cousin"), but the columns
-- below still carried hardcoded CHECK (... IN (...)) lists from 001/002/008/
-- 009. Any custom value passed client-side validation and then failed the
-- INSERT with a check-constraint error. 009 patched one missing bank into the
-- list; with user-defined values a fixed list can never be right, so the
-- lists are replaced by a sanity length bound instead.
--
-- Unnamed inline CHECKs get Postgres's default "<table>_<column>_check" name.
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transactions', 'person_ledger', 'ledger_payments',
    'investment_payments', 'investment_returns', 'recurring_rules'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_payment_method_check');
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_account_check');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (payment_method IS NULL OR char_length(payment_method) BETWEEN 1 AND 60)',
      t, t || '_payment_method_check');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (account IS NULL OR char_length(account) BETWEEN 1 AND 60)',
      t, t || '_account_check');
  END LOOP;
END $$;

ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_relationship_check;
ALTER TABLE public.persons
  ADD CONSTRAINT persons_relationship_check
  CHECK (relationship IS NULL OR char_length(relationship) BETWEEN 1 AND 40);
