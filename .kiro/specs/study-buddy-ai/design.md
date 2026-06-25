# AI Study Buddy Error-Spotter — Design

## Overview

The Study Buddy AI generates intentionally flawed explanations for students to critique. It calibrates error difficulty to the student's level using Feynman scores and adapts based on error-catching accuracy. A separate Teacher XP track rewards successful error identification.

### Key Design Decisions

1. **Stored error items**: Errors are decided at generation time and stored — evaluation doesn't rely solely on the LLM re-judging (deterministic grading baseline).
2. **LLM for final evaluation**: While error items are pre-stored, the student's corrections still need LLM evaluation for partial credit (the student might use different wording).
3. **Separate XP track**: Teacher XP doesn't pollute main progression. Keeps the "teaching" identity distinct from "learning."
4. **Difficulty from Feynman scores**: Reuses an existing signal. No new assessment needed.
5. **Topic-scoped challenges**: Each challenge targets one topic for focused practice.

---

## Architecture

```
src/app/(protected)/app/study-buddy/
├── page.tsx                           # Server component — topic selector
├── _components/
│   ├── challenge-display.tsx          # Renders error explanation with highlight capability
│   ├── error-marker.tsx               # Selection-based error marking UI
│   ├── challenge-results.tsx          # Show identified/missed errors
│   └── teacher-xp-badge.tsx           # Teacher XP level display

src/app/(protected)/app/_actions/
├── study-buddy.ts                     # Server actions
```

### Server Actions

```typescript
// study-buddy.ts
export async function generateChallenge(topicId: string): Promise<{
  challengeId: string;
  explanation: string;
  errorCount: number; // hint: "This contains N errors"
  difficulty: number;
} | { error: string }>;

export async function submitIdentifications(challengeId: string, identifications: Identification[]): Promise<{
  results: IdentificationResult[];
  missedErrors: RevealedError[];
  teacherXpEarned: number;
  coinsEarned: number;
  newAccuracy: number;
} | { error: string }>;

export async function getTeacherStats(): Promise<{
  totalXp: number;
  level: string;
  accuracy: Record<string, number>; // topicId → accuracy
  challengesCompleted: number;
}>;

interface Identification {
  selectedText: string;      // 10–200 chars
  correction: string;        // 20–500 chars
  startOffset: number;       // character position in explanation
}

interface IdentificationResult {
  identification: Identification;
  verdict: 'correct' | 'partial' | 'false_positive';
  feedback: string;
}

interface RevealedError {
  errorText: string;
  correctInfo: string;
  errorType: 'factual' | 'logical' | 'conceptual';
}
```

---

## Data Models

### Migration: `018_study_buddy.sql`

```sql
-- Add teacher_xp to profiles
ALTER TABLE profiles ADD COLUMN teacher_xp INTEGER NOT NULL DEFAULT 0 CHECK (teacher_xp >= 0);

-- Error challenges
CREATE TABLE error_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL CHECK (length(explanation) BETWEEN 100 AND 2000),
  error_items JSONB NOT NULL, -- [{location, type, incorrect, correct}]
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'evaluated')),
  identifications JSONB, -- student's submitted identifications
  results JSONB, -- evaluation results
  teacher_xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evaluated_at TIMESTAMPTZ
);

-- Accuracy tracking per topic
CREATE TABLE error_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  accuracy FLOAT NOT NULL DEFAULT 0.5 CHECK (accuracy BETWEEN 0 AND 1),
  challenges_completed INTEGER NOT NULL DEFAULT 0,
  current_difficulty INTEGER NOT NULL DEFAULT 2 CHECK (current_difficulty BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

CREATE INDEX idx_error_challenges_user ON error_challenges(user_id, created_at DESC);
CREATE INDEX idx_error_challenges_topic ON error_challenges(user_id, topic_id);
CREATE INDEX idx_error_accuracy_user ON error_accuracy(user_id);

ALTER TABLE error_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own challenges" ON error_challenges FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own accuracy" ON error_accuracy FOR ALL USING (user_id = auth.uid());
```

---

## Error Generation Prompt Strategy

```
You are generating a study explanation for {topic} at difficulty level {difficulty}/5.
Include exactly {errorCount} deliberate errors.

Difficulty guide:
- Level 1-2: Obvious factual errors (wrong numbers, names, dates)
- Level 3: Subtle factual + one logical flaw
- Level 4-5: Nuanced conceptual errors requiring deep understanding

Context from student's cards: {cardContent}

Requirements:
- Write 100-400 words explaining the topic
- Embed {errorCount} errors naturally (don't signal them)
- Return JSON: { explanation: string, errors: [{ text: string, type: string, correct: string }] }
```

---

## Correctness Properties

### Property 1: Error count bounds
*For any* generated challenge, the error count SHALL be between 1 and 3 inclusive.
**Validates: Requirement 1.1**

### Property 2: Difficulty calibration from Feynman score
*For any* Feynman score F, difficulty SHALL be: F∈[0,30]→1–2, F∈[31,60]→2–3, F∈[61,100]→3–5.
**Validates: Requirement 1.2**

### Property 3: Teacher XP is non-negative per session
*For any* set of identification results, the total Teacher_XP earned in a session SHALL be ≥ 0.
**Validates: Requirement 3.3**

### Property 4: Difficulty adaptation bounds
*For any* accuracy history, difficulty SHALL stay between 1 and 5 inclusive.
**Validates: Requirement 5.2, 5.3**

### Property 5: Identification limit
*For any* challenge submission, at most 5 identifications SHALL be accepted.
**Validates: Requirement 2.3**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| LLM timeout on generation | Return error, suggest retry |
| LLM returns invalid JSON | Retry once with stricter prompt; fail with error |
| Student submits empty identifications | Allow — shows all errors as "missed" |
| No cards/papers for topic | Generate from topic name alone (less contextual) |
| LLM unavailable during evaluation | Queue for retry, show "evaluating..." status |
| Challenge older than 24h | Auto-expire, don't award XP |

---

## Teacher XP Levels

| Level | XP Range | Title |
|-------|----------|-------|
| 1 | 0–100 | Novice |
| 2 | 101–300 | Tutor |
| 3 | 301–600 | Mentor |
| 4 | 601+ | Professor |
