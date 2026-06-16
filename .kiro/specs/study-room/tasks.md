# Implementation Plan: Study Room

## Overview

The Study Room transforms passive YouTube watching into active, structured learning. This implementation follows a layered approach: database schema first, then video discovery/playback, transcript extraction, AI note generation, rich text editing, flashcard/Feynman integration, and finally layout polish. Each phase builds on the previous, ensuring no orphaned or disconnected code.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Create `supabase/migrations/004_study_room.sql` with complete schema
    - Enable `btree_gist` extension
    - Create `videos` table with all columns, UNIQUE constraint on `(user_id, youtube_id)`, and RLS policy
    - Create `video_transcripts` table with UNIQUE on `(video_id, language)` and JOIN-based RLS policy
    - Create `notes` table with `numrange` time_segment, GiST index, composite index, and RLS policy
    - ALTER `cards` table: drop and re-add `source_type` CHECK to include `'video'`, add `metadata JSONB` column
    - ALTER `study_sessions` table: drop and re-add `mode` CHECK to include `'video'`
    - Add performance indexes: `idx_videos_user`, `idx_videos_youtube`, `idx_video_transcripts_video`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 1.2 Update `src/lib/supabase/database.types.ts` with new table types
    - Add `VideoRecord`, `VideoTranscriptRecord`, `NoteRecord` interfaces
    - Add `VideoCardMetadata` interface
    - Update `Cards` type to include `metadata` field and `'video'` source_type
    - Update `StudySessions` type to include `'video'` mode
    - _Requirements: 8.3, 8.5_

- [x] 2. Video search and player
  - [x] 2.1 Create `src/app/(protected)/app/_actions/study-room/search-heuristic.ts`
    - Implement `scoreVideo()` pure function with heuristic formula: `w1 * ln(views) + w2 * (likes/views) - w3 * clickbaitFactor`
    - Implement clickbait title detection (vlog, parody, funny, gaming, shorts, prank, reaction)
    - Implement `filterAndRankVideos()` with duration exclusion (<240s) and ranking
    - Export `validateSearchQuery()` (3-200 chars trimmed)
    - Export `buildSearchQuery()` that appends exclusion modifiers (`-vlog -parody -funny -gaming -shorts`)
    - Export `extractYouTubeId()` for all URL formats (watch?v=, youtu.be/, embed/, shorts/)
    - _Requirements: 1.1, 1.3, 1.4, 1.7, 2.5, 2.6_

  - [ ]* 2.2 Write property tests for search heuristic and URL extraction
    - **Property 1: Search query length validation** — random strings 0-500 length
    - **Validates: Requirements 1.1, 1.7**
    - **Property 2: Exclusion modifiers always appended** — random valid queries
    - **Validates: Requirements 1.4**
    - **Property 3: Duration filter excludes short videos** — random durations 0-86400
    - **Validates: Requirements 1.3**
    - **Property 4: YouTube URL video ID extraction** — all format variants + invalid strings
    - **Validates: Requirements 2.5, 2.6**

  - [x] 2.3 Create `src/app/(protected)/app/_actions/study-room.ts` — `searchVideos()` server action
    - Implement two-step pipeline: `search.list` (IDs) → `videos.list` (metadata)
    - Apply category filter (27 Education, fallback 28 Science & Tech)
    - Apply `videoDuration: "medium"` or `"long"` filter
    - Parse ISO 8601 durations to seconds
    - Apply heuristic scoring and return top 10 results
    - Handle quota exhausted (403) with specific error message
    - Handle general API errors with retry suggestion
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

  - [x] 2.4 Create `src/app/(protected)/app/study-room/_components/youtube-player.tsx`
    - Load YouTube IFrame API script dynamically (idempotent)
    - Create `YT.Player` instance in a div ref
    - Expose `PlayerController` interface: `seekTo`, `pause`, `play`, `getCurrentTime`, `getDuration`
    - Report time via `onTimeUpdate` callback at 500ms intervals while playing
    - Report state via `onStateChange` callback (playing/paused/ended)
    - 10-second timeout with error state if API fails to load
    - Clean up interval and player on unmount
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 12.1_

  - [x] 2.5 Create `src/app/(protected)/app/study-room/_components/video-search.tsx`
    - Search input with 3-200 char client validation
    - Debounced search (300ms)
    - Results grid: thumbnail, title, channel, duration
    - Click to select video (calls parent callback)
    - Loading and error states
    - _Requirements: 1.1, 1.5, 1.7_

  - [x] 2.6 Create `src/app/(protected)/app/study-room/_components/url-input.tsx`
    - Direct URL paste input field
    - Regex validation using `extractYouTubeId()`
    - Error message for invalid URLs
    - Calls parent callback with extracted video ID on valid input
    - _Requirements: 2.5, 2.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Transcript provider and cache
  - [x] 4.1 Create `src/app/(protected)/app/_actions/study-room/transcript-provider.ts`
    - Define `TranscriptProvider` interface with `name` and `fetch(youtubeId)` method
    - Implement `YouTubeCaptionProvider` using `youtube-transcript-plus`
    - Implement `WhisperProvider` using Groq Whisper API with audio URL extraction
    - Implement `getTranscript()` orchestrator: try providers in sequence, return segments + source
    - Export `parseTranscriptResponse()` for raw response normalization
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 4.2 Add `fetchTranscript()` server action to `study-room.ts`
    - Check `video_transcripts` cache first (by video_id + language)
    - On cache miss: call `getTranscript()` orchestrator
    - Store result in `video_transcripts` table (JSONB segments, source)
    - Handle rate limiting (429) with Retry-After parsing
    - Return segments array + source indicator
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 12.2, 12.4_

  - [x] 4.3 Add `loadVideo()` server action to `study-room.ts`
    - Accept YouTube ID or URL, extract ID
    - UPSERT into `videos` table (user_id, youtube_id, title, channel, duration)
    - Return VideoRecord
    - _Requirements: 2.7_

  - [ ]* 4.4 Write property tests for transcript utilities
    - **Property 5: Transcript segment parsing produces valid structure** — random raw arrays
    - **Validates: Requirements 3.2**
    - **Property 6: Transcript cache round-trip preserves data** — random TranscriptSegment arrays
    - **Validates: Requirements 3.6, 3.7**
    - **Property 14: Retry-After header parsing** — random header values
    - **Validates: Requirements 12.4**

