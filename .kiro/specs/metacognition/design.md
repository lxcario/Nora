# Confidence Calibration Dashboard — Design

## Architecture

```
card_reviews (grade + jol_confidence) → Server Action → CalibrationData DTO
                                                              ↓
                                              CalibrationChart component
                                              CalibrationInsights component
                                              CalibrationTrend sparkline
```

## Data Model

No new tables. Computed from existing `card_reviews` table:
- `card_reviews.jol_confidence` (1-5, nullable)
- `card_reviews.grade` (1-4 FSRS)

### Computed DTO
```typescript
interface CalibrationData {
  /** Calibration per confidence level */
  levels: {
    confidence: number; // 1-5
    totalReviews: number;
    successCount: number; // grade >= 3
    successRate: number; // 0.0-1.0
    expectedRate: number; // confidence / 5 → perfect calibration
    deviation: number; // successRate - expectedRate
  }[];
  /** Overall calibration score (0 = perfect, 1 = worst) */
  overallScore: number; // mean absolute deviation
  /** Interpretation */
  interpretation: 'well-calibrated' | 'overconfident' | 'underconfident' | 'insufficient-data';
  /** Weekly trend (last 8 weeks) */
  weeklyTrend: { week: string; score: number }[];
  /** Per-topic calibration (worst 5) */
  worstTopics: { topicName: string; deviation: number; count: number }[];
}
```

## Server Action: `getCalibrationData()`

```typescript
export async function getCalibrationData(): Promise<{ data?: CalibrationData; error?: string }> {
  // 1. Fetch card_reviews WHERE jol_confidence IS NOT NULL, last 90 days
  // 2. Group by jol_confidence (1-5)
  // 3. For each group: count total, count grade >= 3 (success)
  // 4. Compute successRate = successCount / totalReviews
  // 5. expectedRate = confidence_level * 0.2 (1→0.2, 2→0.4, 3→0.6, 4→0.8, 5→1.0)
  // 6. deviation = successRate - expectedRate
  // 7. overallScore = mean(abs(deviation)) across all levels with count > 0
  // 8. Weekly trend: same computation per ISO week
  // 9. Per-topic: join cards.topics, compute per-topic deviations, return worst 5
}
```

## Components

### CalibrationChart
- Canvas-free pixel-art styled chart using CSS grid
- 5 columns (confidence 1-5), stacked bar showing actual vs expected
- Diagonal reference line (perfect calibration) rendered with CSS transform
- Dots connected by a line showing the student's actual curve
- Color: above diagonal = green (underconfident), below = amber/red (overconfident)

### CalibrationInsights
- Text block with actionable feedback:
  - "You're overconfident at Level 4-5" / "You're well-calibrated!" / "Need more data"
- Per-topic worst deviations list
- "Calibration Challenge" button → starts a 10-card review with JOL focus

### CalibrationTrend
- 8-week sparkline (same style as analytics bar charts)
- Score decreasing = improving calibration

## Integration Points

- Add as a section in `/app/analytics/_components/analytics-dashboard.tsx`
- After review session complete: show mini-indicator "This session: calibration X"
- Review tooltip (optional enhancement): show historical accuracy for selected confidence level

## File Structure
```
src/app/(protected)/app/_actions/
  calibration.ts               -- getCalibrationData()
src/app/(protected)/app/analytics/_components/
  calibration-chart.tsx        -- Main chart
  calibration-insights.tsx     -- Text insights
  calibration-trend.tsx        -- Weekly sparkline
```
