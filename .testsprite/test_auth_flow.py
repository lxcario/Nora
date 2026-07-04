"""
Backend test: Verifies Supabase Auth endpoints respond correctly.
Tests that the auth system is alive and rejects invalid credentials.
"""
import os
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hwoaljqtjlagxacvopnc.supabase.co")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

HEADERS = {
    "apikey": ANON_KEY,
    "Content-Type": "application/json",
}


def test_auth_endpoint_alive():
    """Supabase Auth /auth/v1/settings must respond (proves GoTrue is running)."""
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/settings",
        headers={"apikey": ANON_KEY},
    )
    assert resp.status_code == 200, (
        f"Auth settings endpoint not responding: {resp.status_code}"
    )
    data = resp.json()
    assert "external" in data, "Auth settings response missing 'external' key"
    print("PASS: Supabase Auth (GoTrue) is alive and responding")


def test_invalid_login_rejected():
    """Auth must reject login with invalid credentials (not crash or return 500)."""
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers=HEADERS,
        json={
            "email": "nonexistent-user-hackathon-test@invalid.example",
            "password": "wrong_password_123",
        },
    )
    # Should be 400 (invalid credentials) — NOT 500 (server error)
    assert resp.status_code == 400, (
        f"Expected 400 for invalid login, got {resp.status_code}. "
        f"Auth may be misconfigured or crashing."
    )
    print("PASS: Invalid login correctly rejected with 400")


def test_signup_with_weak_password_rejected():
    """Auth must reject signup with password shorter than minimum."""
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers=HEADERS,
        json={
            "email": "test-weak-pw@invalid.example",
            "password": "123",  # Too short
        },
    )
    # Should be 422 or 400 (validation error) — NOT 200 (account created)
    assert resp.status_code in (400, 422), (
        f"Expected 400/422 for weak password, got {resp.status_code}. "
        f"Password policy may not be enforced."
    )
    print(f"PASS: Weak password rejected with {resp.status_code}")


if __name__ == "__main__":
    test_auth_endpoint_alive()
    test_invalid_login_rejected()
    test_signup_with_weak_password_rejected()
    print("\n=== ALL 3 AUTH FLOW TESTS PASSED ===")
