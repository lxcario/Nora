-- ============================================================
-- Pixel Study OS – FSRS scheduling state (additive)
-- ============================================================
-- Adds per-card FSRS (Free Spaced Repetition Scheduler) memory state
-- alongside the existing SM-2 columns. This migration is ADDITIVE only:
--   - No existing column is dropped or altered.
--   - SM-2 columns (interval, repetition, efactor, next_review_at) are
--     retained for the transition + backfill and are only removed later
--     (migration after backfill is verified stable — spec Task 19).
--   - RLS is unchanged; the existing "Users can manage own cards" policy
--     already covers the new columns.
--
-- Column semantics (mirror src/lib/fsrs.ts#FSRSCardState):
--   stability       — interval (days) at which retrievability decays to the
--                     target retention. NULL until the card has FSRS state.
--   difficulty      — FSRS difficulty, 1 (easy) … 10 (hard).
--   due             — absolute UTC instant the card next becomes due.
--   last_review     — absolute UTC instant of the most recent review.
--   reps            — total review count.
--   lapses          — total lapse (Again) count.
--   state           — 0 New, 1 Learning, 2 Review, 3 Relearning.
--   scheduled_days  — interval (days) the card was last scheduled for.
--   learning_steps  — index into the (re)learning steps queue (short-term).
--   elapsed_days    — days between the last two reviews (informational;
--                     retained for spec Requirement 1.2 / analytics).
--
-- Run in the Supabase SQL Editor after 009_academic_sweeper.sql.
-- ============================================================

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS stability      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS difficulty     DOUBLE PRECISION
    CHECK (difficulty IS NULL OR (difficulty >= 0 AND difficulty <= 10)),
  ADD COLUMN IF NOT EXISTS due            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_review    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reps           INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses         INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS state          SMALLINT NOT NULL DEFAULT 0
    CHECK (state IN (0, 1, 2, 3)),
  ADD COLUMN IF NOT EXISTS scheduled_days INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS learning_steps SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elapsed_days   INTEGER  NOT NULL DEFAULT 0;

-- Due-date queue index (timezone-safe "due today" comparisons read `due`).
-- Partial index keeps it small while cards are still being backfilled.
CREATE INDEX IF NOT EXISTS idx_cards_due
  ON cards (user_id, due)
  WHERE due IS NOT NULL;

-- NOTE: The actual backfill (seeding stability/difficulty/due from each
-- card's SM-2 fields + card_reviews history) is performed by the application
-- backfill routine using src/lib/fsrs.ts#initFromSM2, which preserves each
-- card's existing schedule and avoids forcing every card due on the same day.
-- It is intentionally NOT a blanket SQL UPDATE here, so that the FSRS memory
-- model (difficulty/stability) is computed by the canonical TypeScript path.
