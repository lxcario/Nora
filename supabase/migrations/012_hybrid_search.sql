-- ============================================================
-- Pixel Study OS – Hybrid Paper RAG retrieval (additive)
-- ============================================================
-- Adds `match_paper_chunks_hybrid`: a single retrieval function that fuses
--   • lexical ranking  — Postgres FTS `ts_rank_cd(content_tsv, query)`
--   • vector ranking   — pgvector cosine distance (`embedding <=> query`)
-- using Reciprocal Rank Fusion (RRF). (spec Req 6.1, 6.5)
--
-- Guaranteed path: native Postgres FTS (the `content_tsv` GENERATED column +
-- GIN index already exist from 003_rag_extensions.sql). BM25 (pg_textsearch /
-- ParadeDB) is treated as an OPTIONAL enhancement and is only referenced
-- behind an extension-availability check — it is never required. (Req 6.3, 8.3)
--
-- Embedding dimension is vector(1536) to match the configured embedding model
-- (text-embedding-3-small; OPENAI_EMBEDDING_MODEL). (Req 6.3)
--
-- This migration is ADDITIVE: it creates a new function and (idempotently)
-- ensures the FTS index exists. No existing object is dropped or altered.
-- RLS still applies — the function is SECURITY INVOKER (default), so the
-- caller's RLS policies on paper_chunks/papers are enforced, and every query
-- is additionally scoped by `match_user_id`.
--
-- Run in the Supabase SQL Editor after 010_fsrs_scheduling.sql.
-- (011_material_type.sql is introduced later in Task 13; applying 012 first is
-- safe because both are additive and independent.)
-- ============================================================

-- 1. Ensure the lexical GIN index exists (idempotent; created in 003).
CREATE INDEX IF NOT EXISTS idx_paper_chunks_tsv
  ON paper_chunks USING GIN (content_tsv);

-- 2. Optional BM25 notice (never required). If a BM25 extension is installed
--    (e.g. pg_search / ParadeDB), a future migration may add a BM25 ranking
--    branch; by default we use the always-available ts_rank_cd path.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname IN ('pg_search', 'pg_bm25')) THEN
    RAISE NOTICE 'BM25 extension detected — ts_rank_cd remains the default; BM25 is optional.';
  END IF;
END;
$$;

-- 3. Hybrid retrieval function.
--
--    Parameters:
--      query_text       — raw user query for lexical search (plainto_tsquery).
--                         When NULL/empty, the lexical leg contributes nothing.
--      query_embedding  — query vector for cosine search. When NULL, the
--                         vector leg contributes nothing → ranked lexical-only
--                         retrieval (spec Req 6.2 — never an unranked scan).
--      match_user_id    — RLS-scoping user id (required).
--      match_paper_id   — optional paper scope.
--      match_topic_id   — optional topic scope (via papers.topic_id).
--      match_count      — number of fused rows to return.
--      rrf_k            — RRF damping constant (standard default 60).
--      candidate_pool   — max candidates pulled from each leg before fusion.
--
--    RRF score for a chunk = Σ_legs 1 / (rrf_k + rank_in_leg).
--    Higher is better; legs where the chunk is absent contribute 0.
CREATE OR REPLACE FUNCTION match_paper_chunks_hybrid(
  query_text       TEXT,
  query_embedding  vector(1536) DEFAULT NULL,
  match_user_id    UUID DEFAULT NULL,
  match_paper_id   UUID DEFAULT NULL,
  match_topic_id   UUID DEFAULT NULL,
  match_count      INT DEFAULT 8,
  rrf_k            INT DEFAULT 60,
  candidate_pool   INT DEFAULT 50
)
RETURNS TABLE (
  id              UUID,
  paper_id        UUID,
  chunk_index     INT,
  content         TEXT,
  section_heading TEXT,
  lexical_rank    INT,
  vector_rank     INT,
  rrf_score       DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH scoped AS (
    -- All chunks visible to this user within the requested scope.
    SELECT
      pc.id,
      pc.paper_id,
      pc.chunk_index,
      pc.content,
      pc.section_heading,
      pc.content_tsv,
      pc.embedding
    FROM paper_chunks pc
    JOIN papers p ON p.id = pc.paper_id
    WHERE pc.user_id = match_user_id
      AND (match_paper_id IS NULL OR pc.paper_id = match_paper_id)
      AND (match_topic_id IS NULL OR p.topic_id = match_topic_id)
  ),
  lexical AS (
    -- Lexical leg: rank by ts_rank_cd, best first. Only matching chunks.
    SELECT
      s.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(s.content_tsv, plainto_tsquery('english', query_text)) DESC,
                 s.chunk_index ASC
      ) AS rank
    FROM scoped s
    WHERE query_text IS NOT NULL
      AND length(btrim(query_text)) > 0
      AND s.content_tsv @@ plainto_tsquery('english', query_text)
    ORDER BY rank
    LIMIT candidate_pool
  ),
  vec AS (
    -- Vector leg: rank by cosine distance, nearest first. Only embedded chunks.
    SELECT
      s.id,
      ROW_NUMBER() OVER (
        ORDER BY (s.embedding <=> query_embedding) ASC
      ) AS rank
    FROM scoped s
    WHERE query_embedding IS NOT NULL
      AND s.embedding IS NOT NULL
    ORDER BY rank
    LIMIT candidate_pool
  ),
  fused AS (
    -- Reciprocal Rank Fusion across the two legs.
    SELECT
      COALESCE(l.id, v.id) AS id,
      l.rank               AS lexical_rank,
      v.rank               AS vector_rank,
      (COALESCE(1.0::double precision / (rrf_k + l.rank), 0.0::double precision)
        + COALESCE(1.0::double precision / (rrf_k + v.rank), 0.0::double precision)
      )::double precision AS rrf_score
    FROM lexical l
    FULL OUTER JOIN vec v ON l.id = v.id
  )
  SELECT
    s.id,
    s.paper_id,
    s.chunk_index,
    s.content,
    s.section_heading,
    f.lexical_rank::INT,
    f.vector_rank::INT,
    f.rrf_score
  FROM fused f
  JOIN scoped s ON s.id = f.id
  ORDER BY f.rrf_score DESC, s.chunk_index ASC
  LIMIT match_count;
END;
$$;
