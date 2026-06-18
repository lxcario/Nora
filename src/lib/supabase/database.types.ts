/**
 * Nora – Supabase Database Types
 *
 * NOTE: In production, generate these from your Supabase project using:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
 *
 * These hand-written types match the schema in supabase/migrations/001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// === Study Room Types ===

/** Mirrors the `videos` table — user-scoped video records */
export interface VideoRecord {
  id: string;
  userId: string;
  youtubeId: string;
  title: string;
  channelTitle: string | null;
  durationSeconds: number;
  topicId: string | null;
  createdAt: string;
}

/** Mirrors the `video_transcripts` table — cached transcript segments */
export interface VideoTranscriptRecord {
  id: string;
  videoId: string;
  language: string;
  segments: TranscriptSegment[];
  source: "youtube" | "whisper";
  createdAt: string;
}

/** A single transcript segment with timing info */
export interface TranscriptSegment {
  text: string;
  offset: number;    // seconds from video start
  duration: number;  // segment duration in seconds
}

/** Mirrors the `notes` table — timestamped video notes */
export interface NoteRecord {
  id: string;
  userId: string;
  videoId: string;
  timeSegment: { start: number; end: number };
  noteContent: string;
  richContent: object | null;  // Tiptap JSON document
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
}

/** Metadata stored in cards.metadata JSONB for video-sourced cards */
export interface VideoCardMetadata {
  video_id: string;
  offset_seconds: number;
}

// === University-Aware Onboarding Types (007_university_onboarding.sql) ===

/**
 * Confidence status for an academic fact (event/course).
 *  - `verified`   ≥ 0.95, Tier-1 official source
 *  - `inferred`   0.60–0.95, secondary official source
 *  - `unreleased` < 0.60 or no official date found (date is NULL)
 * (Requirement 9.3)
 */
export type ConfidenceStatus = "verified" | "inferred" | "unreleased";

/** Onboarding lifecycle for an academic profile. */
export type OnboardingStatus =
  | "collecting"
  | "discovering"
  | "review"
  | "complete";

/** Term structure of an institution. */
export type TermKind = "semester" | "quarter" | "block" | "trimester";

/** Canonical academic event types (Turkish/English vocab normalizes to these). */
export type AcademicEventType =
  | "semester_start"
  | "semester_end"
  | "registration"
  | "add_drop"
  | "withdrawal_deadline"
  | "midterm_period"
  | "final_period"
  | "makeup_period"
  | "holiday"
  | "break"
  | "other";

/** Kind tag applied to an ingested academic document on the `papers` table. */
export type AcademicKind =
  | "academic_calendar"
  | "curriculum"
  | "course_catalog"
  | "syllabus"
  | "handbook"
  | "announcement";

/** Source classification (drives the Tier 1–4 ranking). */
export type AcademicSourceType =
  | "registrar_calendar"
  | "faculty_page"
  | "dept_curriculum"
  | "course_catalog"
  | "syllabus"
  | "announcement"
  | "other";

/** Background job lifecycle (008_ingestion_jobs.sql). */
export type JobStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

/** Discovery/ingestion work-unit types. */
export type JobType =
  | "discover_sources"
  | "fetch_source"
  | "parse_document"
  | "extract_events"
  | "extract_curriculum"
  | "embed_chunks";

/**
 * Shared, app-facing academic profile shape (camelCase DTO).
 * Mirrors the `academic_profiles` table but is the type passed around
 * the UI and pure libs. (Requirement 1.4, 1.6)
 */
export interface AcademicProfile {
  id: string;
  userId: string;
  universityId: string | null;
  facultyId: string | null;
  programId: string | null;
  universityNameRaw: string | null;
  facultyNameRaw: string | null;
  programNameRaw: string | null;
  yearOfStudy: number | null;
  term: string | null;
  termKind: TermKind;
  locale: string;
  timezone: string;
  onboardingStatus: OnboardingStatus;
}

