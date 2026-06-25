# AI Study Podcast Generator — Design

## Architecture

```
Topic Selection → Content Aggregation → LLM Script Generation → DB Storage
                                                                      ↓
                                         Client Playback ← Web Speech API ← Script Text
                                                ↓
                                         Post-Listen Quiz → FSRS Update → XP Reward
```

## Data Model

### New Table: `podcast_episodes`
```sql
CREATE TABLE podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  script_json JSONB NOT NULL, -- { segments: [{ speaker, text, type }] }
  quiz_questions JSONB NOT NULL, -- [{ question, answer, card_id? }]
  duration_estimate_seconds INT NOT NULL,
  listened_at TIMESTAMPTZ,
  quiz_score INT, -- 0-3 (number correct)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their episodes" ON podcast_episodes
  FOR ALL USING (user_id = auth.uid());
```

### Script JSON Structure
```json
{
  "segments": [
    { "speaker": "host_a", "text": "Let's talk about...", "type": "explain" },
    { "speaker": "host_b", "text": "Wait, can you clarify...", "type": "question" },
    { "speaker": "host_a", "text": "Good question. So...", "type": "explain" },
    { "speaker": "pause", "text": "", "type": "recall_prompt", "question": "What is X?" },
    { "speaker": "host_a", "text": "The answer is...", "type": "reveal" }
  ]
}
```

## Server Action: `generatePodcastEpisode(topicId)`

1. Auth check + rate limit (`ai_heavy`)
2. Fetch topic content:
   - Latest 3 Feynman explanations (`feynman_explanations` ordered by created_at DESC)
   - All cards for the topic (`cards` where topic_id matches)
   - Latest research answer if available
3. Build content summary (cap at ~3000 tokens)
4. Call LLM with podcast generation prompt:
   - System: Two-host conversational format, explain-question-reveal structure
   - Include 3-5 recall pauses
   - Extract 3 quiz questions with answers
5. Parse response, validate structure
6. Insert into `podcast_episodes`
7. Return episode data

## Client Component: `PodcastPlayer`

- Uses `window.speechSynthesis` API
- Two `SpeechSynthesisVoice` objects (one per host — select different genders/accents)
- Processes segments sequentially:
  - `explain`/`question`/`reveal` → speak with appropriate voice
  - `recall_prompt` → pause 3s, show visual prompt, then continue
- Playback state managed in React context (persists across pages)
- Speed control: modify `SpeechSynthesisUtterance.rate`

## Post-Listen Quiz

- Modal that appears when episode completes
- 3 questions from `quiz_questions` array
- Student answers each (tap to reveal, self-grade)
- Results stored in `podcast_episodes.quiz_score`
- Each question optionally links to a card_id → triggers FSRS review equivalent

## Gamification

- `rewardAction("session_complete")` on episode completion → +10 XP, +3 coins, +2 affinity
- Listen streak tracked via `podcast_episodes.listened_at` dates (similar to study streak)

## File Structure
```
src/app/(protected)/app/listen/
  page.tsx                    -- Topic selection & episode list
  _components/
    podcast-player.tsx        -- Audio player using Web Speech API
    podcast-quiz.tsx          -- Post-listen recall quiz
    episode-card.tsx          -- Episode preview card
src/app/(protected)/app/_actions/
  podcast.ts                  -- generatePodcastEpisode, getEpisodes
```
