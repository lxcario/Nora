# Exam Simulation Mode — Design

## Architecture

```
Config (topics, count, timer) → generateExam server action → LLM → ExamSession JSON
                                                                        ↓
                                                      ExamRunner component (timed)
                                                                        ↓
                                                      submitExam server action
                                                                        ↓
                                              AI grading (short answer + explain) → Results page
                                                                        ↓
                                              Auto-generate cards from missed questions
```

## Data Model

### New Table: `practice_exams`
```sql
CREATE TABLE practice_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  mode TEXT NOT NULL CHECK (mode IN ('quick', 'full')),
  topic_ids UUID[] NOT NULL,
  questions_json JSONB NOT NULL,
  answers_json JSONB,
  score_percent REAL,
  topic_scores JSONB, -- { topicId: { correct: N, total: M } }
  time_limit_seconds INT,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE practice_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own exams" ON practice_exams FOR ALL USING (user_id = auth.uid());
```

### Question JSON Structure
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "topicId": "uuid",
      "question": "What is X?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 2,
      "sourceCardId": "uuid",
      "difficulty": "medium"
    },
    {
      "id": "q2",
      "type": "short_answer",
      "topicId": "uuid",
      "question": "Explain Y briefly.",
      "rubric": "Must mention A and B",
      "modelAnswer": "Y is...",
      "difficulty": "hard"
    },
    {
      "id": "q3",
      "type": "explain",
      "topicId": "uuid",
      "question": "Explain concept Z as if teaching a beginner.",
      "evaluationCriteria": ["accuracy", "completeness", "clarity"],
      "difficulty": "hard"
    }
  ]
}
```

## Server Actions

### `generateExam(config: ExamConfig)`
1. Validate: at least 1 topic selected, min 5 cards across selected topics
2. Fetch cards for selected topics (prioritize low stability, recent lapses)
3. Fetch Feynman explanations for context
4. Build LLM prompt requesting N questions with type distribution
5. Parse and validate questions JSON
6. Insert exam record (questions_json populated, answers_json null)
7. Return exam ID + questions

### `submitExam(examId, answers: Answer[])`
1. Fetch exam from DB
2. Grade MCQs deterministically
3. Grade short answers via LLM (accept synonyms, partial credit 0/0.5/1)
4. Grade explain questions via existing Feynman segment evaluator
5. Compute score_percent and topic_scores
6. Update exam record
7. Award XP
8. Return results

### `createCardsFromMissed(examId, questionIds: string[])`
- Generate flashcards from missed questions
- Insert into cards table with source_type = 'exam'

## Components

```
src/app/(protected)/app/exam/
  page.tsx                     -- Config modal + exam history
  [examId]/page.tsx            -- Active exam session
  [examId]/results/page.tsx    -- Results & gap analysis
  _components/
    exam-config.tsx            -- Topic/mode selector
    exam-runner.tsx            -- Timed question display
    question-card.tsx          -- Individual question (MCQ/short/explain)
    exam-timer.tsx             -- Countdown timer
    exam-results.tsx           -- Score + gap analysis
    topic-breakdown.tsx        -- Per-topic chart
```

## Gamification
- Quick Quiz complete: `rewardAction("card_created")` equivalent → +5 XP
- Full Exam complete: custom reward → +15 XP, +5 coins, +3 affinity
- >90% badge: `exam_master` stored in profiles achievements JSONB
