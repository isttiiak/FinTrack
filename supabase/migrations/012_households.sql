-- ============================================================
-- 012_households.sql
-- Idempotent where practical — safe to re-run.
--
-- Household mode: a shared space where a few people (family, flatmates,
-- a student and the relatives supporting them) log shared expenses, split
-- them, and settle up.
--
-- DESIGN — why this does NOT touch the existing tables' RLS:
-- Every personal table (transactions, ledger, investments, ...) keeps its
-- one-user-one-row `auth.uid() = user_id` policy untouched. Household data
-- lives only in the new tables below, whose policies are membership-based.
-- Personal finances therefore stay private by construction; nothing a
-- household member does can reach them.
--
-- Members are rows in household_members, not raw user ids, so someone
-- without an account (a parent, a flatmate) can still be a named
-- participant in splits — user_id is NULL until they join and claim it.
--
-- Amounts are in one currency per household (households.currency).
--
-- Writes that must be atomic (creating a household, joining, saving an
-- expense together with its splits) go through SECURITY DEFINER functions
-- in `public` that are granted to `authenticated` only — see the grants at
-- the bottom; 007_lock_down_rpc.sql explains why an accidental anon grant
-- on a public function would be a hole.
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  currency    text NOT NULL DEFAULT 'BDT',
  -- Share this to invite people; the owner can rotate it by updating the row.
  invite_code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- NULL = a named placeholder with no account (yet). If an account is
  -- purged the member row survives as a placeholder so history stays intact.
  user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name         text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id),
  -- target for the composite foreign keys below, so a row in another table
  -- can prove its member belongs to the *same* household
  UNIQUE (id, household_id)
);
CREATE INDEX IF NOT EXISTS household_members_user_idx ON public.household_members (user_id);

CREATE TABLE IF NOT EXISTS public.shared_expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  paid_by      uuid NOT NULL,
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  description  text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 200),
  category     text,
  expense_date date NOT NULL,
  notes        text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, household_id),
  FOREIGN KEY (paid_by, household_id) REFERENCES public.household_members (id, household_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS shared_expenses_household_idx ON public.shared_expenses (household_id, expense_date DESC);

CREATE TABLE IF NOT EXISTS public.shared_expense_splits (
  expense_id   uuid NOT NULL,
  member_id    uuid NOT NULL,
  household_id uuid NOT NULL,
  share        numeric(12,2) NOT NULL CHECK (share >= 0),
  PRIMARY KEY (expense_id, member_id),
  FOREIGN KEY (expense_id, household_id) REFERENCES public.shared_expenses (id, household_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id, household_id)  REFERENCES public.household_members (id, household_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.household_settlements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_member  uuid NOT NULL,   -- paid
  to_member    uuid NOT NULL,   -- received
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  settled_on   date NOT NULL,
  note         text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (from_member <> to_member),
  FOREIGN KEY (from_member, household_id) REFERENCES public.household_members (id, household_id) ON DELETE RESTRICT,
  FOREIGN KEY (to_member, household_id)   REFERENCES public.household_members (id, household_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS household_settlements_household_idx ON public.household_settlements (household_id, settled_on DESC);

-- ── Membership helpers ──────────────────────────────────────
-- SECURITY DEFINER so the policies below can ask "is the caller a member?"
-- without recursing into household_members' own RLS. They live in
-- `private` (not exposed by PostgREST); `authenticated` needs USAGE +
-- EXECUTE because policy expressions run with the caller's privileges.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_household_member(hid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members m
    WHERE m.household_id = hid AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_household_owner(hid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members m
    WHERE m.household_id = hid AND m.user_id = auth.uid() AND m.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION private.is_household_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_household_owner(uuid)  FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_household_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_household_owner(uuid)  TO authenticated;

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS households_select ON public.households;
DROP POLICY IF EXISTS households_update ON public.households;
DROP POLICY IF EXISTS households_delete ON public.households;
-- No INSERT policy: households are created through create_household().
CREATE POLICY households_select ON public.households FOR SELECT USING (private.is_household_member(id));
CREATE POLICY households_update ON public.households FOR UPDATE
  USING (private.is_household_owner(id)) WITH CHECK (private.is_household_owner(id));
CREATE POLICY households_delete ON public.households FOR DELETE USING (private.is_household_owner(id));

DROP POLICY IF EXISTS members_select ON public.household_members;
DROP POLICY IF EXISTS members_insert ON public.household_members;
DROP POLICY IF EXISTS members_delete ON public.household_members;
CREATE POLICY members_select ON public.household_members FOR SELECT USING (private.is_household_member(household_id));
-- Members may add *placeholders* only; linking a real account happens in join_household().
CREATE POLICY members_insert ON public.household_members FOR INSERT
  WITH CHECK (private.is_household_member(household_id) AND user_id IS NULL AND role = 'member');
-- Leave yourself, or the owner removes someone. Members who appear in any
-- expense/settlement can't be deleted (ON DELETE RESTRICT) — history stays valid.
CREATE POLICY members_delete ON public.household_members FOR DELETE
  USING (private.is_household_member(household_id)
         AND (user_id = auth.uid() OR private.is_household_owner(household_id)));

DROP POLICY IF EXISTS expenses_select ON public.shared_expenses;
DROP POLICY IF EXISTS expenses_delete ON public.shared_expenses;
-- INSERT/UPDATE only through save_shared_expense(), which validates the splits.
CREATE POLICY expenses_select ON public.shared_expenses FOR SELECT USING (private.is_household_member(household_id));
CREATE POLICY expenses_delete ON public.shared_expenses FOR DELETE USING (private.is_household_member(household_id));

DROP POLICY IF EXISTS splits_select ON public.shared_expense_splits;
CREATE POLICY splits_select ON public.shared_expense_splits FOR SELECT USING (private.is_household_member(household_id));

DROP POLICY IF EXISTS settlements_select ON public.household_settlements;
DROP POLICY IF EXISTS settlements_insert ON public.household_settlements;
DROP POLICY IF EXISTS settlements_delete ON public.household_settlements;
CREATE POLICY settlements_select ON public.household_settlements FOR SELECT USING (private.is_household_member(household_id));
CREATE POLICY settlements_insert ON public.household_settlements FOR INSERT WITH CHECK (private.is_household_member(household_id));
CREATE POLICY settlements_delete ON public.household_settlements FOR DELETE USING (private.is_household_member(household_id));

-- ── RPCs ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_household(p_name text, p_currency text DEFAULT 'BDT')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  hid uuid;
  who text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1), 'Me') INTO who FROM public.profiles WHERE id = uid;
  INSERT INTO public.households (name, currency, created_by) VALUES (btrim(p_name), p_currency, uid) RETURNING id INTO hid;
  INSERT INTO public.household_members (household_id, user_id, name, role) VALUES (hid, uid, coalesce(who, 'Me'), 'owner');
  RETURN hid;
END;
$$;

-- Join with an invite code. If p_member_id is given, claim that placeholder
-- (someone already named in the household's expenses) instead of adding a
-- new member.
CREATE OR REPLACE FUNCTION public.join_household(p_invite_code text, p_member_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  hid uuid;
  who text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO hid FROM public.households WHERE invite_code = btrim(p_invite_code);
  IF hid IS NULL THEN RAISE EXCEPTION 'That invite code is not valid'; END IF;
  IF EXISTS (SELECT 1 FROM public.household_members WHERE household_id = hid AND user_id = uid) THEN
    RETURN hid;   -- already in; joining twice is a no-op
  END IF;

  IF p_member_id IS NOT NULL THEN
    UPDATE public.household_members SET user_id = uid
      WHERE id = p_member_id AND household_id = hid AND user_id IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'That member is not available to claim'; END IF;
  ELSE
    SELECT coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1), 'Me') INTO who FROM public.profiles WHERE id = uid;
    INSERT INTO public.household_members (household_id, user_id, name) VALUES (hid, uid, coalesce(who, 'Me'));
  END IF;
  RETURN hid;
END;
$$;

-- Lets someone holding an invite code see the household's name and which
-- named placeholders (people added without an account) they might be, so they
-- can claim one on joining instead of creating a duplicate. Reveals nothing
-- beyond what the code itself grants access to.
CREATE OR REPLACE FUNCTION public.household_claimables(p_invite_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid uuid;
  hname text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id, name INTO hid, hname FROM public.households WHERE invite_code = btrim(p_invite_code);
  IF hid IS NULL THEN RAISE EXCEPTION 'That invite code is not valid'; END IF;
  RETURN jsonb_build_object(
    'name', hname,
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) ORDER BY m.created_at)
      FROM public.household_members m WHERE m.household_id = hid AND m.user_id IS NULL
    ), '[]'::jsonb)
  );
