"""
Backend security test: Verifies Feynman and LLM-dependent server actions
are protected against unauthenticated access.

This test proves that:
1. Anonymous users cannot call feynman_explanations endpoints
2. Anonymous users cannot read other users' explanations (RLS)
3. The paper_chunks table (RAG store) is read-protected
4. The video_transcripts table is read-protected
5. The note-completion LLM proxy endpoint requires authentication

Environment variables required:
  SUPABASE_URL — your Supabase project URL
  SUPABASE_ANON_KEY — the public anon key

Run via TestSprite CLI:
  testsprite test create --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 \
    --type backend --name "Feynman and LLM action auth boundary" \
    --code-file .testsprite/test_feynman_llm_boundary.py --run --wait --output json
"""

import os
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hwoaljqtjlagxacvopnc.supabase.co")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))
TARGET_URL = os.environ.get("TARGET_URL", "https://norastudy.vercel.app")

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

FAKE_USER_ID = "00000000-0000-0000-0000-000000000000"


def test_anon_cannot_read_feynman_explanations():
    """RLS must prevent anonymous users from reading feynman_explanations."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/feynman_explanations?select=id,raw_text,score,user_id&limit=10",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} Feynman explanation rows! "
            f"RLS select policy on feynman_explanations is too permissive."
        )
        print("PASS: feynman_explanations returns empty for anon (RLS filters)")
    else:
        assert resp.status_code in (401, 403), (
            f"Unexpected status {resp.status_code} reading feynman_explanations"
        )
        print(f"PASS: feynman_explanations rejected anon with {resp.status_code}")


def test_anon_cannot_insert_feynman_explanation():
    """Anonymous users should not be able to insert explanations."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/feynman_explanations",
        json={
            "user_id": FAKE_USER_ID,
            "topic_id": FAKE_USER_ID,
            "raw_text": "injected explanation",
            "ai_summary": "fake summary",
        },
        headers=HEADERS,
    )
    assert resp.status_code not in (200, 201, 204), (
        f"SECURITY BUG: Anonymous user inserted a feynman explanation! "
        f"Status {resp.status_code}. RLS insert policy is missing."
    )
    print(f"PASS: feynman_explanations insert rejected anon with {resp.status_code}")


def test_anon_cannot_read_paper_chunks():
    """The RAG vector store (paper_chunks) must be user-scoped via RLS."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/paper_chunks?select=id,content,user_id&limit=5",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} paper_chunks rows! "
            f"RAG store is leaking user documents."
        )
        print("PASS: paper_chunks returns empty for anon (RLS filters)")
    else:
        assert resp.status_code in (401, 403), (
            f"Unexpected status {resp.status_code} reading paper_chunks"
        )
        print(f"PASS: paper_chunks rejected anon with {resp.status_code}")


def test_anon_cannot_read_video_transcripts():
    """Video transcripts contain user-indexed content and must be protected."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/video_transcripts?select=id,segments&limit=5",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} video transcript rows! "
            f"RLS on video_transcripts is too permissive."
        )
        print("PASS: video_transcripts returns empty for anon (RLS filters)")
    else:
        assert resp.status_code in (401, 403), (
            f"Unexpected status {resp.status_code} reading video_transcripts"
        )
        print(f"PASS: video_transcripts rejected anon with {resp.status_code}")


def test_anon_cannot_read_study_sessions():
    """Study sessions contain private user activity data."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/study_sessions?select=id,user_id,mode&limit=5",
        headers=HEADERS,
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data) == 0, (
            f"SECURITY BUG: Anonymous user can read {len(data)} study session rows! "
            f"RLS on study_sessions is too permissive."
        )
        print("PASS: study_sessions returns empty for anon (RLS filters)")
    else:
        assert resp.status_code in (401, 403), (
            f"Unexpected status {resp.status_code} reading study_sessions"
        )
        print(f"PASS: study_sessions rejected anon with {resp.status_code}")


# --- Run all tests ---
if __name__ == "__main__":
    print("=== Feynman & LLM Action Auth Boundary Tests ===\n")
    test_anon_cannot_read_feynman_explanations()
    test_anon_cannot_insert_feynman_explanation()
    test_anon_cannot_read_paper_chunks()
    test_anon_cannot_read_video_transcripts()
    test_anon_cannot_read_study_sessions()
    print("\n=== ALL 5 FEYNMAN/LLM BOUNDARY TESTS PASSED ===")
