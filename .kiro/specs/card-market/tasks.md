# Collaborative Deck Sharing — Implementation Tasks

## Overview

Adds deck sharing within parties. Implementation order: schema → server actions (share, import, quality) → UI (browse, share dialog) → quality recomputation.

## Tasks

- [ ] 1. Database schema
  - [ ] 1.1 Create `supabase/migrations/017_card_market.sql`
    - Create `shared_decks` table with UNIQUE constraint on (party_id, creator_id, topic_id)
    - Create `deck_imports` table with UNIQUE constraint on (user_id, deck_id)
    - Add indexes for party lookups and quality sorting
    - Enable RLS with party-scoped policies
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2. Server actions
  - [ ] 2.1 Create `src/app/(protected)/app/_actions/card-market.ts`
    - Implement `shareDeck(topicId)`: validate party membership, validate card count (3–200), snapshot cards as JSONB, enforce max 10 decks, enforce unique per topic
    - Implement `importDeck(deckId)`: validate party membership, validate no duplicate import, create cards with fresh FSRS state, create topic if missing, create deck_import record, increment import_count
    - Implement `getSharedDecks()`: return decks for user's party sorted by quality_score DESC, include creator name, card count, import status for current user
    - Implement `unshareDeck(deckId)`: validate creator, delete deck
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 2.2 Implement `recomputeQualityScore(deckId)`
    - Query card_reviews for all cards created from this deck's imports
    - Apply exponential decay weighting (14-day half-life)
    - Compute easy/again ratios → quality score
    - Clamp to 1.0–5.0 range
    - Update shared_decks.quality_score
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3. Checkpoint — Verify server actions

- [ ] 4. UI components
  - [ ] 4.1 Create `src/app/(protected)/app/party/_components/card-market.tsx`
    - Display shared decks as cards with: topic name, creator, card count, quality badge, import count
    - "Import" button (disabled if already imported, shows checkmark)
    - Filter by topic dropdown
    - Sort by quality (default) or newest
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ] 4.2 Create `src/app/(protected)/app/party/_components/share-deck-dialog.tsx`
    - Topic selector from user's topics (only topics with ≥ 3 cards)
    - Preview of cards to be shared (count)
    - "Share" button with loading state
    - Error display for validation failures
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ] 4.3 Create `src/app/(protected)/app/party/_components/deck-quality-badge.tsx`
    - Display quality score as 1–5 stars (half-star precision)
    - Color coding: green ≥ 4, amber 2.5–3.9, red < 2.5
    - _Requirements: 4.1_

  - [ ] 4.4 Add Card Market tab to party page
    - New tab/section in party page alongside quests, messages, cheers
    - Only visible when user is in a party
    - _Requirements: 2.1_

- [ ] 5. Quality score cron/trigger
  - [ ] 5.1 Add quality recomputation on review completion
    - After card review, check if card was imported from a shared deck
    - If yes, recompute quality score for that deck
    - Throttle to at most once per deck per hour
    - _Requirements: 4.4_

- [ ] 6. Final checkpoint — End-to-end verification
  - Share a deck → import → review cards → verify quality score updates.

## Notes

- Card snapshots are stored as JSONB — no foreign key to original cards (snapshot pattern)
- Import creates real card rows — they work exactly like manually created cards
- Quality computation is relatively cheap (count grades for deck's imported cards)
- Max 10 decks × 200 cards = 2000 card snapshots max per user — reasonable JSONB size
- Deck deletion doesn't affect already-imported cards (they're independent copies)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["5.1"] }
  ]
}
```
