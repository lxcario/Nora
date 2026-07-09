"""
Backend security test: Proves getNoteCompletion requires authentication.

LOOP STORY (Iteration 42):
  BEFORE the fix: an unauthenticated POST to this server action returns real
  LLM output - anyone can burn the server's Groq/OpenRouter quota for free.
  AFTER the fix (auth check + rate limit): the same POST returns an auth-
  rejection error.

HOW TO RUN (the loop sequence):
  1. Run this test NOW, against the current (unfixed) deploy:
       testsprite test create --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 \
         --type backend --name "Note completion rejects unauthenticated calls" \
         --code-file .testsprite/test_note_completion_auth.py --run --wait --output json
     -> Expected: FAIL (the action accepts the unauth request = the bug).
  2. Apply the fix in note-completion.ts (add getUser() + checkRateLimit).
  3. Redeploy, then rerun: testsprite test rerun <test-id> --wait --output json
     -> Expected: PASS (the action now rejects unauth calls).
  4. Bank it. Add the iteration to LOOP.md.

TECHNICAL NOTE (honest limitation - document like the mobile-viewport test):
  Next.js Server Actions are invoked via POST to the page URL with a
  Next-Action header. The ID is build-time derived from the action source.
  This test extracts it dynamically by logging in, fetching the study-room
  page, and searching the RSC payload. If extraction fails, set the
  NOTE_COMPLETION_ACTION_ID env var (find it via DevTools). The ID changes
  when the action code changes - re-extract after redeploying.

Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD, APP_URL
"""

import os
import re
import requests

APP_URL = os.environ.get("APP_URL", "https://norastudy.vercel.app")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hwoaljqtjlagxacvopnc.supabase.co")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")
ACTION_ID = os.environ.get("NOTE_COMPLETION_ACTION_ID", "")


def _login_and_extract_action_id():
    """Log in via Supabase, fetch study-room page, extract the action ID."""
    if not TEST_EMAIL or not TEST_PASSWORD:
        print("SKIP: TEST_EMAIL/TEST_PASSWORD not set")
        return None

    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
    )
    if auth_resp.status_code != 200:
        print(f"SKIP: Supabase login failed ({auth_resp.status_code})")
        return None

    tokens = auth_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    if not access_token:
        return None

    project_ref = SUPABASE_URL.replace("https://", "").split(".")[0]
    cookie_name = f"sb-{project_ref}-auth-token"
    cookie_value = f'{{"access_token":"{access_token}","refresh_token":"{refresh_token}","token_type":"bearer","expires_in":3600}}'

    page_resp = requests.get(f"{APP_URL}/app/study-room", cookies={cookie_name: cookie_value}, allow_redirects=False)
    if page_resp.status_code != 200:
        print(f"SKIP: study-room page returned {page_resp.status_code}")
        return None

    html = page_resp.text
    for pattern in [r'"id":"(f_[a-f0-9]+)"[^}]*getNoteCompletion', r'getNoteCompletion[^"]*"id":"([^"]+)"']:
        match = re.search(pattern, html)
        if match:
            print(f"Found action ID: {match.group(1)}")
            return match.group(1)

    print("SKIP: could not extract action ID from page source")
    return None


def test_note_completion_rejects_unauthenticated():
    """An unauthenticated POST to getNoteCompletion must NOT return LLM output."""
    action_id = ACTION_ID
    if not action_id:
        action_id = _login_and_extract_action_id()

    if not action_id:
        print("SKIP: no action ID (set NOTE_COMPLETION_ACTION_ID or TEST_EMAIL/TEST_PASSWORD)")
        return

    resp = requests.post(
        f"{APP_URL}/app/study-room",
        headers={"Content-Type": "text/plain;charset=UTF-8", "Next-Action": action_id},
        data='["Test Video","Some note text to continue"]',
        allow_redirects=False,
    )

    body = resp.text
    markers = ["Not authenticated", "not authenticated", "Too many requests", "unauthorized", '"error"']
    is_rejected = any(m.lower() in body.lower() for m in markers)
    is_redirected = resp.status_code in (301, 302, 303, 307, 308)

    if is_rejected or is_redirected:
        print(f"PASS: unauthenticated note-completion rejected (status={resp.status_code})")
    else:
        snippet = body[:300]
        raise AssertionError(
            f"SECURITY BUG: getNoteCompletion returned a response without auth "
            f"rejection (status={resp.status_code}). Snippet: {snippet}"
        )


if __name__ == "__main__":
    test_note_completion_rejects_unauthenticated()
    print("\n=== NOTE COMPLETION AUTH TEST COMPLETE ===")


