-- ============================================================
-- SQL test — increment_profile_rewards authorization guard (IDOR)
-- ============================================================
-- Proves the reward RPC (migration 020) rejects a call whose target user is
-- NOT the authenticated caller — the "authenticated but malicious" case — and
-- that the victim's balance is left unchanged. It also proves the legitimate
-- self path still works, so we know the guard blocks foreign writes, not all
-- writes (spec Req 5).
--
-- Models the attack WITHOUT needing GoTrue from the CI runner: it sets the
-- request JWT claim(s) that Supabase's auth.uid() reads, so the SECURITY
-- DEFINER guard sees a specific authenticated caller. Both claim shapes are
-- set (`request.jwt.claim.sub` and `request.jwt.claims`) so the test is robust
-- across auth.uid() implementations.
--
-- Compatible with the Supabase SQL Editor (no psql meta-commands). Runs inside
-- one transaction and ROLLBACKs — no data persists. Requires at least one
-- existing account (a profiles row). Run as the table owner / service role.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_victim   UUID;
  v_attacker UUID := gen_random_uuid();
  v_xp0      INTEGER;
  v_xp1      INTEGER;
  v_xp2      INTEGER;
  v_blocked  BOOLEAN := FALSE;
BEGIN
  -- A real victim account (its profile balance must not move).
  SELECT id INTO v_victim FROM profiles LIMIT 1;
  IF v_victim IS NULL THEN
    RAISE EXCEPTION 'No profiles found — sign up at least one account before running this test.';
  END IF;

  SELECT xp INTO v_xp0 FROM profiles WHERE id = v_victim;

  -- ── Attack: an authenticated attacker targets the VICTIM's id ─────────────
  -- Make auth.uid() resolve to the attacker (NOT the victim, and NOT null —
  -- null would be the trusted service_role path).
  PERFORM set_config('request.jwt.claim.sub', v_attacker::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_attacker::text, 'role', 'authenticated')::text,
    true  -- local: transaction-scoped
  );

  BEGIN
    PERFORM * FROM increment_profile_rewards(v_victim, 9999, 9999);
  EXCEPTION
    WHEN insufficient_privilege THEN  -- SQLSTATE 42501 raised by the guard
      v_blocked := TRUE;
  END;

  ASSERT v_blocked,
    'SECURITY: increment_profile_rewards did NOT reject a foreign p_user_id — IDOR is possible!';

  -- Balance must be untouched. Read back as owner (clear the simulated auth).
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  SELECT xp INTO v_xp1 FROM profiles WHERE id = v_victim;
  ASSERT v_xp1 = v_xp0,
    format('SECURITY: victim xp changed from %s to %s despite the guard', v_xp0, v_xp1);
  RAISE NOTICE 'Guard test 1 PASSED: foreign p_user_id rejected (42501), balance unchanged.';

  -- ── Control: the owner CAN reward themselves (guard blocks foreign, not all) ─
  PERFORM set_config('request.jwt.claim.sub', v_victim::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_victim::text, 'role', 'authenticated')::text,
    true
  );
  PERFORM * FROM increment_profile_rewards(v_victim, 5, 0);

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  SELECT xp INTO v_xp2 FROM profiles WHERE id = v_victim;
  ASSERT v_xp2 = v_xp0 + 5,
    format('self-reward should add 5 xp: before %s, after %s', v_xp0, v_xp2);
  RAISE NOTICE 'Guard test 2 PASSED: legitimate self-reward (auth.uid() = target) allowed.';

  RAISE NOTICE 'All reward-RPC guard tests PASSED.';
END;
$$;

-- ── Rollback — no data persisted ─────────────────────────────────────────────
ROLLBACK;
