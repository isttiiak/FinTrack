-- ============================================================
-- FinTrack — Case-insensitive household invite codes
-- docs/AUDIT_2026-10_BUGS.md §4.1
-- Idempotent — safe to re-run. Requires 012_households.sql.
--
-- Invite codes are generated lowercase (012's column default and
-- useRotateInviteCode both slice a hex UUID), but were matched exactly, so a
-- phone keyboard capitalising the first letter made a correct code
-- "not valid". Both lookups now lower-case the input. The client normalises
-- too; this keeps older clients and hand-typed codes working.
-- CREATE OR REPLACE keeps 012's grants (authenticated only, never anon).
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_household(p_invite_code text, p_member_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  hid uuid;
  who text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO hid FROM public.households WHERE invite_code = lower(btrim(p_invite_code));
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

CREATE OR REPLACE FUNCTION public.household_claimables(p_invite_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid uuid;
  hname text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id, name INTO hid, hname FROM public.households WHERE invite_code = lower(btrim(p_invite_code));
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