- [x] 5. AI note generation
  - [x] 5.1 Create `src/app/(protected)/app/_actions/study-room/transcript-utils.ts`
    - Implement `sliceTranscript(segments, startSeconds, endSeconds)` — filter by offset range
    - Implement `parseTimeInput(input)` — "MM:SS" or "HH:MM:SS" → seconds (null on invalid)
    - Implement `formatSeconds(seconds)` — seconds → "MM:SS" or "HH:MM:SS"
    - Implement `validateTimeRange(start, end, duration)` — 0 ≤ start < end ≤ duration
    - Implement `buildNotePrompt(title, start, end, segments)` — construct LLM prompt with all required context
    - _Requirements: 4.1, 4.7, 4.8_

  - [ ]* 5.2 Write property tests for transcript slicing and time utilities
    - **Property 7: Transcript slicing correctness** — random segments + time ranges
    - **Validates: Requirements 4.1**
    - **Property 8: Time range validation** — random (start, end, duration) triples
    - **Validates: Requirements 4.8**
    - **Property 9: Note generation prompt completeness** — random titles, ranges, segments
    - **Validates: Requirements 4.2, 4.7**
    - **Property 16: Time format parsing round-trip** — random integers 0-86399
    - **Validates: Requirements 4.1, 4.8**

  - [x] 5.3 Add `generateNotes()` server action to `study-room.ts`
    - Accept videoId, startSeconds, endSeconds
    - Validate time range
    - Slice cached transcript by time range
    - Build LLM prompt with video title, formatted times, segment text
    - Call Groq (15s timeout) with OpenRouter fallback (45s timeout)
    - Parse structured JSON response (summary, key_concepts, flashcards)
    - Save note to `notes` table with `numrange` time_segment
    - Award XP via `rewardAction("session_complete")`
    - Handle empty slice, LLM timeout, invalid JSON errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.1_

  - [x] 5.4 Create `src/app/(protected)/app/study-room/_components/time-range-selector.tsx`
    - MM:SS / HH:MM:SS input fields for start and end
    - Client-side validation (start < end, within duration)
    - "Generate Notes" button with loading state
    - Error messages for invalid ranges
    - _Requirements: 4.8, 10.4_

  - [x] 5.5 Create `src/app/(protected)/app/study-room/_components/generated-notes.tsx`
    - Display AI summary section
    - Key concepts list with clickable timestamp citations
    - Suggested flashcards section (integrates with card editor)
    - Loading animation (multi-step progress: slicing → generating → formatting)
    - _Requirements: 4.2, 4.4, 6.1_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Tiptap editor and timestamp marks
  - [x] 7.1 Create `src/app/(protected)/app/study-room/_components/timestamp-mark.ts` — Tiptap extension
    - Custom `TimestampMark` Mark with `seconds` attribute
    - `parseHTML` / `renderHTML` with `data-seconds` attribute
    - Styled as inline clickable badges (indigo bg, mono font)
    - `onSeek` option for click-to-seek callback injection
    - Keyboard shortcut: `Mod-Shift-t` inserts mark at cursor with current player time
    - _Requirements: 5.2, 5.3_

  - [x] 7.2 Create `src/app/(protected)/app/study-room/_components/note-editor.tsx`
    - Initialize Tiptap editor with StarterKit + TimestampMark extension
    - Markdown formatting: headings (H1-H3), bold, italic, bullet/numbered lists, code blocks
    - Accept `onSeek` prop to wire timestamp mark clicks to player
    - Accept `playerGetCurrentTime` prop for Ctrl+Shift+T insertion
    - Auto-save with 3-second debounce (call `saveNote()` server action)
    - Save failure warning indicator with 10-second retry
    - Insert AI-generated content at cursor or append
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7_

  - [x] 7.3 Add AI inline completion to note editor
    - After 2 seconds of typing inactivity, request continuation from Groq
    - Display as ghost text overlay
    - Press Tab to accept suggestion
    - Reuse pattern from existing `_actions/autocomplete.ts`
    - _Requirements: 5.4_

  - [x] 7.4 Add `saveNote()` and `getVideoNotes()` server actions to `study-room.ts`
    - `saveNote()`: INSERT or UPDATE note record with numrange time_segment and rich_content
    - `getVideoNotes()`: SELECT all notes for a video ordered by `lower(time_segment)` ASC
    - `updateVideoTopic()`: UPDATE video record's topic_id
    - _Requirements: 5.6, 11.2, 11.5_

