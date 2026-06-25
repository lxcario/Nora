# Cornell Notes AI Template — Implementation Tasks

## Overview

Extends the existing Tiptap note editor with Cornell Method support. Order: Tiptap extension setup → layout component → AI cue generation → flashcard conversion → integration.

## Tasks

- [ ] 1. Tiptap document extension
  - [ ] 1.1 Extend existing note-editor to support Cornell document attrs
    - Add `cornellMode`, `summary`, `cueQuestions` to document attrs
    - Ensure these are serialized/deserialized with `rich_content` JSONB
    - Maintain backward compatibility (old notes without these attrs work fine)
    - _Requirements: 4.1, 4.3, 4.4_

- [ ] 2. Cornell layout components
  - [ ] 2.1 Create `src/app/(protected)/app/study-room/_components/cornell-mode-toggle.tsx`
    - Toggle button in editor toolbar
    - Reads/writes `cornellMode` document attr
    - _Requirements: 1.5_

  - [ ] 2.2 Create `src/app/(protected)/app/study-room/_components/cornell-layout.tsx`
    - Three-area responsive layout (30/70 + bottom)
    - CSS Grid: desktop side-by-side, mobile stacked
    - Renders cue column, main editor, summary area
    - _Requirements: 1.1, 1.4_

  - [ ] 2.3 Create `src/app/(protected)/app/study-room/_components/cue-questions-column.tsx`
    - List of cue question items, positioned relative to note paragraphs
    - "Add question" button at bottom
    - Loading state during AI generation
    - _Requirements: 2.2, 2.4_

  - [ ] 2.4 Create `src/app/(protected)/app/study-room/_components/cue-question-item.tsx`
    - Display question text (editable on click)
    - "Convert to Card" button (📇 icon)
    - Delete button (×)
    - Checkmark overlay when converted
    - _Requirements: 2.4, 3.1, 3.4, 3.6_

  - [ ] 2.5 Create `src/app/(protected)/app/study-room/_components/summary-area.tsx`
    - Simple textarea for student summary
    - Character count
    - Saves to document attrs on change
    - _Requirements: 1.3_

- [ ] 3. AI cue question generation
  - [ ] 3.1 Add `generateCueQuestions()` to `study-room.ts` server action
    - Accept: note content (string), existing questions (string[])
    - Validate: content ≥ 100 chars
    - Prompt LLM to generate 1–3 questions, avoiding duplicates
    - Return questions with anchor text for positioning
    - 5-second timeout, Groq primary / OpenRouter fallback
    - _Requirements: 2.1, 2.5, 2.6, 2.7_

  - [ ] 3.2 Wire auto-generation trigger in cornell-layout
    - Debounce: trigger after 5s typing pause
    - Minimum threshold: 100 chars in main notes
    - Regenerate on significant change (> 50 chars delta since last generation)
    - Match generated questions to paragraph positions using anchor text
    - _Requirements: 2.1, 2.3_

- [ ] 4. Flashcard conversion
  - [ ] 4.1 Implement card creation from cue question
    - Extract cue text → front, corresponding paragraph → back (truncate at 1000)
    - Create card with topic from current note context
    - Mark question as converted (isConverted = true)
    - Prevent duplicate conversion (button disabled when already converted)
    - Call existing card creation + rewardAction("card_created")
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 5. Checkpoint — Verify Cornell layout and cue generation

- [ ] 6. Integration with existing editor
  - [ ] 6.1 Modify `note-editor.tsx` to conditionally render Cornell layout
    - If note has `cornellMode: true` in rich_content, render Cornell layout
    - If not, render standard free-form editor (unchanged)
    - Cornell toggle in toolbar switches between modes
    - Content preservation on toggle (no data loss)
    - _Requirements: 1.2, 1.5, 4.2_

- [ ] 7. Final checkpoint — Full integration test
  - Test: activate Cornell → write notes → verify questions generated → convert to card → deactivate → reactivate → verify preserved.

## Notes

- No new database table needed — Cornell data stored in existing `rich_content` JSONB
- Backward compatible — notes without Cornell attrs render normally
- AI only generates the cue questions — "tutor not author" principle maintained
- Summary is always student-written (no AI assistance for summary)
- Cue question positioning is approximate (nearest paragraph) — doesn't need pixel-perfect alignment
- Existing auto-save (3s debounce) handles persistence of Cornell state

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["6.1"] }
  ]
}
```
