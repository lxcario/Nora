# Spec: Practice Exam Mode (Quiz + Mock Exam from PDFs)

**Build timing:** June 30–July 2 (build week Days 1–3, during TestSprite loop)
**Inspired by:** Astra AI's exam prep flow — but built on Nora's existing RAG pipeline

---

## What This Adds

Two new features that close Nora's biggest gap vs. competitors like Astra AI:

1. **Quick Quiz** — generate 5-10 MCQ questions from your uploaded PDFs or topic content
2. **Mock Exam** — timed exam simulation (10/20/30 min) with mixed question types, scored at the end

Both use content from:
- Uploaded PDFs (already in `paper_chunks` via RAG pipeline)
- Feynman explanations (already in `feynman_explanations`)
- Existing flashcard deck (already in `cards`)

---

## User Flow

### Quick Quiz (from sidebar or after Feynman/Research)

```
User clicks "Quick Quiz" → selects topic/paper → AI generates 5-10 MCQs
→ Each question: 4 options, one correct → User picks answer
→ Immediate feedback per question (correct/wrong + explanation)
→ Score at end (7/10) + XP reward + weak areas highlighted
→ Wrong answers → auto-create flashcards for review
```

### Mock Exam (dedicated page)

```
User goes to /app/exam → Setup screen:
  - Select topic(s) or paper(s) to test from
  - Question count: 10 / 20 / 30
  - Time limit: 10 / 20 / 30 minutes (or untimed)
  - Question types: MCQ only / MCQ + Short Answer / Mixed

→ Exam starts:
  - Countdown timer (visible, not anxiety-inducing — pixel-art style)
  - One question at a time, progress bar
  - MCQ: 4 options, pick one
  - Short Answer: text input (evaluated by AI after)
  - Can flag questions for review

→ Exam ends (time up or all answered):
  - Score screen: X/Y correct, percentage, time taken
  - Per-question breakdown (correct answer, your answer, explanation)
  - Weak topics identified
  - Wrong answers → flashcards created automatically
  - XP + coins reward based on score
  - FSRS: correct answers grade the source card as Good, wrong as Again
```

---

## How It Connects to Existing Systems

### Content Source: RAG Pipeline

The questions are generated from REAL content the student uploaded:

```
User's uploaded PDFs → paper_chunks (already embedded + indexed)
     ↓
AI query: "Generate 10 MCQ questions from these chunks about [topic]"
     ↓
LLM generates questions WITH distractors based on actual chunk content
     ↓
Each question has: stem, 4 options, correct answer, explanation, source chunk ID
```

This means every question is GROUNDED in the student's own material — not random
AI-generated trivia. Citations trace back to specific chunks.

### Content Source: Flashcard Deck

For topics without uploaded PDFs, use existing cards:

```
User's flashcard deck for topic → card.front becomes question stem
     ↓
AI generates 3 plausible wrong answers (distractors) from:
  - Other cards in the same topic (confusable concepts)
  - Feynman amber/red segments (common misconceptions)
     ↓
MCQ: card.front = question, card.back = correct answer, 3 AI distractors
```

### Gamification Integration

| Action | XP | Coins |
|---|---|---|
| Complete a Quick Quiz | +5 | +2 |
| Complete a Mock Exam | +15 | +5 |
| Score 80%+ on Mock Exam | +10 bonus | +5 bonus |
| Perfect score | +25 bonus | +10 bonus |

### FSRS Integration

After the exam:
- Questions answered correctly → source card gets `submitReview(cardId, Rating.Good)`
- Questions answered wrong → source card gets `submitReview(cardId, Rating.Again)`
- Questions from RAG (no existing card) → create a new card from the question

This means taking exams feeds back into the spaced repetition system.

---

## Technical Architecture

### New Route

```
src/app/(protected)/app/exam/
├── page.tsx              ← Setup screen (server component)
├── loading.tsx           ← Skeleton
└── _components/
    ├── exam-setup.tsx    ← Topic/paper selection, question count, timer
    ├── exam-session.tsx  ← Shared: active exam (Quick Quiz AND Mock Exam)
    └── exam-results.tsx  ← Score screen with breakdown
```

**No separate `quick-quiz.tsx`.** Both modes use `exam-session.tsx` with
different config params passed from setup.

### New Server Action

```
src/app/(protected)/app/_actions/exam.ts

Functions:
- generateExamQuestions(topicId, paperId?, count, types)
  → Queries paper_chunks OR cards
  → Sends to LLM with distractor generation prompt
  → Returns: { questions: ExamQuestion[] }

- submitExamResults(questions, answers, duration)
  → Scores answers
  → Creates flashcards for wrong answers
  → Calls rewardAction for XP
  → Calls submitReview for FSRS integration
  → Returns: { score, breakdown, cardsCreated }
```

### New Types

```ts
interface ExamQuestion {
  id: string;
  type: "mcq" | "short_answer";
  stem: string;           // The question text
  options?: string[];     // 4 options for MCQ
  correctIndex?: number;  // Which option is correct (0-3)
  correctAnswer?: string; // For short answer
  explanation: string;    // Why this is the answer
  sourceChunkId?: string; // RAG citation
  sourceCardId?: string;  // If generated from a flashcard
  difficulty: "easy" | "medium" | "hard";
}

interface ExamResult {
  questionId: string;
  userAnswer: string | number;
  correct: boolean;
  timeSpent: number; // ms on this question
}
```

