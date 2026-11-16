-- ============================================================
-- FinTrack — Audit Fixes (Phase 2)
-- Idempotent / safely re-runnable:
-- 1) Clean up any existing orphaned ledger_payments (no matching
--    person_ledger rows for the same (person_id, ledger_type)) and add
--    an AFTER DELETE trigger on person_ledger so deleting the last
--    entry for a (person_id, ledger_type) also removes its payments.
-- 2) Re-assert RLS policies on all 11 user-owned tables with explicit
--    USING (...) and WITH CHECK (...) clauses using (select auth.uid()).
-- 3) Explicitly REVOKE direct client access on public.budget_alert_log
--    from anon and authenticated roles (service role only).
-- ============================================================

-- ── 1. Orphaned ledger_payments cleanup & cascade trigger ──────────────
DELETE FROM public.ledger_payments lp
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_ledger pl
  WHERE pl.person_id = lp.person_id
    AND pl.ledger_type = lp.ledger_type
);

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_ledger_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.person_ledger
    WHERE person_id = OLD.person_id
      AND ledger_type = OLD.ledger_type
  ) THEN
    DELETE FROM public.ledger_payments
    WHERE person_id = OLD.person_id
      AND ledger_type = OLD.ledger_type;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_ledger_cleanup_payments ON public.person_ledger;
CREATE TRIGGER trg_person_ledger_cleanup_payments
  AFTER DELETE ON public.person_ledger
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_ledger_payments();

-- ── 2. Explicit USING + WITH CHECK RLS policies across user tables ─────
DROP POLICY IF EXISTS "profiles_own_data" ON public.profiles;
CREATE POLICY "profiles_own_data" ON public.profiles
  FOR ALL
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "categories_own_data" ON public.categories;
CREATE POLICY "categories_own_data" ON public.categories
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "budget_limits_own_data" ON public.budget_limits;
CREATE POLICY "budget_limits_own_data" ON public.budget_limits
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "transactions_own_data" ON public.transactions;
CREATE POLICY "transactions_own_data" ON public.transactions
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "persons_own_data" ON public.persons;
CREATE POLICY "persons_own_data" ON public.persons
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "person_ledger_own_data" ON public.person_ledger;
CREATE POLICY "person_ledger_own_data" ON public.person_ledger
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "ledger_payments_own_data" ON public.ledger_payments;
CREATE POLICY "ledger_payments_own_data" ON public.ledger_payments
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "investments_own_data" ON public.investments;
CREATE POLICY "investments_own_data" ON public.investments
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "investment_payments_own_data" ON public.investment_payments;
CREATE POLICY "investment_payments_own_data" ON public.investment_payments
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "investment_returns_own_data" ON public.investment_returns;
CREATE POLICY "investment_returns_own_data" ON public.investment_returns
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "recurring_rules_own_data" ON public.recurring_rules;
CREATE POLICY "recurring_rules_own_data" ON public.recurring_rules
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ── 3. Explicitly revoke client access on budget_alert_log ────────────
REVOKE ALL ON public.budget_alert_log FROM anon, authenticated;
