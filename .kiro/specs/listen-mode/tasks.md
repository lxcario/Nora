# AI Study Podcast Generator — Tasks

## Task 1: Database schema
- [ ] Create migration for `podcast_episodes` table with RLS policy
- [ ] Add indexes on (user_id, topic_id) and (user_id, created_at)

## Task 2: Server action — generatePodcastEpisode
- [ ] Create `src/app/(protected)/app/_actions/podcast.ts`
- [ ] Implement content aggregation (Feynman + cards + research for a topic)
- [ ] Build LLM prompt for two-host conversational script
- [ ] Parse and validate script JSON structure
- [ ] Extract quiz questions from generated content
- [ ] Store episode in database
- [ ] Apply rate limiting (ai_heavy preset)
- [ ] Return episode data to client

## Task 3: Server action — getEpisodes & markListened
- [ ] `getEpisodes(topicId?)` — fetch user's episodes, optionally filtered by topic
- [ ] `markEpisodeListened(episodeId, quizScore)` — update listened_at and quiz_score
- [ ] Award XP via `rewardAction("session_complete")` on listen completion

## Task 4: PodcastPlayer component
- [ ] Create `src/app/(protected)/app/listen/_components/podcast-player.tsx`
- [ ] Implement Web Speech API playback with two distinct voices
- [ ] Process segments sequentially with proper voice assignment
- [ ] Handle recall_prompt segments (3s pause + visual indicator)
- [ ] Playback controls: play/pause, skip ±15s, speed (0.75x-2x)
- [ ] Progress bar showing current position in episode
- [ ] Persist playback state across page navigations (React context)

## Task 5: Post-listen quiz
- [ ] Create `podcast-quiz.tsx` component
- [ ] Display 3 questions after episode completion
- [ ] Self-grade interface (tap to reveal answer, rate correct/incorrect)
- [ ] Submit quiz score to server
- [ ] Show XP toast on completion

## Task 6: Listen page & UI
- [ ] Create `src/app/(protected)/app/listen/page.tsx`
- [ ] Topic selector to generate new episode
- [ ] Episode list (previously generated)
- [ ] "Generate Episode" button with loading state
- [ ] Add "Listen" button to topic detail views
- [ ] Add pixel-art audio icons and player styling
- [ ] Add loading.tsx skeleton

## Task 7: Integration
- [ ] Add "Listen" nav item to sidebar
- [ ] Track listen streak in analytics
- [ ] Pet affinity update on episode completion
- [ ] Party quest progress: count listen sessions as study_minutes
