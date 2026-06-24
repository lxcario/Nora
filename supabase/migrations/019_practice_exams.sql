-- ============================================================
-- Pixel Study OS – Practice Exams Migration
-- Adds the practice_exams table for Mock Exam mode.
-- Students upload PDFs/notes → AI generates exam questions → timed session → grading
-- ============================================================

CREATE TABLE practice_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Exam configuration
  mode TEXT NOT NULL CHECK (mode IN ('quick', 'full')),
  title TEXT NOT NULL DEFAULT 'Practice Exam',
  -- Source material (one or both populated)
  source_paper_ids UUID[] DEFAULT '{}',  -- references to papers table (already ingested)
  source_notes TEXT,                      -- pasted notes (raw text, up to 50k chars)
  -- Generated content
  questions_json JSONB NOT NULL DEFAULT '[]',
  -- Student answers + grading
  answers_json JSONB,
  score_percent REAL,
  topic_scores JSONB,  -- { topicName: { correct: N, total: M } }
  -- Timing
  time_limit_seconds INT,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  -- Metadata
  question_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE practice_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exams"
  ON practice_exams FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_practice_exams_user_created
  ON practice_exams (user_id, created_at DESC);

-- Constraint: source_notes length (prevent abuse)
ALTER TABLE practice_exams
  ADD CONSTRAINT practice_exams_notes_length
    CHECK (source_notes IS NULL OR length(source_notes) <= 50000);
