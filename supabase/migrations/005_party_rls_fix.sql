-- ============================================================
-- Pixel Study OS – Party RLS recursion fix
-- ============================================================
-- The original 002_social_parties.sql policies referenced
-- `party_members` from within `party_members`' own policy
-- (and from parties/quests/messages/cheers policies). On a fresh
-- database this triggers:
--   ERROR: infinite recursion detected in policy for relation "party_members"
--
-- This migration introduces a SECURITY DEFINER helper that resolves the
-- caller's party id WITHOUT being subject to RLS, then rewrites every
-- membership-based policy to use it. The helper is idempotent and safe to
-- re-run.
--
-- Run in the Supabase SQL Editor after 002_social_parties.sql.
-- ============================================================

-- 1. SECURITY DEFINER helper: the caller's current party id.
--    Runs as the function owner, bypassing RLS on party_members, which is
--    what breaks the recursion cycle.
CREATE OR REPLACE FUNCTION get_user_party_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT party_id
  FROM party_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Lock down execution to authenticated callers.
REVOKE ALL ON FUNCTION get_user_party_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_party_id() TO authenticated;

-- 2. Helper: is the caller the owner of a given party? (non-recursive;
--    `parties` policies do not reference `party_members`).
CREATE OR REPLACE FUNCTION is_party_owner(p_party_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parties
    WHERE id = p_party_id AND owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_party_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_party_owner(uuid) TO authenticated;

-- ============================================================
-- 3. Rewrite policies to use the helpers (drop + recreate).
-- ============================================================

-- --- parties ---
DROP POLICY IF EXISTS "Members can view own party" ON parties;
CREATE POLICY "Members can view own party"
  ON parties FOR SELECT
  USING (
    deleted_at IS NULL AND (
      id = get_user_party_id()
      OR visibility = 'public'
    )
  );

-- --- party_members ---
DROP POLICY IF EXISTS "Members can view party members" ON party_members;
CREATE POLICY "Members can view party members"
  ON party_members FOR SELECT
  USING (party_id = get_user_party_id());

DROP POLICY IF EXISTS "Owner can remove members" ON party_members;
CREATE POLICY "Owner can remove members"
  ON party_members FOR DELETE
  USING (is_party_owner(party_id));

-- --- party_quests ---
DROP POLICY IF EXISTS "Members can view party quests" ON party_quests;
CREATE POLICY "Members can view party quests"
  ON party_quests FOR SELECT
  USING (party_id = get_user_party_id());

DROP POLICY IF EXISTS "Members can update quest progress" ON party_quests;
CREATE POLICY "Members can update quest progress"
  ON party_quests FOR UPDATE
  USING (party_id = get_user_party_id());

-- --- party_messages ---
DROP POLICY IF EXISTS "Members can view party messages" ON party_messages;
CREATE POLICY "Members can view party messages"
  ON party_messages FOR SELECT
  USING (party_id = get_user_party_id());

DROP POLICY IF EXISTS "Members can insert messages" ON party_messages;
CREATE POLICY "Members can insert messages"
  ON party_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    party_id = get_user_party_id()
  );

-- --- party_cheers ---
DROP POLICY IF EXISTS "Members can view party cheers" ON party_cheers;
CREATE POLICY "Members can view party cheers"
  ON party_cheers FOR SELECT
  USING (party_id = get_user_party_id());

DROP POLICY IF EXISTS "Members can insert cheers" ON party_cheers;
CREATE POLICY "Members can insert cheers"
  ON party_cheers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    party_id = get_user_party_id()
  );