END;
$$;

-- Create (p_expense_id NULL) or replace an expense together with its splits,
-- atomically. p_splits: [{"member_id": "...", "share": 12.5}, ...]; the shares
-- must add up to the amount exactly.
CREATE OR REPLACE FUNCTION public.save_shared_expense(
  p_expense_id   uuid,
  p_household_id uuid,
  p_paid_by      uuid,
  p_amount       numeric,
  p_description  text,
  p_category     text,
  p_date         date,
  p_notes        text,
  p_splits       jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  eid uuid;
  total numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT private.is_household_member(p_household_id) THEN RAISE EXCEPTION 'Not a member of this household'; END IF;
  IF p_splits IS NULL OR jsonb_typeof(p_splits) <> 'array' OR jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'Pick at least one person to split with';
  END IF;

  SELECT coalesce(sum(round((s->>'share')::numeric, 2)), 0) INTO total FROM jsonb_array_elements(p_splits) s;
  IF total <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Split shares (%) must add up to the amount (%)', total, round(p_amount, 2);
  END IF;

  IF p_expense_id IS NULL THEN
    INSERT INTO public.shared_expenses (household_id, paid_by, amount, description, category, expense_date, notes, created_by)
    VALUES (p_household_id, p_paid_by, round(p_amount, 2), btrim(p_description), nullif(btrim(p_category), ''), p_date, nullif(btrim(p_notes), ''), uid)
    RETURNING id INTO eid;
  ELSE
    UPDATE public.shared_expenses
       SET paid_by = p_paid_by, amount = round(p_amount, 2), description = btrim(p_description),
           category = nullif(btrim(p_category), ''), expense_date = p_date, notes = nullif(btrim(p_notes), '')
     WHERE id = p_expense_id AND household_id = p_household_id
     RETURNING id INTO eid;
    IF eid IS NULL THEN RAISE EXCEPTION 'Expense not found'; END IF;
    DELETE FROM public.shared_expense_splits WHERE expense_id = eid;
  END IF;

  -- The composite foreign keys reject any member from another household.
  INSERT INTO public.shared_expense_splits (expense_id, member_id, household_id, share)
  SELECT eid, (s->>'member_id')::uuid, p_household_id, round((s->>'share')::numeric, 2)
  FROM jsonb_array_elements(p_splits) s;

  RETURN eid;
END;
$$;

-- Callable by signed-in users only — never anon (see 007_lock_down_rpc.sql).
REVOKE ALL ON FUNCTION public.create_household(text, text)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household(text, uuid)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_claimables(text)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_shared_expense(uuid, uuid, uuid, numeric, text, text, date, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_household(text, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(text, uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_claimables(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_shared_expense(uuid, uuid, uuid, numeric, text, text, date, text, jsonb) TO authenticated;
