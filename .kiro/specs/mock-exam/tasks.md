# Exam Simulation Mode — Tasks

## Task 1: Database schema
- [ ] Create migration for `practice_exams` table
- [ ] Add RLS policy (user_id = auth.uid())
- [ ] Add index on (user_id, created_at)

## Task 2: Server action — generateExam
- [ ] Create `src/app/(protected)/app/_actions/exam.ts`
- [ ] ExamConfig type: { topicIds, mode: 'quick'|'full', timerEnabled }
- [ ] Fetch cards for selected topics (sort by ascending stability)
- [ ] Fetch latest Feynman explanations for question context
- [ ] Build LLM prompt: request MCQ (50%) + short answer (30%) + explain (20%)
- [ ] Parse and validate question JSON structure
- [ ] Insert exam record into practice_exams
- [ ] Return exam ID + questions (without answers for client)

## Task 3: Server action — submitExam
- [ ] Grade MCQ deterministically (correctIndex comparison)
- [ ] Grade short answers via LLM (rubric-based, partial credit)
- [ ] Grade explain questions via Feynman segment evaluator (reuse existing)
- [ ] Compute overall score_percent
- [ ] Compute per-topic scores (topic_scores JSONB)
- [ ] Update exam record with answers, scores, submitted_at
- [ ] Award XP via rewardAction
- [ ] Return graded results

## Task 4: Server action — createCardsFromMissed
- [ ] Accept examId + array of question IDs
- [ ] For each missed question, generate front/back flashcard
- [ ] Insert into cards with source_type='exam'
- [ ] Award card_created XP batch

## Task 5: Exam configuration page
- [ ] Create `src/app/(protected)/app/exam/page.tsx`
- [ ] ExamConfig component: topic multi-select, mode toggle, timer toggle
- [ ] "Start Exam" button → calls generateExam → navigates to exam session
- [ ] Past exams list with scores and dates
- [ ] Loading skeleton

## Task 6: Exam runner component
- [ ] Create `exam/[examId]/page.tsx` — fetch exam, render ExamRunner
- [ ] ExamRunner: displays one question at a time
- [ ] Navigation: Previous / Next / Skip / Submit
- [ ] Progress bar (question N of M)
- [ ] Timer component (countdown, auto-submit on expiry)
- [ ] Confidence selector (1-5) per question
- [ ] Store answers in local state, submit on finish

## Task 7: Question display components
- [ ] `question-card.tsx` — renders MCQ (radio buttons), short answer (text input), explain (textarea)
- [ ] MCQ: 4 option buttons with pixel-art styling
- [ ] Short answer: single-line input
- [ ] Explain: textarea with min 50 char requirement

## Task 8: Results page
- [ ] Create `exam/[examId]/results/page.tsx`
- [ ] Call submitExam action on mount (or display cached results)
- [ ] Score card with percentage and letter grade
- [ ] Topic breakdown bar chart
- [ ] Missed questions list with correct answers
- [ ] "Create cards from missed" button
- [ ] Recommended next actions
- [ ] Celebratory animation for high scores (>80%)

## Task 9: Navigation & integration
- [ ] Add "Practice Exam" to sidebar navigation
- [ ] Add exam button to topic detail views
- [ ] Party quest: exam completions count as study sessions
- [ ] Analytics: exam score trend over time
