-- ============================================================
-- Pixel Study OS – Drop SM-2 columns from cards (cleanup)
-- ============================================================
-- After backfill migration 010 has been verified stable, this migration
-- removes the SM-2 scheduling columns from the `cards` table:
--   interval, repetition, efactor, next_review_at
--
-- Pre-drop safety:
--   1. Any cards that somehow still have `due IS NULL` are initialised to
--      now() so no card becomes invisible to the FSRS scheduler.
--   2. The `due` column is made NOT NULL with a default of now() so new
--      cards always receive a due date on insert.
--
-- The `card_reviews.grade` column and its 0–5 history are PRESERVED as
-- read-only analytics — this migration does not touch card_reviews.
--
-- Run ONLY after verifying that all production cards have non-NULL `due`
-- values and that the app is fully on the FSRS review path.
-- ============================================================

-- 1. Safety backfill: initialise `due` for any remaining un-backfilled cards.
UPDATE cards
SET
  due            = now(),
  stability      = 1.0,
  difficulty     = 5.0,
  reps           = 0,
  lapses         = 0,
  state          = 0,
  scheduled_days = 0,
  learning_steps = 0,
  elapsed_days   = 0
WHERE due IS NULL;

-- 2. Make `due` non-nullable (all rows now have a value).
ALTER TABLE cards
  ALTER COLUMN due SET NOT NULL,
  ALTER COLUMN due SET DEFAULT now();

-- 3. Drop the SM-2 scheduling columns (irreversible — run after backfill verification).
ALTER TABLE cards
  DROP COLUMN IF EXISTS interval,
  DROP COLUMN IF EXISTS repetition,
  DROP COLUMN IF EXISTS efactor,
  DROP COLUMN IF EXISTS next_review_at;

-- 4. Update the primary due-date index (the existing idx_cards_next_review
--    references next_review_at which no longer exists; replace it).
DROP INDEX IF EXISTS idx_cards_next_review;

-- idx_cards_due already exists (from 010_fsrs_scheduling.sql); remove the
-- partial-index WHERE clause so it covers all cards now that due is NOT NULL.
DROP INDEX IF EXISTS idx_cards_due;
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards (user_id, due);
