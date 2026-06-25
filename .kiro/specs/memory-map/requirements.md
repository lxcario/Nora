# Knowledge Decay Visualization ("Memory Map") — Requirements

## Overview
A visual graph showing the student's knowledge state across all topics — which concepts are strong (high retrievability), which are decaying, and where the forgetting curve predicts a lapse. Rendered as a pixel-art "memory garden" where each topic is a plant whose health reflects FSRS retrievability.

## Research Basis
- FSRS DSR model computes retrievability R = e^(-t/S) for each card — this data already exists
- Modeling adaptive forgetting curves per user × knowledge component enables optimal revision (Springer 2020)
- Neural networks exhibit human-like forgetting curves that become robust through scheduled reviews (arxiv 2506.12034)

## Requirements

### 1. Data Computation
- 1.1: Compute aggregate retrievability per topic from FSRS card state (R = e^(-elapsed_days / stability))
- 1.2: Group cards by topic_id, compute mean retrievability for the topic
- 1.3: Classify each topic into health states: blooming (R > 0.85), healthy (R 0.60-0.85), wilting (R 0.30-0.60), dead (R < 0.30)
- 1.4: Predict when each topic will drop below 0.80 retrievability ("days until review needed")
- 1.5: Include "new" state for topics with no cards or all-new cards (never reviewed)

### 2. Visualization
- 2.1: Render topics as pixel-art plant sprites on a garden grid (3-5 columns, scrollable)
- 2.2: Plant sprite variant selected by health state: 🌸 blooming, 🌿 healthy, 🥀 wilting, 💀 dead, 🌱 seedling (new)
- 2.3: Smooth CSS transition when a topic's state changes (e.g., wilting → healthy after review)
- 2.4: Show topic name below each plant
- 2.5: Tooltip on hover/tap showing: topic name, retrievability %, days until due, card count
- 2.6: Color-code subject groupings (use subject.color as pot/border color)

### 3. Interaction
- 3.1: Tapping a wilting/dead plant navigates to a focused review session for ONLY that topic's due cards
- 3.2: Tapping a blooming plant shows a celebration animation + mastery stats
- 3.3: "Water all" button at the top starts a mixed review session of all wilting topics
- 3.4: Filter toggle: All topics / Wilting only / By subject

### 4. Dashboard Integration
- 4.1: Show a summary strip on the main dashboard: "🌿 8 healthy · 🥀 3 need watering · 🌱 2 new"
- 4.2: The strip links to the full Memory Map page
- 4.3: Include the garden in the Pixel Room scene (miniature version on the shelf)

### 5. Gamification
- 5.1: "Gardener" streak: consecutive days with all topics above 0.60 retrievability
- 5.2: Milestone rewards: "First Bloom" (first topic hits 0.95), "Full Garden" (all topics above 0.80)
- 5.3: Pet reacts to garden state (happy when all blooming, concerned when many wilting)

### 6. Performance
- 6.1: Computation is server-side (RSC) — no client-side FSRS math
- 6.2: Aggregation query should handle 500+ cards efficiently (GROUP BY topic_id with AVG)
- 6.3: Cache results for 5 minutes (revalidate on review submission)
