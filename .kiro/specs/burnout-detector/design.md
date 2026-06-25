# Burnout Detector & Micro-Breaks — Design

## Overview

The Burnout Detector analyzes existing study behavior data server-side to produce a Burnout_Score. When the score indicates risk, the system suggests micro-breaks and notifies the student's party. No new data collection — just smart analysis of what already exists.

### Key Design Decisions

1. **No biometrics**: All signals come from existing tables (study_sessions, card_reviews, feynman_explanations). No camera, heartrate, or keystroke tracking.
2. **Throttled computation**: Runs at most once per 6 hours per user to avoid unnecessary DB load.
3. **Gentle UX**: Break suggestions are dismissible, never forced. Pet animations frame the intervention as caring, not clinical.
4. **Server-side scoring**: The Burnout_Score is computed server-side (pure function over query results) so it can't be gamed or accidentally leak private data to the client beyond the score.
5. **Rolling retention**: Max 30 records per user to prevent unbounded table growth.

---

## Architecture

```
src/app/(protected)/app/_actions/
├── burnout.ts                    # Server actions: computeBurnout, getBurnoutStatus

src/app/(protected)/app/_components/
├── burnout/
│   ├── break-suggestion.tsx      # Non-blocking break prompt with pet
│   ├── breathing-exercise.tsx    # Full-screen breathing animation
│   └── wellness-indicator.tsx    # Subtle amber dot for mild concern

src/lib/
├── burnout-signals.ts            # Pure function: computeBurnoutScore(signals)
```

### Data Flow

1. User loads any protected page → layout checks `shouldComputeBurnout(userId)` (throttle)
2. If needed: query study_sessions, card_reviews, feynman_explanations for 14-day window
3. Run `computeBurnoutScore()` — pure function, returns score + triggered signals
4. Store result in `burnout_checks`
5. If score ≥ 50 and no recent suggestion (12h): show break prompt
6. If score ≥ 75 and user is in a party and not recently notified: send party notification

---

## Pure Signal Computation

```typescript
// src/lib/burnout-signals.ts

interface BurnoutInput {
  sessions7d: StudySession[];          // last 7 days
  sessions14d: StudySession[];         // days 8–14
  reviews7d: CardReview[];             // last 7 days
  reviews14d: CardReview[];            // days 8–14
  feynman7d: FeynmanExplanation[];     // last 7 days
  feynman14d: FeynmanExplanation[];    // days 8–14
  userTimezone: string;
}

interface BurnoutResult {
  score: number;                       // 0, 25, 50, 75, or 100
  signals: string[];                   // names of triggered signals
  classification: 'healthy' | 'mild' | 'moderate' | 'high';
}

export function computeBurnoutScore(input: BurnoutInput): BurnoutResult;
```

Signal implementation:

1. **Session shrinking**: `avg(sessions7d.duration) < 0.7 * avg(sessions14d.duration)` → +25
2. **Rising lapse rate**: `(again7d / total7d) - (again14d / total14d) > 0.20` → +25
3. **Late-night shift**: `>50% of sessions7d start after 23:00 local` AND `≤30% of sessions14d start after 23:00 local` → +25
4. **Feynman avoidance**: `feynman7d.length < 0.5 * feynman14d.length` AND `feynman14d.length >= 2` → +25

---

## Data Model

### Migration: `016_burnout_detector.sql`

```sql
CREATE TABLE burnout_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  signals JSONB NOT NULL DEFAULT '[]',
  classification TEXT NOT NULL CHECK (classification IN ('healthy', 'mild', 'moderate', 'high')),
  notified_party BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_burnout_checks_user_computed ON burnout_checks(user_id, computed_at DESC);

ALTER TABLE burnout_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own burnout checks"
  ON burnout_checks FOR ALL USING (user_id = auth.uid());
```

Retention: The server action deletes records beyond 30 per user after each new insert.

---

## Micro-Break UI

### Breathing Animation

CSS-only animation (no sprite needed):

```css
@keyframes breathe {
  0%, 100% { transform: scale(0.6); opacity: 0.7; }
  50% { transform: scale(1.0); opacity: 1.0; }
}

.breathing-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--pixel-teal), var(--pixel-indigo));
  animation: breathe 8s ease-in-out infinite; /* 4s in, 4s out */
}
```

Pixel overlay option: a subtle pixel-grid pattern on the circle for style consistency.

Timer: 3 minutes = 22.5 full breath cycles. Display remaining time in MM:SS.

---

## Correctness Properties

### Property 1: Score is sum of triggered signals
*For any* set of inputs, the Burnout_Score SHALL equal exactly `25 * count(triggered_signals)`.
**Validates: Requirement 1.6**

### Property 2: Score range
*For any* computation, the Burnout_Score SHALL be one of: 0, 25, 50, 75, or 100.
**Validates: Requirement 1.6**

### Property 3: Classification mapping
*For any* score, classification SHALL be: 0–24 → healthy, 25–49 → mild, 50–74 → moderate, 75–100 → high.
**Validates: Requirement 1.7**

### Property 4: Insufficient data handling
*For any* user with fewer than 3 sessions in 14 days, computation SHALL return "insufficient data" and not produce a score.
**Validates: Requirement 2.3**

### Property 5: Throttle enforcement
*For any* user, computations SHALL be at least 6 hours apart.
**Validates: Requirement 2.1**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Fewer than 3 sessions in 14 days | Skip computation, return "insufficient data" |
| DB query timeout | Skip computation, log warning, try again next trigger |
| Party notification fails | Mark `notified_party: false`, retry on next cycle |
| Break animation interrupted (navigation) | Award no XP, don't log completion |
| Score computation error | Return previous score from cache |

---

## Integration Points

- **Gamification**: New action `rewardAction("break_completed")` — 5 XP, 2 coins
- **Party notifications**: Uses existing party notification pattern from social-parties spec
- **Pet state**: Extends pet animation states with `cozy_rest` mode
- **Layout**: Burnout check runs in the protected layout's server component (throttled)