- [x] 8. Flashcards, Feynman integration, and gamification
  - [x] 8.1 Add `saveVideoCards()` server action to `study-room.ts`
    - Accept cards array with front/back/offsetSeconds, videoId, optional topicId
    - Validate card field lengths (front ≤ 200, back ≤ 1000)
    - Set `source_type: 'video'` and `metadata: { video_id, offset_seconds }` on each card
    - Inherit video's `topic_id` when user doesn't explicitly select a different one
    - Call `rewardAction("card_created")` N times (once per card)
    - _Requirements: 6.2, 6.3, 6.5, 6.6, 9.3, 11.3_

  - [ ]* 8.2 Write property tests for card validation and metadata
    - **Property 10: Card field length validation** — random strings for front/back
    - **Validates: Requirements 6.2**
    - **Property 11: Video card metadata invariant** — random videoId + offsetSeconds
    - **Validates: Requirements 6.3, 7.4**
    - **Property 12: Card creation reward count** — random card arrays of length 1-20
    - **Validates: Requirements 6.6, 9.3**
    - **Property 13: Topic inheritance for generated cards** — random video records
    - **Validates: Requirements 11.3**
    - **Property 15: Feynman explanation minimum length validation** — random strings
    - **Validates: Requirements 7.2**

  - [x] 8.3 Add `evaluateWithTranscript()` server action to `study-room.ts`
    - Accept videoId, explanation, startSeconds, endSeconds, optional topicId
    - Validate explanation length (≥ 50 chars trimmed)
    - Slice transcript for the watched segment
    - Inject transcript text into existing Feynman prompt as additional context
    - Call existing `callLLM` pattern (Groq primary, OpenRouter fallback)
    - Parse GapAnalysis response
    - Award XP via `rewardAction("feynman")`
    - Set generated cards with `source_type: 'video'` metadata
    - Fallback: evaluate without transcript if unavailable
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.2_

  - [x] 8.4 Create `src/app/(protected)/app/study-room/_components/video-card-editor.tsx`
    - Display batch of suggested flashcards with front/back preview
    - Per-card edit (pencil icon), accept (✓), reject (✕) buttons
    - Inline editing with character count enforcement (front: 200, back: 1000)
    - "Save Selected (N)" button with count
    - Source timestamp badge on each card
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 8.5 Create `src/app/(protected)/app/study-room/_components/feynman-video-prompt.tsx`
    - "Explain what you just watched" prompt appearing after 60s of playback
    - Explanation textarea (50 char minimum)
    - Submit button triggering `evaluateWithTranscript()`
    - Display gap analysis results (color-coded segments, questions, paraphrase)
    - Show suggested cards (feeds into video-card-editor)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 8.6 Create `src/app/(protected)/app/study-room/_components/topic-linker.tsx`
    - Dropdown populated from user's existing topics
    - "None" option for no association
    - Calls `updateVideoTopic()` on change
    - Used by card editor for topic selection before save
    - _Requirements: 11.1, 11.2, 11.5, 6.7_

  - [x] 8.7 Add video study session tracking
    - Track cumulative play time in client state
    - When play time reaches 5 minutes, create `study_session` record with mode `'video'`
    - Increment pet affinity through standard reward mechanism
    - _Requirements: 9.4, 9.5_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Layout, navigation, and polish
  - [x] 10.1 Create `src/app/(protected)/app/study-room/_components/study-room-layout.tsx`
    - Split-panel responsive layout: 60% player / 40% editor on desktop (≥1024px)
    - Stacked layout (player above editor) on mobile (<1024px)
    - Collapsible search panel above player
    - Time range selector below player
    - Integrate all child components into unified workspace
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 10.2 Create `src/app/(protected)/app/study-room/page.tsx`
    - Server component for initial data loading (user topics)
    - Render `study-room-layout` client component
    - Empty state: search input + URL input when no video loaded
    - _Requirements: 10.6_

  - [x] 10.3 Add Study Room to sidebar navigation
    - Add navigation item in `src/app/(protected)/app/_components/sidebar.tsx`
    - Use appropriate Lucide icon (e.g., `MonitorPlay` or `Video`)
    - Link to `/app/study-room`
    - _Requirements: 10.5_

  - [x] 10.4 Add XP toast integration
    - Reuse existing `XpToast` component pattern
    - Display floating "+XP / +coins" on rewards from video study actions
    - _Requirements: 9.6_

  - [x] 10.5 Wire card source navigation from review
    - When reviewing a card with `source_type: 'video'`, show source badge
    - On badge click: navigate to `/app/study-room?video={youtube_id}&t={offset_seconds}`
    - Auto-load video and seek to stored timestamp
    - _Requirements: 6.4_

  - [ ]* 10.6 Write integration tests for Study Room
    - Test full search pipeline with YouTube API mocks
    - Test transcript fetch with cache (first call stores, second serves from cache)
    - Test note generation with mocked LLM response
    - Test card creation with `source_type='video'` and metadata structure
    - Test video UPSERT (same youtube_id for same user → no duplicate)
    - _Requirements: 1.1, 3.6, 4.3, 6.3, 8.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major phases
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js 16 (App Router), Supabase, Tailwind CSS, Vitest, and fast-check
- `youtube-transcript-plus` needs to be added to dependencies; `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit` need installation
- YouTube Data API key (`YOUTUBE_API_KEY`) must be added to `.env.local`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 9, "tasks": ["8.1", "8.3", "8.6"] },
    { "id": 10, "tasks": ["8.2", "8.4", "8.5", "8.7"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 12, "tasks": ["10.5", "10.6"] }
  ]
}
```
