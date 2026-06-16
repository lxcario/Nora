# Requirements Document

## Introduction

The Study Room is a unified video study workspace at `/app/study-room` that transforms passive YouTube watching into active, structured learning. Students can search for educational videos, play them with programmatic timestamp control, extract and cache transcripts, generate AI-powered timestamped notes from specific video segments, take rich text notes alongside AI content, practice Feynman explanations of watched content, and generate flashcards linked back to source video timestamps. The feature integrates with the existing gamification system (XP, coins, pet affinity) and SM-2 spaced repetition engine.

**Scope boundary:** The Study Room operates as a standalone page (`/app/study-room`) separate from the existing Research Desk. It focuses exclusively on YouTube video content as its source material. Flashcards generated from video content integrate with the existing SM-2 review system using `source_type: 'video'`. Feynman explanations triggered from video segments use the existing Feynman evaluation pipeline with additional video-transcript context.

## Glossary

- **Study_Room_UI**: The `/app/study-room` page and its client components that provide the unified video study workspace.
- **Video_Player**: The client component wrapping the YouTube IFrame API that provides programmatic playback control (seekTo, pause, getCurrentTime) and exposes time tracking to the parent workspace.
- **Video_Search_Engine**: The server action that queries the YouTube Data API v3 with educational filtering heuristics to return relevant video results.
- **Transcript_Service**: The server action responsible for fetching, parsing, and caching video transcripts from YouTube caption tracks or fallback transcription services.
- **Transcript_Cache**: The Supabase table storing previously fetched transcripts with timestamp offsets, keyed by YouTube video ID, enabling instant re-access without re-fetching.
- **Note_Generator**: The server action that accepts a transcript time range, slices the transcript by timestamp boundaries, and feeds the segment to Groq LLM to produce structured study materials.
- **Note_Editor**: The Tiptap-based rich text editor component supporting markdown formatting, custom clickable timestamp marks, and AI inline completions.
- **Timestamp_Mark**: A custom Tiptap inline mark that renders a clickable timestamp badge; clicking the mark seeks the Video_Player to the associated time offset.
- **Video_Record**: A row in the `videos` table representing a YouTube video with metadata (youtube_id, title, channel, duration).
- **Video_Note**: A row in the `notes` table representing user or AI-generated notes linked to a specific time range (numrange) within a video.
- **Segment**: A contiguous portion of a video transcript defined by a start timestamp and end timestamp, expressed in seconds.
- **Groq_LLM**: The primary AI provider (Groq Cloud API) used for note generation, flashcard generation, and Feynman evaluation.
- **Groq_Whisper**: The Groq Cloud Whisper API used as a fallback transcription service when YouTube caption tracks are unavailable.
- **Topic**: A user-defined study topic that videos, notes, and cards can be associated with.

## Requirements

### Requirement 1: Video Search with Educational Filtering

**User Story:** As a student, I want to search for educational videos by topic so that I can find high-quality learning content without distracting results.

#### Acceptance Criteria

1. WHEN a user submits a search query of between 3 and 200 characters via the Study_Room_UI, THE Video_Search_Engine SHALL execute a two-step pipeline: first querying the YouTube Data API v3 `search.list` endpoint with supported filters to retrieve video IDs, then calling `videos.list` with `contentDetails` and `statistics` parts to fetch duration, view counts, and other metadata needed for heuristic ranking and exclusion, returning up to 10 video results within 5 seconds.
2. WHEN the Video_Search_Engine queries the YouTube Data API, THE Video_Search_Engine SHALL restrict results to the Education (category 27) or Science & Technology (category 28) video categories.
3. WHEN the Video_Search_Engine queries the YouTube Data API, THE Video_Search_Engine SHALL filter results to medium-duration (4-20 minutes) or long-duration (over 20 minutes) videos, excluding short-form content under 4 minutes.
4. THE Video_Search_Engine SHALL append exclusion modifiers to the user query (excluding terms: vlog, parody, funny, gaming, shorts) to reduce non-educational results.
5. WHEN results are returned, THE Study_Room_UI SHALL display each result with the video title, channel name, duration, and thumbnail image.
6. IF the YouTube Data API returns an error or is unavailable, THEN THE Video_Search_Engine SHALL return an error message indicating the search service is temporarily unavailable and suggest the user try again.
7. IF the user submits a query shorter than 3 characters or longer than 200 characters, THEN THE Study_Room_UI SHALL reject the submission and display an error message indicating the query must be between 3 and 200 characters.
8. IF the YouTube Data API search quota is exhausted (search.list costs 100 units per call, allowing approximately 100 searches per day from the 10,000 unit daily pool), THEN THE Video_Search_Engine SHALL return an error message indicating the daily search limit has been reached and suggest the user provide a direct YouTube URL instead.

