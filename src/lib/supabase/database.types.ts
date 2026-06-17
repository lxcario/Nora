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
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          name: string;
          exam_date?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          subject_id?: string;
          exam_date?: string | null;
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
          interval: number;
          repetition: number;
          efactor: number;
          next_review_at: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          front: string;
          back: string;
          source_type?: "feynman" | "research" | "manual" | "video";
          interval?: number;
          repetition?: number;
          efactor?: number;
          next_review_at?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          front?: string;
          back?: string;
          topic_id?: string | null;
          source_type?: "feynman" | "research" | "manual" | "video";
          interval?: number;
          repetition?: number;
          efactor?: number;
          next_review_at?: string;
          metadata?: Json | null;
          updated_at?: string;
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
        };
      };
      paper_chunks: {
        Row: {
          id: string;
          user_id: string;
          paper_id: string;
          chunk_index: number;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          paper_id: string;
          chunk_index: number;
          content: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          content?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
