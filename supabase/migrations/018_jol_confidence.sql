-- Migration 018: Add Judgment of Learning (JOL) confidence to card_reviews
-- Supports pre-reveal confidence rating (1-5 scale) per SPEC-JOL-CONFIDENCE.md
-- Additive only — no existing columns touched.

ALTER TABLE card_reviews
  ADD COLUMN IF NOT EXISTS jol_confidence SMALLINT
    CHECK (jol_confidence IS NULL OR (jol_confidence >= 1 AND jol_confidence <= 5));

COMMENT ON COLUMN card_reviews.jol_confidence IS
  'Pre-reveal Judgment of Learning confidence (1=cannot recall, 5=certain). NULL for reviews before this feature.';
