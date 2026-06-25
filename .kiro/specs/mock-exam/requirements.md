# Exam Simulation Mode ("Mock Exam") — Requirements

## Overview
Generate timed practice exams from the student's flashcards and Feynman explanations with MCQ, short answer, and explain-in-your-own-words questions. Adaptive difficulty weighted toward weak topics, with post-exam gap analysis.

## Research Basis
- Testing effect: retrieving information strengthens memory more than re-reading (Bjork, 1994)
- Desirable difficulties: introducing challenge during retrieval improves long-term retention
- Timed practice reduces real exam anxiety (neuralconsult.com)
- MIT 2025: confidence declarations + AI feedback on practice exams transform study behavior

## Requirements

### 1. Exam Generation
- 1.1: Generate 10-30 questions from the student's cards, Feynman explanations, and research answers
- 1.2: Question types: multiple choice (4 options), short answer, explain-in-own-words
- 1.3: Distribution: ~50% MCQ, ~30% short answer, ~20% explain
- 1.4: Adaptive difficulty: weight questions toward topics with low FSRS stability + low Feynman scores
- 1.5: MCQ distractors must be plausible (AI-generated from related concepts, not random)
- 1.6: Questions grounded in student's actual content (never test on material they haven't studied)
- 1.7: Support "Quick Quiz" (5 questions, 5 min) and "Full Exam" (20 questions, 30 min) modes

### 2. Timed Session
- 2.1: Configurable time limit per exam mode
- 2.2: Countdown timer visible throughout the session
- 2.3: Questions can be skipped and returned to later
- 2.4: Auto-submit when time expires (unanswered = incorrect)
- 2.5: Optional "calm mode" with no timer (for anxiety-prone students)

### 3. Answering & Grading
- 3.1: MCQ: deterministic grading (one correct answer)
- 3.2: Short answer: AI-graded with rubric (accept synonyms, partial credit)
- 3.3: Explain: AI-evaluated using existing Feynman segment classification (green/amber/red)
- 3.4: Confidence declaration before each answer (1-5 scale, feeds calibration data)
- 3.5: After each question is graded, show correct answer + brief explanation

### 4. Post-Exam Gap Analysis
- 4.1: Overall score (%) with topic breakdown
- 4.2: Per-topic performance chart (which topics were strongest/weakest)
- 4.3: Missed question list with correct answers and source references
- 4.4: Auto-generate flashcards from missed questions (one-click save to FSRS queue)
- 4.5: Recommended next actions ("Review topic X", "Do a Feynman session on Y")

### 5. Gamification
- 5.1: XP award: +15 for completing a Full Exam, +5 for Quick Quiz
- 5.2: "Exam Master" badge for scoring >90% on a Full Exam
- 5.3: Party quest integration: exam completions count as study sessions
- 5.4: Score history per topic (sparkline trend)

### 6. UI/UX
- 6.1: Accessible from a dedicated "Practice Exam" page and from each topic's detail view
- 6.2: Exam configuration modal: select topics, question count, timer mode
- 6.3: Progress bar during exam (question N of M)
- 6.4: Results page with celebratory animation on high scores
- 6.5: Pixel-art exam paper/scroll theme for the exam interface
