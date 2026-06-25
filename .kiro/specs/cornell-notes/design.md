# Cornell Notes AI Template — Design

## Overview

Extends the existing Tiptap note editor with a Cornell Mode toggle. When active, the editor renders a three-area layout. AI generates cue questions from note content (left column), the student writes the main notes (right) and summary (bottom). One-click flashcard creation from cue questions closes the learning loop.

### Key Design Decisions

1. **Tiptap extension, not separate editor**: Cornell Mode is implemented as a Tiptap extension that restructures the document. No new editor instance.
2. **Document-level metadata for layout**: Store Cornell state (questions, summary, mode) in the Tiptap document's attrs or a custom top-level node, serialized to the existing `rich_content` JSONB.
3. **AI generates questions only**: The "tutor not author" principle means AI assists with questions but never writes main content or summaries.
4. **Debounced generation**: Questions regenerate after 5s typing pause + 100+ chars, not continuously.
5. **Flashcard from structured data**: Since cue questions and notes are structured (not just prose), card creation is straightforward extraction.

---

## Architecture

```
src/app/(protected)/app/study-room/_components/
├── note-editor.tsx            # MODIFIED: add Cornell Mode support
├── cornell-mode-toggle.tsx    # Toggle button
├── cornell-layout.tsx         # Three-area container
├── cue-questions-column.tsx   # Left column with generated questions
├── summary-area.tsx           # Bottom summary textarea
├── cue-question-item.tsx      # Single question with edit/convert/delete

src/app/(protected)/app/_actions/
├── study-room.ts              # EXTENDED: generateCueQuestions() action
```

### Tiptap Document Structure (Cornell Mode)

```typescript
// When Cornell Mode is active, the document has this structure:
interface CornellDocument {
  type: 'doc';
  attrs: {
    cornellMode: boolean;
    summary: string;
    cueQuestions: CueQuestion[];
  };
  content: ParagraphNode[]; // main notes content (unchanged)
}

interface CueQuestion {
  id: string;
  text: string;             // 10–150 chars
  anchorParagraphIndex: number; // which paragraph this references
  isConverted: boolean;     // true if already made into a card
  createdAt: string;
}
```

### Server Action

```typescript
// Added to study-room.ts
export async function generateCueQuestions(
  noteContent: string,
  existingQuestions: string[]
): Promise<{ questions: GeneratedCue[] } | { error: string }>;

interface GeneratedCue {
  text: string;              // the question
  anchorText: string;        // snippet of note it references (for positioning)
}
```

Prompt: "Given these student notes, generate 1–3 review cue questions. Each question should target a key concept and be answerable from the notes. Don't repeat existing questions: [list]. Format: JSON array of {text, anchorText}."

---

## Component Design

### `cornell-layout.tsx`

```typescript
interface CornellLayoutProps {
  editor: Editor;
  noteId: string;
  topicId?: string;
  onSave: () => void;
}
```

Layout (desktop ≥ 768px):
```
┌──────────────────────────────────────────────┐
│  Cue Questions (30%)  │  Main Notes (70%)     │
│                       │                       │
│  Q: What is...?  [📇]│  Paragraph 1...       │
│                       │                       │
│  Q: Why does...? [📇]│  Paragraph 2...       │
│                       │                       │
├───────────────────────┴───────────────────────┤
│  Summary (student writes this)                │
│  ________________________________________________ │
└──────────────────────────────────────────────┘
```

### `cue-question-item.tsx`

```typescript
interface CueQuestionItemProps {
  question: CueQuestion;
  onEdit: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
}
```

Renders:
- Question text (editable on click)
- Convert-to-card button (📇 icon, disabled if already converted)
- Delete button (×)
- Checkmark overlay if already converted

---

## Flashcard Conversion Logic

```typescript
function convertCueToCard(cue: CueQuestion, paragraphs: string[], topicId?: string) {
  const front = cue.text; // max 150 chars, always valid for card front (limit 200)
  const referencedParagraph = paragraphs[cue.anchorParagraphIndex] || '';
  const back = referencedParagraph.slice(0, 1000); // truncate to card back limit
  
  return { front, back, topicId, sourceType: 'notes' };
}
```

---

## Correctness Properties

### Property 1: Cue question length bounds
*For any* generated cue question, the text SHALL be between 10 and 150 characters.
**Validates: Requirement 2.6**

### Property 2: Card front from cue fits limits
*For any* cue question text used as card front, the length SHALL not exceed 200 characters.
**Validates: Requirement 3.2**

### Property 3: Card back truncation
*For any* note paragraph used as card back, if length > 1000 chars, the card back SHALL be truncated to 1000.
**Validates: Requirement 3.3**

### Property 4: Mode toggle preserves content
*For any* document with content, toggling Cornell mode off and back on SHALL not lose any main note text, cue questions, or summary text.
**Validates: Requirement 1.5**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| LLM unavailable for cue generation | Show error icon on left column, allow manual entry |
| LLM returns invalid questions | Filter out malformed entries, show whatever is valid |
| Notes too short for question generation | Don't generate until 100+ chars |
| Cue column empty (no questions yet) | Show placeholder: "Questions will appear as you write" |
| Save fails | Same as existing editor: warning indicator + 10s retry |
| Very long notes (5000+ chars) | Only send last 2000 chars + headings to LLM for generation |

---

## Data Model

No new tables. Cornell data is stored in the existing `notes.rich_content` JSONB field:

```json
{
  "type": "doc",
  "attrs": {
    "cornellMode": true,
    "summary": "Student's written summary...",
    "cueQuestions": [
      { "id": "abc", "text": "What is...?", "anchorParagraphIndex": 0, "isConverted": false }
    ]
  },
  "content": [...]
}
```

Migration needed: None (JSONB is schema-flexible). The `rich_content` column already exists.
