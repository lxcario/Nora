# Knowledge Decay Visualization ("Memory Map") — Design

## Architecture

```
[cards table] → Server Action (compute retrievability) → Page RSC → MemoryGarden component
                                                                         ↓
                                                              PlantSprite per topic
                                                                         ↓
                                                              Tap → /app/review?topic=X
```

## Data Model

No new tables needed — all data derived from existing `cards` table.

### Computed DTO
```typescript
interface TopicHealth {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  cardCount: number;
  dueCount: number;
  avgRetrievability: number; // 0.0 - 1.0
  healthState: 'blooming' | 'healthy' | 'wilting' | 'dead' | 'new';
  daysUntilDue: number | null; // predicted days until R drops below 0.80
}
```

## Server Action: `getMemoryMap()`

```typescript
export async function getMemoryMap(): Promise<{ topics: TopicHealth[] }> {
  // 1. Fetch all cards with topic + subject info
  // 2. Group by topic_id
  // 3. For each topic:
  //    - If no cards or all state=0 (new): healthState = 'new'
  //    - Else compute R per card: R = Math.exp(-elapsedDays / stability)
  //      where elapsedDays = (now - last_review) / 86400000
  //    - Average R across all reviewed cards
  //    - Map to healthState based on thresholds
  //    - Predict daysUntilDue: solve R = 0.80 → t = -S * ln(0.80)
}
```

### Retrievability Formula
```typescript
function computeRetrievability(card: { stability: number; last_review: string | null }): number {
  if (!card.last_review || !card.stability) return 0;
  const elapsedDays = (Date.now() - new Date(card.last_review).getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-elapsedDays / card.stability);
}
```

## Component: `MemoryGarden`

```
src/app/(protected)/app/memory-map/
  page.tsx                    -- RSC fetching getMemoryMap()
  loading.tsx                 -- Skeleton grid
  _components/
    memory-garden.tsx         -- Grid container
    plant-sprite.tsx          -- Individual plant with state-driven sprite
    garden-summary.tsx        -- "8 healthy · 3 wilting" strip
    garden-filters.tsx        -- Filter toggles
```

### Plant Sprites (CSS approach)
Use existing sprite icons with state-driven styling:
- Blooming: `/sprites/travel-book/icons/Flower2.png` + glow animation
- Healthy: `/sprites/travel-book/icons/FlowerPot.png`
- Wilting: `/sprites/travel-book/icons/FlowerPot.png` + desaturate + droop transform
- Dead: `/sprites/travel-book/icons/FlowerPot.png` + grayscale + opacity 50%
- New/Seedling: `/sprites/travel-book/icons/Flower.png` + small scale

### Interaction Flow
1. Tap wilting plant → `router.push(`/app/review?topic=${topicId}`)`
2. Review page reads `topic` query param → filters `getDueCards()` to that topic only
3. After review completes → revalidatePath("/app/memory-map")

## Dashboard Strip Integration

In `app/page.tsx`, add a `GardenSummaryStrip` component between quests and friends feed:
```tsx
<GardenSummaryStrip topics={memoryMapData.topics} />
```
Links to `/app/memory-map`.

## Gamification

- No new DB column needed — "Gardener streak" computed from `card_reviews` dates + retrievability at session end
- Pet reaction: pass garden state to `PixelRoom` component, show wilting_concern animation if >50% topics are wilting
