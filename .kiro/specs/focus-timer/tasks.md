# Adaptive Focus Timer — Implementation Tasks

## Build Status

**Slice 1 — shipped (client-only, demoable, no DB writes):**
- [x] `src/lib/focus-adaptive.ts` — pure `computeRecommendation()` (injectable clock for testing)
- [x] `src/lib/focus-audio.ts` — 8-bit focus/break/complete chimes (Web Audio, safe no-op fallback)
- [x] `src/app/(protected)/app/focus/_components/focus-timer.tsx` — full state machine (idle→focus→break→…→complete), pause/resume/reset, MM:SS + SVG progress ring, mute, localStorage persistence, override inputs. (Combined the spec's display/controls/adaptive-settings/timer files into one cohesive component.)
- [x] `src/app/(protected)/app/focus/page.tsx` — server page; reads focus sessions (empty until slice 2) → `computeRecommendation` → renders timer
- [x] Sidebar link added to `STUDY_CHILDREN` in `game-sidebar.tsx` (the intentional shared-component regression surface)
- [x] TestSprite plan `.testsprite/plans/focus-timer.plan.json`
- Verified: `tsc --noEmit` clean; existing suite 326/332 (6 failures are pre-existing pdf-parse env issues, unrelated)
- NOT done (deliberately): unit tests for `focus-adaptive` (add when ready); pixel desk clock; break activities

**Slice 2 — the regression vector (do DURING the loop, when CLI credits return):**
This is the change most likely to break existing tests, so run it through TestSprite to catch regressions.
1. Migration `020_focus_session_mode.sql`: extend the `study_sessions.mode` CHECK to include `'focus'` (currently only `feynman|review|research|planner` — so logging `mode='focus'` fails until this lands). Consider adding `'video'` too if not already applied in prod.
2. `src/app/(protected)/app/_actions/focus.ts`: `logFocusBlock(durationMinutes)` → insert `study_sessions(mode='focus')` + `rewardAction("session_complete")` + pet affinity; `logFocusSessionComplete(totalBlocks)` → bonus XP/coins; `getFocusHistory()` already partially read by the page.
3. Wire `focus-timer.tsx` block/session completion to call those actions (XP toast on completion).
4. **Rerun the FULL suite** — this touches `study_sessions` (shared by dashboard streak/quests + analytics), so watch `dashboard-loads`, `analytics-page`, and `sidebar-navigation` for regressions. Pull the failure bundle, fix, rerun → bank.

Loop commands when credits return:
```
testsprite test create --plan-from .testsprite/plans/focus-timer.plan.json --run --wait --target-url https://norastudy.vercel.app --timeout 600 --output json
testsprite test rerun --all --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --wait --output json
```

## Overview

Implements an adaptive Pomodoro timer with pixel room integration, 8-bit audio, and themed breaks. Order: pure adaptive logic → audio synthesis → timer component → server logging → pixel room integration → break activities.

## Tasks

- [ ] 1. Pure adaptive logic
  - [ ] 1.1 Create `src/lib/focus-adaptive.ts`
    - Implement `computeRecommendation(history)`: average duration from 14-day window → clamp 10–60 min focus, 3–15 min break
    - Handle < 5 sessions → default 25/5
    - Detect early-end pattern (> 60% ended early) → suggest shorter
    - Return recommendation with confidence and reason
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 1.2 Write unit tests for adaptive logic
    - Test default case (< 5 sessions)
    - Test clamping (very short/long averages)
    - Test early-end adaptation
    - Test confidence levels

- [ ] 2. Audio synthesis
  - [ ] 2.1 Create `src/lib/focus-audio.ts`
    - Implement `playFocusEndChime(ctx)`: 8-bit ascending arpeggio, 0.5s
    - Implement `playBreakEndChime(ctx)`: 8-bit descending two-note, 0.3s
    - Implement `createAudioContext()`: lazy AudioContext creation (user gesture required)
    - _Requirements: 5.1, 5.2_

- [ ] 3. Timer component
  - [ ] 3.1 Create `src/app/(protected)/app/focus/_components/timer-display.tsx`
    - Circular SVG progress ring with remaining MM:SS in center
    - Color: blue during focus, green during break
    - Pixel-art font for time display
    - _Requirements: 1.4_

  - [ ] 3.2 Create `src/app/(protected)/app/focus/_components/timer-controls.tsx`
    - Play/Pause/Stop buttons with pixel-art icons
    - Block counter ("Block 2/4")
    - Mute toggle for audio
    - _Requirements: 1.5, 5.3_

  - [ ] 3.3 Create `src/app/(protected)/app/focus/_components/adaptive-settings.tsx`
    - Display recommended focus/break durations with confidence reason
    - Number inputs to override (constrained to valid ranges)
    - Block count selector (1–8, default 4)
    - _Requirements: 1.6, 2.4_

  - [ ] 3.4 Create `src/app/(protected)/app/focus/_components/focus-timer.tsx`
    - Main timer state machine: idle → running → break_prompt → break_running → focus_prompt → complete
    - localStorage persistence for cross-navigation survival
    - requestAnimationFrame/setInterval countdown
    - Chime playback on transitions
    - Pet celebration triggers on block/session completion
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.4, 5.5_

- [ ] 4. Focus page
  - [ ] 4.1 Create `src/app/(protected)/app/focus/page.tsx`
    - Server component fetching recent study_sessions (mode='focus') for adaptive computation
    - Render full-screen timer layout
    - _Requirements: 3.4_

- [ ] 5. Server logging
  - [ ] 5.1 Create `src/app/(protected)/app/_actions/focus.ts`
    - Implement `logFocusBlock(durationMinutes)`: create study_session with mode='focus', award XP via rewardAction("session_complete"), increment pet affinity
    - Implement `logFocusSessionComplete(totalBlocks)`: award bonus 20 XP + 5 coins
    - Implement `getFocusHistory()`: return last 14 days of focus sessions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Checkpoint — Verify timer works end-to-end

- [ ] 7. Pixel room integration
  - [ ] 7.1 Create `pixel-desk-clock.tsx`
    - Small pixel-art clock sprite (16x16 or 24x24)
    - Idle: shows static clock face
    - Active: progress bar or animated clock hands
    - Click to start focus session (navigates to /app/focus or opens inline)
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 7.2 Integrate clock into pixel room
    - Add desk clock component to pixel-room.tsx at desk position
    - Wire click handler to start focus session

- [ ] 8. Break activities
  - [ ] 8.1 Create `break-activity-picker.tsx`
    - Display 3 break options with pixel-art icons
    - "Skip" option for plain countdown
    - _Requirements: 4.1, 4.4_

  - [ ] 8.2 Create `break-garden.tsx`
    - Read-only view of knowledge web / topic cards
    - Calming green pixel-art styling
    - _Requirements: 4.2_

  - [ ] 8.3 Create `break-pet.tsx`
    - Pet play interaction (click to pet, affinity boost)
    - Simple animation sequence
    - _Requirements: 4.2_

  - [ ] 8.4 Create `break-stretch.tsx`
    - Pixel-art stick figure showing stretch poses
    - 30-second intervals between poses
    - _Requirements: 4.2, 4.3_

- [ ] 9. Navigation
  - [ ] 9.1 Add Focus Timer to sidebar
    - Link to `/app/focus` with Timer/Clock icon from Lucide

- [ ] 10. Final checkpoint — Full end-to-end verification

## Notes

- Timer runs client-side — server only logs completed blocks
- localStorage persists timer state across navigations (prevents lost progress)
- Web Audio requires user gesture to initialize — first click/tap on page
- Tab visibility handling ensures timer stays accurate when backgrounded
- No new DB table needed — uses existing study_sessions with mode='focus'
- Break activities are optional and self-contained — can be built incrementally

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["3.4", "5.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["9.1"] }
  ]
}
```