### Requirement 2: Video Playback with Programmatic Control

**User Story:** As a student, I want to embed and play YouTube videos with precise timestamp control so that I can navigate to specific moments referenced in my notes.

#### Acceptance Criteria

1. WHEN a user selects a video from search results or provides a valid YouTube URL, THE Video_Player SHALL embed and begin playing the video using the YouTube IFrame API.
2. THE Video_Player SHALL expose programmatic control functions: seekTo (accepts seconds as a number), pause, play, and getCurrentTime (returns current playback position in seconds).
3. WHEN an external component invokes seekTo with a timestamp value in seconds, THE Video_Player SHALL navigate to that position within 1 second and resume playback.
4. THE Video_Player SHALL report the current playback position to the parent workspace at up to every 500 milliseconds while the video is playing, subject to browser performance constraints.
5. WHEN a user provides a YouTube URL via a direct URL input field, THE Study_Room_UI SHALL extract the video ID from the URL and load the video into the Video_Player.
6. IF the provided YouTube URL is invalid or the video ID cannot be extracted, THEN THE Study_Room_UI SHALL display an error message indicating the URL is not a valid YouTube video link.
7. WHEN a video is loaded, THE Study_Room_UI SHALL create or retrieve a Video_Record in the `videos` table storing the youtube_id, title, channel_title, and duration_seconds.

### Requirement 3: Transcript Extraction and Caching

**User Story:** As a student, I want video transcripts to be automatically fetched and cached so that I can generate notes from any video segment without waiting.

#### Acceptance Criteria

1. WHEN a video is loaded into the Video_Player, THE Transcript_Service SHALL attempt transcript retrieval using a best-effort unofficial caption extraction provider (`youtube-transcript-plus`), preferring YouTube auto-generated or manual caption availability when accessible. This is an unofficial integration that may be subject to regional blocking, DOM changes, or IP-based rate limiting in production environments.
2. WHEN the caption extraction provider successfully returns a transcript, THE Transcript_Service SHALL parse the response into an array of segments, each containing `text` (string), `offset` (start time in seconds as a number), and `duration` (segment duration in seconds as a number).
3. WHEN a transcript is successfully fetched, THE Transcript_Service SHALL store the complete transcript array in the Transcript_Cache table keyed by the video's youtube_id, enabling instant retrieval on subsequent requests for the same video.
4. IF the caption extraction provider fails to fetch a transcript (due to unavailable captions, IP blocking, regional restrictions, or network error), THEN THE Transcript_Service SHALL fall back to the Groq_Whisper API for audio-based transcription. Note: the Whisper fallback may increase latency (processing time proportional to video length) and consumes Groq API quota compared to cached caption retrieval.
5. IF both the primary caption extraction and the Groq_Whisper fallback fail, THEN THE Transcript_Service SHALL inform the user that no transcript is available for this video and disable AI note generation features for that video.
6. WHEN a transcript request is made for a video that already exists in the Transcript_Cache, THE Transcript_Service SHALL return the cached transcript without making external API calls.
7. THE Transcript_Cache SHALL store transcripts with their full timestamp offset arrays so that any time range can be sliced without re-fetching.

### Requirement 4: Timestamp-Aware AI Note Generation

**User Story:** As a student, I want to request AI-generated notes from a specific time range of a video so that I can get structured summaries of exactly what I watched.

#### Acceptance Criteria

