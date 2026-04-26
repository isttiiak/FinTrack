-- ============================================================
-- FinTrack — Initial Schema
-- PostgreSQL 16 / Supabase
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Profiles (extends auth.users) ───────────────────────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  full_name   text,
  avatar_url  text,
  currency    text    NOT NULL DEFAULT 'BDT',
  timezone    text    NOT NULL DEFAULT 'Asia/Dhaka',
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz          -- soft-delete; NULL = active
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_data" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Trigger: auto-create profile + seed categories on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Seed default categories for the new user
  PERFORM public.seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  main_group  text NOT NULL,
  type        text NOT NULL CHECK (type IN ('Expense', 'Income')),
  color_hex   text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_own_data" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_categories_user ON public.categories(user_id);

-- ── Budget limits ────────────────────────────────────────────
CREATE TABLE public.budget_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit numeric(12,2) NOT NULL CHECK (monthly_limit > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_limits_own_data" ON public.budget_limits
  FOR ALL USING (auth.uid() = user_id);

-- ── Transactions ─────────────────────────────────────────────
CREATE TABLE public.transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  category_id    uuid          REFERENCES public.categories(id) ON DELETE SET NULL,
  txn_date       date NOT NULL,
  type           text NOT NULL CHECK (type IN ('Expense', 'Income')),
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  description    text,
  payment_method text CHECK (payment_method IN (
    'Cash', 'MFS - bKash', 'MFS - Nagad', 'MFS - Rocket', 'Bank Transfer', 'Card'
  )),
  account        text CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Other'
  )),
  no_spend_flag  boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_own_data" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_date  ON public.transactions(user_id, txn_date DESC);
CREATE INDEX idx_transactions_category   ON public.transactions(category_id);

-- ── Persons ──────────────────────────────────────────────────
CREATE TABLE public.persons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         text NOT NULL,
  relationship text CHECK (relationship IN (
    'Friend', 'Family', 'Business Partner', 'Colleague', 'Self', 'Other'
  )),
  phone        text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persons_own_data" ON public.persons
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_persons_user ON public.persons(user_id);

-- ── Person ledger ────────────────────────────────────────────
CREATE TABLE public.person_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  person_id      uuid NOT NULL REFERENCES public.persons(id)  ON DELETE CASCADE,
  ledger_type    text NOT NULL CHECK (ledger_type IN ('Lent', 'Debt')),
  total_amount   numeric(12,2) NOT NULL CHECK (total_amount > 0),
  start_date     date NOT NULL,
  reason         text,
  payment_method text CHECK (payment_method IN (
    'Cash', 'MFS - bKash', 'MFS - Nagad', 'MFS - Rocket', 'Bank Transfer', 'Card'
  )),
  account        text CHECK (account IN (
    'Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings',
    'Prime Bank', 'Islami Bank', 'Other'
  )),
  settled_date   date,
  doc_link       text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.person_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_ledger_own_data" ON public.person_ledger
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_person_ledger_user   ON public.person_ledger(user_id);
CREATE INDEX idx_person_ledger_person ON public.person_ledger(person_id);

-- ── Ledger payments ──────────────────────────────────────────
CREATE TABLE public.ledger_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id      uuid NOT NULL REFERENCES public.person_ledger(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
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

ALTER TABLE public.ledger_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_payments_own_data" ON public.ledger_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ledger_payments_ledger ON public.ledger_payments(ledger_id);
CREATE INDEX idx_ledger_payments_user   ON public.ledger_payments(user_id);

-- ── Investments ──────────────────────────────────────────────
CREATE TABLE public.investments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  category         text CHECK (category IN (
    'Real Estate','Shared Business','Garments','Farming',
    'Stocks','Crypto','Fixed Deposit','Savings Bond','Other'
  )),
  company_name     text,
  committed_amount numeric(12,2),
  start_date       date,
  end_date         date,
  market_value     numeric(12,2),
  doc_link         text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investments_own_data" ON public.investments
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_investments_user ON public.investments(user_id);

-- ── Investment returns ────────────────────────────────────────
CREATE TABLE public.investment_returns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  return_date   date NOT NULL,
  return_type   text CHECK (return_type IN ('Profit','Capital Return','Dividend','Rent','Other')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investment_returns_own_data" ON public.investment_returns
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_inv_returns_investment ON public.investment_returns(investment_id);
CREATE INDEX idx_inv_returns_user       ON public.investment_returns(user_id);

-- ── Seed default categories for a new user ───────────────────
-- Called from the app layer after sign-up (not a trigger, keeps SQL simple)
-- Function available for the Edge Function or client to invoke:
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, main_group, type, is_default) VALUES
    (p_user_id, 'Food',           'Food',          'Expense', true),
    (p_user_id, 'Restaurants',    'Food',          'Expense', true),
    (p_user_id, 'Fruits',         'Food',          'Expense', true),
    (p_user_id, 'Dry Food',       'Food',          'Expense', true),
    (p_user_id, 'Chicken',        'Food',          'Expense', true),
    (p_user_id, 'Coffee',         'Coffee',        'Expense', true),
    (p_user_id, 'Ricksha Fare',   'Transport',     'Expense', true),
    (p_user_id, 'Bus Fare',       'Transport',     'Expense', true),
    (p_user_id, 'Uber/Pathao',    'Transport',     'Expense', true),
    (p_user_id, 'Phone Bill',     'Utility',       'Expense', true),
    (p_user_id, 'Internet Bill',  'Utility',       'Expense', true),
    (p_user_id, 'Laundry',        'Utility',       'Expense', true),
    (p_user_id, 'Medical',        'Medical',       'Expense', true),
    (p_user_id, 'Entertainment',  'Entertainment', 'Expense', true),
    (p_user_id, 'Education',      'Education',     'Expense', true),
    (p_user_id, 'Shopping',       'Shopping',      'Expense', true),
    (p_user_id, 'Fragrance',      'Lifestyle',     'Expense', true),
    (p_user_id, 'Treats',         'Lifestyle',     'Expense', true),
    (p_user_id, 'Donate',         'Donate',        'Expense', true),
    (p_user_id, 'Gift',           'Gift',          'Expense', true),
    (p_user_id, 'Others',         'Others',        'Expense', true),
    (p_user_id, 'Cashout Charge', 'Others',        'Expense', true),
    (p_user_id, 'Salary',         'Income',        'Income',  true),
    (p_user_id, 'Savings',        'Income',        'Income',  true),
    (p_user_id, 'Business',       'Income',        'Income',  true),
    (p_user_id, 'Gift Received',  'Income',        'Income',  true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── Hard-delete scheduled users (run via Edge Function cron) ─
CREATE OR REPLACE FUNCTION public.purge_deleted_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Cascade handles child tables via ON DELETE CASCADE
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.profiles
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - INTERVAL '30 days'
  );
END;
$$;
