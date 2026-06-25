# AI Concept Map — Requirements

## Introduction

The Knowledge Web is an interactive concept map that visualizes relationships between topics a student has studied. It extracts concepts from topics, papers, and Feynman explanations, then renders them as an interactive graph using an RPG "skill tree" metaphor. Mastered concepts glow green while weak ones pulse red — clicking a weak node starts a targeted study session. The feature leverages existing RAG embeddings to discover semantic relationships between concepts without requiring manual linking.

**Scope boundary:** The Knowledge Web operates as a read-heavy visualization at `/app/knowledge-web`. It derives data from existing tables (topics, paper_chunks, feynman_explanations, cards, card_reviews) and does not introduce new study content — it surfaces what already exists. Concept extraction runs on-demand (page load or manual refresh), not as a background job.

## Glossary

- **Concept_Node**: A single concept extracted from the student's study materials, displayed as a node in the graph.
- **Concept_Edge**: A relationship between two Concept_Nodes, typed as one of: builds-on, contradicts, requires, or extends.
- **Mastery_Score**: A 0–1 float representing how well a student has mastered a concept, derived from FSRS card stability and Feynman comprehension scores.
- **Knowledge_Graph**: The complete set of Concept_Nodes and Concept_Edges for a user, stored in the database.
- **Concept_Extractor**: The server action that uses LLM + existing embeddings to identify concepts and infer relationships.
- **Graph_Renderer**: The client component that renders the Knowledge_Graph as an interactive force-directed graph.

## Requirements

### Requirement 1: Concept Extraction

**User Story:** As a student, I want the system to automatically identify key concepts from my study materials so I can see what I've been learning.

#### Acceptance Criteria

1. WHEN a user navigates to the Knowledge Web page, THE Concept_Extractor SHALL analyze the user's topics, paper chunks, and Feynman explanations to identify distinct concepts.
2. THE Concept_Extractor SHALL extract between 1 and 10 concepts per topic, each with a name (3–80 characters) and a brief description (10–200 characters).
3. THE Concept_Extractor SHALL deduplicate concepts that are semantically equivalent (cosine similarity > 0.85 between their embeddings) by merging them into a single node.
4. WHEN new study material is added (new topic, new Feynman explanation, or new paper indexed), THE system SHALL mark the Knowledge_Graph as stale and prompt the user to refresh on next visit.
5. THE Concept_Extractor SHALL complete extraction for up to 50 topics within 30 seconds.
6. IF the LLM is unavailable, THEN THE Concept_Extractor SHALL return a cached version of the graph if available, or display an error suggesting the user retry.

### Requirement 2: Relationship Inference

**User Story:** As a student, I want to see how my concepts relate to each other so I understand the structure of my knowledge.

#### Acceptance Criteria

1. THE Concept_Extractor SHALL infer relationships between concepts using semantic similarity of their embeddings and LLM classification.
2. THE system SHALL support four relationship types: `builds-on` (A is a prerequisite for B), `contradicts` (A and B are in tension), `requires` (A needs B to make sense), and `extends` (A adds depth to B).
3. WHEN two concepts have embedding cosine similarity > 0.6, THE Concept_Extractor SHALL use the LLM to classify the relationship type.
4. THE system SHALL store edges with a confidence score (0–1) and only display edges with confidence > 0.5.
5. THE system SHALL limit edges to a maximum of 3 per node to prevent visual clutter.

### Requirement 3: Mastery Visualization

**User Story:** As a student, I want to see at a glance which concepts I've mastered and which need work, like an RPG skill tree.

#### Acceptance Criteria

1. THE Graph_Renderer SHALL color each Concept_Node based on its Mastery_Score: green (≥ 0.7), amber (0.4–0.69), red (< 0.4).
2. THE Mastery_Score SHALL be computed from: average FSRS stability of cards linked to that concept's topic (60% weight) and the most recent Feynman comprehension score for that topic (40% weight).
3. WHEN a concept has no associated cards or Feynman scores, THE system SHALL assign a default Mastery_Score of 0.0 (red/unstarted).
4. THE Graph_Renderer SHALL animate weak nodes (red) with a subtle pulse effect to draw attention.
5. THE Graph_Renderer SHALL display the concept name and Mastery_Score on hover/focus.

### Requirement 4: Interactive Graph Rendering

**User Story:** As a student, I want to interact with the concept map by zooming, panning, and clicking nodes so I can explore my knowledge structure.

#### Acceptance Criteria

1. THE Graph_Renderer SHALL render the Knowledge_Graph as a force-directed graph using a lightweight library (react-force-graph-2d or canvas-based).
2. THE Graph_Renderer SHALL support zoom (scroll/pinch), pan (drag background), and node selection (click/tap).
3. WHEN a user clicks a weak node (Mastery_Score < 0.4), THE system SHALL offer to start a targeted study session for that concept's topic (navigate to review queue filtered by topic).
4. THE Graph_Renderer SHALL render up to 200 nodes and 300 edges without dropping below 30fps on a standard laptop (targeting Canvas 2D rendering).
5. WHEN the viewport is below 768px, THE Graph_Renderer SHALL switch to a simplified list view showing concepts sorted by Mastery_Score (weakest first) with relationship indicators.
6. THE Graph_Renderer SHALL render edge types with distinct visual styles: solid line (builds-on), dashed line (contradicts), dotted line (requires), double line (extends).

### Requirement 5: Data Persistence

**User Story:** As a student, I want my concept map to be saved so I don't have to regenerate it every time I visit.

#### Acceptance Criteria

1. THE system SHALL store Concept_Nodes in a `concept_nodes` table with columns: id, user_id, topic_id, name, description, embedding, mastery_score, created_at, updated_at.
2. THE system SHALL store Concept_Edges in a `concept_edges` table with columns: id, user_id, source_node_id, target_node_id, relationship_type, confidence, created_at.
3. RLS policies SHALL restrict all concept data to the owning user.
4. WHEN the user refreshes the graph, THE system SHALL update existing nodes (preserving IDs for stable layout) and add/remove nodes as needed, rather than recreating from scratch.
