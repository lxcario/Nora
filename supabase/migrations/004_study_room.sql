-- ============================================================
-- Study Room Schema (Phase 14)
-- Videos, transcripts, and timestamped notes
-- ============================================================

-- Enable btree_gist for numrange + GiST indexing
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 1. VIDEOS (user-scoped video records)
-- ============================================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_id VARCHAR(11) NOT NULL,
  title TEXT NOT NULL,
  channel_title TEXT,
  duration_seconds INTEGER NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT videos_user_youtube_unique UNIQUE (user_id, youtube_id)
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own videos"
  ON videos FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 2. VIDEO_TRANSCRIPTS (cached transcript segments)
-- ============================================================
CREATE TABLE video_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  segments JSONB NOT NULL,  -- Array of {text, offset, duration}
  source TEXT NOT NULL CHECK (source IN ('youtube', 'whisper')),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT video_transcripts_video_language_unique UNIQUE (video_id, language)
);

ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS via parent videos row (JOIN-based policy)
CREATE POLICY "Users can manage transcripts for own videos"
  ON video_transcripts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      WHERE v.id = video_transcripts.video_id
      AND v.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. NOTES (timestamped video notes with numrange)
-- ============================================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  time_segment NUMRANGE NOT NULL,  -- [start_seconds, end_seconds)
  note_content TEXT NOT NULL,
  rich_content JSONB,  -- Tiptap document JSON
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
  ON notes FOR ALL USING (user_id = auth.uid());

-- GiST index for efficient range overlap/containment queries
CREATE INDEX idx_notes_time_segment ON notes USING gist (time_segment);

-- Composite index for fetching notes by video
CREATE INDEX idx_notes_video ON notes (video_id, user_id);

-- ============================================================
-- 4. CARDS TABLE UPDATE (add 'video' source_type + metadata)
-- ============================================================

-- Extend source_type CHECK constraint to include 'video'
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_source_type_check;
ALTER TABLE cards ADD CONSTRAINT cards_source_type_check
  CHECK (source_type IN ('feynman', 'research', 'manual', 'video'));

-- Add metadata column for video source info
ALTER TABLE cards ADD COLUMN IF NOT EXISTS metadata JSONB;
-- metadata schema for video cards: {"video_id": "uuid", "offset_seconds": number}

-- ============================================================
-- 5. STUDY_SESSIONS UPDATE (add 'video' mode)
-- ============================================================
ALTER TABLE study_sessions DROP CONSTRAINT IF EXISTS study_sessions_mode_check;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_mode_check
  CHECK (mode IN ('feynman', 'review', 'research', 'planner', 'video'));

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX idx_videos_user ON videos (user_id, created_at DESC);
CREATE INDEX idx_videos_youtube ON videos (youtube_id);
CREATE INDEX idx_video_transcripts_video ON video_transcripts (video_id);
