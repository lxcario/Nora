# Pre-Build Week Plan (June 23–29) — REVISED

**Key strategic decision:** Practice Exam Mode and Competitive MCQ are being
SAVED for build week (June 30–July 7). Loop Quality is 40% of the hackathon
score. The loop needs to catch real regressions during active development in
the judged window — not just confirm pre-built features "still work."

---

## The Rule

**BUILD NOW (pre-build):** Things that DON'T touch review/Feynman/gamification
- Specs and architecture decisions (no code)
- Micro-break timer (purely frontend, isolated)
- CLI PR (separate repo entirely)
- QA, polish, README, demo prep

**SAVE FOR BUILD WEEK (June 30–July 7):** Things that WILL touch shared code
- Practice Exam Mode implementation (imports review.ts, FSRS, gamification)
- Any feature that creates regression potential against existing TestSprite tests

---

## June 23 (Today) — DONE

- [x] Full codebase audit (20 tasks identified)
- [x] All 20 audit fixes shipped
- [x] TestSprite CLI installed + authenticated + project created
- [x] JOL Confidence Rating feature built and deployed
- [x] Migration 018 applied to production
- [x] PDF parser ENOENT fix deployed
- [x] Gemini deep research on learning strategies complete
- [x] All planning docs written
- [x] LOOP.md template created
- [x] Submission template understood and documented

---

## June 24 (Tuesday) — Manual QA + Micro-Break Timer

### Morning: Manual End-to-End QA on deployed app

Test every flow on https://nora-mu-six.vercel.app:

- [ ] Sign up with a fresh email
- [ ] Complete onboarding (university, faculty, year, term)
- [ ] Dashboard loads (stats, quests, friends feed)
- [ ] Create a subject and topic in Settings
- [ ] Write a Feynman explanation, get evaluation
- [ ] Review cards (verify JOL confidence step works!)
- [ ] Research Desk: enter a query, view sources
- [ ] Study Room: search a video, load it, play
- [ ] Planner: view weekly calendar, navigate weeks
- [ ] Pixel Room: check pet, missions
- [ ] Party: create a party
- [ ] Analytics: verify charts render
- [ ] History: check entries appear
- [ ] Settings: change theme, change cursor, check persistence
- [ ] Mobile: test bottom nav on phone viewport
- [ ] Log out, log back in

**Document any bugs found → fix immediately.**

### Afternoon: Build Micro-Break Timer

Research-backed: 6-min wakeful rest post-session improves 24hr recall.

**Scope (intentionally tiny — does NOT touch review/Feynman):**
- After review session completes, show "Take a rest break" button
- Opens 6-minute countdown with pixel-art breathing animation
- When done: message + return to dashboard
- No new DB tables, purely frontend component

**Files:**
- New: `src/app/(protected)/app/review/_components/rest-break.tsx`
- Modify: session-complete section (add CTA button)

---

## June 25 (Wednesday) — CLI PR (Kiro Agent Target)

**Separate repo, separate work. $100+ bounty.**

1. Fork `TestSprite/testsprite-cli`
2. Clone locally, `npm install`, `npm run build`, `npm test`
3. Add `kiro` to `src/lib/agent-targets.ts`:
   - path: `.kiro/skills/testsprite-verify/SKILL.md`
   - mode: `own-file`
   - status: `experimental`
4. Add test coverage
5. Update docs (DOCUMENTATION.md, README.md)
6. `npm run lint:fix && npm run format && npm run typecheck && npm test`
7. Commit: `feat(agent): add kiro as an install target`
8. Open PR against `main`

---

## June 26 (Thursday) — Write Practice Exam Mode SPEC (no code)

Write the full architectural spec so a session agent can implement it on
Day 2 of build week with zero ambiguity:

- Route structure: `/app/exam`
- Components: ExamSetup (topic, count, timer selection) + ExamSession
- Server action: `_actions/exam.ts`
- How it connects to FSRS (grade cards based on exam answers)
- How it connects to gamification (XP for exam completion)
- DB needs: possibly a migration for exam_sessions table
- UI mockup in words
- What shared code it touches (review.ts, gamification.ts, study-mix.ts)

**Output:** `docs/SPEC-PRACTICE-EXAM.md`

**NO IMPLEMENTATION.** The whole point is this gets built on Day 2–3 of build
week while TestSprite is watching. The spec ensures it gets built fast and
correctly when the time comes.

---

## June 27 (Friday) — Polish + README Update

- [ ] Update README.md with:
  - New features (JOL confidence, micro-break timer)
  - Correct test count
  - "Quick Judge Path" section
  - Screenshot placeholders (fill during build week)
- [ ] Verify landing page loads correctly on Vercel
- [ ] Check all sprite assets load (no 404s)
- [ ] Test responsive layout on mobile viewport
- [ ] Clean up any stale docs or dead files

---

## June 28 (Saturday) — Demo Video Script + Buffer

- [ ] Write demo video script (2–3 min flow):
  1. Landing page → sign up
  2. Onboarding wizard
  3. Dashboard with quests
  4. Feynman Mode → evaluation → suggested cards
  5. Review with JOL confidence step
  6. Research Desk query with citations
  7. Pixel Room with pet
  8. Theme change in settings
- [ ] Practice the flow mentally
- [ ] Fix any last bugs found
- [ ] Buffer day for anything that slipped

---

## June 29 (Sunday) — Rest + Final Check

- [ ] Final deploy verification: all green
- [ ] Confirm TestSprite credits available
- [ ] One `testsprite test create --dry-run` to confirm CLI is ready
- [ ] Rest. Fresh start tomorrow.

---

## Build Week (June 30 – July 7) — The Judged Window

| Day | Focus | Loop activity |
|---|---|---|
| **30 (Mon)** | Create first 5 TestSprite tests (login, dashboard, review+JOL, Feynman, planner) | Create → run → fix → pass |
| **1 (Tue)** | **BUILD: Practice Exam Mode** (active dev while tests watch) | Existing tests may break → catch → fix |
| **2 (Wed)** | Finish exam + rerun ALL tests → catch regressions → fix | Best loop material |
| **3 (Thu)** | Expand to 15+ tests (exam mode, study room, party, settings) | Coverage grows |
| **4 (Fri)** | Edge cases + full suite green | Compound suite |
| **5 (Sat)** | Polish, write LOOP.md narrative, README final | Documentation |
| **6 (Sun)** | Record demo video, final deploy check, submit before 4:59 PM PDT | Done |

---

## Why This Split Works

Pre-build makes the app strong and stable. Build week adds a feature that
deliberately touches shared systems while the loop watches. The narrative
becomes: "I had a solid app. I built exam mode during the judged week.
TestSprite caught that it broke the JOL confidence step in review. I fixed
it. The loop works."

That's a 40-point loop story, not a "everything was already working" story.
