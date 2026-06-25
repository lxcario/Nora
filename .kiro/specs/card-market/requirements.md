# Collaborative Deck Sharing — Requirements

## Introduction

Card Market enables party members to share flashcard decks within their study group. Students can browse shared decks by topic, import them with one click, and rate them over time through quality voting. Imported cards enter the importer's FSRS queue with fresh state — no inherited intervals. This extends the social-parties feature with educational collaboration while keeping individual SRS integrity intact.

**Scope boundary:** Deck sharing is restricted to within a party (not public/global). It requires the social-parties feature to be active. No cards are shared outside the user's party. Import is a copy, not a reference — changes to the original deck don't propagate.

## Glossary

- **Shared_Deck**: A collection of flashcards shared by a party member for others to import, stored in `shared_decks`.
- **Deck_Importer**: A party member who copies a Shared_Deck into their own card collection with fresh FSRS state.
- **Quality_Score**: A 0–5 float representing how useful importers find a deck, derived from card grading patterns.
- **Deck_Import**: A record tracking that a user imported a specific deck, with timestamp.

## Requirements

### Requirement 1: Deck Sharing

**User Story:** As a party member, I want to share my flashcard decks with my group so they can benefit from my study materials.

#### Acceptance Criteria

1. WHEN a party member selects a topic and clicks "Share with Party", THE system SHALL create a Shared_Deck record containing the user's cards for that topic (minimum 3 cards, maximum 200 cards).
2. THE Shared_Deck SHALL store a snapshot of each card's front and back text at the time of sharing (not a live reference).
3. THE system SHALL restrict sharing to users who are currently members of a party.
4. THE system SHALL allow a user to share at most 10 decks per party simultaneously.
5. WHEN a user shares a deck, THE system SHALL set the initial Quality_Score to 3.0 (neutral).
6. THE system SHALL NOT share any FSRS state, review history, or personal scheduling data with the deck.

### Requirement 2: Deck Browsing

**User Story:** As a party member, I want to browse decks shared by my group so I can find useful study materials.

#### Acceptance Criteria

1. WHEN a party member navigates to the deck market view, THE system SHALL display all Shared_Decks from their party, sorted by Quality_Score descending.
2. THE system SHALL display each deck's topic name, creator display name, card count, Quality_Score, and import count.
3. THE system SHALL allow filtering by topic/subject.
4. THE system SHALL NOT display decks from other parties or from non-party-member users.
5. THE system SHALL visually indicate decks the user has already imported.

### Requirement 3: One-Click Import

**User Story:** As a party member, I want to import a shared deck into my collection with one click so I can start studying those cards.

#### Acceptance Criteria

1. WHEN a user clicks "Import" on a Shared_Deck, THE system SHALL create copies of all cards in the deck under the user's account with fresh FSRS state (state=0/New, stability=null, difficulty=null, due=now).
2. THE imported cards SHALL be associated with the same topic as the original deck; IF the importer doesn't have that topic, THE system SHALL create the topic for them.
3. THE system SHALL create a Deck_Import record linking the user to the deck with a timestamp.
4. THE system SHALL prevent duplicate imports — a user cannot import the same deck twice.
5. THE system SHALL display a success notification showing the number of cards imported.
6. WHEN import completes, THE system SHALL NOT copy any review history or FSRS scheduling data — all cards start as New.

### Requirement 4: Quality Voting

**User Story:** As a student who imported a deck, I want the system to automatically rate deck quality based on how easy cards are to learn so the best decks rise to the top.

#### Acceptance Criteria

1. THE system SHALL update a deck's Quality_Score based on the aggregate grading patterns of importers (not the creator).
2. WHEN importers consistently grade cards "Easy" (> 50% Easy grades across all imported instances after at least 10 total reviews), THE Quality_Score SHALL increase (max 5.0).
3. WHEN importers consistently grade cards "Again" (> 40% Again grades after at least 10 total reviews), THE Quality_Score SHALL decrease (min 1.0).
4. THE Quality_Score SHALL be recomputed daily or on each import/review milestone (whichever is simpler).
5. THE system SHALL weight recent reviews more heavily than older ones (exponential decay, half-life 14 days).

### Requirement 5: Data Model

**User Story:** As a developer, I want clear tables for deck sharing that integrate with existing card and party structures.

#### Acceptance Criteria

1. THE system SHALL create a `shared_decks` table with columns: id, party_id, creator_id, topic_id, card_snapshots (JSONB array of {front, back}), quality_score, import_count, created_at.
2. THE system SHALL create a `deck_imports` table with columns: id, user_id, deck_id, imported_at.
3. THE `deck_imports` table SHALL enforce a UNIQUE constraint on (user_id, deck_id) to prevent duplicate imports.
4. RLS policies SHALL restrict deck access to members of the associated party.
5. THE `shared_decks` table SHALL have a UNIQUE constraint on (party_id, creator_id, topic_id) — one shared deck per topic per user per party.
