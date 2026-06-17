-- ============================================================
-- Pixel Study OS – University-Aware Onboarding & Personalization
-- Adds the University Registry (admin-maintained reference data),
-- the user-owned academic profile, and the structured academic
-- data tables (sources, events, curriculum courses).
--
-- Security model:
--   * Registry tables (universities/faculties/programs) are
--     authenticated-READ only. Writes happen via the service role
--     (which bypasses RLS); there are intentionally NO user write
--     policies.  (Requirement 2.1, 17.3)
--   * Every user-owned table enables RLS with
--     `user_id = auth.uid()` (Requirement 17.1), matching the
--     pattern established in 001_initial_schema.sql.
--   * Dates are NULLABLE: a missing official date is stored as NULL
--     with status='unreleased' rather than guessed. (Requirement 7.5)
-- ============================================================

-- ============================================================
-- 1. UNIVERSITY REGISTRY (authenticated-read, admin-write)
-- ============================================================
CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  country TEXT,
  primary_domain TEXT NOT NULL,
  registrar_url TEXT,
  academic_calendar_url TEXT,
  timezone TEXT DEFAULT 'Europe/Istanbul',
  locale TEXT DEFAULT 'tr-TR',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  url TEXT
);

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  degree_level TEXT,
  curriculum_url TEXT,
  course_catalog_url TEXT,
  language TEXT
);

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties   ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs    ENABLE ROW LEVEL SECURITY;

-- Authenticated users may READ the registry. No write policies:
-- inserts/updates are performed by the service role (seed scripts).
CREATE POLICY "registry universities readable"
  ON universities FOR SELECT TO authenticated USING (true);
CREATE POLICY "registry faculties readable"
  ON faculties FOR SELECT TO authenticated USING (true);
CREATE POLICY "registry programs readable"
  ON programs FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_faculties_university ON faculties (university_id);
CREATE INDEX idx_programs_university ON programs (university_id, faculty_id);

-- ============================================================
-- 2. ACADEMIC PROFILE (user-owned identity)
-- Stores BOTH the matched registry ids (when available) AND the
-- raw free-text the user typed, as a fallback. (Requirement 1.6)
-- ============================================================
CREATE TABLE academic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  university_name_raw TEXT,
  faculty_name_raw TEXT,
  program_name_raw TEXT,
  year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 8),
  term TEXT,
  term_kind TEXT DEFAULT 'semester'
    CHECK (term_kind IN ('semester','quarter','block','trimester')),
  locale TEXT DEFAULT 'tr-TR',
  timezone TEXT DEFAULT 'Europe/Istanbul',
  onboarding_status TEXT DEFAULT 'collecting'
    CHECK (onboarding_status IN ('collecting','discovering','review','complete')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. ACADEMIC SOURCES (discovered/uploaded official documents)
-- One row per candidate source. source_tier 1 (registrar) .. 4
-- (syllabus/upload). storage_path points into the reused `papers`
-- Storage bucket when the source is a downloaded PDF.
-- ============================================================
CREATE TABLE academic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_profile_id UUID NOT NULL REFERENCES academic_profiles(id) ON DELETE CASCADE,
  url TEXT,
  domain TEXT,
  source_tier INTEGER CHECK (source_tier BETWEEN 1 AND 4),
  source_type TEXT CHECK (source_type IN
    ('registrar_calendar','faculty_page','dept_curriculum','course_catalog','syllabus','announcement','other')),
  title TEXT,
  http_status INTEGER,
  content_hash TEXT,
  storage_path TEXT,
  paper_id UUID REFERENCES papers(id) ON DELETE SET NULL,
  confidence_base NUMERIC(4,3) CHECK (confidence_base IS NULL OR confidence_base BETWEEN 0 AND 1),
  source_year INTEGER,
  is_official BOOLEAN DEFAULT FALSE,
  is_stale BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. ACADEMIC EVENTS (structured, confidence-labelled dates)
-- start_date / end_date are NULLABLE: an expected-but-missing date
-- (e.g. finals not yet released) is stored as NULL with
-- status='unreleased'. NEVER invent a date. (Requirements 7.5, 9.3)
-- ============================================================
CREATE TABLE academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_profile_id UUID NOT NULL REFERENCES academic_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN
    ('semester_start','semester_end','registration','add_drop','withdrawal_deadline',
     'midterm_period','final_period','makeup_period','holiday','break','other')),
  title TEXT,
  start_date DATE,                    -- NULL allowed (unreleased)
  end_date DATE,                      -- NULL allowed (unreleased)
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL CHECK (status IN ('verified','inferred','unreleased')),
  is_confirmed BOOLEAN DEFAULT FALSE, -- set true when the user confirms on the Review screen
  source_id UUID REFERENCES academic_sources(id) ON DELETE SET NULL,
  source_excerpt TEXT,
  -- A conflicting alternative value retained for display (Requirement 10.3, 10.4)
  alt_start_date DATE,
  alt_end_date DATE,
  alt_source_id UUID REFERENCES academic_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- end_date, when present, must not precede start_date
  CONSTRAINT academic_events_date_order
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

-- ============================================================
-- 5. CURRICULUM COURSES (structured course records)
-- ============================================================
CREATE TABLE curriculum_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_profile_id UUID NOT NULL REFERENCES academic_profiles(id) ON DELETE CASCADE,
  course_code TEXT,
  title TEXT,
  year_level INTEGER,
  term TEXT,
  credits NUMERIC(4,1),
  description TEXT,
  is_user_enrolled BOOLEAN DEFAULT FALSE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  source_id UUID REFERENCES academic_sources(id) ON DELETE SET NULL,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  status TEXT CHECK (status IN ('verified','inferred','unreleased')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. TAG ACADEMIC DOCS ONTO THE EXISTING `papers` TABLE
-- Academic documents are ingested through the SAME pipeline as
-- research papers; they are simply tagged with their kind and the
-- owning academic profile. (Requirement 6.2, 6.3)
-- ============================================================
ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS academic_kind TEXT
    CHECK (academic_kind IS NULL OR academic_kind IN
      ('academic_calendar','curriculum','course_catalog','syllabus','handbook','announcement')),
  ADD COLUMN IF NOT EXISTS academic_profile_id UUID
    REFERENCES academic_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_papers_academic_profile
  ON papers (academic_profile_id)
  WHERE academic_profile_id IS NOT NULL;

-- ============================================================
-- 7. ROW-LEVEL SECURITY for all user-owned tables
-- FOR ALL USING (user_id = auth.uid()) — Postgres applies this as
-- the WITH CHECK expression for INSERT/UPDATE when WITH CHECK is
-- omitted, so it covers SELECT/INSERT/UPDATE/DELETE. (Requirement 17.1)
-- ============================================================
ALTER TABLE academic_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own academic profile"
  ON academic_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own academic sources"
  ON academic_sources FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own academic events"
  ON academic_events FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own curriculum courses"
  ON curriculum_courses FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 8. Helpful indexes for per-user / per-profile lookups
-- ============================================================
CREATE INDEX idx_academic_sources_profile
  ON academic_sources (user_id, academic_profile_id);
CREATE INDEX idx_academic_events_profile
  ON academic_events (user_id, academic_profile_id, start_date);
CREATE INDEX idx_academic_events_confirmed
  ON academic_events (user_id, academic_profile_id, is_confirmed, start_date);
CREATE INDEX idx_curriculum_courses_profile
  ON curriculum_courses (user_id, academic_profile_id);

-- ============================================================
-- 9. updated_at maintenance for academic_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_academic_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_academic_profiles_updated_at
  BEFORE UPDATE ON academic_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_academic_profile_updated_at();
