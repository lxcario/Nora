-- ============================================================
-- Pixel Study OS – Initial Schema (Phase 2)
-- All user-owned tables have RLS: user_id = auth.uid()
-- ============================================================

-- Enable pgvector extension for future RAG/embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  adhd_mode BOOLEAN DEFAULT FALSE,
  focus_audio TEXT,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. SUBJECTS
-- ============================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subjects"
  ON subjects FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 3. TOPICS
-- ============================================================
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own topics"
  ON topics FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 4. STUDY SESSIONS
-- ============================================================
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('feynman', 'review', 'research', 'planner')),
  duration_minutes INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON study_sessions FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 5. FEYNMAN EXPLANATIONS
-- ============================================================
CREATE TABLE feynman_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  ai_summary TEXT,
  gaps_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feynman_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own explanations"
  ON feynman_explanations FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 6. CARDS (SM-2 flashcards)
-- ============================================================
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('feynman', 'research', 'manual')),
  -- SM-2 state
  interval INTEGER DEFAULT 0,
  repetition INTEGER DEFAULT 0,
  efactor NUMERIC(4,2) DEFAULT 2.50,
  next_review_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cards"
  ON cards FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 7. CARD REVIEWS
-- ============================================================
CREATE TABLE card_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade >= 0 AND grade <= 5),
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reviews"
  ON card_reviews FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 8. AVATARS
-- ============================================================
CREATE TABLE avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT DEFAULT 'base_male',
  head TEXT DEFAULT 'default',
  hair TEXT DEFAULT 'short_brown',
  outfit TEXT DEFAULT 'casual',
  accessory TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own avatar"
  ON avatars FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 9. PETS
-- ============================================================
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_type TEXT NOT NULL DEFAULT 'cat',
  name TEXT DEFAULT 'Buddy',
  state TEXT DEFAULT 'happy' CHECK (state IN ('happy', 'neutral', 'sad', 'forest_rescue')),
  affinity INTEGER DEFAULT 50 CHECK (affinity >= 0 AND affinity <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet"
  ON pets FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 10. PAPERS (academic paper metadata)
-- ============================================================
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  authors TEXT[],
  year INTEGER,
  citation_count INTEGER,
  abstract TEXT,
  url TEXT,
  semantic_scholar_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own papers"
  ON papers FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 11. PAPER CHUNKS (for RAG - vector embeddings)
-- ============================================================
CREATE TABLE paper_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimension
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE paper_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chunks"
  ON paper_chunks FOR ALL USING (user_id = auth.uid());

-- Index for vector similarity search
CREATE INDEX paper_chunks_embedding_idx
  ON paper_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- Helpful indexes
-- ============================================================
CREATE INDEX idx_cards_next_review ON cards (user_id, next_review_at);
CREATE INDEX idx_study_sessions_user ON study_sessions (user_id, started_at DESC);
CREATE INDEX idx_topics_subject ON topics (subject_id);
CREATE INDEX idx_card_reviews_card ON card_reviews (card_id, reviewed_at DESC);
