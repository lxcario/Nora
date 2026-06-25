# Socratic Voice Tutor — Implementation Tasks

## Overview

Adds voice-based Socratic Feynman mode using the Web Speech API. Implementation order: browser speech handling → Socratic follow-up action → session orchestration → pet integration → polish.

## Tasks

- [ ] 1. Schema update
  - [ ] 1.1 Add `mode` column to `feynman_explanations`
    - Create `supabase/migrations/015_voice_feynman.sql`
    - `ALTER TABLE feynman_explanations ADD COLUMN mode TEXT DEFAULT 'text' CHECK (mode IN ('text', 'voice'))`
    - _Requirements: 3.4_

- [ ] 2. Voice recording component
  - [ ] 2.1 Create `src/app/(protected)/app/_components/feynman/voice-recorder.tsx`
    - Wrap `SpeechRecognition` / `webkitSpeechRecognition` API
    - Configure: `continuous: true`, `interimResults: true`, `lang: 'en-US'`
    - Display interim text (italic) and final text (normal)
    - Auto-stop after 3s silence via timer on `onsoundend` / `onend`
    - Manual "Stop" button
    - Animated microphone indicator while recording
    - Handle errors: `no-speech`, `audio-capture`, `network`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2_

  - [ ] 2.2 Create `src/app/(protected)/app/_components/feynman/voice-mode-toggle.tsx`
    - Detect Web Speech API support on mount
    - Render toggle only when supported; render nothing otherwise
    - Toggle between text mode and voice mode
    - _Requirements: 1.6, 5.3_

  - [ ] 2.3 Add microphone permission handling
    - Use `navigator.permissions.query({ name: 'microphone' })` where available
    - Show appropriate message on `denied` state
    - _Requirements: 1.7_

- [ ] 3. Socratic follow-up server action
  - [ ] 3.1 Add `generateFollowUp()` to `feynman.ts`
    - Accept `explanation: string` and `topicId: string`
    - Validate explanation length ≥ 50 chars
    - Prompt LLM: identify weakest claim/gap, generate one Socratic question
    - 10-second timeout, Groq primary / OpenRouter fallback
    - Return `{ question: string }` or `{ error: string }`
    - _Requirements: 2.1, 2.2, 2.6_

- [ ] 4. Voice session orchestrator
  - [ ] 4.1 Create `src/app/(protected)/app/_components/feynman/voice-session-manager.tsx`
    - Implement state machine: idle → recording_turn1 → reviewing_turn1 → generating_followup → awaiting_turn2 → recording_turn2 → reviewing_turn2 → evaluating → complete
    - Editable textarea between recording and submission for transcript corrections
    - Concatenate turns: `turn1 + "\n\n" + turn2` (or just turn1 if skipped)
    - "Skip" button for Turn 2 (also triggered after 10s silence)
    - Enforce minimum lengths: Turn 1 ≥ 50 chars, Turn 2 ≥ 20 chars
    - Call existing `evaluateExplanation()` with combined transcript
    - Display existing Feynman results UI on completion
    - _Requirements: 1.8, 2.1, 2.3, 2.4, 2.5, 3.1, 3.2_

  - [ ] 4.2 Create `src/app/(protected)/app/_components/feynman/socratic-followup.tsx`
    - Display AI question with speech-bubble pixel art animation
    - "Answer with voice" and "Type answer" buttons
    - "Skip" button
    - _Requirements: 2.3_

- [ ] 5. Checkpoint — Verify voice flow end-to-end
  - Test full flow: speak → transcript → follow-up → respond → evaluate.

- [ ] 6. Gamification and session tracking
  - [ ] 6.1 Wire `rewardAction("feynman")` on voice session completion
    - Ensure same XP/coins as text mode
    - _Requirements: 3.3_

  - [ ] 6.2 Log voice session to `study_sessions`
    - Track duration from first speech start to evaluation complete
    - Set `mode: 'feynman'`
    - _Requirements: 3.5_

  - [ ] 6.3 Save feynman_explanation with `mode: 'voice'`
    - _Requirements: 3.4_

- [ ] 7. Pet integration
  - [ ] 7.1 Add pet animation triggers
    - `listening` animation while recording
    - `curious` animation when follow-up question appears
    - `celebrate` animation on score ≥ 70
    - `encourage` animation on score < 70
    - Wire via existing pet state management system
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Integration with existing Feynman UI
  - [ ] 8.1 Add Voice Mode toggle to Feynman editor
    - Integrate `voice-mode-toggle.tsx` in the Feynman page
    - When voice mode active, show `voice-session-manager` instead of textarea
    - When text mode active, show existing text editor (unchanged)
    - _Requirements: 1.6, 5.3_

- [ ] 9. Final checkpoint — Full integration test
  - Test on Chrome, Edge, Safari. Verify Firefox gracefully hides toggle.

## Notes

- Web Speech API is free and browser-native — no API costs for transcription
- Firefox doesn't support SpeechRecognition — toggle is hidden, not errored
- The follow-up question LLM call is the only new server cost per session
- Voice sessions produce identical `feynman_explanations` records as text mode
- Pet animations reuse existing sprite states (listening, curious, celebrate, encourage)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "7.1"] },
    { "id": 4, "tasks": ["8.1"] }
  ]
}
```
