-- ============================================================
-- Pixel Study OS – Research source metadata (additive)
-- ============================================================
-- Adds `doi` and `oa_url` columns to the `papers` table to support:
--   • DOI-based deduplication and Unpaywall OA lookups (Req 5.6).
--   • One-click "Ingest open-access PDF" from a research result.
--
-- Both columns are NULLABLE so existing records are unaffected.
-- All existing RLS policies cover these columns automatically.
--
-- Run after 012_hybrid_search.sql.
-- ============================================================

ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS doi     TEXT,
  ADD COLUMN IF NOT EXISTS oa_url  TEXT;

-- Unique partial index: one row per DOI per user (skip NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_user_doi
  ON papers (user_id, doi)
  WHERE doi IS NOT NULL;
