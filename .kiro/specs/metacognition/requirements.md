# Confidence Calibration Dashboard — Requirements

## Overview
Track the correlation between the student's JOL (Judgment of Learning) confidence ratings and their actual review performance. Show whether they're overconfident, underconfident, or well-calibrated — a unique metacognitive insight no competitor offers.

## Research Basis
- MIT 2025: Students who received AI feedback with metacognitive requirements showed transformed learning behaviors
- arxiv 2505.13381: Adding confidence declarations to practice exams changes study behavior
- JOL data already collected in Nora (card_reviews.jol_confidence 1-5, pre-reveal)

## Requirements

### 1. Calibration Computation
- 1.1: For each confidence level (1-5), compute the actual recall success rate (grade ≥ 3 = success)
- 1.2: Compute an overall calibration score: mean absolute deviation from perfect calibration (lower = better calibrated)
- 1.3: Track calibration over time (weekly snapshots) to show improvement trajectory
- 1.4: Minimum 20 reviews with JOL data before showing calibration (avoid noisy small samples)

### 2. Visualization
- 2.1: Calibration curve chart: X-axis = confidence (1-5), Y-axis = actual success rate (0-100%)
- 2.2: Perfect calibration line (diagonal) shown as reference
- 2.3: Student's curve plotted with dots + connecting line
- 2.4: Color-coding: dots above diagonal = underconfident (good!), below = overconfident (risky)
- 2.5: Weekly trend sparkline showing calibration score improving/declining
- 2.6: Pixel-art styled chart consistent with analytics page

### 3. Insights
- 3.1: Text insight: "You tend to be overconfident on Level 4-5 ratings — consider being more careful before marking 'Pretty sure' or 'Certain'"
- 3.2: Per-topic breakdown: show which topics have worst calibration
- 3.3: "Calibration challenge" prompt: review 10 cards and try to perfectly calibrate confidence to outcomes

### 4. Gamification
- 4.1: "Well-calibrated" badge earned when calibration score < 0.15 deviation across 50+ reviews
- 4.2: Weekly calibration score feeds into party quests (optional quest type)
- 4.3: Pet celebrates when calibration improves

### 5. Integration
- 5.1: Show as a tab/section within the Analytics page
- 5.2: Mini calibration indicator on the review session summary screen
- 5.3: Tooltip during review: "Your confidence of 4 has historically been correct 65% of the time"

### 6. Constraints
- 6.1: Only include reviews where JOL was provided (jol_confidence IS NOT NULL)
- 6.2: Computation is server-side
- 6.3: No new external dependencies required
