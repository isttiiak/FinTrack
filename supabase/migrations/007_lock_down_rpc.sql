-- ============================================================
-- FinTrack — Lock down admin-only RPCs
-- Fixes TODO.md §2.1 and §2.2.
--
-- Postgres grants EXECUTE to PUBLIC on every new function by default,
-- and PostgREST automatically exposes any non-trigger-returning function
-- in an exposed schema (public, by default) as a callable RPC endpoint.
-- 001_initial_schema.sql never revoked that default grant on either
-- purge_deleted_users() or seed_default_categories(uuid), so both have
-- been callable by anyone holding nothing more than the public anon key
-- since the app first shipped:
--   - purge_deleted_users() runs a real DELETE against auth.users. The
--     30-day-old-soft-delete WHERE clause limits which rows it can
--     touch, but nothing should be able to invoke it at all — no cron
--     ever called it (still not deployed), so today an anonymous caller
--     is the only thing that can.
--   - seed_default_categories(uuid) is SECURITY DEFINER (bypasses RLS)
--     and takes an arbitrary uuid. Its `ON CONFLICT DO NOTHING` has
--     always been dead code — categories had no unique constraint, so
--     nothing could ever conflict — meaning a caller could insert 26
--     rows into *any* user's category list, in a loop, forever.
--
-- Fix, in order:
--   1. De-duplicate any categories the dead ON CONFLICT let through,
--      safely repointing anything that references a row being removed
--      (this repo has no way to inspect live data before writing this,
--      so it's written to be safe regardless of what's actually there —
--      see the DO block below).
--   2. Add the UNIQUE constraint that makes seed_default_categories'
--      existing `ON CONFLICT DO NOTHING` start actually working, with
--      no change to the function body needed.
--   3. Move both functions out of `public` into a new `private` schema.
--      Supabase's REST layer only exposes schemas explicitly listed in
--      Project Settings → API → "Exposed schemas" (public by default) —
--      a function in `private` is unreachable via /rest/v1/rpc/... no
--      matter its grants, which is the primary fix.
--   4. Revoke the default PUBLIC execute grant too, as defense in depth
--      — so a future "add private to Exposed schemas" slip in the
--      dashboard doesn't silently re-open this.
--
-- Nothing in src/ calls either function via .rpc(...) (confirmed by
-- grep), and the only existing caller — the on_auth_user_created
-- trigger — is updated below to call the new schema location. A future
-- purge cron should invoke `SELECT private.purge_deleted_users();`
-- directly in SQL (e.g. via pg_cron), which runs with the cron job's
-- own database role and never touches PostgREST or these grants.
--
-- Written to be safely re-runnable, matching this repo's existing
-- migration style.
-- ============================================================

-- ── Step 1: de-duplicate categories ─────────────────────────────────
-- For any (user_id, name, main_group) group with more than one row,
-- keep the earliest-created (ties broken by id) and repoint anything
-- referencing a duplicate before deleting it, so this can't fail with
-- a foreign-key violation regardless of what the live data holds.
DO $$
DECLARE
  dup RECORD;
  keeper_id uuid;
BEGIN
  FOR dup IN
    SELECT user_id, name, main_group,
           (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keeper,
           array_remove(
             array_agg(id ORDER BY created_at ASC, id ASC),
             (array_agg(id ORDER BY created_at ASC, id ASC))[1]
           ) AS dupes
    FROM public.categories
    GROUP BY user_id, name, main_group
    HAVING COUNT(*) > 1
  LOOP
    keeper_id := dup.keeper;

    -- transactions.category_id has no unique constraint — safe blanket repoint.
    UPDATE public.transactions
    SET category_id = keeper_id
    WHERE category_id = ANY(dup.dupes);

    -- budget_limits has UNIQUE(user_id, category_id): if the keeper already
    -- has a budget limit, a duplicate's limit can't be repointed onto it
    -- (two limits merging into one row) — drop it instead of colliding.
    DELETE FROM public.budget_limits
    WHERE category_id = ANY(dup.dupes)
      AND user_id IN (SELECT user_id FROM public.budget_limits WHERE category_id = keeper_id);

    UPDATE public.budget_limits
    SET category_id = keeper_id
    WHERE category_id = ANY(dup.dupes);

    DELETE FROM public.categories WHERE id = ANY(dup.dupes);
  END LOOP;
END $$;

-- ── Step 2: add the constraint that makes ON CONFLICT DO NOTHING real ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_name_group_unique'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_user_name_group_unique UNIQUE (user_id, name, main_group);
  END IF;
END $$;

-- ── Step 3: move both functions to a non-exposed schema ──────────────
CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'purge_deleted_users'
  ) THEN
    ALTER FUNCTION public.purge_deleted_users() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'seed_default_categories'
  ) THEN
    ALTER FUNCTION public.seed_default_categories(uuid) SET SCHEMA private;
  END IF;
END $$;

-- The signup trigger is the one existing caller — repoint it at the new
-- schema. handle_new_user() itself was never exposed as RPC (it returns
-- `trigger`, which PostgREST always excludes), so it doesn't need moving.
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
  PERFORM private.seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

-- ── Step 4: revoke the default PUBLIC execute grant, defense in depth ──
REVOKE ALL ON FUNCTION private.purge_deleted_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.seed_default_categories(uuid) FROM PUBLIC;