/** Shared, app-facing academic event shape (camelCase DTO). */
export interface AcademicEvent {
  id: string;
  academicProfileId: string;
  eventType: AcademicEventType;
  title: string | null;
  /** ISO date `YYYY-MM-DD`, or null when unreleased. */
  startDate: string | null;
  endDate: string | null;
  confidence: number | null;
  status: ConfidenceStatus;
  isConfirmed: boolean;
  sourceId: string | null;
  sourceExcerpt: string | null;
  /** Conflicting alternative retained for display (Requirement 10.3/10.4). */
  altStartDate: string | null;
  altEndDate: string | null;
  altSourceId: string | null;
}

/** Shared, app-facing curriculum course shape (camelCase DTO). */
export interface CurriculumCourse {
  id: string;
  academicProfileId: string;
  courseCode: string | null;
  title: string | null;
  yearLevel: number | null;
  term: string | null;
  credits: number | null;
  description: string | null;
  isUserEnrolled: boolean;
  isConfirmed: boolean;
  sourceId: string | null;
  confidence: number | null;
  status: ConfidenceStatus | null;
}

/** Shared, app-facing academic source shape (camelCase DTO). */
export interface AcademicSource {
  id: string;
  academicProfileId: string;
  url: string | null;
  domain: string | null;
  sourceTier: number | null;
  sourceType: AcademicSourceType | null;
  title: string | null;
  httpStatus: number | null;
  storagePath: string | null;
  paperId: string | null;
  confidenceBase: number | null;
  sourceYear: number | null;
  isOfficial: boolean;
  isStale: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          timezone: string;
          adhd_mode: boolean;
          focus_audio: string | null;
          xp: number;
          coins: number;
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          timezone?: string;
          adhd_mode?: boolean;
          focus_audio?: string | null;
          xp?: number;
          coins?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          timezone?: string;
          adhd_mode?: boolean;
          focus_audio?: string | null;
          xp?: number;
          coins?: number;
          level?: number;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          name: string;
          exam_date: string | null;
          created_at: string;
          /** Added in 011_material_type.sql (default: 'conceptual'). */
          material_type: "conceptual" | "procedural_math" | "visual_discrimination" | "verbal_vocabulary";
          /** Added in 014_feynman_source_attachment.sql. */
          feynman_source_ref: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          name: string;
          exam_date?: string | null;
          created_at?: string;
          material_type?: "conceptual" | "procedural_math" | "visual_discrimination" | "verbal_vocabulary";
          feynman_source_ref?: Json | null;
        };
        Update: {
          name?: string;
          subject_id?: string;
          exam_date?: string | null;
          material_type?: "conceptual" | "procedural_math" | "visual_discrimination" | "verbal_vocabulary";
          feynman_source_ref?: Json | null;
        };
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string | null;
          mode: "feynman" | "review" | "research" | "planner" | "video";
          duration_minutes: number | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          mode: "feynman" | "review" | "research" | "planner" | "video";
          duration_minutes?: number | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          topic_id?: string | null;
          mode?: "feynman" | "review" | "research" | "planner" | "video";
          duration_minutes?: number | null;
          ended_at?: string | null;
        };
      };
      feynman_explanations: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          raw_text: string;
          ai_summary: string | null;
          gaps_json: Json | null;
          score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          raw_text: string;
          ai_summary?: string | null;
          gaps_json?: Json | null;
          score?: number | null;
          created_at?: string;
        };
        Update: {
          raw_text?: string;
          ai_summary?: string | null;
          gaps_json?: Json | null;
          score?: number | null;
        };
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string | null;
          front: string;
          back: string;
          source_type: "feynman" | "research" | "manual" | "video";
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          // FSRS state (NOT NULL after migration 016; previously nullable)
          due: string;
          stability: number | null;
          difficulty: number | null;
          last_review: string | null;
          reps: number;
          lapses: number;
          /** 0=New 1=Learning 2=Review 3=Relearning */
          state: number;
          scheduled_days: number;
          learning_steps: number;
          elapsed_days: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          front: string;
          back: string;
          source_type?: "feynman" | "research" | "manual" | "video";
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          due?: string;
          stability?: number | null;
          difficulty?: number | null;
          last_review?: string | null;
          reps?: number;
          lapses?: number;
          state?: number;
          scheduled_days?: number;
          learning_steps?: number;
          elapsed_days?: number;
        };
        Update: {
          front?: string;
          back?: string;
          topic_id?: string | null;
          source_type?: "feynman" | "research" | "manual" | "video";
          metadata?: Json | null;
          updated_at?: string;
          due?: string;
          stability?: number | null;
          difficulty?: number | null;
          last_review?: string | null;
          reps?: number;
          lapses?: number;
          state?: number;
          scheduled_days?: number;
          learning_steps?: number;
          elapsed_days?: number;
        };
      };
      card_reviews: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          grade: number;
          reviewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          grade: number;
          reviewed_at?: string;
        };
        Update: {
          grade?: number;
        };
      };
      avatars: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          head: string;
          hair: string;
          outfit: string;
          accessory: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          body?: string;
          head?: string;
          hair?: string;
          outfit?: string;
          accessory?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          head?: string;
          hair?: string;
          outfit?: string;
          accessory?: string | null;
          updated_at?: string;
        };
      };
      pets: {
        Row: {
          id: string;
          user_id: string;
          pet_type: string;
          name: string;
          state: "happy" | "neutral" | "sad" | "forest_rescue";
          affinity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pet_type?: string;
          name?: string;
          state?: "happy" | "neutral" | "sad" | "forest_rescue";
          affinity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pet_type?: string;
          name?: string;
          state?: "happy" | "neutral" | "sad" | "forest_rescue";
          affinity?: number;
          updated_at?: string;
        };
      };
      papers: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string | null;
          title: string;
          authors: string[] | null;
          year: number | null;
          citation_count: number | null;
          abstract: string | null;
          url: string | null;
          semantic_scholar_id: string | null;
          // Added in 013_research_sources.sql
          doi: string | null;
          oa_url: string | null;
          // Added by 003_rag_extensions.sql
          parse_status: "pending" | "processing" | "ready" | "partial" | "failed";
          parse_error: string | null;
          chunk_count: number;
          storage_path: string | null;
          // Added by 007_university_onboarding.sql — academic document tagging
          academic_kind: AcademicKind | null;
          academic_profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          title: string;
          authors?: string[] | null;
          year?: number | null;
          citation_count?: number | null;
          abstract?: string | null;
          url?: string | null;
          semantic_scholar_id?: string | null;
          doi?: string | null;
          oa_url?: string | null;
          parse_status?: "pending" | "processing" | "ready" | "partial" | "failed";
          parse_error?: string | null;
          chunk_count?: number;
          storage_path?: string | null;
          academic_kind?: AcademicKind | null;
          academic_profile_id?: string | null;
          created_at?: string;
        };
        Update: {
          topic_id?: string | null;
          title?: string;
          authors?: string[] | null;
          year?: number | null;
          citation_count?: number | null;
          abstract?: string | null;
          url?: string | null;
          semantic_scholar_id?: string | null;
          doi?: string | null;
          oa_url?: string | null;
          parse_status?: "pending" | "processing" | "ready" | "partial" | "failed";
          parse_error?: string | null;
          chunk_count?: number;
          storage_path?: string | null;
          academic_kind?: AcademicKind | null;
          academic_profile_id?: string | null;
        };
      };
      paper_chunks: {
        Row: {
          id: string;
          user_id: string;
          paper_id: string;
          chunk_index: number;
          content: string;
          section_heading: string | null;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          paper_id: string;
          chunk_index: number;
          content: string;
          section_heading?: string | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          section_heading?: string | null;
          embedding?: number[] | null;
          chunk_index?: number;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          youtube_id: string;
          title: string;
          channel_title: string | null;
          duration_seconds: number;
          topic_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          youtube_id: string;
          title: string;
          channel_title?: string | null;
          duration_seconds: number;
          topic_id?: string | null;
          created_at?: string;
        };
        Update: {
          youtube_id?: string;
          title?: string;
          channel_title?: string | null;
          duration_seconds?: number;
          topic_id?: string | null;
        };
      };
      video_transcripts: {
        Row: {
          id: string;
          video_id: string;
          language: string;
          segments: Json;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          language?: string;
          segments: Json;
          source: string;
          created_at?: string;
        };
        Update: {
          video_id?: string;
          language?: string;
          segments?: Json;
          source?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          time_segment: string;  // numrange stored as string e.g. "[0,120)"
          note_content: string;
          rich_content: Json | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          time_segment: string;
          note_content: string;
          rich_content?: Json | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          video_id?: string;
          time_segment?: string;
          note_content?: string;
          rich_content?: Json | null;
          source?: string;
          updated_at?: string;
        };
      };
      universities: {
        Row: {
          id: string;
          name: string;
          aliases: string[];
          country: string | null;
          primary_domain: string;
          registrar_url: string | null;
          academic_calendar_url: string | null;
          timezone: string;
          locale: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          aliases?: string[];
          country?: string | null;
          primary_domain: string;
          registrar_url?: string | null;
          academic_calendar_url?: string | null;
          timezone?: string;
          locale?: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          aliases?: string[];
          country?: string | null;
          primary_domain?: string;
          registrar_url?: string | null;
          academic_calendar_url?: string | null;
          timezone?: string;
          locale?: string;
          verified?: boolean;
        };
      };
      faculties: {
        Row: {
          id: string;
          university_id: string;
          name: string;
          aliases: string[];
          url: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          name: string;
          aliases?: string[];
          url?: string | null;
        };
        Update: {
          name?: string;
          aliases?: string[];
          url?: string | null;
        };
      };
      programs: {
        Row: {
          id: string;
          university_id: string;
          faculty_id: string | null;
          name: string;
          aliases: string[];
          degree_level: string | null;
          curriculum_url: string | null;
          course_catalog_url: string | null;
          language: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          faculty_id?: string | null;
          name: string;
          aliases?: string[];
          degree_level?: string | null;
          curriculum_url?: string | null;
          course_catalog_url?: string | null;
          language?: string | null;
        };
        Update: {
          faculty_id?: string | null;
          name?: string;
          aliases?: string[];
          degree_level?: string | null;
          curriculum_url?: string | null;
          course_catalog_url?: string | null;
          language?: string | null;
        };
      };
      academic_profiles: {
        Row: {
          id: string;
          user_id: string;
          university_id: string | null;
          faculty_id: string | null;
          program_id: string | null;
          university_name_raw: string | null;
          faculty_name_raw: string | null;
          program_name_raw: string | null;
          year_of_study: number | null;
          term: string | null;
          term_kind: TermKind;
          locale: string;
          timezone: string;
          onboarding_status: OnboardingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          university_id?: string | null;
          faculty_id?: string | null;
          program_id?: string | null;
          university_name_raw?: string | null;
          faculty_name_raw?: string | null;
          program_name_raw?: string | null;
          year_of_study?: number | null;
          term?: string | null;
          term_kind?: TermKind;
          locale?: string;
          timezone?: string;
          onboarding_status?: OnboardingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          university_id?: string | null;
          faculty_id?: string | null;
          program_id?: string | null;
          university_name_raw?: string | null;
          faculty_name_raw?: string | null;
          program_name_raw?: string | null;
          year_of_study?: number | null;
          term?: string | null;
          term_kind?: TermKind;
          locale?: string;
          timezone?: string;
          onboarding_status?: OnboardingStatus;
          updated_at?: string;
        };
      };
      academic_sources: {
        Row: {
          id: string;
          user_id: string;
          academic_profile_id: string;
          url: string | null;
          domain: string | null;
          source_tier: number | null;
          source_type: AcademicSourceType | null;
          title: string | null;
          http_status: number | null;
          content_hash: string | null;
          storage_path: string | null;
          paper_id: string | null;
          confidence_base: number | null;
          source_year: number | null;
          is_official: boolean;
          is_stale: boolean;
          fetched_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          academic_profile_id: string;
          url?: string | null;
          domain?: string | null;
          source_tier?: number | null;
          source_type?: AcademicSourceType | null;
          title?: string | null;
          http_status?: number | null;
          content_hash?: string | null;
          storage_path?: string | null;
          paper_id?: string | null;
          confidence_base?: number | null;
          source_year?: number | null;
          is_official?: boolean;
          is_stale?: boolean;
          fetched_at?: string | null;
          created_at?: string;
        };
        Update: {
          url?: string | null;
          domain?: string | null;
          source_tier?: number | null;
          source_type?: AcademicSourceType | null;
          title?: string | null;
          http_status?: number | null;
          content_hash?: string | null;
          storage_path?: string | null;
          paper_id?: string | null;
          confidence_base?: number | null;
          source_year?: number | null;
          is_official?: boolean;
          is_stale?: boolean;
          fetched_at?: string | null;
        };
      };
      academic_events: {
        Row: {
          id: string;
          user_id: string;
          academic_profile_id: string;
          event_type: AcademicEventType;
          title: string | null;
          start_date: string | null;
          end_date: string | null;
          confidence: number | null;
          status: ConfidenceStatus;
          is_confirmed: boolean;
          source_id: string | null;
          source_excerpt: string | null;
          alt_start_date: string | null;
          alt_end_date: string | null;
          alt_source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          academic_profile_id: string;
          event_type: AcademicEventType;
          title?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          confidence?: number | null;
          status: ConfidenceStatus;
          is_confirmed?: boolean;
          source_id?: string | null;
          source_excerpt?: string | null;
          alt_start_date?: string | null;
          alt_end_date?: string | null;
          alt_source_id?: string | null;
          created_at?: string;
        };
        Update: {
          event_type?: AcademicEventType;
          title?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          confidence?: number | null;
          status?: ConfidenceStatus;
          is_confirmed?: boolean;
          source_id?: string | null;
          source_excerpt?: string | null;
          alt_start_date?: string | null;
          alt_end_date?: string | null;
          alt_source_id?: string | null;
        };
      };
      curriculum_courses: {
        Row: {
          id: string;
          user_id: string;
          academic_profile_id: string;
          course_code: string | null;
          title: string | null;
          year_level: number | null;
          term: string | null;
          credits: number | null;
          description: string | null;
          is_user_enrolled: boolean;
          is_confirmed: boolean;
          source_id: string | null;
          confidence: number | null;
          status: ConfidenceStatus | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          academic_profile_id: string;
          course_code?: string | null;
          title?: string | null;
          year_level?: number | null;
          term?: string | null;
          credits?: number | null;
          description?: string | null;
          is_user_enrolled?: boolean;
          is_confirmed?: boolean;
          source_id?: string | null;
          confidence?: number | null;
          status?: ConfidenceStatus | null;
          created_at?: string;
        };
        Update: {
          course_code?: string | null;
          title?: string | null;
          year_level?: number | null;
          term?: string | null;
          credits?: number | null;
          description?: string | null;
          is_user_enrolled?: boolean;
          is_confirmed?: boolean;
          source_id?: string | null;
          confidence?: number | null;
          status?: ConfidenceStatus | null;
        };
      };
      ingestion_jobs: {
        Row: {
          id: string;
          user_id: string;
          academic_profile_id: string | null;
          job_type: JobType;
          status: JobStatus;
          payload: Json;
          result: Json | null;
          error: string | null;
          attempts: number;
          max_attempts: number;
          next_run_at: string;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          academic_profile_id?: string | null;
          job_type: JobType;
          status?: JobStatus;
          payload?: Json;
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          max_attempts?: number;
          next_run_at?: string;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: JobStatus;
          payload?: Json;
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          max_attempts?: number;
          next_run_at?: string;
          locked_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
