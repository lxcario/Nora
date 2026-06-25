# Socratic Voice Tutor — Requirements

## Introduction

Voice Feynman adds a voice-based Socratic dialogue mode to the existing Feynman technique feature. Students explain concepts verbally using the Web Speech API (browser-native, free), receive real-time transcription, and get AI-driven follow-up questions that probe understanding gaps. The transcribed text feeds into the existing `evaluateExplanation()` pipeline. The feature uses a structured two-turn conversation format: explain → AI questions → student answers → AI evaluates.

**Scope boundary:** Voice Feynman is a mode within the existing Feynman explanation workflow, not a separate page. It adds a "Voice Mode" toggle to the Feynman editor at `/app/study-room` and the dedicated Feynman page. It does not replace text-based Feynman — both modes coexist. Voice sessions count toward study minutes and pet affinity through existing gamification hooks.

## Glossary

- **Voice_Session**: A single voice-based Feynman explanation session consisting of up to two turns of student speech and one AI follow-up question.
- **Speech_Recognizer**: The browser-native Web Speech API (`SpeechRecognition`) component that converts student speech to text.
- **Socratic_Responder**: The server action that generates a probing follow-up question based on the student's initial explanation.
- **Turn**: One segment of student speech within a Voice_Session. Turn 1 is the initial explanation; Turn 2 is the response to the AI's follow-up question.
- **Transcript**: The combined text from both turns, concatenated for evaluation.

## Requirements

### Requirement 1: Voice Input via Web Speech API

**User Story:** As a student, I want to explain concepts by speaking so that I can practice articulating ideas naturally without typing.

#### Acceptance Criteria

1. WHEN a user activates Voice Mode, THE Speech_Recognizer SHALL begin listening for speech input using the browser's native `SpeechRecognition` API with `continuous: true` and `interimResults: true`.
2. THE Speech_Recognizer SHALL display interim (in-progress) text in a distinct style (lighter color/italic) and final (committed) text in normal style, updating in real-time as the user speaks.
3. WHEN the user pauses speaking for more than 3 seconds, THE Speech_Recognizer SHALL automatically stop listening and treat the accumulated text as the completed turn.
4. THE system SHALL display a visible "Recording" indicator (animated microphone icon) while the Speech_Recognizer is actively listening.
5. THE system SHALL provide a manual "Stop" button to end recording before the 3-second silence threshold.
6. IF the browser does not support the Web Speech API, THEN THE system SHALL hide the Voice Mode toggle and display no error (graceful degradation).
7. THE Speech_Recognizer SHALL request microphone permission and display an appropriate message if permission is denied.
8. WHEN speech recognition produces a final transcript, THE system SHALL display the transcribed text in an editable textarea allowing the student to correct errors before submission.

### Requirement 2: Two-Turn Socratic Dialogue

**User Story:** As a student, I want the AI to ask me a follow-up question after my explanation so that I'm pushed to think deeper.

#### Acceptance Criteria

1. WHEN the student completes Turn 1 (initial explanation of at least 50 characters), THE Socratic_Responder SHALL generate one probing follow-up question within 10 seconds.
2. THE follow-up question SHALL target the weakest part of the explanation — a gap, vague claim, or unsupported assertion — identified by the LLM.
3. THE system SHALL display the AI follow-up question with a visual speech bubble animation and then prompt the student to respond (voice or text).
4. WHEN the student completes Turn 2 (response to follow-up, at least 20 characters), THE system SHALL concatenate both turns and submit the combined transcript to the existing `evaluateExplanation()` pipeline.
5. IF the student skips Turn 2 (clicks "Skip" or remains silent for 10 seconds), THE system SHALL submit only Turn 1 to the evaluation pipeline.
6. THE Socratic_Responder SHALL use the same LLM (Groq primary, OpenRouter fallback) as the existing Feynman evaluation.

### Requirement 3: Integration with Existing Feynman Pipeline

**User Story:** As a student, I want my voice explanations evaluated the same way as typed ones so that I get consistent feedback regardless of input method.

#### Acceptance Criteria

1. THE combined transcript from a Voice_Session SHALL be passed to `evaluateExplanation()` with the same parameters (topicId, sourceRef) as a text-based explanation.
2. THE evaluation result (gap analysis, color-coded segments, probing questions, suggested flashcards) SHALL be displayed using the existing Feynman results UI components.
3. WHEN a Voice_Session completes evaluation, THE system SHALL award XP via `rewardAction("feynman")` (15 XP, 5 coins) — identical to text-based Feynman.
4. THE system SHALL create a `feynman_explanations` record with the full transcript and a `mode` field set to "voice".
5. Voice_Sessions SHALL count toward study minutes: the session duration (from first speech start to evaluation complete) is logged to `study_sessions` with `mode: 'feynman'`.

### Requirement 4: Pet Reactions During Voice Sessions

**User Story:** As a student, I want my pet to react while I'm speaking so that the experience feels engaging and alive.

#### Acceptance Criteria

1. WHILE the Speech_Recognizer is active, THE pet character SHALL display a "listening" animation (e.g., head tilted, ears perked).
2. WHEN the AI follow-up question is displayed, THE pet SHALL display a "curious" animation (e.g., question mark bubble).
3. WHEN evaluation completes with a score ≥ 70, THE pet SHALL display a "celebration" animation.
4. WHEN evaluation completes with a score < 70, THE pet SHALL display an "encouraging" animation (not punishing).

### Requirement 5: Error Handling and Browser Compatibility

**User Story:** As a student, I want voice mode to work reliably or gracefully inform me when it can't.

#### Acceptance Criteria

1. IF a speech recognition error occurs (network error, audio capture error, or `no-speech` event), THEN THE system SHALL display a non-blocking error message and allow the user to retry or switch to text mode.
2. IF the speech recognition service returns empty text after the user appeared to speak (recording indicator was active for > 5 seconds), THEN THE system SHALL suggest the user check their microphone settings.
3. THE system SHALL detect Web Speech API support on component mount and only render the Voice Mode toggle when supported.
4. IF the user's browser supports Web Speech API but recognition repeatedly fails (3 consecutive errors), THEN THE system SHALL suggest switching to text mode and disable automatic retry.
