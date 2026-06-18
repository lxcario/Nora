-- ============================================================
-- SQL test — match_paper_chunks_hybrid fusion ordering
-- ============================================================
-- Verifies RRF fusion ordering on KNOWN rows (spec Req 6.5).
--
-- Compatible with the Supabase SQL Editor (no psql meta-commands).
-- The whole thing runs inside a single transaction and ROLLBACKs at the
-- end, so NO test data persists.
--
-- It uses a REAL user id from auth.users (the FK papers.user_id ->
-- auth.users is enforced at INSERT time and is NOT deferrable), so you
-- must have at least one signed-up account before running this test.
-- Run as the table owner / service role.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_user  UUID;
  v_paper UUID := gen_random_uuid();
  v_c1    UUID := gen_random_uuid();
  v_c2    UUID := gen_random_uuid();
  v_c3    UUID := gen_random_uuid();
  rows    UUID[];
  n       INT;
  prev    DOUBLE PRECISION := 1e9;
  r       RECORD;
BEGIN
  -- Use an existing account so the papers.user_id FK is satisfied.
  SELECT id INTO v_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No users found — sign up at least one account before running this test.';
  END IF;

  -- ── Seed ────────────────────────────────────────────────────────────────
  INSERT INTO papers (id, user_id, title, parse_status, chunk_count)
  VALUES (v_paper, v_user, 'Hybrid Test Paper', 'ready', 3);

  -- content_tsv is GENERATED from content automatically.
  --   c1: strong lexical match for "vector database indexing"
  --   c2: partial lexical match ("database")
  --   c3: no lexical match (about cats)
  INSERT INTO paper_chunks (id, user_id, paper_id, chunk_index, content, section_heading)
  VALUES
    (v_c1, v_user, v_paper, 0,
     'Vector database indexing enables fast similarity search over embeddings.',
     'Indexing'),
    (v_c2, v_user, v_paper, 1,
     'A relational database stores rows in tables.',
     'Background'),
    (v_c3, v_user, v_paper, 2,
     'The cat sat quietly on the warm windowsill.',
     'Unrelated');

  -- ── Test 1: lexical-only (NULL embedding) returns RANKED results ──────────
  -- plainto_tsquery ANDs all terms: 'vector' & 'databas' & 'index'.
  -- Only c1 contains all three → c1 is the sole match. c2 (only "database")
  -- and c3 (no match) are correctly excluded.
  SELECT array_agg(id ORDER BY rrf_score DESC)
  INTO rows
  FROM match_paper_chunks_hybrid(
    query_text      => 'vector database indexing',
    query_embedding => NULL,
    match_user_id   => v_user,
    match_count     => 8
  );

  ASSERT rows[1] = v_c1, format('Test 1: expected c1 first, got %s', rows[1]);
  ASSERT NOT (v_c2 = ANY(rows)), 'Test 1: c2 excluded (lacks "vector"/"indexing")';
  ASSERT NOT (v_c3 = ANY(rows)), 'Test 1: c3 must be excluded (no lexical match)';
  RAISE NOTICE 'Test 1 (multi-term AND match) PASSED.';

  -- ── Test 2: single shared term matches multiple chunks, scoped by paper ───
  -- Query "database" matches both c1 and c2 (both contain it); c3 excluded.
  SELECT count(*) INTO n
  FROM match_paper_chunks_hybrid(
    query_text      => 'database',
    query_embedding => NULL,
    match_user_id   => v_user,
    match_paper_id  => v_paper
  );
  ASSERT n = 2, format('Test 2: expected 2 chunks matching "database", got %s', n);
  RAISE NOTICE 'Test 2 (shared-term match + paper scope) PASSED.';

  -- ── Test 3: rrf_score non-increasing; lexical_rank non-NULL ───────────────
  FOR r IN
    SELECT lexical_rank, rrf_score
    FROM match_paper_chunks_hybrid(
      query_text      => 'database',
      query_embedding => NULL,
      match_user_id   => v_user
    )
  LOOP
    ASSERT r.rrf_score <= prev,
      format('Test 3: rrf_score not non-increasing: %s > %s', r.rrf_score, prev);
    ASSERT r.lexical_rank IS NOT NULL,
      'Test 3: lexical_rank should be set in lexical-only mode';
    prev := r.rrf_score;
  END LOOP;
  RAISE NOTICE 'Test 3 (ordering + ranks) PASSED.';

  -- ── Test 4: empty query returns nothing ───────────────────────────────────
  SELECT count(*) INTO n
  FROM match_paper_chunks_hybrid(
    query_text      => '',
    query_embedding => NULL,
    match_user_id   => v_user
  );
  ASSERT n = 0, format('Test 4: empty query should return 0 rows, got %s', n);
  RAISE NOTICE 'Test 4 (empty query returns 0 rows) PASSED.';

  RAISE NOTICE 'All hybrid-search fusion tests PASSED.';
END;
$$;

-- ── Rollback — no data persisted ─────────────────────────────────────────────
ROLLBACK;
