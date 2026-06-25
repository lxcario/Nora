# Cross-Topic "Eureka" Connections — Implementation Tasks

## Overview

Implements cross-topic discovery using embeddings, thought-bubble presentation, and challenge evaluation. Order: schema → discovery logic → server actions → notification UI → challenge flow → integration.

## Tasks

- [ ] 1. Database schema
  - [ ] 1.1 Create `supabase/migrations/019_eureka_connections.sql`
    - Create `eureka_connections` table with all columns and constraints
    - Add UNIQUE on (user_id, topic_a_id, topic_b_id)
    - Add indexes on user_id + status, user_id + created_at
    - Enable RLS with user-scoped policy
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 2. Discovery logic
  - [ ] 2.1 Create `src/lib/eureka-discovery.ts`
    - Implement `findCrossTopicConnections(topics, existingPairs, maxResults)` pure function
    - Cross-subject filter (skip same-subject)
    - Similarity window [0.5, 0.9]
    - Skip already-discovered pairs
    - Sort by similarity DESC, limit to maxResults
    - Performance: sample 30 random topics if > 100 exist
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 2.2 Write unit tests for discovery logic
    - Test cross-subject filtering
    - Test similarity bounds
    - Test duplicate rejection
    - Test max results limit
    - Test empty inputs / insufficient subjects

- [ ] 3. Server actions
  - [ ] 3.1 Create `src/app/(protected)/app/_actions/eureka.ts`
    - Implement `discoverConnections()`:
      - Throttle: skip if last run < 6 hours ago
      - Fetch topics with embeddings from different subjects
      - Skip if fewer than 2 subjects
      - Call `findCrossTopicConnections()`
      - Generate connection phrase via LLM for each pair
      - Insert into eureka_connections with status='pending'
      - Enforce max 50 records (prune oldest dismissed)
    - _Requirements: 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.2 Implement `getConnectionNotifications()`
    - Return oldest pending connection (for thought-bubble display)
    - _Requirements: 2.7_

  - [ ] 3.3 Implement `viewConnection(connectionId)`
    - Update status to 'viewed'
    - Return full connection detail (topics, phrase, challenge prompt)
    - _Requirements: 2.4, 2.5_

  - [ ] 3.4 Implement `submitEurekaChallenge(connectionId, explanation)`
    - Validate: explanation 50–500 chars
    - Evaluate via `evaluateExplanation()` with both topic descriptions as source context
    - Score ≥ 60: mark completed, award 25 XP + 10 coins via rewardAction("eureka")
    - Score < 60: return feedback, allow one retry
    - Store attempt in attempts JSONB
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.5 Implement `dismissConnection(connectionId)`
    - Update status to 'dismissed'
    - _Requirements: 2.4_

  - [ ] 3.6 Implement `getEurekaHistory()`
    - Return last 20 connections (all statuses) for history view
    - _Requirements: 3.6_

  - [ ] 3.7 Add `rewardAction("eureka")` to gamification
    - 25 XP, 10 coins

- [ ] 4. Checkpoint — Verify discovery and server actions

- [ ] 5. UI components
  - [ ] 5.1 Create `src/app/(protected)/app/_components/eureka/eureka-thought-bubble.tsx`
    - Pixel-art thought bubble with lightbulb icon
    - Brief connection text (truncated to 80 chars)
    - Float-up animation positioned above pet
    - Click to view full connection
    - "Dismiss" X button
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 5.2 Create `src/app/(protected)/app/_components/eureka/eureka-connection-card.tsx`
    - Display both topic names + subjects
    - Connection phrase (LLM-generated)
    - "Explain It" button → opens challenge
    - "Skip" button → dismisses
    - _Requirements: 2.5, 2.6_

  - [ ] 5.3 Create `src/app/(protected)/app/_components/eureka/eureka-challenge.tsx`
    - Explanation textarea (50–500 chars)
    - Character counter
    - Submit button with loading state
    - Results display: score, feedback, XP earned
    - Retry option if score < 60
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [ ] 5.4 Create `src/app/(protected)/app/_components/eureka/eureka-history.tsx`
    - List of past connections with status badges
    - Completed: green checkmark + XP amount
    - Dismissed: gray
    - Viewed but not completed: amber
    - _Requirements: 3.6_

- [ ] 6. Integration
  - [ ] 6.1 Wire thought bubble into pixel room
    - On pixel room load, check for pending connections via `getConnectionNotifications()`
    - If pending, render `eureka-thought-bubble` above pet
    - _Requirements: 2.1_

  - [ ] 6.2 Trigger discovery on Feynman submission
    - After successful Feynman evaluation, call `discoverConnections()` (throttled)
    - _Requirements: 4.2_

  - [ ] 6.3 Trigger discovery on daily first load
    - In protected layout, check if 24h since last discovery → run
    - _Requirements: 4.1_

  - [ ] 6.4 Add Eureka History to a viewable location
    - Add to dashboard or a dedicated `/app/eureka` route (lightweight page)
    - Link from connection card after challenge completion

- [ ] 7. Final checkpoint — End-to-end verification
  - Verify: discovery runs → connection stored → thought bubble shows → challenge works → XP awarded.

## Notes

- Discovery is computationally bounded by sampling (max 30 topics × 30 = 435 pairs)
- Embeddings come from existing RAG infrastructure — no new embedding calls needed
- The connection phrase is the only LLM call in the discovery phase (1–3 calls per run)
- If embeddings are missing for some topics, those topics are skipped
- Duplicate prevention uses sorted pair keys: `[a_id, b_id].sort().join(':')`
- 50-record rolling window prevents unbounded growth

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4"] }
  ]
}
```
