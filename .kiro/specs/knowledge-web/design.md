# AI Concept Map — Design

## Overview

The Knowledge Web visualizes a student's conceptual understanding as an interactive force-directed graph. It combines LLM-based concept extraction with existing RAG embeddings to infer relationships, and renders the result using `react-force-graph-2d` (MIT, lightweight Canvas renderer). The mastery state is derived from FSRS card stability and Feynman scores — no new study data is created, only visualized.

### Key Design Decisions

1. **react-force-graph-2d over D3 or Three.js**: Lightweight (~50KB), Canvas-based (good perf at 200 nodes), React-friendly API, MIT license.
2. **On-demand extraction, not background job**: Concept extraction runs when the user visits the page or clicks "Refresh". Avoids cron infrastructure.
3. **Embedding reuse**: Uses existing paper_chunks embeddings + Groq for concept embedding generation. No new embedding model required.
4. **Incremental updates**: Graph refresh updates existing nodes in-place (stable positions) rather than full regeneration.
5. **Mastery from existing signals**: No new "mastery" tracking — computed from FSRS stability + Feynman scores at render time.

---

## Architecture

```
src/app/(protected)/app/knowledge-web/
├── page.tsx                          # Server component — fetches graph state
├── _components/
│   ├── knowledge-graph.tsx           # Force-graph renderer (client)
│   ├── concept-node-tooltip.tsx      # Hover tooltip with mastery details
│   ├── concept-list-view.tsx         # Mobile fallback list view
│   └── graph-controls.tsx            # Zoom/filter/refresh controls

src/app/(protected)/app/_actions/
├── knowledge-web.ts                  # Server actions: extract, refresh, getGraph
```

### Server Actions

```typescript
// knowledge-web.ts
export async function getKnowledgeGraph(): Promise<{ nodes: ConceptNode[]; edges: ConceptEdge[] }>;
export async function refreshKnowledgeGraph(): Promise<{ nodes: ConceptNode[]; edges: ConceptEdge[] }>;
export async function startTargetedSession(topicId: string): Promise<{ redirectUrl: string }>;
```

### Data Flow

1. User visits `/app/knowledge-web`
2. Server fetches cached graph from `concept_nodes` + `concept_edges`
3. If graph is stale (flag set on new material), show "Refresh" prompt
4. On refresh: LLM extracts concepts from topics/papers → embed concepts → compute similarity pairs → classify relationships → upsert nodes/edges → recompute mastery scores
5. Client renders graph with mastery-colored nodes

---

## Data Models

### Migration: `014_knowledge_web.sql`

```sql
CREATE TABLE concept_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 3 AND 80),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 200),
  embedding vector(1536),
  mastery_score FLOAT DEFAULT 0.0 CHECK (mastery_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE concept_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('builds-on', 'contradicts', 'requires', 'extends')),
  confidence FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_concept_nodes_user ON concept_nodes(user_id);
CREATE INDEX idx_concept_edges_user ON concept_edges(user_id);
CREATE INDEX idx_concept_edges_source ON concept_edges(source_node_id);
CREATE INDEX idx_concept_edges_target ON concept_edges(target_node_id);

ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own concept nodes"
  ON concept_nodes FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own concept edges"
  ON concept_edges FOR ALL USING (user_id = auth.uid());
```

---

## Mastery Score Computation

```typescript
function computeMastery(topicId: string, cards: CardWithFSRS[], feynmanScores: number[]): number {
  const avgStability = cards.length > 0
    ? cards.reduce((sum, c) => sum + Math.min(c.stability / 30, 1), 0) / cards.length
    : 0;
  const latestFeynman = feynmanScores.length > 0
    ? feynmanScores[feynmanScores.length - 1] / 100
    : 0;
  return avgStability * 0.6 + latestFeynman * 0.4;
}
```

---

## Correctness Properties

### Property 1: Concept name length bounds
*For any* extracted concept, the name SHALL be between 3 and 80 characters inclusive.
**Validates: Requirement 1.2**

### Property 2: Deduplication threshold
*For any* two concepts with embedding cosine similarity > 0.85, the system SHALL merge them into a single node.
**Validates: Requirement 1.3**

### Property 3: Mastery score range
*For any* concept node, the mastery_score SHALL be between 0.0 and 1.0 inclusive.
**Validates: Requirement 3.1, 3.2**

### Property 4: Edge confidence filter
*For any* edge stored in concept_edges, the confidence SHALL be > 0.5. Edges with confidence ≤ 0.5 SHALL NOT be persisted.
**Validates: Requirement 2.4**

### Property 5: Maximum edges per node
*For any* node, the count of edges (as source or target) SHALL not exceed 3.
**Validates: Requirement 2.5**

### Property 6: Relationship type validity
*For any* edge, the relationship_type SHALL be one of: 'builds-on', 'contradicts', 'requires', 'extends'.
**Validates: Requirement 2.2**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| LLM unavailable during extraction | Return cached graph; show "Using cached data" badge |
| No topics/papers exist | Show empty state: "Start studying to build your knowledge web" |
| Embedding generation fails | Skip relationship inference; show nodes without edges |
| Graph exceeds 200 nodes | Truncate to top 200 by mastery (keep weakest for actionability) |
| Force-graph fails to render | Fall back to list view |

---

## Dependencies

- `react-force-graph-2d` — MIT — Canvas 2D force-directed graph renderer
- Existing: Groq LLM, OpenAI embeddings (optional), Supabase pgvector
