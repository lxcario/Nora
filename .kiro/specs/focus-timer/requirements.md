# Adaptive Focus Timer — Requirements

## Introduction

The Focus Timer is an adaptive Pomodoro-style timer that adjusts work/break intervals based on the student's historical focus data. It integrates with the pixel room as a desk clock, offers themed break activities, and logs focus sessions for gamification. The timer learns the student's optimal focus duration over time rather than forcing a rigid 25/5 split on everyone.

**Scope boundary:** The Focus Timer is a standalone widget accessible from the pixel room and as a dedicated route. It logs sessions to the existing `study_sessions` table with `mode='focus'`. It does not control what the student does during focus blocks — it's a time management tool, not a content delivery system.

## Glossary

- **Focus_Block**: A single work interval during which the student is studying, lasting between 10 and 60 minutes.
- **Break_Block**: A rest interval between Focus_Blocks, lasting between 3 and 15 minutes.
- **Focus_Session**: A complete series of Focus_Blocks and Break_Blocks, typically ending when the student stops or completes a planned number of blocks.
- **Adaptive_Engine**: The logic that adjusts Focus_Block and Break_Block durations based on historical patterns.
- **Break_Activity**: A themed mini-activity offered during Break_Blocks (garden, pet companion, stretch quest).

## Requirements

### Requirement 1: Timer Core

**User Story:** As a student, I want a focus timer that counts down my work blocks and tells me when to take breaks.

#### Acceptance Criteria

1. WHEN a student starts a Focus_Session, THE system SHALL begin a countdown timer with the configured Focus_Block duration (default 25 minutes for new users).
2. WHEN a Focus_Block countdown reaches zero, THE system SHALL play an 8-bit chime sound (Web Audio API) and transition to a Break_Block countdown.
3. WHEN a Break_Block countdown reaches zero, THE system SHALL play a different 8-bit chime and prompt the student to start the next Focus_Block.
4. THE system SHALL display the remaining time in MM:SS format with a visual progress ring.
5. THE student SHALL be able to pause, resume, and cancel the timer at any time.
6. THE system SHALL support configurable block counts per session (default 4 Focus_Blocks).

### Requirement 2: Adaptive Duration

**User Story:** As a student, I want the timer to learn my focus patterns and suggest optimal durations.

#### Acceptance Criteria

1. THE Adaptive_Engine SHALL compute the recommended Focus_Block duration from the student's average session duration over the last 14 days, clamped between 10 and 60 minutes.
2. THE Adaptive_Engine SHALL compute recommended Break_Block duration as 20% of the Focus_Block duration, clamped between 3 and 15 minutes.
3. WHEN a student has fewer than 5 focus sessions in history, THE Adaptive_Engine SHALL use the default 25/5 split.
4. THE system SHALL display the recommended durations to the student, who can override them before starting.
5. WHEN a student consistently ends sessions early (>60% of sessions ended before timer in last 7 days), THE Adaptive_Engine SHALL suggest a shorter Focus_Block.

### Requirement 3: Pixel Room Integration

**User Story:** As a student, I want to see my timer as a pixel desk clock in my room so it feels part of the environment.

#### Acceptance Criteria

1. THE system SHALL render a pixel-art desk clock in the pixel room that shows the timer state (idle, counting, break).
2. WHEN the timer is running, THE desk clock SHALL visually indicate remaining time (progress bar or clock face animation).
3. THE student SHALL be able to start a Focus_Session by clicking the desk clock in the pixel room.
4. THE system SHALL also provide a standalone timer route at `/app/focus` for full-screen usage.

### Requirement 4: Themed Break Activities

**User Story:** As a student, I want fun break activities so I actually rest instead of scrolling my phone.

#### Acceptance Criteria

1. WHEN a Break_Block starts, THE system SHALL offer the student a choice of themed break activities.
2. THE system SHALL provide at least 3 break activity options: "Water Garden" (view memory map/knowledge web in read-only mode), "Pet Companion" (play with pet for affinity boost), "Stretch Quest" (pixel-art guided stretches).
3. EACH break activity SHALL be self-contained and completable within the Break_Block duration.
4. IF the student does not select a break activity, THE system SHALL display a simple countdown timer for the break.

### Requirement 5: Audio and Celebrations

**User Story:** As a student, I want satisfying audio feedback when I complete focus blocks.

#### Acceptance Criteria

1. THE system SHALL generate 8-bit chime sounds using Web Audio API (no audio file downloads required).
2. THE system SHALL play a short chime (0.5s) at Focus_Block end and a different chime (0.3s) at Break_Block end.
3. THE system SHALL allow the student to mute/unmute audio.
4. WHEN a Focus_Block completes, THE pet SHALL display a celebration animation (bounce, sparkle).
5. WHEN a full Focus_Session completes (all planned blocks done), THE pet SHALL display an enhanced celebration.

### Requirement 6: Session Logging and Gamification

**User Story:** As a student, I want my focus sessions to count toward my study progress and earn rewards.

#### Acceptance Criteria

1. WHEN a Focus_Block completes, THE system SHALL log a study_session record with `mode='focus'` and the actual duration of the block.
2. THE system SHALL award XP via `rewardAction("session_complete")` (10 XP, 3 coins) for each completed Focus_Block.
3. WHEN a full Focus_Session completes (all blocks), THE system SHALL award a bonus of 20 XP and 5 coins.
4. THE system SHALL increment pet affinity for each completed Focus_Block.
5. THE system SHALL display XP toast notifications on block completion.
