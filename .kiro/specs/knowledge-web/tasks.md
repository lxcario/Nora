# AI Concept Map — Implementation Tasks

## Overview

Implements an interactive concept map that extracts concepts from study materials, infers relationships via embeddings, and renders a force-directed graph with RPG-style mastery coloring. Built incrementally: schema → extraction logic → mastery computation → graph rendering → interactivity.

## Tasks

- [ ] 1. Database schema and dependencies
  - [ ] 1.1 Create migration `supabase/migrations/014_knowledge_web.sql`
    - Create `concept_nodes` table with all columns and constraints
    - Create `concept_edges` table with relationship_type CHECK and confidence constraints
    - Add indexes on user_id, source_node_id, target_node_id
    - Enable RLS with user-scoped policies
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 1.2 Install `react-force-graph-2d`
    - Run `npm install react-force-graph-2d`
    - Verify MIT license compatibility
    - _Requirements: 4.1_

- [ ] 2. Concept extraction server actions
  - [ ] 2.1 Create `src/app/(protected)/app/_actions/knowledge-web.ts`
    - Implement `extractConcepts(userId)`: query topics + recent Feynman explanations, prompt LLM to extract 1–10 concepts per topic with name + description
    - Implement deduplication via embedding similarity (merge if > 0.85)
    - Implement `inferRelationships(nodes)`: compute pairwise similarity, classify edges via LLM for pairs > 0.6 similarity, cap at 3 edges per node
    - Implement `refreshKnowledgeGraph()`: orchestrates extraction → dedup → relationship inference → upsert
    - 30-second timeout for up to 50 topics
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 2.2 Implement `getKnowledgeGraph()` server action
    - Fetch cached concept_nodes and concept_edges for current user
    - Compute mastery_score for each node from FSRS stability + Feynman scores
    - Return graph data ready for rendering
    - _Requirements: 3.2, 5.4_

  - [ ] 2.3 Implement `startTargetedSession(topicId)` server action
    - Redirect to review queue filtered by the selected topic
    - _Requirements: 4.3_

- [ ] 3. Checkpoint — Verify extraction logic
  - Ensure extraction + relationship inference works against test data.

- [ ] 4. Graph rendering UI
  - [ ] 4.1 Create `src/app/(protected)/app/knowledge-web/page.tsx`
    - Server component fetching graph via `getKnowledgeGraph()`
    - Show "Refresh" button when graph is stale
    - Empty state when no concepts exist
    - _Requirements: 1.4, 1.6_

  - [ ] 4.2 Create `knowledge-graph.tsx` client component
    - Render force-directed graph with react-force-graph-2d
    - Color nodes by mastery: green (≥0.7), amber (0.4–0.69), red (<0.4)
    - Animate red nodes with pulse effect
    - Edge styles: solid (builds-on), dashed (contradicts), dotted (requires), double (extends)
    - Support zoom, pan, node click
    - Performance target: 200 nodes / 300 edges at 30fps
    - _Requirements: 3.1, 3.4, 4.1, 4.2, 4.4, 4.6_

  - [ ] 4.3 Create `concept-node-tooltip.tsx`
    - Display concept name, description, mastery score on hover/focus
    - Show "Study this" action for weak nodes
    - _Requirements: 3.5, 4.3_

  - [ ] 4.4 Create `concept-list-view.tsx` for mobile
    - List concepts sorted by mastery (weakest first)
    - Show relationship indicators (icons for edge types)
    - Tap to start targeted session
    - _Requirements: 4.5_

  - [ ] 4.5 Create `graph-controls.tsx`
    - Refresh button, zoom in/out, filter by topic
    - _Requirements: 1.4, 4.2_

- [ ] 5. Add Knowledge Web to sidebar navigation
  - [ ] 5.1 Add nav item in sidebar
    - Link to `/app/knowledge-web` with appropriate icon (e.g., `Network` from Lucide)

- [ ] 6. Final checkpoint — Verify end-to-end
  - Ensure graph renders correctly with test data, interactions work.

## Notes

- `react-force-graph-2d` is lightweight and Canvas-based — good for perf
- Mastery is computed at read time, not stored permanently (always fresh)
- Extraction is LLM-heavy; rate-limit refreshes to once per hour per user
- Mobile gets a list view fallback since force-graph is hard to use on small screens

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["5.1"] }
  ]
}
```
