# AI Study Buddy Error-Spotter — Implementation Tasks

## Overview

Adds an AI "study buddy" that makes deliberate errors for students to catch. Implementation: schema → generation action → evaluation action → UI → difficulty adaptation → Teacher XP display.

## Tasks

- [ ] 1. Database schema
  - [ ] 1.1 Create `supabase/migrations/018_study_buddy.sql`
    - ALTER profiles to add `teacher_xp` column
    - Create `error_challenges` table
    - Create `error_accuracy` table
    - Add indexes, enable RLS
    - _Requirements: 4.1, 5.5_

- [ ] 2. Server actions — generation
  - [ ] 2.1 Create `src/app/(protected)/app/_actions/study-buddy.ts`
    - Implement `generateChallenge(topicId)`:
      - Look up topic cards/papers for context
      - Get or compute Error_Difficulty from Feynman scores + accuracy history
      - Determine error count (1–3 based on difficulty)
      - Call LLM with structured prompt
      - Parse response: explanation text + error items
      - Store in error_challenges with status='active'
      - Return challenge ID, explanation text, error count hint, difficulty
    - 15-second timeout with Groq primary / OpenRouter fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 3. Server actions — evaluation
  - [ ] 3.1 Implement `submitIdentifications(challengeId, identifications)`
    - Validate: challenge exists, belongs to user, status='active', max 5 identifications
    - Validate each identification: selectedText 10–200 chars, correction 20–500 chars
    - Use LLM to evaluate each identification against stored error items
    - Classify: correct, partial, false_positive
    - Identify missed errors
    - Calculate Teacher XP: +15 correct, +5 partial, -5 false_positive (min 0 total), +5 all-found bonus
    - Award coins: 3 per correct
    - Update error_challenges with results
    - Update error_accuracy for the topic
    - Update profiles.teacher_xp
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

  - [ ] 3.2 Implement `getTeacherStats()`
    - Return total teacher_xp, level, per-topic accuracy, challenges completed
    - _Requirements: 4.2, 4.3_

- [ ] 4. Difficulty adaptation logic
  - [ ] 4.1 Implement adaptive difficulty in `study-buddy.ts`
    - After evaluation: update error_accuracy, check last 5 challenges
    - If accuracy > 80% over 5 challenges: difficulty +1 (max 5)
    - If accuracy < 40% over 5 challenges: difficulty -1 (min 1)
    - Store in error_accuracy.current_difficulty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Checkpoint — Verify server actions and logic

- [ ] 6. UI components
  - [ ] 6.1 Create `src/app/(protected)/app/study-buddy/page.tsx`
    - Server component with topic selector
    - Show available topics, their difficulty, accuracy
    - "Start Challenge" button per topic
    - Teacher XP summary at top
    - _Requirements: 2.1_

  - [ ] 6.2 Create `challenge-display.tsx`
    - Render explanation text with text selection capability
    - Show hint: "This contains N errors"
    - Show difficulty level badge
    - _Requirements: 2.1_

  - [ ] 6.3 Create `error-marker.tsx`
    - Text selection → show "Mark as Error" floating button
    - On mark: expand correction textarea (20–500 chars)
    - List of marked errors with edit/remove capability
    - Counter: "X/5 marks used"
    - "Submit for Grading" button
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ] 6.4 Create `challenge-results.tsx`
    - Show each identification with verdict badge (correct/partial/false positive)
    - Reveal missed errors highlighted in original text
    - Show correct explanations for each error
    - Display XP and coins earned
    - "Try Another" button for same topic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 6.5 Create `teacher-xp-badge.tsx`
    - Level icon + progress bar to next level
    - Total XP display
    - Reusable: shown on study-buddy page + dashboard
    - _Requirements: 4.2, 4.3, 4.5_

- [ ] 7. Navigation and integration
  - [ ] 7.1 Add Study Buddy to sidebar
    - Link to `/app/study-buddy` with Brain icon from Lucide
    - Show Teacher XP level badge in sidebar if > 0

- [ ] 8. Final checkpoint — End-to-end verification
  - Generate challenge → identify errors → submit → verify scoring + XP.

## Notes

- Error items are stored at generation time for deterministic baseline evaluation
- LLM still needed at evaluation for partial credit (student wording varies)
- Teacher XP is independent of regular XP — different progression
- Challenges auto-expire after 24h to prevent gaming (generate, research, then submit)
- Difficulty starts at 2 for new topics (matches Feynman score default)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 5, "tasks": ["7.1"] }
  ]
}
```
