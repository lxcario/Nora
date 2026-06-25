# Adaptive Focus Timer — Design

## Overview

A Pomodoro-style timer with adaptive intervals, pixel room integration, themed breaks, and 8-bit audio. The timer runs entirely client-side for responsiveness, with server logging on block completion.

### Key Design Decisions

1. **Client-side timer**: Countdown runs in the browser (requestAnimationFrame/setInterval). No server polling. Only on block completion do we hit the server.
2. **Web Audio API for chimes**: Synthesized 8-bit sounds — no audio files to load. Consistent pixel-art aesthetic.
3. **Adaptive from study_sessions**: Reads `duration_minutes` from recent sessions to compute recommendations. No new table needed for the adaptive logic.
4. **Pixel room desk clock is a React component**: Integrated into the existing pixel room canvas as an overlay element.
5. **Session state in localStorage**: Timer state (remaining time, block count) persists across page navigations using localStorage. Server only knows about completed blocks.

---

## Architecture

```
src/app/(protected)/app/focus/
├── page.tsx                          # Full-screen timer route
├── _components/
│   ├── focus-timer.tsx               # Main timer component
│   ├── timer-display.tsx             # Circular progress + MM:SS
│   ├── timer-controls.tsx            # Play/pause/stop buttons
│   ├── adaptive-settings.tsx         # Duration picker with recommendations
│   ├── break-activity-picker.tsx     # Themed break selection
│   ├── break-garden.tsx              # "Water Garden" break activity
│   ├── break-pet.tsx                 # "Pet Companion" break activity
│   ├── break-stretch.tsx             # "Stretch Quest" break activity
│   └── pixel-desk-clock.tsx          # Mini clock for pixel room

src/lib/
├── focus-audio.ts                    # Web Audio chime generation
├── focus-adaptive.ts                 # Pure: compute recommended durations
```

### Adaptive Engine (Pure Function)

```typescript
// src/lib/focus-adaptive.ts

interface FocusHistory {
  sessions: { durationMinutes: number; completedFull: boolean; createdAt: Date }[];
}

interface FocusRecommendation {
  focusMinutes: number;    // 10–60
  breakMinutes: number;    // 3–15
  confidence: 'low' | 'medium' | 'high';
  reason: string;
}

export function computeRecommendation(history: FocusHistory): FocusRecommendation {
  if (history.sessions.length < 5) {
    return { focusMinutes: 25, breakMinutes: 5, confidence: 'low', reason: 'Using defaults (not enough data yet)' };
  }

  const recent14d = history.sessions.filter(s => 
    Date.now() - s.createdAt.getTime() < 14 * 24 * 60 * 60 * 1000
  );

  const avgDuration = recent14d.reduce((sum, s) => sum + s.durationMinutes, 0) / recent14d.length;
  
  // Clamp focus block to 10–60 minutes
  const focusMinutes = Math.max(10, Math.min(60, Math.round(avgDuration)));
  const breakMinutes = Math.max(3, Math.min(15, Math.round(focusMinutes * 0.2)));

  // Check for early-end pattern
  const earlyEnds = recent14d.filter(s => !s.completedFull).length / recent14d.length;
  const adjusted = earlyEnds > 0.6 ? Math.max(10, focusMinutes - 5) : focusMinutes;

  return {
    focusMinutes: adjusted,
    breakMinutes,
    confidence: recent14d.length >= 10 ? 'high' : 'medium',
    reason: earlyEnds > 0.6
      ? 'Shortened — you often end early'
      : `Based on your ${Math.round(avgDuration)}-min average`,
  };
}
```

### Web Audio Chimes

```typescript
// src/lib/focus-audio.ts

export function playFocusEndChime(ctx: AudioContext): void {
  // 8-bit style ascending arpeggio (C5-E5-G5), 0.5s total
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square'; // 8-bit sound
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.15);
  });
}

export function playBreakEndChime(ctx: AudioContext): void {
  // 8-bit style descending two-note (G5-C5), 0.3s
  const notes = [783.99, 523.25];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.11);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.12);
  });
}
```

---

## Timer State Machine

```
idle → running (focus block)
running → paused
paused → running
running → break_prompt (focus block complete → chime → offer break)
break_prompt → break_running (break starts)
break_running → focus_prompt (break complete → chime)
focus_prompt → running (next focus block starts)
running/break_running → idle (cancelled)
focus_prompt → complete (all blocks done → bonus chime + celebration)
```

State persisted in localStorage: `{ state, remainingMs, blockIndex, totalBlocks, focusMs, breakMs }`

---

## Correctness Properties

### Property 1: Focus duration bounds
*For any* recommendation, focusMinutes SHALL be between 10 and 60 inclusive.
**Validates: Requirement 2.1**

### Property 2: Break duration bounds
*For any* recommendation, breakMinutes SHALL be between 3 and 15 inclusive.
**Validates: Requirement 2.2**

### Property 3: Default with insufficient data
*For any* user with fewer than 5 focus sessions, recommendation SHALL be 25/5.
**Validates: Requirement 2.3**

### Property 4: Early-end adaptation
*For any* user where >60% of sessions in last 7 days ended early, recommended focusMinutes SHALL be less than or equal to the raw average.
**Validates: Requirement 2.5**

---

## Data Model

No new tables needed. The timer uses:
- `study_sessions` with `mode='focus'` for logging completed blocks
- `profiles.timezone` for correct date boundaries
- localStorage for client-side timer state persistence

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Browser tab hidden during timer | Use `document.visibilityState` + stored end timestamp to resume correctly |
| Web Audio not available | Skip chimes silently, show visual flash instead |
| Server action fails on block completion | Queue in localStorage, retry on next completion |
| Timer state corrupted in localStorage | Reset to idle, don't crash |
| Page refresh mid-timer | Restore from localStorage, recalculate remaining time |
