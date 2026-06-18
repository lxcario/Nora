-- ============================================================
-- Pixel Study OS – Planner missed-session records (additive)
-- ============================================================
-- Stores a record each time the user marks a planned session as missed.
-- The planner reads this table on each `getWeeklyPlan` call to:
--   (a) suppress the original date so it no longer appears as a suggestion,
--   (b) surface `reschedule_date` as the new planned slot.
--
-- This lets the planner forward-fill intelligently without compressing
-- all rescheduled sessions onto the same next day. (spec Req 7.4)
--
-- Run after 014_feynman_source_attachment.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS planner_skips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id      UUID REFERENCES topics(id) ON DELETE SET NULL,
  original_date DATE NOT NULL,
  reschedule_date DATE,         -- computed forward-fill date; NULL if no free slot found
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE planner_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own planner skips"
  ON planner_skips FOR ALL USING (user_id = auth.uid());

-- Speed up the `getWeeklyPlan` lookup (recent skips for this user).
CREATE INDEX IF NOT EXISTS idx_planner_skips_user_date
  ON planner_skips (user_id, original_date DESC);
