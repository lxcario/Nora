# Collaborative Deck Sharing — Design

## Overview

Card Market allows party members to share and import flashcard decks within their group. Decks are snapshots (not live references), imported cards get fresh FSRS state, and quality emerges from aggregate grading patterns across importers.

### Key Design Decisions

1. **Snapshot, not reference**: Shared decks store card content at share-time. No sync complexity.
2. **Fresh FSRS on import**: Importers start with New state. This prevents inheriting someone else's scheduling, which would break the memory model.
3. **Quality from grades, not votes**: No manual voting UI. Quality is derived from actual learning outcomes (Easy grades = good cards, Again grades = poor quality). More reliable than star ratings.
4. **Party-scoped only**: No global marketplace. Keeps it simple, leverages existing party trust.
5. **JSONB snapshots**: Cards stored as JSONB array in the deck row — avoids complex joins and makes the import operation atomic.

---

## Architecture

```
src/app/(protected)/app/party/
├── _components/
│   ├── card-market.tsx          # Browse/import shared decks
│   ├── share-deck-dialog.tsx    # Share topic's cards with party
│   └── deck-quality-badge.tsx   # Star/score display

src/app/(protected)/app/_actions/
├── card-market.ts               # Server actions
```

### Server Actions

```typescript
// card-market.ts
export async function shareDeck(topicId: string): Promise<{ deckId: string } | { error: string }>;
export async function importDeck(deckId: string): Promise<{ cardsImported: number } | { error: string }>;
export async function getSharedDecks(): Promise<SharedDeckView[]>;
export async function unshareDeck(deckId: string): Promise<{ success: boolean }>;
export async function recomputeQualityScore(deckId: string): Promise<number>;
```

---

## Data Models

### Migration: `017_card_market.sql`

```sql
CREATE TABLE shared_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  card_snapshots JSONB NOT NULL, -- [{front: string, back: string}]
  quality_score FLOAT NOT NULL DEFAULT 3.0 CHECK (quality_score BETWEEN 1.0 AND 5.0),
  import_count INTEGER NOT NULL DEFAULT 0 CHECK (import_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(party_id, creator_id, topic_id)
);

CREATE TABLE deck_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES shared_decks(id) ON DELETE CASCADE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, deck_id)
);

CREATE INDEX idx_shared_decks_party ON shared_decks(party_id, quality_score DESC);
CREATE INDEX idx_shared_decks_creator ON shared_decks(creator_id);
CREATE INDEX idx_deck_imports_user ON deck_imports(user_id);
CREATE INDEX idx_deck_imports_deck ON deck_imports(deck_id);

ALTER TABLE shared_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Party members can view shared decks"
  ON shared_decks FOR SELECT
  USING (party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can share decks to their party"
  ON shared_decks FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Creators can delete own decks"
  ON shared_decks FOR DELETE
  USING (creator_id = auth.uid());

CREATE POLICY "Users can view own imports"
  ON deck_imports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create imports"
  ON deck_imports FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

---

## Quality Score Algorithm

```typescript
function computeQualityScore(deckId: string, reviews: ImporterReview[]): number {
  if (reviews.length < 10) return 3.0; // not enough data

  const now = Date.now();
  const halfLife = 14 * 24 * 60 * 60 * 1000; // 14 days in ms
  
  let weightedEasy = 0;
  let weightedAgain = 0;
  let totalWeight = 0;
  
  for (const review of reviews) {
    const age = now - review.reviewedAt.getTime();
    const weight = Math.exp(-age * Math.LN2 / halfLife);
    totalWeight += weight;
    if (review.rating === 'Easy') weightedEasy += weight;
    if (review.rating === 'Again') weightedAgain += weight;
  }
  
  const easyRatio = weightedEasy / totalWeight;
  const againRatio = weightedAgain / totalWeight;
  
  // Base 3.0, +2 at 100% easy, -2 at 100% again
  const score = 3.0 + (easyRatio * 2) - (againRatio * 2);
  return Math.max(1.0, Math.min(5.0, score));
}
```

---

## Correctness Properties

### Property 1: Import produces fresh FSRS state
*For any* deck import, all created cards SHALL have state=0 (New), stability=null, difficulty=null, due=now.
**Validates: Requirement 3.1**

### Property 2: No duplicate imports
*For any* user-deck pair, at most one deck_import record SHALL exist.
**Validates: Requirement 3.4**

### Property 3: Quality score bounds
*For any* deck, quality_score SHALL be between 1.0 and 5.0 inclusive.
**Validates: Requirement 4.2, 4.3**

### Property 4: Deck card count bounds
*For any* shared deck, card_snapshots SHALL contain between 3 and 200 items.
**Validates: Requirement 1.1**

### Property 5: Party isolation
*For any* user, getSharedDecks() SHALL return only decks where party_id matches the user's current party.
**Validates: Requirement 2.4**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| User not in a party | Return error: "Join a party to access shared decks" |
| Topic has < 3 cards | Reject share: "Need at least 3 cards to share a deck" |
| Topic has > 200 cards | Truncate to 200 most-reviewed cards |
| Duplicate import attempt | Reject with: "You've already imported this deck" |
| Already shared this topic | Reject with: "You already have a shared deck for this topic" |
| Max 10 decks reached | Reject with: "Maximum 10 shared decks. Remove one to share more." |
| Party deleted | CASCADE deletes all shared_decks |
