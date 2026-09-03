-- ============================================================
-- FinTrack — Recurring Transactions
-- TODO.md §5.1
-- ============================================================

-- ── Recurring rules ──────────────────────────────────────────
-- One row per recurring bill/income (rent, phone bill, salary, ...). The
-- schedule is anchored on start_date rather than a separate day-of-month
-- column: for Monthly/Yearly cadences the day (or month+day) comes straight
-- off start_date, and Weekly just steps 7 days at a time — one anchor date
-- covers all three cadences without an extra column that wouldn't mean
-- anything for Weekly rules. See src/lib/recurring.ts for the occurrence math.
--
-- last_materialized_date tracks the furthest date this rule has already
-- generated a transaction for, so "materialize on app open" can resume from
-- there instead of re-checking (or re-creating) everything back to
-- start_date on every load.
CREATE TABLE public.recurring_rules (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  category_id             uuid          REFERENCES public.categories(id) ON DELETE SET NULL,
  type                    text NOT NULL CHECK (type IN ('Expense', 'Income')),
  amount                  numeric(12,2) NOT NULL CHECK (amount > 0),
  description             text,
  cadence                 text NOT NULL CHECK (cadence IN ('Weekly', 'Monthly', 'Yearly')),
  start_date              date NOT NULL,
  end_date                date,
  payment_method          text CHECK (payment_method IN (
    'Cash', 'MFS - bKash', 'MFS - Nagad', 'MFS - Rocket', 'Bank Transfer', 'Card'
  )),
  -- Includes 'Dutch Bangla Bank', unlike the older CHECK constraints on
  -- transactions/person_ledger/ledger_payments (those predate it being added
  -- to lib/constants.ts's ACCOUNTS list and were never migrated — a live
  -- gap worth its own fix, out of scope here; flagged separately).
  account                 text CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Dutch Bangla Bank', 'Other'
  )),
  is_active               boolean NOT NULL DEFAULT true,
  last_materialized_date  date,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_rules_own_data" ON public.recurring_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_recurring_rules_user ON public.recurring_rules(user_id);