1. WHEN a user specifies a time range (start time and end time in MM:SS or HH:MM:SS format) and requests note generation, THE Note_Generator SHALL slice the cached transcript to include only segments where the segment offset falls within the specified range.
2. WHEN the Note_Generator receives a sliced transcript segment, THE Note_Generator SHALL feed the timestamped text to the Groq_LLM with instructions to produce a structured JSON response containing: a summary (100-200 words), key concepts (each with concept name, definition, and source timestamp citation), and flashcard question-answer pairs (each with a source timestamp offset).
3. WHEN the Groq_LLM returns a structured response, THE Note_Generator SHALL create a Video_Note record in the `notes` table with the `time_segment` stored as a numrange value of `[start_seconds, end_seconds)` and the `note_content` field populated with the generated summary text.
4. WHEN AI-generated notes contain timestamp citations, THE Note_Editor SHALL render each citation as a clickable Timestamp_Mark that, when clicked, invokes the Video_Player's seekTo function with the cited offset in seconds.
5. IF the specified time range contains no transcript segments (empty slice), THEN THE Note_Generator SHALL inform the user that no transcript content is available for the selected time range.
6. IF the Groq_LLM fails to respond within 30 seconds or returns an error, THEN THE Note_Generator SHALL return an error message indicating that note generation is temporarily unavailable and suggest the user retry.
7. THE Note_Generator SHALL include the video title and time range in the LLM prompt context so that generated content references the specific source material.
8. WHEN the user selects a time range using the Study_Room_UI, THE Study_Room_UI SHALL validate that the start time is less than the end time and both values are within the video duration, rejecting invalid ranges with an appropriate error message.

### Requirement 5: Rich Text Note Editor

**User Story:** As a student, I want a rich text editor for taking manual notes alongside AI-generated content so that I can annotate and organize my video study notes.

#### Acceptance Criteria

1. THE Note_Editor SHALL provide markdown formatting capabilities including headings (H1-H3), bold, italic, bullet lists, numbered lists, and code blocks using the Tiptap editor framework.
2. THE Note_Editor SHALL support custom Timestamp_Mark inline marks that render as clickable styled badges displaying the formatted time (MM:SS) and, when clicked, invoke the Video_Player's seekTo function with the associated seconds value.
3. WHEN a user presses a keyboard shortcut (Ctrl+Shift+T or Cmd+Shift+T), THE Note_Editor SHALL insert a Timestamp_Mark at the current cursor position with the seconds value set to the Video_Player's current playback position.
4. THE Note_Editor SHALL support AI inline completions where, after 2 seconds of typing inactivity, the system requests a continuation suggestion from the Groq_LLM and displays it as ghost text that the user can accept by pressing Tab.
5. WHEN AI-generated notes are produced by the Note_Generator, THE Note_Editor SHALL insert the generated content at the current cursor position or append it to the end of the document, preserving all Timestamp_Mark references.
6. THE Note_Editor SHALL auto-save note content to the corresponding Video_Note record in the database within 3 seconds of the last edit, debouncing rapid changes.
7. IF the auto-save operation fails, THEN THE Note_Editor SHALL display a non-blocking warning indicator and retry the save operation within 10 seconds.

### Requirement 6: Flashcard Generation from Video Segments

**User Story:** As a student, I want to generate flashcards from any video segment so that I can review key concepts using spaced repetition with links back to the source video.

#### Acceptance Criteria

1. WHEN AI-generated notes include flashcard pairs, THE Study_Room_UI SHALL display each suggested flashcard with its front (question) and back (answer) text, along with the source timestamp offset.
2. THE Study_Room_UI SHALL allow the user to edit the front (maximum 200 characters) and back (maximum 1000 characters) of each suggested flashcard before saving.
3. WHEN a user saves a flashcard from the Study Room, THE system SHALL create a card record with `source_type` set to "video", the associated `topic_id` if a Topic is selected, and metadata storing the `video_id` and `offset_seconds` for the source timestamp.
4. WHEN a user views a video-sourced flashcard during SM-2 review and clicks the source reference, THE system SHALL navigate to the Study Room with the source video loaded and seeked to the stored timestamp offset.
5. THE Study_Room_UI SHALL allow the user to select or reject individual flashcards from a batch of AI-suggested cards before saving, and display a count of selected cards.
6. WHEN cards are saved, THE system SHALL award XP via the existing `rewardAction("card_created")` for each card created.
7. IF no Topic is associated with the current study session, THEN THE Study_Room_UI SHALL allow the user to select a Topic from their existing topics before saving cards.

