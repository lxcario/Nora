-- ============================================================
-- Pixel Study OS – Feynman source attachment (additive)
-- ============================================================
-- Adds `feynman_source_ref` to the `topics` table so each topic can
-- remember which source (indexed paper, video transcript, or pasted notes)
-- the student wants to use as ground-truth when explaining that topic.
--
-- The column is NULLABLE: NULL means "no source attached" (unverified mode).
-- Task 12 reads this ref and passes it to evaluateExplanation().
-- RLS is unchanged — the existing "Users can manage own topics" policy
-- already covers new columns.
--
-- JSONB shape (mirrors src/app/(protected)/app/_actions/feynman.ts):
--   { type: "paper", paperId: "…", paperTitle: "…" }
--   { type: "notes", notes: "…" }
--   { type: "video", videoId: "…", videoTitle: "…" }
--
-- Run after 013_research_sources.sql.
-- ============================================================

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS feynman_source_ref JSONB;
