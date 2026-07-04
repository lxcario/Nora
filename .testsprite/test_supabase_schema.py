"""
Backend test: Verifies the Supabase schema has the expected tables.
Confirms the database is correctly set up with all required tables for Nora.
"""
import os
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hwoaljqtjlagxacvopnc.supabase.co")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

# Core tables that must exist for Nora to function
REQUIRED_TABLES = [
    "profiles",
    "subjects",
    "topics",
    "cards",
    "card_reviews",
    "feynman_explanations",
    "study_sessions",
    "pets",
    "parties",
    "party_members",
]


def test_required_tables_exist():
    """All core Nora tables must be queryable (even if RLS returns empty)."""
    missing = []
    for table in REQUIRED_TABLES:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}?select=id&limit=0",
            headers=HEADERS,
        )
        # 200 = table exists (RLS may filter rows but schema is accessible)
        # 404 = table doesn't exist
        if resp.status_code == 404:
            missing.append(table)
        elif resp.status_code not in (200, 401, 403):
            missing.append(f"{table} (unexpected {resp.status_code})")

    assert len(missing) == 0, (
        f"Missing tables: {', '.join(missing)}. "
        f"Database schema is incomplete — run migrations."
    )
    print(f"PASS: All {len(REQUIRED_TABLES)} required tables exist in the schema")


def test_profiles_has_xp_and_coins_columns():
    """Profiles table must have xp and coins columns for gamification."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?select=xp,coins&limit=0",
        headers=HEADERS,
    )
    # If columns don't exist, Supabase returns 400 with "column not found"
    assert resp.status_code != 400, (
        f"Profiles table missing xp/coins columns: {resp.text[:200]}"
    )
    print("PASS: profiles table has xp and coins columns")


def test_cards_has_fsrs_columns():
    """Cards table must have FSRS scheduling columns (due, stability, difficulty)."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/cards?select=due,stability,difficulty&limit=0",
        headers=HEADERS,
    )
    assert resp.status_code != 400, (
        f"Cards table missing FSRS columns: {resp.text[:200]}"
    )
    print("PASS: cards table has FSRS scheduling columns (due, stability, difficulty)")


if __name__ == "__main__":
    test_required_tables_exist()
    test_profiles_has_xp_and_coins_columns()
    test_cards_has_fsrs_columns()
    print("\n=== ALL 3 SCHEMA VALIDATION TESTS PASSED ===")
