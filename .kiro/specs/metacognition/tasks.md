# Confidence Calibration Dashboard — Tasks

## Task 1: Server action — getCalibrationData
- [ ] Create `src/app/(protected)/app/_actions/calibration.ts`
- [ ] Query card_reviews with jol_confidence IS NOT NULL (last 90 days)
- [ ] Group by jol_confidence level, compute success rates
- [ ] Compute overall calibration score (mean absolute deviation)
- [ ] Determine interpretation (well-calibrated / overconfident / underconfident / insufficient)
- [ ] Compute weekly trend (last 8 weeks)
- [ ] Compute per-topic worst deviations (join cards → topics)
- [ ] Return CalibrationData DTO

## Task 2: CalibrationChart component
- [ ] Create `analytics/_components/calibration-chart.tsx`
- [ ] Render 5-column pixel-art chart (confidence 1-5 on X axis)
- [ ] Plot expected rate as reference line (diagonal)
- [ ] Plot actual success rate dots with connecting line
- [ ] Color-code: green (underconfident), amber/red (overconfident)
- [ ] Hover/tap: show exact numbers per level

## Task 3: CalibrationInsights component
- [ ] Create `analytics/_components/calibration-insights.tsx`
- [ ] Display overall interpretation text with actionable advice
- [ ] Show worst 3-5 topics by calibration deviation
- [ ] "Calibration Challenge" button linking to review mode

## Task 4: CalibrationTrend component
- [ ] Create `analytics/_components/calibration-trend.tsx`
- [ ] 8-week sparkline with pixel-art styling
- [ ] Trend direction indicator (improving / declining / stable)

## Task 5: Analytics page integration
- [ ] Add calibration section to `analytics-dashboard.tsx`
- [ ] Gate behind minimum 20 JOL-rated reviews
- [ ] Show "Not enough data" state with progress toward threshold

## Task 6: Review session integration
- [ ] After review session ends, show mini calibration summary
- [ ] Optional: tooltip on JOL buttons showing historical accuracy for that level
- [ ] Badge: "Well-Calibrated" at calibration score < 0.15 with 50+ reviews
