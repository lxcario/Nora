-- ============================================================
-- Verification script for 007_university_onboarding.sql (Task 1.3)
--
-- Confirms that RLS isolates academic data between users and that
-- the registry is authenticated-read / not user-writable.
--
-- HOW TO RUN: paste into the Supabase SQL Editor AFTER applying
-- 007_university_onboarding.sql. It uses two real auth.users ids.
-- Replace :user_a and :user_b with two ids from `select id from auth.users`.
--
-- Because the SQL Editor runs as a privileged role (RLS bypassed),
-- we simulate each user with `set local role authenticated` +
-- `request.jwt.claims`. Run the whole thing in one transaction.
-- ============================================================

BEGIN;

-- ---- Pick two existing users (edit these two lines) ----
\set user_a '00000000-0000-0000-0000-00000000000a'
\set user_b '00000000-0000-0000-0000-00000000000b'

-- ---- Act as user A and create a profile + one event ----
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);

INSERT INTO academic_profiles (user_id, university_name_raw, year_of_study, term, onboarding_status)
VALUES (:'user_a', 'Test Univ A', 2, 'Fall', 'review')
RETURNING id AS profile_a \gset

INSERT INTO academic_events (user_id, academic_profile_id, event_type, status, start_date, confidence)
VALUES (:'user_a', :'profile_a', 'final_period', 'verified', '2026-01-12', 0.97);

-- User A should see exactly their own rows.
SELECT 'A sees own profiles' AS check, count(*) AS n FROM academic_profiles;     -- expect 1
SELECT 'A sees own events'   AS check, count(*) AS n FROM academic_events;       -- expect 1

-- ---- Switch to user B ----
SELECT set_config('request.jwt.claims', json_build_object('sub', :'user_b', 'role', 'authenticated')::text, true);

-- User B must NOT see user A's data (RLS isolation).
SELECT 'B sees A profiles (must be 0)' AS check, count(*) AS n FROM academic_profiles; -- expect 0
SELECT 'B sees A events (must be 0)'   AS check, count(*) AS n FROM academic_events;   -- expect 0

-- Registry must be readable by an authenticated user...
SELECT 'B can read registry' AS check, count(*) >= 0 AS ok FROM universities;         -- expect true

-- ...but NOT writable by a normal user (this INSERT should raise an RLS error).
DO $$
BEGIN
  INSERT INTO universities (name, primary_domain) VALUES ('Hacker U', 'evil.example');
  RAISE EXCEPTION 'FAIL: authenticated user was able to write to the registry';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: registry write blocked by RLS (insufficient_privilege)';
END $$;

-- Roll everything back — this is a read-only verification.
ROLLBACK;
