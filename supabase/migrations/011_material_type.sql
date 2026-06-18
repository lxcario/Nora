-- ============================================================
-- Pixel Study OS – Topic material-type classification (additive)
-- ============================================================
-- Adds `material_type` to `topics` so the Study Mix queue builder can
-- apply evidence-based interleaving rules per Brunmair & Richter 2019:
--   • verbal_vocabulary  → blocked (NOT interleaved)
--   • procedural_math    → interleaved within confusable same-subject topics
--   • visual_discrimination → interleaved
--   • conceptual         → interleaved (default)
-- (spec Req 4.1, 4.2, 4.3)
--
-- The column defaults to 'conceptual' so all existing topics remain
-- functional without any backfill. The CHECK constraint guards against
-- invalid values being written by application code.
--
-- RLS unchanged — the existing "Users can manage own topics" policy covers
-- new columns automatically.
--
-- NOTE: Even though this migration is numbered 011, migrations 012–014 were
-- applied earlier in the development sequence. All are additive and
-- independent; application order does not matter for this column.
-- ============================================================

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS material_type TEXT NOT NULL DEFAULT 'conceptual'
    CHECK (material_type IN (
      'conceptual',
      'procedural_math',
      'visual_discrimination',
      'verbal_vocabulary'
    ));
