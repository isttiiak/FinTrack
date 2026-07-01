-- ============================================================
-- FinTrack — Ledger aggregate payments
-- Payments were bound to ONE person_ledger row (ledger_id FK),
-- but a person can have multiple lend/debt events over time.
-- The correct mental model is a running balance per (person,
-- ledger_type), not per individual entry — this migration
-- re-points ledger_payments at (person_id, ledger_type) instead,
-- backfilling from the existing ledger_id linkage, then drops
-- ledger_id.
--
-- Written to be safely re-runnable: column adds are guarded with
-- IF NOT EXISTS; the backfill/NOT NULL/drop-column sequence is
-- wrapped in a guard that checks whether ledger_id still exists,
-- so re-running after a partial or full prior application is safe.
-- ============================================================

-- ── Step 1: add new columns (nullable initially, for backfill) ──
ALTER TABLE public.ledger_payments
  ADD COLUMN IF NOT EXISTS person_id   uuid REFERENCES public.persons(id) ON DELETE CASCADE;

ALTER TABLE public.ledger_payments
  ADD COLUMN IF NOT EXISTS ledger_type text CHECK (ledger_type IN ('Lent', 'Debt'));

-- ── Step 2: backfill + cutover (idempotent — only runs once) ────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ledger_payments' AND column_name = 'ledger_id'
  ) THEN
    -- Backfill person_id/ledger_type from the old ledger_id linkage
    UPDATE public.ledger_payments lp
    SET person_id   = pl.person_id,
        ledger_type = pl.ledger_type
    FROM public.person_ledger pl
    WHERE lp.ledger_id = pl.id
      AND (lp.person_id IS NULL OR lp.ledger_type IS NULL);

    -- Enforce NOT NULL now that backfill is complete
    ALTER TABLE public.ledger_payments ALTER COLUMN person_id   SET NOT NULL;
    ALTER TABLE public.ledger_payments ALTER COLUMN ledger_type SET NOT NULL;

    -- Drop the old per-entry FK column and its index
    DROP INDEX IF EXISTS idx_ledger_payments_ledger;
    ALTER TABLE public.ledger_payments DROP COLUMN ledger_id;
  END IF;
END $$;

-- ── Step 3: new indexes for the aggregate access pattern ─────────
CREATE INDEX IF NOT EXISTS idx_ledger_payments_person_type
  ON public.ledger_payments(person_id, ledger_type);

CREATE INDEX IF NOT EXISTS idx_ledger_payments_user
  ON public.ledger_payments(user_id);

-- ── Step 4: RLS policy stays the same shape, re-assert idempotently ──
ALTER TABLE public.ledger_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_payments_own_data" ON public.ledger_payments;
CREATE POLICY "ledger_payments_own_data" ON public.ledger_payments
  FOR ALL USING (auth.uid() = user_id);
