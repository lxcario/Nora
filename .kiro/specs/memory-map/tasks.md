# Knowledge Decay Visualization ("Memory Map") — Tasks

## Task 1: Server action — getMemoryMap
- [ ] Create `src/app/(protected)/app/_actions/memory-map.ts`
- [ ] Fetch all user cards with topic + subject info
- [ ] Group by topic_id, compute average retrievability (R = e^(-t/S))
- [ ] Classify health states: blooming/healthy/wilting/dead/new
- [ ] Predict daysUntilDue for each topic
- [ ] Return sorted array of TopicHealth DTOs

## Task 2: Memory Map page
- [ ] Create `src/app/(protected)/app/memory-map/page.tsx` (RSC)
- [ ] Create `loading.tsx` skeleton
- [ ] Call `getMemoryMap()` server action
- [ ] Pass data to `MemoryGarden` client component

## Task 3: MemoryGarden component
- [ ] Create `_components/memory-garden.tsx`
- [ ] Render responsive grid (3-5 columns based on viewport)
- [ ] Map each topic to a `PlantSprite` component
- [ ] Implement filter toggles (All / Wilting / By subject)
- [ ] "Water All" button navigating to review with multiple topic filter

## Task 4: PlantSprite component
- [ ] Create `_components/plant-sprite.tsx`
- [ ] Select sprite icon based on healthState
- [ ] Apply CSS transformations (desaturate, droop, glow) per state
- [ ] Show topic name label below plant
- [ ] Tooltip on hover: retrievability %, cards due, days until review
- [ ] Click handler: navigate to `/app/review?topic=topicId`

## Task 5: Review page topic filter
- [ ] Update `getDueCards()` to accept optional `topicId` filter param
- [ ] Update review page to read `?topic=` query parameter
- [ ] Pass filtered cards to `ReviewSession` component
- [ ] After review, revalidate memory-map path

## Task 6: Dashboard summary strip
- [ ] Create `_components/garden-summary.tsx`
- [ ] Compute counts per health state
- [ ] Render "🌿 8 healthy · 🥀 3 need watering" strip with link
- [ ] Add to `app/page.tsx` between quests and friends feed

## Task 7: Navigation & integration
- [ ] Add "Memory Map" / "Garden" to sidebar nav
- [ ] Add to bottom-nav for mobile
- [ ] Pet state: pass garden health to PixelRoom for concerned animation
