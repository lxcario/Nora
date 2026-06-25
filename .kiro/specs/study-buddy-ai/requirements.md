# AI Study Buddy Error-Spotter — Requirements

## Introduction

The Study Buddy AI acts as a peer that deliberately makes mistakes in explanations. The student's job is to catch the errors and explain why they're wrong — a proven active learning technique (per arxiv 2507.12801, peer learning requires similar proficiency; AI imitating mistakes at the right level enables effective peer learning without needing a real peer). Catching errors earns "Teacher XP" on a separate track.

**Scope boundary:** The Study Buddy operates on existing topics and cards, generating flawed explanations for the student to critique. It does not replace Feynman mode (where the student explains) — it complements it (the student evaluates). Teacher XP is tracked separately from regular XP. The feature integrates with the existing gamification system for coins/achievements.

## Glossary

- **Error_Explanation**: An LLM-generated explanation containing deliberate calibrated mistakes for the student to identify.
- **Error_Challenge**: A single session where the student reviews an Error_Explanation, identifies mistakes, and explains corrections.
- **Teacher_XP**: A separate experience track earned by correctly catching and explaining errors.
- **Error_Difficulty**: The calibration level of planted errors, ranging from 1 (obvious) to 5 (subtle), scaled to the student's proficiency.
- **Error_Item**: A specific deliberate mistake within an Error_Explanation, with its location, type, and correct information.

## Requirements

### Requirement 1: Error Explanation Generation

**User Story:** As a student, I want the AI to generate explanations with calibrated mistakes so I can practice catching errors at my level.

#### Acceptance Criteria

1. WHEN a student starts an Error_Challenge for a topic, THE system SHALL generate an Error_Explanation of 100–400 words containing between 1 and 3 deliberate errors.
2. THE system SHALL calibrate Error_Difficulty based on the student's average Feynman comprehension score for that topic: score 0–30 → difficulty 1–2, score 31–60 → difficulty 2–3, score 61–100 → difficulty 3–5.
3. THE system SHALL generate errors of different types: factual errors (wrong facts), logical errors (flawed reasoning), and conceptual errors (misapplied concepts).
4. EACH Error_Item SHALL be recoverable from the text — the system stores the error location, type, the incorrect statement, and the correct information.
5. THE Error_Explanation SHALL be contextually appropriate for the selected topic, drawing on the topic's associated cards and papers when available.
6. IF the student has no Feynman scores for the topic, THE system SHALL default to Error_Difficulty 2 (moderate/obvious errors).
7. THE system SHALL generate the Error_Explanation within 15 seconds.

### Requirement 2: Error Identification Interface

**User Story:** As a student, I want to highlight parts of the explanation I think are wrong and explain why.

#### Acceptance Criteria

1. THE system SHALL display the Error_Explanation as readable text with the ability to select/highlight passages.
2. WHEN a student selects a passage (10–200 characters) and submits a correction (20–500 characters explaining why it's wrong), THE system SHALL record this as an error identification attempt.
3. THE system SHALL allow the student to identify up to 5 passages per challenge (preventing spam while allowing more attempts than actual errors).
4. THE student SHALL be able to submit their identifications and get results at any time (they don't have to find all errors).
5. THE system SHALL display a "Submit for Grading" button that evaluates all identifications at once.

### Requirement 3: Error Evaluation and Scoring

**User Story:** As a student, I want to know which errors I correctly identified and get feedback on ones I missed.

#### Acceptance Criteria

1. WHEN the student submits identifications, THE system SHALL evaluate each one against the stored Error_Items using the LLM to determine if the student correctly identified a real error.
2. THE system SHALL classify each identification as: correct (matched a real error + valid explanation), partial (found the right area but wrong explanation), false positive (identified a non-error as an error), or missed (a real error the student didn't find).
3. THE system SHALL award Teacher_XP based on results: +15 XP per correct identification, +5 XP per partial, -5 XP per false positive (minimum 0 total per session), +5 XP bonus for finding all errors.
4. THE system SHALL display results with each Error_Item revealed, showing which the student found and which they missed, with the correct explanations.
5. WHEN results are displayed, THE system SHALL highlight missed errors in the original text and show the correct information.

### Requirement 4: Teacher XP Track

**User Story:** As a student, I want a separate "Teacher XP" track so catching errors feels like a distinct achievement.

#### Acceptance Criteria

1. THE system SHALL maintain a separate `teacher_xp` column on the user's profile, independent of regular XP.
2. THE system SHALL display Teacher XP with a distinct icon/badge on the dashboard (e.g., graduation cap).
3. THE system SHALL track Teacher XP levels: 0–100 = Novice, 101–300 = Tutor, 301–600 = Mentor, 601+ = Professor.
4. THE system SHALL award coins (shared currency) alongside Teacher XP: 3 coins per correct identification.
5. WHEN a student reaches a new Teacher XP level, THE system SHALL display an achievement notification.

### Requirement 5: Adaptive Difficulty

**User Story:** As a student, I want the errors to get subtler as I improve so the challenge stays engaging.

#### Acceptance Criteria

1. THE system SHALL track the student's error-catching accuracy per topic (correct identifications / total real errors presented).
2. WHEN accuracy exceeds 80% over the last 5 challenges, THE system SHALL increase Error_Difficulty by 1 (max 5).
3. WHEN accuracy drops below 40% over the last 5 challenges, THE system SHALL decrease Error_Difficulty by 1 (min 1).
4. DIFFICULTY 1–2: errors are factually obvious (wrong dates, wrong names, contradictions). DIFFICULTY 3: subtle factual errors + some logical flaws. DIFFICULTY 4–5: nuanced conceptual errors that require deep understanding.
5. THE system SHALL store difficulty adjustments to persist across sessions.
