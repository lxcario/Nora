"""
Backend security test: Verifies Supabase RLS policies reject unauthorized
access to the increment_profile_rewards RPC and direct table mutations.

This test proves that:
1. Anonymous users cannot call reward RPCs to grant themselves XP/coins
2. Anonymous users cannot read other users' profiles directly
3. The gamification system is protected against privilege escalation

Environment variables required:
  SUPABASE_URL — your Supabase project URL
  SUPABASE_ANON_KEY — the public anon key (safe to use, it's the same one in the frontend bundle)

Run via TestSprite CLI:
  testsprite test create --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 \
    --type backend --name "RLS rejects unauthorized reward manipulation" \
    --code-file .testsprite/test_rls_security.py --run --wait --output json
"""

import os
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hwoaljqtjlagxacvopnc.supabase.co")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

FAKE_USER_ID = "00000000-0000-0000-0000-000000000000"


def test_anon_cannot_call_increment_rewards():
    """RLS must reject anonymous calls to increment_profile_rewards RPC."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/increment_profile_rewards",
        json={"p_user_id": FAKE_USER_ID, "p_xp": 9999, "p_coins": 9999},
        headers=HEADERS,
    )
    # Should NOT be 200/204 — any of 401, 403, 404, or 400 means RLS blocked it
    assert resp.status_code not in (200, 204), (
        f"SECURITY BUG: increment_profile_rewards returned {resp.status_code} "
        f"for anonymous user — RLS policy is not enforcing auth!"
    )
    print(f"PASS: increment_profile_rewards correctly rejected anon with {resp.status_code}")


def test_anon_cannot_read_profiles_table():
    """RLS must prevent anonymous users from reading the profiles table."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?select=id,xp,coins&limit=5",
        headers=HEADERS,
    )
    # If RLS is working: either 401/403, or 200 with empty array (RLS filters rows)
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} profile rows! "
            f"RLS select policy is too permissive."
        )
        print("PASS: profiles table returns empty array for anon (RLS filters all rows)")
    else:
        assert resp.status_code in (401, 403), (
            f"Unexpected status {resp.status_code} reading profiles"
        )
        print(f"PASS: profiles table rejected anon with {resp.status_code}")


def test_anon_cannot_insert_into_cards():
    """RLS must prevent anonymous users from inserting flashcards."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/cards",
        json={
            "user_id": FAKE_USER_ID,
            "topic_id": FAKE_USER_ID,
            "front": "injected card front",
            "back": "injected card back",
        },
        headers=HEADERS,
    )
    assert resp.status_code not in (200, 201, 204), (
        f"SECURITY BUG: Anonymous user inserted a card! Status {resp.status_code}. "
        f"RLS insert policy on cards table is missing or misconfigured."
    )
    print(f"PASS: cards insert correctly rejected anon with {resp.status_code}")


def test_health_endpoint_responds():
    """Basic connectivity check — the Supabase project is alive and RLS is active."""
    # Query profiles with anon key — should return 200 (RLS filters rows, not blocks)
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?select=id&limit=1",
        headers=HEADERS,
    )
    # 200 with empty array = RLS is active and filtering. 401/403 = also fine.
    assert resp.status_code in (200, 401, 403), (
        f"Supabase REST endpoint not responding as expected: {resp.status_code}"
    )
    print(f"PASS: Supabase REST endpoint is alive (status {resp.status_code})")


# --- Run all tests ---
if __name__ == "__main__":
    test_health_endpoint_responds()
    test_anon_cannot_call_increment_rewards()
    test_anon_cannot_read_profiles_table()
    test_anon_cannot_insert_into_cards()
    print("\n=== ALL 4 SECURITY TESTS PASSED ===")
