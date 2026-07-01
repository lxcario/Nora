-- ============================================================
-- Pixel Study OS – Secure the atomic reward RPCs (authorization hardening)
-- ============================================================
-- Migration 017 added three SECURITY DEFINER reward functions that bypass RLS
-- but trusted the caller-supplied p_user_id / p_quest_id with NO auth check,
-- and never REVOKEd the implicit PUBLIC EXECUTE grant. That made them callable
-- through the public PostgREST API with the anon key, allowing anyone to inflate
-- any user's XP/coins/pet affinity or advance any party's quest (IDOR).
--
-- This migration recreates the three functions WITH authorization and locks
-- down EXECUTE, mirroring the proven pattern in 005_party_rls_fix.sql
-- (REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated, asserts auth.uid()).
--
-- Authorization model:
--   * increment_profile_rewards / increment_pet_affinity:
--       An AUTHENTICATED caller may only target their OWN row (p_user_id = auth.uid()).
--       A NULL auth.uid() = the trusted server-side service_role (used for the
--       cross-user party-quest completion bonus). That path is allowed.
--   * increment_quest_progress:
--       The caller must belong to the party that owns the quest
--       (reuses get_user_party_id() from 005).
--
-- Bodies are otherwise IDENTICAL to 017. Idempotent: safe to re-run.
-- Apply via the Supabase SQL Editor or `supabase db push`.
-- ============================================================

-- 1. Atomic profile XP/coins increment (self-only, or trusted service_role).
CREATE OR REPLACE FUNCTION public.increment_profile_rewards(
  p_user_id UUID,
  p_xp INTEGER,
  p_coins INTEGER
)
RETURNS TABLE (new_xp INTEGER, new_coins INTEGER, new_level INTEGER, old_level INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level INTEGER;
  v_new_xp INTEGER;
  v_new_coins INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Authorization: an authenticated user may only modify their own profile.
  -- auth.uid() IS NULL means the trusted service_role (server-side) is calling
  -- (e.g. the party-quest completion bonus that rewards every member).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden: cannot modify another user''s rewards'
      USING ERRCODE = '42501';
  END IF;

  -- Read the old level before the update
  SELECT level INTO v_old_level FROM profiles WHERE id = p_user_id;

  -- Atomic increment
  UPDATE profiles
  SET
    xp = xp + p_xp,
    coins = coins + p_coins,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING xp, coins INTO v_new_xp, v_new_coins;

  -- Compute new level from the updated XP
  v_new_level := floor(sqrt(v_new_xp::numeric / 50)) + 1;

  -- Update level if it changed
  IF v_new_level <> v_old_level THEN
    UPDATE profiles SET level = v_new_level WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT v_new_xp, v_new_coins, v_new_level, v_old_level;
END;
$$;

-- 2. Atomic pet affinity increment (self-only, or trusted service_role).
CREATE OR REPLACE FUNCTION public.increment_pet_affinity(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden: cannot modify another user''s pet'
      USING ERRCODE = '42501';
  END IF;

  UPDATE pets
  SET
    affinity = LEAST(100, GREATEST(0, affinity + p_amount)),
    state = CASE
      WHEN LEAST(100, GREATEST(0, affinity + p_amount)) > 70 THEN 'happy'
      WHEN LEAST(100, GREATEST(0, affinity + p_amount)) > 40 THEN 'neutral'
      ELSE 'sad'
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 3. Atomic party quest progress increment (party-membership authorized).
CREATE OR REPLACE FUNCTION public.increment_quest_progress(
  p_quest_id UUID,
  p_amount INTEGER
)
RETURNS TABLE (new_progress INTEGER, target INTEGER, just_completed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_progress INTEGER;
  v_target INTEGER;
  v_old_status TEXT;
BEGIN
  -- Authorization: the caller must belong to the party that owns this quest.
  -- get_user_party_id() (migration 005) resolves the caller's party via auth.uid().
  IF NOT EXISTS (
    SELECT 1 FROM party_quests pq
    WHERE pq.id = p_quest_id
      AND pq.party_id = get_user_party_id()
  ) THEN
    RAISE EXCEPTION 'forbidden: quest does not belong to your party'
      USING ERRCODE = '42501';
  END IF;

  -- Only increment active quests
  SELECT pq.progress, pq.target, pq.status
  INTO v_new_progress, v_target, v_old_status
  FROM party_quests pq
  WHERE pq.id = p_quest_id AND pq.status = 'active'
  FOR UPDATE;

  IF NOT FOUND OR v_old_status <> 'active' THEN
    RETURN QUERY SELECT 0, 0, FALSE;
    RETURN;
  END IF;

  v_new_progress := v_new_progress + p_amount;

  IF v_new_progress >= v_target THEN
    UPDATE party_quests
    SET progress = v_new_progress, status = 'completed', completed_at = now()
    WHERE id = p_quest_id;
    RETURN QUERY SELECT v_new_progress, v_target, TRUE;
  ELSE
    UPDATE party_quests
    SET progress = v_new_progress
    WHERE id = p_quest_id;
    RETURN QUERY SELECT v_new_progress, v_target, FALSE;
  END IF;
END;
$$;

-- 4. Lock down EXECUTE: allow only authenticated users and the trusted
--    service_role.
--    NOTE: Supabase auto-grants EXECUTE to `anon` (and `authenticated`) on
--    functions created in the `public` schema (the Data API exposure behaviour
--    referenced by `auto_expose_new_tables` in config.toml). That is a DIRECT
--    grant to the `anon` role, so `REVOKE ... FROM PUBLIC` alone does NOT remove
--    it — `anon` must be revoked explicitly, otherwise unauthenticated callers
--    keep access (verified: anon could still invoke after a PUBLIC-only revoke).
REVOKE ALL ON FUNCTION public.increment_profile_rewards(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_pet_affinity(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_quest_progress(UUID, INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.increment_profile_rewards(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_pet_affinity(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_quest_progress(UUID, INTEGER) TO authenticated, service_role;
