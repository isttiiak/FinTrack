-- ============================================================
-- 016_onboarding_region.sql
-- Idempotent — safe to re-run.
--
-- FinTrack is for Bangladesh AND everyone else (TODO.md §7). New accounts
-- used to start with BDT, Asia/Dhaka and a BD-flavoured category set no
-- matter where the user was. Now, on a new account's first sign-in, the app
-- detects currency + timezone from the browser and calls complete_onboarding():
--   * sets profiles.currency / timezone
--   * for a non-Bangladesh user, swaps the starter categories for a neutral
--     global set — but only while the account has no transactions or
--     recurring rules, so nothing that's in use is ever touched
--   * stamps profiles.onboarded_at so it runs once
--
-- Existing accounts are stamped as already onboarded below, so they are
-- never changed. The signup trigger keeps seeding the Bangladesh set (it
-- can't know the user's location); BD users simply keep it.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Everyone who exists today has already set things up the way they like.
UPDATE public.profiles SET onboarded_at = coalesce(onboarded_at, created_at, now()) WHERE onboarded_at IS NULL;

CREATE OR REPLACE FUNCTION private.seed_global_categories(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, main_group, type, is_default) VALUES
    (p_user_id, 'Groceries',          'Food',          'Expense', true),
    (p_user_id, 'Restaurants',        'Food',          'Expense', true),
    (p_user_id, 'Coffee',             'Food',          'Expense', true),
    (p_user_id, 'Rent',               'Housing',       'Expense', true),
    (p_user_id, 'Electricity & Water','Utility',       'Expense', true),
    (p_user_id, 'Phone Bill',         'Utility',       'Expense', true),
    (p_user_id, 'Internet Bill',      'Utility',       'Expense', true),
    (p_user_id, 'Public Transport',   'Transport',     'Expense', true),
    (p_user_id, 'Taxi / Rideshare',   'Transport',     'Expense', true),
    (p_user_id, 'Fuel',               'Transport',     'Expense', true),
    (p_user_id, 'Medical',            'Medical',       'Expense', true),
    (p_user_id, 'Education',          'Education',     'Expense', true),
    (p_user_id, 'Entertainment',      'Entertainment', 'Expense', true),
    (p_user_id, 'Subscriptions',      'Lifestyle',     'Expense', true),
    (p_user_id, 'Personal Care',      'Lifestyle',     'Expense', true),
    (p_user_id, 'Shopping',           'Shopping',      'Expense', true),
    (p_user_id, 'Family Support',     'Giving',        'Expense', true),
    (p_user_id, 'Gift',               'Giving',        'Expense', true),
    (p_user_id, 'Donate',             'Giving',        'Expense', true),
    (p_user_id, 'Bank & Transfer Fees','Others',       'Expense', true),
    (p_user_id, 'Others',             'Others',        'Expense', true),
    (p_user_id, 'Salary',             'Income',        'Income',  true),
    (p_user_id, 'Scholarship',        'Income',        'Income',  true),
    (p_user_id, 'Family Support Received', 'Income',   'Income',  true),
    (p_user_id, 'Business',           'Income',        'Income',  true),
    (p_user_id, 'Gift Received',      'Income',        'Income',  true)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION private.seed_global_categories(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_currency text, p_timezone text, p_region text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_currency !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'Invalid currency'; END IF;
  IF char_length(coalesce(p_timezone, '')) NOT BETWEEN 1 AND 64 THEN RAISE EXCEPTION 'Invalid timezone'; END IF;

  -- Runs once per account. The guard is in the UPDATE itself, so two
  -- concurrent calls (the app can sign in twice in quick succession) can't
  -- both get past it: the second waits on the row lock, re-checks, and
  -- finds onboarded_at already set.
  UPDATE public.profiles
     SET currency = p_currency, timezone = p_timezone, onboarded_at = now()
   WHERE id = uid AND onboarded_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_region = 'global'
     AND NOT EXISTS (SELECT 1 FROM public.transactions    WHERE user_id = uid)
     AND NOT EXISTS (SELECT 1 FROM public.recurring_rules WHERE user_id = uid)
  THEN
    -- budget_limits on these rows cascade; there can't be any yet in practice
    DELETE FROM public.categories WHERE user_id = uid AND is_default;
    PERFORM private.seed_global_categories(uid);
  END IF;
END;
$$;

-- Callable by signed-in users only — never anon (see 007_lock_down_rpc.sql).
REVOKE ALL ON FUNCTION public.complete_onboarding(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, text) TO authenticated;