### Requirement 7: Feynman Integration with Video Context

**User Story:** As a student, I want to practice explaining what I just watched using the Feynman technique so that I can identify gaps in my understanding of video content.

#### Acceptance Criteria

1. WHEN a user has watched a video segment (defined as the Video_Player having played for at least 60 seconds since the last Feynman prompt or since video load), THE Study_Room_UI SHALL display an optional "Explain what you just watched" prompt.
2. WHEN a user accepts the Feynman prompt and submits an explanation of at least 50 characters, THE system SHALL evaluate the explanation against the transcript of the most recently watched segment using the existing Feynman evaluation pipeline with the transcript text injected as additional context.
3. WHEN the Feynman evaluation completes, THE system SHALL display the standard gap analysis (color-coded segments, probing questions, paraphrase) and suggested flashcards, with each flashcard linked to the source video timestamp.
4. WHEN flashcards are generated from a Feynman explanation of video content, THE system SHALL set the card `source_type` to "video" and store the video_id and offset_seconds in the card metadata.
5. WHEN a Feynman explanation is completed, THE system SHALL award XP via `rewardAction("feynman")`.
6. IF the transcript for the recently watched segment is unavailable, THEN THE system SHALL evaluate the Feynman explanation using only the video title and topic context (standard Feynman behavior) without transcript grounding.

### Requirement 8: Video Transcript Cache Schema

**User Story:** As a developer, I want a database schema for caching video transcripts so that transcripts are stored with full timestamp data for instant segment slicing.

#### Acceptance Criteria

1. THE database SHALL include a `video_transcripts` table with columns: `id` (UUID, primary key), `video_id` (UUID, foreign key to `videos`), `language` (TEXT, default 'en'), `segments` (JSONB, storing the array of transcript segments with offset and duration), `source` (TEXT, one of 'youtube', 'whisper'), `created_at` (TIMESTAMPTZ). Transcripts are stored per-user through the parent `videos` row (which is user-scoped), not globally deduplicated by YouTube ID, ensuring each user's transcript cache is isolated and RLS-compatible.
2. THE `video_transcripts` table SHALL enforce a UNIQUE constraint on `(video_id, language)` to prevent duplicate transcripts for the same video and language combination.
3. THE `videos` table SHALL include columns: `id` (UUID, primary key), `user_id` (UUID, foreign key to auth.users), `youtube_id` (VARCHAR(11), NOT NULL), `title` (TEXT, NOT NULL), `channel_title` (TEXT), `duration_seconds` (INTEGER, NOT NULL), `topic_id` (UUID, nullable foreign key to `topics`), `created_at` (TIMESTAMPTZ).
4. THE `videos` table SHALL enforce a UNIQUE constraint on `(user_id, youtube_id)` so each user has at most one Video_Record per YouTube video.
5. THE `notes` table SHALL include columns: `id` (UUID, primary key), `user_id` (UUID, foreign key to auth.users), `video_id` (UUID, foreign key to `videos`), `time_segment` (NUMRANGE, NOT NULL), `note_content` (TEXT, NOT NULL), `rich_content` (JSONB, storing Tiptap document JSON), `source` (TEXT, one of 'manual', 'ai'), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
6. THE `notes` table SHALL have a GiST index on `time_segment` for efficient range overlap and containment queries.
7. RLS policies SHALL be enabled on `videos` and `notes` tables restricting all operations to rows where `user_id` equals the authenticated user's ID. THE `video_transcripts` table SHALL enforce access control through the parent `videos` row — a user may only read or write transcript records whose `video_id` references a `videos` row owned by the same user (enforced via a JOIN-based RLS policy or SECURITY DEFINER function).

### Requirement 9: Gamification Integration

**User Story:** As a student, I want to earn XP and coins for video study activities so that my progress contributes to my overall gamification profile.

#### Acceptance Criteria

