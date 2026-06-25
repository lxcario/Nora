# Burnout Detector & Micro-Breaks — Requirements

## Introduction

The Burnout Detector monitors behavioral patterns from existing study data to identify early signs of burnout — without biometrics or invasive tracking. When burnout is detected, the system responds with compassion: the pet enters a cozy rest mode, suggests a guided breathing break, and notifies party members to check in. The goal is to catch declining engagement before the student hits a wall.

**Scope boundary:** The burnout detector reads existing tables (`study_sessions`, `card_reviews`, `feynman_explanations`) and runs server-side computation. It does not collect new data types, access device sensors, or use external wellness APIs. Micro-break content (breathing animation) is self-contained pixel art rendered client-side.

## Glossary

- **Burnout_Score**: A 0–100 integer representing the likelihood that a student is experiencing burnout, computed from behavioral signals over the past 7–14 days.
- **Burnout_Detector**: The server-side module that computes the Burnout_Score from study pattern analysis.
- **Signal**: A specific behavioral pattern that contributes to the Burnout_Score (e.g., shrinking sessions, rising lapse rate).
- **Micro_Break**: A short guided activity (2–3 minutes) offered when burnout is detected, featuring a pixel-art breathing circle animation.
- **Cozy_Rest_Mode**: A special pet animation state indicating the pet is encouraging rest rather than more study.

## Requirements

### Requirement 1: Burnout Signal Detection

**User Story:** As a student, I want the system to notice when my study patterns suggest burnout so I can get help before I crash.

#### Acceptance Criteria

1. THE Burnout_Detector SHALL compute a Burnout_Score from four behavioral signals, each measured over the past 7 days compared to the prior 7 days (14-day lookback total).
2. **Signal 1: Session duration shrinking** — WHEN average session duration over the past 7 days is less than 70% of the average from days 8–14, THE signal SHALL contribute 25 points to the Burnout_Score.
3. **Signal 2: Rising lapse rate** — WHEN the ratio of "Again" grades to total grades in the past 7 days exceeds the ratio from days 8–14 by more than 20 percentage points, THE signal SHALL contribute 25 points.
4. **Signal 3: Late-night shift** — WHEN more than 50% of study sessions in the past 7 days start after 11 PM in the user's timezone (vs ≤ 30% in days 8–14), THE signal SHALL contribute 25 points.
5. **Signal 4: Feynman avoidance** — WHEN the number of Feynman explanations in the past 7 days is less than 50% of the count from days 8–14 (minimum 2 in prior period), THE signal SHALL contribute 25 points.
6. THE Burnout_Score SHALL be the sum of triggered signals (0, 25, 50, 75, or 100).
7. THE Burnout_Detector SHALL classify: 0–24 = healthy, 25–49 = mild concern, 50–74 = moderate burnout risk, 75–100 = high burnout risk.

### Requirement 2: Burnout Detection Trigger

**User Story:** As a student, I want burnout detection to run automatically without me having to do anything.

#### Acceptance Criteria

1. THE Burnout_Detector SHALL compute the Burnout_Score when the user loads any protected page, throttled to at most once per 6 hours per user.
2. THE system SHALL store the most recent Burnout_Score and computation timestamp in the user's profile or a dedicated table.
3. IF the user has fewer than 3 study sessions in the past 14 days, THE Burnout_Detector SHALL skip computation and return a "insufficient data" status (not enough data to detect patterns).
4. THE Burnout_Detector computation SHALL complete within 2 seconds.

### Requirement 3: Gentle Intervention — Micro-Break

**User Story:** As a student experiencing burnout, I want the system to suggest a quick restorative break instead of pushing me to study harder.

#### Acceptance Criteria

1. WHEN the Burnout_Score is 50 or above (moderate/high), THE system SHALL display a non-blocking "Take a Break" suggestion on the next page load, featuring the pet in Cozy_Rest_Mode.
2. THE Micro_Break SHALL consist of a 3-minute guided breathing exercise with a pixel-art circle that expands (inhale) and contracts (exhale) over a 4-second inhale / 4-second exhale cycle.
3. WHEN the user accepts the break, THE system SHALL display the breathing animation full-screen with a soft ambient background (CSS gradient, no audio by default).
4. THE system SHALL allow the user to dismiss the break suggestion without penalty.
5. WHEN the user completes the full 3-minute break, THE system SHALL award a small XP bonus via `rewardAction("break_completed")` (5 XP, 2 coins) and display a gentle pet animation.
6. THE system SHALL not re-suggest a break within 12 hours of the last suggestion, regardless of Burnout_Score.
7. WHEN the Burnout_Score is 25–49 (mild), THE system SHALL display a subtle wellness indicator on the dashboard (e.g., amber dot) but NOT a break suggestion.

### Requirement 4: Pet Cozy Rest Mode

**User Story:** As a student, I want my pet to show concern when I might be burning out, making the suggestion feel caring rather than clinical.

#### Acceptance Criteria

1. WHEN the Burnout_Score is 50 or above, THE pet SHALL enter Cozy_Rest_Mode with a sleeping/relaxed animation (e.g., curled up, closed eyes, soft breathing).
2. THE Cozy_Rest_Mode SHALL persist on the pixel room until the next Burnout_Score computation returns below 50.
3. THE pet SHALL display a thought bubble with a heart or rest icon while in Cozy_Rest_Mode.

### Requirement 5: Party Check-In Notification

**User Story:** As a party member, I want to be gently notified when a teammate might be burning out so I can offer support.

#### Acceptance Criteria

1. WHEN a party member's Burnout_Score reaches 75 or above (high), THE system SHALL send a non-blocking "Check in on [display_name]" notification to all other party members, delivered on their next page load.
2. THE notification SHALL NOT reveal the Burnout_Score or specific behavioral data — only that the system thinks the member could use encouragement.
3. THE system SHALL send at most one party notification per burnout episode (defined as: score stays ≥ 75 continuously). A new notification is only sent after the score drops below 75 and rises above 75 again.
4. IF the user is not in a party, THE system SHALL skip party notifications entirely.

### Requirement 6: Data Model

**User Story:** As a developer, I want burnout data persisted efficiently for throttling and history.

#### Acceptance Criteria

1. THE system SHALL store burnout computations in a `burnout_checks` table with columns: id, user_id, score, signals (JSONB array of triggered signal names), computed_at, notified_party (boolean).
2. RLS policies SHALL restrict access to the user's own burnout records.
3. THE system SHALL retain at most 30 burnout_checks per user (rolling window) to avoid unbounded growth.
