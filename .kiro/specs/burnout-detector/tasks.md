# Burnout Detector & Micro-Breaks — Implementation Tasks

## Overview

Implements behavioral burnout detection from existing study data, gentle break suggestions, and party notifications. Order: schema → pure scoring logic → server action → UI components → pet integration → party notifications.

## Tasks

- [ ] 1. Database schema
  - [ ] 1.1 Create `supabase/migrations/016_burnout_detector.sql`
    - Create `burnout_checks` table with all columns and constraints
    - Add index on (user_id, computed_at DESC)
    - Enable RLS with user-scoped policy
    - _Requirements: 6.1, 6.2_

- [ ] 2. Pure scoring function
  - [ ] 2.1 Create `src/lib/burnout-signals.ts`
    - Implement `computeBurnoutScore(input)` pure function
    - Signal 1: Session duration shrinking (< 70% of prior period) → +25
    - Signal 2: Rising lapse rate (> 20pp increase) → +25
    - Signal 3: Late-night shift (> 50% after 11 PM vs ≤ 30%) → +25
    - Signal 4: Feynman avoidance (< 50% of prior, min 2 in prior) → +25
    - Return score, signal names, classification
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 2.2 Write unit tests for `computeBurnoutScore`
    - Test each signal in isolation
    - Test all signals combined = 100
    - Test no signals = 0
    - Test edge cases: exactly at thresholds
    - Test insufficient data path
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3_

- [ ] 3. Server action
  - [ ] 3.1 Create `src/app/(protected)/app/_actions/burnout.ts`
    - Implement `computeBurnout()`: throttle check (6h), query 14-day window, call pure function, store result, prune old records (>30)
    - Implement `getBurnoutStatus()`: return latest score + last suggestion time
    - Implement `completeMicroBreak()`: award XP, log completion
    - Handle insufficient data (< 3 sessions)
    - 2-second timeout target for computation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.5, 6.3_

  - [ ] 3.2 Add `rewardAction("break_completed")` to gamification
    - 5 XP, 2 coins
    - _Requirements: 3.5_

- [ ] 4. Checkpoint — Verify scoring logic and server action

- [ ] 5. UI components
  - [ ] 5.1 Create `src/app/(protected)/app/_components/burnout/break-suggestion.tsx`
    - Non-blocking modal/banner with pet in Cozy_Rest_Mode
    - "Take a 3-min break" button and "Not now" dismiss
    - Only shows if score ≥ 50 and no suggestion in last 12h
    - _Requirements: 3.1, 3.4, 3.6_

  - [ ] 5.2 Create `src/app/(protected)/app/_components/burnout/breathing-exercise.tsx`
    - Full-screen overlay with pixel-art breathing circle
    - 4s inhale (expand) + 4s exhale (contract) cycle
    - 3-minute timer display (MM:SS countdown)
    - "End early" button
    - On completion: call `completeMicroBreak()`, show pet celebration
    - Soft CSS gradient background
    - _Requirements: 3.2, 3.3, 3.5_

  - [ ] 5.3 Create `src/app/(protected)/app/_components/burnout/wellness-indicator.tsx`
    - Subtle amber dot/icon for mild concern (25–49)
    - Displayed on dashboard/sidebar
    - Tooltip: "You seem a bit stressed lately. Take it easy."
    - _Requirements: 3.7_

- [ ] 6. Pet Cozy Rest Mode
  - [ ] 6.1 Add `cozy_rest` animation state to pet system
    - Curled up / closed eyes / soft breathing sprite animation
    - Thought bubble with heart/rest icon
    - Triggers when Burnout_Score ≥ 50
    - Persists in pixel room until score drops below 50
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. Party notification
  - [ ] 7.1 Implement party burnout notification
    - When score ≥ 75 and user is in a party and not recently notified
    - Send "Check in on [name]" to party members (non-blocking, next page load)
    - Don't reveal score or specific data
    - Mark `notified_party: true` on the burnout_check record
    - Only re-notify after score drops below 75 and rises again
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Integration with layout
  - [ ] 8.1 Wire burnout check in protected layout
    - Call `computeBurnout()` (throttled) in layout server component
    - Pass burnout status to client for UI rendering
    - Show break suggestion or wellness indicator based on score
    - _Requirements: 2.1_

- [ ] 9. Final checkpoint — End-to-end verification
  - Verify: signal detection → score → UI suggestion → break completion → XP.

## Notes

- All computation is from existing tables — no new data collection
- Pure function makes testing easy — no mocks needed for the scoring logic
- Throttle prevents excessive DB queries (max 4 computations per day per user)
- Rolling 30-record retention prevents table bloat
- Break animation is CSS-only (no sprite sheet needed), with optional pixel-grid overlay

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["6.1", "7.1"] },
    { "id": 5, "tasks": ["8.1"] }
  ]
}
```
