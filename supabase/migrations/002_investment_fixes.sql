-- ============================================================
-- FinTrack — Post-audit fixes
-- 1) investment_payments table was referenced by the app but
--    never created in 001_initial_schema.sql (installment
--    payment tracking on investments was fully broken).
-- 2) investment_returns was missing payment_method/account
--    columns that the return-logging form has always submitted
--    (every return log attempt failed).
-- 3) transactions.no_spend_flag was always written as `false`
--    and never read anywhere — the no-spend streak feature
--    computes it dynamically from transaction dates instead.
--
-- Written to be safely re-runnable: every statement is guarded
-- (IF NOT EXISTS / IF EXISTS / DROP+CREATE for policies) so a
-- partial prior run — e.g. the table got created but a later
-- statement failed — can just be re-applied without editing.
-- ============================================================

-- ── Investment payments (installment tracking) ────────────────
CREATE TABLE IF NOT EXISTS public.investment_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id  uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date   date NOT NULL,
  payment_method text CHECK (payment_method IN (
    'Cash', 'MFS - bKash', 'MFS - Nagad', 'MFS - Rocket', 'Bank Transfer', 'Card'
  )),
  account        text CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Other'
  )),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_payments_own_data" ON public.investment_payments;
CREATE POLICY "investment_payments_own_data" ON public.investment_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inv_payments_investment ON public.investment_payments(investment_id);
CREATE INDEX IF NOT EXISTS idx_inv_payments_user       ON public.investment_payments(user_id);

-- ── Investment returns: add missing payment_method/account ────
ALTER TABLE public.investment_returns
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN (
    'Cash', 'MFS - bKash', 'MFS - Nagad', 'MFS - Rocket', 'Bank Transfer', 'Card'
  ));

ALTER TABLE public.investment_returns
  ADD COLUMN IF NOT EXISTS account text CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Other'
  ));

-- ── Transactions: drop dead no_spend_flag column ───────────────
ALTER TABLE public.transactions DROP COLUMN IF EXISTS no_spend_flag;
