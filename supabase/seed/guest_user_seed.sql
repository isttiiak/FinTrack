-- ============================================================
-- FinTrack — Guest test-account seed data
--
-- Populates ONE real, persistent Supabase account with realistic pseudo
-- data (same shape as the in-memory "Try Demo" seed in src/stores/
-- demoStore.ts), so features that demo mode can't exercise — Profile
-- edits, CSV import, currency changes, an avatar URL, real recurring-
-- transaction materialization, real RLS/mutations — have something to
-- test against instead of just reading the code.
--
-- ONE-TIME SETUP (do this first, not from this script):
--   1. Sign up a normal account through the app itself — Settings →
--      Signup, or /signup — with an email/password you control. Any
--      email works (it does not need to be deliverable); suggested:
--      guest@fintrack.local
--   2. Come back here and set the email below to match, then run this
--      whole script in the Supabase SQL Editor.
--
-- SAFE TO RE-RUN: the first step below deletes any previously-seeded
-- rows for this specific account before reinserting, so running this
-- again resets the guest account back to a known-good state (handy
-- after testing mutations against it) rather than duplicating data.
-- It only ever touches the ONE account matched by email below.
-- ============================================================

DO $$
DECLARE
  v_email    text := 'guest@fintrack.local';  -- ← change if you signed up with a different address
  v_user_id  uuid;
  v_cat_food uuid; v_cat_coffee uuid; v_cat_ricksha uuid; v_cat_salary uuid;
  v_cat_shopping uuid; v_cat_medical uuid; v_cat_uber uuid; v_cat_phone uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid;
  v_inv1 uuid; v_inv2 uuid; v_inv3 uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE email = v_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for %. Sign up through the app with this email first (see the comment at the top of this file), then re-run.', v_email;
  END IF;

  -- ── Reset: wipe any previously-seeded data for this account only ────
  DELETE FROM public.recurring_rules    WHERE user_id = v_user_id;
  DELETE FROM public.investment_returns  WHERE user_id = v_user_id;
  DELETE FROM public.investment_payments WHERE user_id = v_user_id;
  DELETE FROM public.investments         WHERE user_id = v_user_id;
  DELETE FROM public.ledger_payments     WHERE user_id = v_user_id;
  DELETE FROM public.person_ledger       WHERE user_id = v_user_id;
  DELETE FROM public.persons             WHERE user_id = v_user_id;
  DELETE FROM public.transactions        WHERE user_id = v_user_id;

  -- ── Resolve default category ids (seeded automatically at signup) ───
  SELECT id INTO v_cat_food     FROM public.categories WHERE user_id = v_user_id AND name = 'Food';
  SELECT id INTO v_cat_coffee   FROM public.categories WHERE user_id = v_user_id AND name = 'Coffee';
  SELECT id INTO v_cat_ricksha  FROM public.categories WHERE user_id = v_user_id AND name = 'Ricksha Fare';
  SELECT id INTO v_cat_salary   FROM public.categories WHERE user_id = v_user_id AND name = 'Salary';
  SELECT id INTO v_cat_shopping FROM public.categories WHERE user_id = v_user_id AND name = 'Shopping';
  SELECT id INTO v_cat_medical  FROM public.categories WHERE user_id = v_user_id AND name = 'Medical';
  SELECT id INTO v_cat_uber     FROM public.categories WHERE user_id = v_user_id AND name = 'Uber/Pathao';
  SELECT id INTO v_cat_phone    FROM public.categories WHERE user_id = v_user_id AND name = 'Phone Bill';

  -- ── Transactions — ~3 months, same shape as the demo seed ───────────
  INSERT INTO public.transactions (user_id, category_id, txn_date, type, amount, description, payment_method, account) VALUES
    (v_user_id, v_cat_salary,   CURRENT_DATE - 1,   'Income',  45000, 'Monthly salary',      'Bank Transfer', 'BRAC Bank Savings'),
    (v_user_id, v_cat_food,     CURRENT_DATE - 1,   'Expense', 280,   'Lunch at office',     'Cash',          'Cash'),
    (v_user_id, v_cat_coffee,   CURRENT_DATE - 1,   'Expense', 120,   'Morning coffee',      'MFS - bKash',   'bKash'),
    (v_user_id, v_cat_ricksha,  CURRENT_DATE - 2,   'Expense', 40,    'To office',           'Cash',          'Cash'),
    (v_user_id, v_cat_shopping, CURRENT_DATE - 3,   'Expense', 1800,  'New shirt',           'Card',          'BRAC Bank Savings'),
    (v_user_id, v_cat_food,     CURRENT_DATE - 4,   'Expense', 350,   'Dinner',              'Cash',          'Cash'),
    (v_user_id, v_cat_uber,     CURRENT_DATE - 5,   'Expense', 180,   'Pathao to Dhanmondi', 'MFS - bKash',   'bKash'),
    (v_user_id, v_cat_medical,  CURRENT_DATE - 7,   'Expense', 600,   'Pharmacy',            'Cash',          'Cash'),
    (v_user_id, v_cat_coffee,   CURRENT_DATE - 8,   'Expense', 250,   'Starbucks',           'Card',          'BRAC Bank Savings'),
    (v_user_id, v_cat_food,     CURRENT_DATE - 10,  'Expense', 480,   'Dinner with friend',  'Cash',          'Cash'),
    (v_user_id, v_cat_salary,   CURRENT_DATE - 31,  'Income',  45000, 'Monthly salary',      'Bank Transfer', 'BRAC Bank Savings'),
    (v_user_id, v_cat_shopping, CURRENT_DATE - 40,  'Expense', 2400,  'New shoes',           'Card',          'BRAC Bank Savings'),
    (v_user_id, v_cat_phone,    CURRENT_DATE - 45,  'Expense', 599,   'Phone bill',          'MFS - bKash',   'bKash'),
    (v_user_id, v_cat_salary,   CURRENT_DATE - 61,  'Income',  43000, 'Monthly salary',      'Bank Transfer', 'BRAC Bank Savings'),
    (v_user_id, v_cat_food,     CURRENT_DATE - 70,  'Expense', 320,   'Groceries',           'Cash',          'Cash');

  -- ── Persons + lent/debt ledger ───────────────────────────────────────
  INSERT INTO public.persons (id, user_id, name, relationship) VALUES
    (gen_random_uuid(), v_user_id, 'Rafiq Bhai',   'Friend'),
    (gen_random_uuid(), v_user_id, 'Mama',         'Family'),
    (gen_random_uuid(), v_user_id, 'Tariq',        'Business Partner'),
    (gen_random_uuid(), v_user_id, 'Sadia',        'Friend'),
    (gen_random_uuid(), v_user_id, 'Office Petty', 'Colleague');

  SELECT id INTO v_p1 FROM public.persons WHERE user_id = v_user_id AND name = 'Rafiq Bhai';
  SELECT id INTO v_p2 FROM public.persons WHERE user_id = v_user_id AND name = 'Mama';
  SELECT id INTO v_p3 FROM public.persons WHERE user_id = v_user_id AND name = 'Tariq';
  SELECT id INTO v_p4 FROM public.persons WHERE user_id = v_user_id AND name = 'Sadia';
  SELECT id INTO v_p5 FROM public.persons WHERE user_id = v_user_id AND name = 'Office Petty';

  -- Rafiq Bhai gets TWO Lent entries — exercises the aggregate-balance
  -- model (remaining = sum of entries minus all payments, not one entry).
  INSERT INTO public.person_ledger (user_id, person_id, ledger_type, total_amount, start_date, reason, payment_method, account, settled_date) VALUES
    (v_user_id, v_p1, 'Lent', 5000,  CURRENT_DATE - 30, 'Borrowed for medical', 'MFS - bKash',   'bKash',              NULL),
    (v_user_id, v_p1, 'Lent', 1000,  CURRENT_DATE - 10, 'Emergency top-up',     'MFS - bKash',   'bKash',              NULL),
    (v_user_id, v_p2, 'Lent', 10000, CURRENT_DATE - 60, 'House expense',       'Bank Transfer', 'BRAC Bank Savings',  NULL),
    (v_user_id, v_p3, 'Debt', 15000, CURRENT_DATE - 45, 'Business capital',    'Bank Transfer', 'BRAC Bank Savings',  NULL),
    (v_user_id, v_p4, 'Lent', 800,   CURRENT_DATE - 10, 'Lunch split',         'Cash',          'Cash',               CURRENT_DATE - 3),
    (v_user_id, v_p5, 'Debt', 2000,  CURRENT_DATE - 20, 'Petty cash advance',  'Cash',          'Cash',               NULL);

  INSERT INTO public.ledger_payments (person_id, ledger_type, user_id, amount, payment_date, payment_method, account, notes) VALUES
    (v_p1, 'Lent', v_user_id, 2000, CURRENT_DATE - 15, 'MFS - bKash',   'bKash',             NULL),
    (v_p3, 'Debt', v_user_id, 5000, CURRENT_DATE - 20, 'Bank Transfer', 'BRAC Bank Savings', NULL),
    (v_p4, 'Lent', v_user_id, 800,  CURRENT_DATE - 3,  'Cash',          'Cash',              'Settled in full');

  -- ── Investments ───────────────────────────────────────────────────
  INSERT INTO public.investments (id, user_id, name, category, company_name, committed_amount, start_date, end_date, market_value) VALUES
    (gen_random_uuid(), v_user_id, 'Bashundhara Land Plot', 'Real Estate',    NULL,                                     800000, CURRENT_DATE - 300, NULL,               950000),
    (gen_random_uuid(), v_user_id, 'DSE Stock Portfolio',   'Stocks',        'Grameenphone, BRAC Bank',                150000, CURRENT_DATE - 200, NULL,               172000),
    (gen_random_uuid(), v_user_id, 'Islami Bank FDR',       'Fixed Deposit', 'Islami Bank Bangladesh',                 300000, CURRENT_DATE - 180, CURRENT_DATE + 185, NULL);

  SELECT id INTO v_inv1 FROM public.investments WHERE user_id = v_user_id AND name = 'Bashundhara Land Plot';
  SELECT id INTO v_inv2 FROM public.investments WHERE user_id = v_user_id AND name = 'DSE Stock Portfolio';
  SELECT id INTO v_inv3 FROM public.investments WHERE user_id = v_user_id AND name = 'Islami Bank FDR';

  INSERT INTO public.investment_payments (investment_id, user_id, amount, payment_date, payment_method, account, notes) VALUES
    (v_inv1, v_user_id, 500000, CURRENT_DATE - 300, 'Bank Transfer', 'BRAC Bank Savings', 'Booking amount'),
    (v_inv1, v_user_id, 300000, CURRENT_DATE - 200, 'Bank Transfer', 'BRAC Bank Savings', 'Final installment'),
    (v_inv2, v_user_id, 150000, CURRENT_DATE - 200, 'Bank Transfer', 'Prime Bank',        NULL),
    (v_inv3, v_user_id, 300000, CURRENT_DATE - 180, 'Bank Transfer', 'Islami Bank',       NULL);

  INSERT INTO public.investment_returns (investment_id, user_id, amount, return_date, return_type, payment_method, account, notes) VALUES
    (v_inv1, v_user_id, 15000, CURRENT_DATE - 240, 'Rent',     'MFS - bKash',   'bKash',       'Q1 rent'),
    (v_inv1, v_user_id, 15000, CURRENT_DATE - 150, 'Rent',     'MFS - bKash',   'bKash',       'Q2 rent'),
    (v_inv1, v_user_id, 15000, CURRENT_DATE - 60,  'Rent',     'MFS - bKash',   'bKash',       'Q3 rent'),
    (v_inv2, v_user_id, 3200,  CURRENT_DATE - 90,  'Dividend', 'Bank Transfer', 'Prime Bank',  NULL),
    (v_inv2, v_user_id, 8000,  CURRENT_DATE - 30,  'Profit',   'Bank Transfer', 'Prime Bank',  'Partial share sale');

  -- ── Recurring rules — exercises real materialization on next login,
  -- unlike demo mode where it's simulated. last_materialized_date left
  -- NULL (materialize-on-open backfills from start_date on first run).
  INSERT INTO public.recurring_rules (user_id, category_id, type, amount, description, cadence, start_date, payment_method, account, is_active) VALUES
    (v_user_id, v_cat_salary, 'Income',  45000, 'Monthly salary', 'Monthly', CURRENT_DATE - 95, 'Bank Transfer', 'BRAC Bank Savings', true),
    (v_user_id, v_cat_phone,  'Expense', 599,   'Phone bill',     'Monthly', CURRENT_DATE - 65, 'MFS - bKash',   'bKash',             true),
    (v_user_id, v_cat_food,   'Expense', 800,   'Weekly groceries','Weekly', CURRENT_DATE - 30, 'Cash',          'Cash',              true);

  RAISE NOTICE 'Guest account % seeded: 15 transactions, 5 persons, 6 ledger entries, 3 payments, 3 investments, 3 recurring rules.', v_email;
END $$;
