# Cornell Notes AI Template — Requirements

## Introduction

Cornell Notes adds a structured note-taking mode to the existing Tiptap editor in the Study Room. The Cornell method divides notes into three areas: main notes (right column), cue questions (left column), and a summary (bottom). The AI auto-generates cue questions from the student's notes, and students write their own summaries — maintaining the "tutor not author" principle. Cue questions can be converted to flashcards with one click.

**Scope boundary:** Cornell Notes is a mode toggle within the existing Tiptap note editor — not a separate page. It extends the editor already built for the Study Room. When toggled off, the editor returns to its default free-form layout. AI only generates questions (the left column) — the student writes everything else.

## Glossary

- **Cornell_Layout**: The three-area layout: cue questions (left, ~30%), main notes (right, ~70%), summary (bottom, full width).
- **Cue_Question**: An AI-generated question in the left column that corresponds to content in the main notes at the same vertical position.
- **Summary_Area**: The student-written summary at the bottom of the Cornell layout.
- **Cornell_Mode**: The toggle state that switches the editor between free-form and Cornell layout.

## Requirements

### Requirement 1: Cornell Layout

**User Story:** As a student, I want a structured three-column note layout so I can organize my thoughts using the Cornell method.

#### Acceptance Criteria

1. WHEN the student activates Cornell_Mode, THE editor SHALL switch to a three-area layout: cue questions column (left, approximately 30% width), main notes column (right, approximately 70% width), and summary area (bottom, full width).
2. THE main notes column SHALL retain all formatting capabilities from the existing editor (headings, bold, italic, lists, code, timestamp marks).
3. THE summary area SHALL be a text input that the student fills manually (AI does NOT generate the summary).
4. THE layout SHALL adapt to viewports below 768px by stacking areas vertically: main notes → cue questions → summary.
5. WHEN the student deactivates Cornell_Mode, THE editor SHALL return to the free-form layout, preserving all content (cue questions are hidden but retained in the document structure).

### Requirement 2: AI Cue Question Generation

**User Story:** As a student, I want AI to generate review questions from my notes so I don't have to come up with cue questions manually.

#### Acceptance Criteria

1. WHEN the student has typed at least 100 characters of main notes and pauses typing for 5 seconds, THE system SHALL generate 1–3 cue questions based on the note content.
2. THE generated cue questions SHALL be positioned vertically adjacent to the note content they reference (closest paragraph or heading).
3. THE system SHALL regenerate/update cue questions when notes content changes significantly (> 50 characters added/changed since last generation).
4. THE student SHALL be able to edit, delete, or manually add cue questions.
5. THE system SHALL generate cue questions within 5 seconds of triggering.
6. EACH cue question SHALL be between 10 and 150 characters.
7. IF the LLM is unavailable, THE system SHALL display an error icon on the cue column and allow manual question entry.

### Requirement 3: Flashcard Conversion

**User Story:** As a student, I want to convert cue questions into flashcards with one click so I can review them with spaced repetition.

#### Acceptance Criteria

1. EACH cue question SHALL display a "Convert to Card" button (card icon).
2. WHEN the student clicks "Convert to Card", THE system SHALL create a flashcard with the cue question as the front and the corresponding note paragraph as the back.
3. THE system SHALL pre-truncate the card back to 1000 characters if the note content exceeds it.
4. THE student SHALL see a brief confirmation when a card is created, and the cue question SHALL show a checkmark indicating it has been converted.
5. THE card SHALL inherit the video/topic association from the current note context.
6. THE system SHALL prevent duplicate conversions (clicking again on an already-converted cue does nothing).

### Requirement 4: Persistence and Integration

**User Story:** As a student, I want my Cornell notes saved as part of my regular notes so everything is in one place.

#### Acceptance Criteria

1. THE Cornell layout state (cue questions, summary) SHALL be stored as structured data within the existing `notes.rich_content` JSONB field.
2. THE auto-save behavior SHALL work identically to the free-form editor (debounced 3-second save).
3. WHEN loading a note that was saved in Cornell_Mode, THE editor SHALL restore the Cornell layout with all cue questions and summary intact.
4. THE Cornell_Mode toggle state SHALL be stored per-note so different notes can have different modes.