1. WHEN a user generates AI notes from a video segment, THE system SHALL award XP by calling `rewardAction("session_complete")` (10 XP, 3 coins).
2. WHEN a user completes a Feynman explanation of video content, THE system SHALL award XP by calling `rewardAction("feynman")` (15 XP, 5 coins).
3. WHEN a user saves flashcards generated from video content, THE system SHALL award XP by calling `rewardAction("card_created")` (2 XP per card).
4. WHEN a user starts a video study session (loads a video and watches for at least 5 minutes as measured by the Video_Player's cumulative play time), THE system SHALL create a study_session record with `session_type` of "video" for daily mission tracking.
5. WHEN a video study session is recorded, THE system SHALL increment pet affinity through the standard reward mechanism, contributing to pet happiness state calculations.
6. THE Study_Room_UI SHALL display XP toast notifications (floating "+XP" indicators) when rewards are earned during video study activities.

### Requirement 10: Study Room Layout and Navigation

**User Story:** As a student, I want a well-organized workspace layout so that I can watch videos and take notes side by side without losing context.

#### Acceptance Criteria

1. THE Study_Room_UI SHALL display a split-panel layout with the Video_Player occupying the left panel (approximately 60% width on desktop viewports of 1024px or wider) and the Note_Editor occupying the right panel (approximately 40% width).
2. WHEN the viewport width is below 1024px, THE Study_Room_UI SHALL stack the Video_Player above the Note_Editor in a single-column layout.
3. THE Study_Room_UI SHALL include a collapsible search panel above the Video_Player that allows searching for videos without leaving the workspace.
4. THE Study_Room_UI SHALL display a time range selector below the Video_Player that allows the user to specify start and end timestamps for AI note generation.
5. THE Study_Room_UI SHALL include the Study Room as a navigation item in the application sidebar accessible from all protected pages.
6. WHEN no video is loaded, THE Study_Room_UI SHALL display an empty state with a search input and a direct URL input field, prompting the user to find or paste a video.

### Requirement 11: Topic Linking for Videos

**User Story:** As a student, I want to associate videos with my study topics so that video content is organized alongside my other study materials.

#### Acceptance Criteria

1. WHEN a user loads a video, THE Study_Room_UI SHALL allow the user to optionally associate the video with one of their existing Topics via a dropdown selector.
2. WHEN a video is associated with a Topic, THE Video_Record SHALL store the `topic_id` in the `videos` table.
3. WHEN flashcards are generated from a video that is associated with a Topic, THE system SHALL automatically set the card's `topic_id` to match the video's Topic association unless the user explicitly selects a different Topic.
4. WHEN a user navigates to a Topic's study materials (if such a view exists), THE system SHALL include videos associated with that Topic in the materials list.
5. THE Study_Room_UI SHALL allow the user to change or remove the Topic association of a video at any time by updating the `topic_id` field on the Video_Record.

### Requirement 12: Error Handling and Fallback Behavior

**User Story:** As a student, I want the system to handle failures gracefully so that my study session is minimally disrupted by technical issues.

#### Acceptance Criteria

1. IF the YouTube IFrame API fails to load within 10 seconds, THEN THE Study_Room_UI SHALL display an error message indicating the video player could not be initialized and suggest the user refresh the page.
2. IF a transcript fetch via `youtube-transcript-plus` fails and the Groq_Whisper fallback is attempted, THEN THE Study_Room_UI SHALL display a status message indicating that an alternative transcription method is being used.
3. IF both AI providers (Groq and OpenRouter) are unavailable during note generation, THEN THE Note_Generator SHALL return an error message indicating AI services are temporarily unavailable and preserve any manual notes the user has written.
4. IF the Groq_Whisper API rate limit is exceeded (HTTP 429), THEN THE Transcript_Service SHALL inform the user that transcription is temporarily rate-limited and suggest trying again after the period specified in the Retry-After header, or after 60 seconds if no header is present.
5. IF a database write operation fails when saving notes or video records, THEN THE Study_Room_UI SHALL display an error notification, retain unsaved content in the editor state, and retry the operation once after 5 seconds.
6. IF the YouTube Data API returns a quotaExceeded error (HTTP 403), THEN THE Video_Search_Engine SHALL inform the user that the daily search quota has been reached and offer the direct URL input as an alternative.
