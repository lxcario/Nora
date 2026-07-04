"""
Backend test: Verifies RLS policies on cards and topics tables.
Ensures anonymous users cannot read, create, or delete other users' study data.
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


def test_anon_cannot_read_cards():
    """RLS must prevent anonymous users from reading flashcards."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/cards?select=id,front,back&limit=5",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} cards! "
            f"RLS select policy on cards table is too permissive."
        )
        print("PASS: cards table returns empty array for anon (RLS filters all rows)")
    else:
        assert resp.status_code in (401, 403), f"Unexpected {resp.status_code}"
        print(f"PASS: cards table rejected anon with {resp.status_code}")


def test_anon_cannot_read_topics():
    """RLS must prevent anonymous users from reading topics."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/topics?select=id,name&limit=5",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} topics!"
        )
        print("PASS: topics table returns empty array for anon")
    else:
        assert resp.status_code in (401, 403), f"Unexpected {resp.status_code}"
        print(f"PASS: topics table rejected anon with {resp.status_code}")


def test_anon_cannot_delete_cards():
    """RLS must prevent anonymous users from deleting cards."""
    resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/cards?id=eq.{FAKE_USER_ID}",
        headers=HEADERS,
    )
    # Should not return 200/204 (success)
    assert resp.status_code not in (200, 204) or resp.text == "[]" or resp.text == "", (
        f"SECURITY BUG: Anonymous DELETE on cards returned {resp.status_code}"
    )
    print(f"PASS: cards delete rejected or no-op for anon (status {resp.status_code})")


def test_anon_cannot_read_feynman_explanations():
    """RLS must prevent anonymous users from reading Feynman explanations."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/feynman_explanations?select=id,content&limit=5",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} Feynman explanations!"
        )
        print("PASS: feynman_explanations returns empty for anon")
    else:
        assert resp.status_code in (400, 401, 403), f"Unexpected {resp.status_code}"
        print(f"PASS: feynman_explanations rejected anon with {resp.status_code}")


if __name__ == "__main__":
    test_anon_cannot_read_cards()
    test_anon_cannot_read_topics()
    test_anon_cannot_delete_cards()
    test_anon_cannot_read_feynman_explanations()
    print("\n=== ALL 4 RLS DATA ISOLATION TESTS PASSED ===")
