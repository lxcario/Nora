-- ============================================================
-- Pixel Study OS – Feynman comprehension scoring
-- ============================================================
-- Adds a numeric comprehension score (0–100) to each Feynman
-- explanation so progress per topic can be queried/charted in SQL.
--
-- The score is also embedded in `gaps_json`, so the app works with or
-- without this column applied; this column simply makes the value
-- first-class for analytics and indexing.
--
-- Run in the Supabase SQL Editor after 001_initial_schema.sql.
-- ============================================================

ALTER TABLE feynman_explanations
  ADD COLUMN IF NOT EXISTS score INTEGER
    CHECK (score IS NULL OR (score >= 0 AND score <= 100));

-- Index for fetching a topic's recent scores in chronological order.
CREATE INDEX IF NOT EXISTS idx_feynman_topic_created
  ON feynman_explanations (topic_id, created_at);

-- Backfill existing rows from the score embedded in gaps_json (best-effort;
-- rows created before scoring simply stay NULL).
UPDATE feynman_explanations
SET score = ((gaps_json -> 'score' ->> 'score'))::int
WHERE score IS NULL
  AND gaps_json -> 'score' ->> 'score' ~ '^[0-9]+$';
