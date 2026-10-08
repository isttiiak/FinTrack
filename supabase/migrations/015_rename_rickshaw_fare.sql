-- ============================================================
-- 015_rename_rickshaw_fare.sql
-- Idempotent — safe to re-run.
--
-- Spelling fix: the default category "Ricksha Fare" → "Rickshaw Fare".
--   1. Renames every existing default row, except for a user who already
--      has their own "Rickshaw Fare" in Transport (categories are UNIQUE
--      on (user_id, name, main_group) since 007 — leave theirs alone).
--      Transactions, budgets and recurring rules point at category ids,
--      so nothing else needs touching.
--   2. Re-creates private.seed_default_categories() (moved there by 007)
--      with the corrected name, so new signups get the right spelling.
-- ============================================================

UPDATE public.categories c
   SET name = 'Rickshaw Fare'
 WHERE c.name = 'Ricksha Fare'
   AND c.main_group = 'Transport'
   AND NOT EXISTS (
     SELECT 1 FROM public.categories o
      WHERE o.user_id = c.user_id AND o.name = 'Rickshaw Fare' AND o.main_group = 'Transport'
   );

CREATE OR REPLACE FUNCTION private.seed_default_categories(p_user_id uuid)
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
    (p_user_id, 'Rickshaw Fare',  'Transport',     'Expense', true),
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

-- CREATE OR REPLACE keeps existing grants; repeat 007's revoke as defense in depth.
REVOKE ALL ON FUNCTION private.seed_default_categories(uuid) FROM PUBLIC;