### Database (optional — can skip for hackathon)

Could add an `exam_sessions` table for history, but for the hackathon the
results can be ephemeral (just shown on the results screen + cards created).
Skip the migration unless time allows.

---

## LLM Prompt for MCQ Generation

```
You are generating exam questions from study material. The student is preparing
for a real exam on this topic.

SOURCE MATERIAL (from their uploaded PDF / notes):
{chunks}

Generate {count} multiple-choice questions. For each question:
1. Write a clear question stem that tests UNDERSTANDING, not just recall
2. Write exactly 4 answer options (A, B, C, D)
3. One must be clearly correct based on the source material
4. The other 3 must be plausible but wrong (common misconceptions, partial truths, confusable concepts)
5. Write a brief explanation of why the correct answer is right

RULES:
- Questions should test different Bloom's levels (some recall, some application, some analysis)
- Distractors should be plausible — not obviously wrong
- Every correct answer must be verifiable from the source material
- Do NOT use "all of the above" or "none of the above"

Respond as JSON array:
[{
  "stem": "...",
  "options": ["A...", "B...", "C...", "D..."],
  "correctIndex": 0,
  "explanation": "...",
  "difficulty": "easy|medium|hard"
}]
```

---

## Regression Potential (why build this during hackathon week)

Building this DURING the TestSprite loop creates genuine regressions because:

1. **Imports `submitReview` from review.ts** — same function the Review page uses.
   If exam mode calls it differently, existing review tests might behave differently.

2. **Imports `rewardAction` from gamification.ts** — XP calculations shared with
   Feynman, Review, Study Mix. Changes to reward patterns here affect the dashboard.

3. **New sidebar nav item** — changes the GameSidebar, which all page tests interact with.

4. **RAG query** — uses `queryRag` or `match_paper_chunks_hybrid`. If the exam
   query pattern differs from Research Desk's, it could surface RAG bugs.

5. **New route** — Needs its own loading.tsx, error handling, auth gate. All of
   which the layout.tsx onboarding guard interacts with.

This is exactly the kind of feature that WILL break something the loop is watching.

---

## What NOT to Build (out of scope)

- Oral/voice exam (too complex, needs speech-to-text)
- Podcast generation (different product direction)
- Photo solver / snap-to-solve (computer vision, out of scope)
- Adaptive difficulty that learns across sessions (post-hackathon)
- Exam history page (nice-to-have, not for build week)

---

## Implementation Order (during build week)

**Day 2 (July 1):**
1. Create route structure (`/app/exam/page.tsx` + components)
2. Build `exam-setup.tsx` (topic/paper picker, count, timer)
3. Build `_actions/exam.ts` with `generateExamQuestions`
4. Add MCQ grounding validator (check correct answer against source chunk)
5. Test generation locally — validate: array length matches count, JSON valid,
   max_tokens guard, no truncation

**CHECKPOINT: Show `submitExamResults` implementation to reviewer before
wiring into `rewardAction` / `submitReview`. Do not deploy until approved.**

**Day 3 (July 2):**
6. Build `exam-session.tsx` (shared by both Quick Quiz and Mock Exam — 
   differentiated by setup params: count, timer on/off, question types)
7. Build `exam-results.tsx` (score, breakdown, card creation)
8. Wire FSRS integration + gamification (after checkpoint approval)
9. Add sidebar nav link
10. Deploy → TestSprite catches regressions → fix → rerun

**Architecture note:** Quick Quiz and Mock Exam share `exam-session.tsx`.
Quick Quiz = `{count: 5-10, timer: null, types: "mcq"}`.
Mock Exam = `{count: 10-30, timer: 600-1800s, types: "mixed"}`.
NO separate `quick-quiz.tsx` component needed.

---

## Safeguards (learned from Research Desk)

### MCQ Grounding Validator

After LLM generates questions, BEFORE showing to student:

```ts
function validateExamQuestion(question: ExamQuestion, sourceChunk: string): boolean {
  // Extract key content words from the correct answer
  const answerWords = extractContentWords(question.options[question.correctIndex]);
  const chunkWords = extractContentWords(sourceChunk);
  
  // Check overlap — correct answer must be grounded in source
  const overlap = groundingScore(answerWords, chunkWords);
  
  // Threshold: 0.25 (slightly higher than Research Desk's 0.20
  // because exam grading consequences are more severe)
  return overlap >= 0.25;
}

// Questions that fail grounding check are DROPPED, not shown.
// If too many drop (< 50% pass), regenerate with stricter prompt.
```

### Generation Guards (same as Research Desk)

- `max_tokens: 4000` (prevent runaway generation)
- Validate returned array length === requested count
- If array is short (model truncated), request remaining questions in follow-up
- `stripCodeFences()` before JSON.parse (same utility Research Desk uses)
- Rate limit: one exam generation per 30 seconds per user

---

## Summary

This feature makes Nora competitive with Astra AI's exam prep flow while
leveraging the existing RAG pipeline and FSRS system. It's grounded in the
student's own materials (not random trivia), feeds back into spaced repetition,
and is architecturally designed to create real regressions during the TestSprite
loop — exactly what the hackathon scores on.
