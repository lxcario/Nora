# Nora — Audit Fix Tasks

Generated from the full UI/UX/frontend/backend audit on June 23, 2026.
All issues are sourced from reading the actual code — no speculation.

**Gemini Deep Research needed?** See the bottom of this file.

---

## 🔴 CRITICAL — Fix before ANY testing (broken features)

### TASK-01: Fix history.ts video query — wrong table name
- **File:** `src/app/(protected)/app/_actions/history.ts`
- **Issue:** Queries `supabase.from("notes")` but the DB table is `video_notes` (created in migration 004)
- **Effect:** Video history is always empty for all users
- **Fix:** Change `from("notes")` to `from("video_notes")` and verify the column names match (`note_content`, `time_segment`, `video_id`, `source`)
- **Effort:** 30 min
- **Status:** [ ]

### TASK-02: Fix XP toast visibility — 100ms is invisible
- **Files:** `review-session.tsx`, `study-session.tsx`, `study-room-layout.tsx`, `feynman-editor.tsx`
- **Issue:** Every XP toast uses `setTimeout(..., 100)` — 100ms is invisible to users. The toast appears and disappears before a single frame renders.
- **Fix:** Change to 2500–3000ms. Also verify the toast component itself (XpToast) has a CSS fade-out transition so it doesn't just snap off.
- **Effort:** 15 min
- **Status:** [ ]

### TASK-03: Fix 404 page — wrong theme/styling
- **File:** `src/app/not-found.tsx`
- **Issue:** Uses `bg-zinc-50`, `dark:bg-zinc-950`, `rounded-md`, `bg-indigo-600` — old Tailwind classes from before the pixel-art redesign. Completely off-theme.
- **Fix:** Rewrite using `pixel-panel`, `pixel-btn pixel-btn-primary`, `var(--pixel-*)` CSS variables to match the rest of the app.
- **Effort:** 20 min
- **Status:** [ ]

### TASK-04: Fix bottom nav — broken CSS class names
- **File:** `src/components/pixel-ui/bottom-nav.tsx`
- **Issue:** Uses `border-pixel-border`, `bg-pixel-bg`, `text-pixel-accent`, `text-pixel-text-muted`, `text-pixel-text` — these Tailwind utility classes don't exist. The app uses CSS variables via `style` props and `globals.css`. Mobile nav renders with no background, no border, broken colors.
- **Fix:** Replace all `text-pixel-*` / `bg-pixel-*` / `border-pixel-*` classes with inline `style` attributes using `var(--pixel-*)` variables. Match the sidebar's active/hover pattern.
- **Effort:** 20 min
- **Status:** [ ]

### TASK-05: Fix Review page description — says "SM-2" (removed in migration 016)
- **File:** `src/app/(protected)/app/review/page.tsx`
- **Issue:** `description="SM-2 spaced repetition. Grade your recall from 0 (blackout) to 5 (perfect)."` — SM-2 was fully removed. App uses FSRS-6 with 4-button grading (Again/Hard/Good/Easy).
- **Fix:** Update description to: `"FSRS spaced repetition. Grade each card: Again, Hard, Good, or Easy — the algorithm schedules your next review automatically."`
- **Effort:** 2 min
- **Status:** [ ]

### TASK-06: Fix analytics topic mastery grade scale — divides by 5 but FSRS uses 1–4
- **File:** `src/app/(protected)/app/_actions/analytics.ts` and `analytics-dashboard.tsx`
- **Issue:** `avgGrade / 5` is used for mastery bar width, but FSRS grades are `Again=1, Hard=2, Good=3, Easy=4` (max 4, not 5). Bars are always 20% smaller than they should be.
- **Fix:** Change mastery bar to divide by 4 (`avgGrade / 4`). Also update the `>/= 3` threshold comparisons to match FSRS scale.
- **Effort:** 10 min
- **Status:** [ ]

---

## 🟡 IMPORTANT — Fix before hackathon build week

### TASK-07: Add Review Cards to bottom nav
- **File:** `src/components/pixel-ui/bottom-nav.tsx`
- **Issue:** The most important daily feature (Review Cards, used every day) is missing from mobile bottom nav. Only: Home, Feynman, Research, Planner, Stats. Review is buried in the sidebar only.
- **Fix:** Replace one of the 5 items (Stats is the least daily-critical) with Review, or expand to 5 items keeping Review. Suggested order: Home, Review, Feynman, Research, Room.
- **Effort:** 10 min
- **Status:** [ ]

### TASK-08: Add loading.tsx skeletons for feature pages
- **Issue:** Only `/app/loading.tsx` (dashboard skeleton) exists. All feature pages flash blank on navigation.
- **Pages needing loading.tsx:**
  - `src/app/(protected)/app/feynman/loading.tsx`
  - `src/app/(protected)/app/review/loading.tsx`
  - `src/app/(protected)/app/research/loading.tsx`
  - `src/app/(protected)/app/study/loading.tsx`
  - `src/app/(protected)/app/study-room/loading.tsx`
  - `src/app/(protected)/app/planner/loading.tsx`
  - `src/app/(protected)/app/room/loading.tsx`
  - `src/app/(protected)/app/party/loading.tsx`
  - `src/app/(protected)/app/analytics/loading.tsx`
  - `src/app/(protected)/app/settings/loading.tsx`
  - `src/app/(protected)/app/history/loading.tsx`
- **Fix:** Each loading.tsx should be a skeleton matching the page's rough layout using `<LoadingSkeleton>` components. Doesn't need to be perfect — just prevent the white flash.
- **Effort:** 1.5–2 hours for all 11 pages
- **Status:** [ ]

### TASK-09: Fix avatar rendering in Pixel Room — always shows CatHead.png
- **File:** `src/app/(protected)/app/room/_components/pixel-room.tsx`
- **Issue:** The avatar sprite in the room scene is hardcoded to `CatHead.png` and ignores the user's `avatars` table (body, head, hair, outfit, accessory). Avatar customization in Settings has no visible effect on the room.
- **Fix:** Pass the user's avatar data from `getRoomState()` to `PixelRoom` and render the correct avatar layers. At minimum, use a placeholder avatar sprite instead of the generic cat head if custom avatars are complex to layer.
- **Effort:** 45 min
- **Status:** [ ]

### TASK-10: Connect Collection page themes to the actual theme system
- **File:** `src/app/(protected)/app/collection/page.tsx`
- **Issue:** The Themes section says "Coming soon" but 6 full palettes (Ember, Forest, Ocean, Lavender, Rose + Light) ARE implemented in `globals.css` and `preferences-provider.tsx`. Users expect to find theme selection in Collection but it's hidden in Settings → Customization.
- **Fix option A (easy):** Add a link in the Collection themes section pointing to Settings → Customization with a note that themes are there.
- **Fix option B (better):** Embed the `<PreferencesPanel>` palette selector directly in the Collection themes section and remove the "Coming soon" label.
- **Effort:** 20 min (Option A) or 45 min (Option B)
- **Status:** [ ]

### TASK-11: Add timezone, ADHD mode, focus audio to Settings → Preferences
- **File:** `src/app/(protected)/app/settings/_components/settings-tabs.tsx` and `profile-form.tsx`
- **Issue:** Settings → Preferences tab says "Timezone, ADHD mode, and focus audio are saved under the Profile tab" — but the ProfileForm doesn't visibly expose these fields. They exist in the DB (`profiles.timezone`, `profiles.adhd_mode`, `profiles.focus_audio`) but users have no clear UI to set them.
- **Fix:** Add timezone selector (IANA timezone list, searchable), ADHD mode toggle, and focus audio selector to the Preferences tab directly. Remove the confusing redirect note.
- **Effort:** 1 hour
- **Status:** [ ]

### TASK-12: Fix sidebar collapse state persistence
- **File:** `src/app/(protected)/app/_components/game-sidebar.tsx`
- **Issue:** The sidebar's nav group expand/collapse state (Study group, Room group) resets on every page navigation. Users re-expand the same group each time.
- **Fix:** Persist expand state to `localStorage` on toggle, read on mount. Key: `sidebar-study-expanded`, `sidebar-room-expanded`.
- **Effort:** 20 min
- **Status:** [ ]

### TASK-13: Fix cancel button in Research Desk — visual-only, doesn't stop LLM call
- **File:** `src/app/(protected)/app/research/_components/research-desk.tsx`
- **Issue:** The Cancel button during research sets `abortRef.current = true` and clears stage timers, but the server action (`performResearch`) is already in flight via `startTransition`. The LLM call and API requests continue server-side — cancel is purely visual, result is silently discarded.
- **Fix:** This is a known limitation of Server Actions (can't abort mid-flight). At minimum, add a note in the UI: "The current search will finish in the background but the result will be discarded." Or move research to a Route Handler with proper AbortController support.
- **Effort:** 30 min (UI note) or 2–3 hours (Route Handler refactor)
- **Status:** [ ]

### TASK-14: Fix duplicate academic events in planner — shows in both strip AND calendar
- **File:** `src/app/(protected)/app/planner/page.tsx` and `weekly-calendar.tsx`
- **Issue:** The same `academicEvents` array feeds both the "UPCOMING ACADEMIC DEADLINES" strip above the calendar AND the chips inside each calendar cell. A user sees the same event twice.
- **Fix:** The deadline strip should show only events within the NEXT 14 days (near-term warnings). The calendar should show all events within the visible week. These are different views of the same data — just scope each one appropriately.
- **Effort:** 20 min
- **Status:** [ ]

---

## 🟠 POLISH — Nice to have before hackathon

### TASK-15: Persist sidebar open/closed state on mobile
- **File:** `src/app/(protected)/app/_components/game-sidebar.tsx`
- **Issue:** If there's a mobile hamburger toggle for the sidebar, its state should persist across navigations.
- **Effort:** 15 min
- **Status:** [ ]

### TASK-16: Add "Add cards manually" button to empty Feynman state
- **File:** `src/app/(protected)/app/feynman/page.tsx`
- **Issue:** New users with no topics see "No topics found. Go to Settings." — but Settings → Subjects isn't obviously a "create first topic" flow. The empty state could be more guiding.
- **Fix:** Add a more descriptive empty state: "Start by adding subjects and topics — then use Feynman Mode to explain them and build your flashcard deck." With a primary CTA: "Create your first subject →"
- **Effort:** 20 min
- **Status:** [ ]

### TASK-17: Fix pet evolution logic — magic number formula inconsistent with UI text
- **File:** `src/app/(protected)/app/_actions/room.ts`
- **Issue:** `canEvolve = userLevel >= (currentIdx + 1) * 5 - 2` doesn't match the displayed message "at level 5 or 15". The formula gives 3 and 8, not 5 and 15.
- **Fix:** Define explicit evolution level thresholds as constants (e.g. `EVOLUTION_LEVELS = [5, 15]`) and use them consistently in both the calculation and the display text.
- **Effort:** 20 min
- **Status:** [ ]

### TASK-18: Remove dead `PixelSidebar` component or document it
- **File:** `src/components/pixel-ui/pixel-sidebar.tsx`
- **Issue:** The old `PixelSidebar` component still exists but `GameSidebar` is used everywhere. The old one is exported from `components/pixel-ui/index.ts` and appears in `pixel-sidebar.tsx`. It's dead code that confuses navigation.
- **Fix:** Either delete `pixel-sidebar.tsx` and remove it from the index export, or add a deprecation comment explaining that `GameSidebar` replaced it.
- **Effort:** 10 min
- **Status:** [ ]

### TASK-19: Study Mix — Feynman items should deep-link to topic, not just `/app/feynman`
- **File:** `src/app/(protected)/app/study/_components/study-session.tsx`
- **Issue:** When a Study Mix queue item is type `feynman_prompt`, clicking "Explain This" navigates to `/app/feynman` without selecting the topic. Users land on the first topic in the dropdown, not the one they were prompted for.
- **Fix:** Navigate to `/app/feynman?topic=<topicId>` and have the Feynman page read the `topic` query param on mount to pre-select the right topic.
- **Effort:** 30 min
- **Status:** [ ]

### TASK-20: Fix party help quests — creation logic not triggered
- **File:** `src/app/(protected)/app/_actions/party-quests.ts` and `party.ts`
- **Issue:** The `forest_rescue` pet state and help quest UI exist, but no logic converts a missed study day into a help quest. The feature is cosmetically wired but functionally empty.
- **Fix:** This is a significant feature to build fully (needs a daily check or on-login trigger). For now, add a comment clarifying the gap and consider a manual "Ask for help" button that creates a help quest directly. Full automation can come later.
- **Effort:** 1–2 hours for manual trigger, 4+ hours for full automation
- **Status:** [ ]

---

## 📋 CONTEXT FOR FUTURE AI AGENTS

**What "broken" means here:** The app builds and deploys without errors. "Broken" means a specific user flow produces wrong/empty output or visually broken UI.

**Key file relationships:**
- History video entries: `history.ts` → should query `video_notes` table (004_study_room.sql)
- XP toasts: `XpToast` component in `_components/xp-toast.tsx` — the component itself is fine, callers use 100ms timeout
- Pixel Room avatar: `room.ts` → `getRoomState()` → `PixelRoom` component — avatar data flows but isn't rendered
- Bottom nav: `bottom-nav.tsx` uses non-existent Tailwind classes — use `style` props with CSS variables instead
- FSRS grades: `Rating.Again=1, Hard=2, Good=3, Easy=4` — NOT 0-5 SM-2 scale

**What NOT to do:**
- Don't touch `supabase/migrations/` — migrations are already applied to prod
- Don't change the FSRS algorithm in `src/lib/fsrs.ts` — it's correct and unit-tested
- Don't change `src/proxy.ts` — auth middleware is working correctly
- Don't change `.env.local` or `.env.example` values

---

## ❓ DO WE NEED GEMINI DEEP RESEARCH?

**Short answer: No, not for any of these tasks.**

Every issue here was found by reading actual code. The fixes are all:
- Internal code changes (wrong table name, wrong constant, wrong CSS class)
- UI wiring issues (components not connected to data)
- Missing files (loading.tsx skeletons)

None of these require external knowledge that Gemini Deep Research would help with:

| What Gemini Deep Research is useful for | Applies here? |
|---|---|
| "What's the best way to implement X pattern in Next.js 16?" | No — we know the pattern |
| "How does pgvector cosine similarity work?" | No — already implemented |
| "What are the best FSRS parameters for a study app?" | No — already tuned |
| "What's wrong with our video history feature?" | No — we already found it |

The only scenario where Gemini research WOULD help is if you decide to tackle **TASK-13** (cancel button / Route Handler refactor) and want to understand the tradeoffs between Server Actions vs Route Handlers for long-running AI calls. That's a design decision worth researching.

**Recommendation:** Skip Gemini research. Start with TASK-01 through TASK-07 in order — they're all <30 min each and fix real broken behavior before the hackathon.

---

## Quick wins (< 5 min each)

These can be done right now without reading any additional code:

| Task | File | Change |
|---|---|---|
| TASK-05 | `review/page.tsx` line 10 | Update description string |
| TASK-02 (partial) | Any component with `setTimeout(..., 100)` | Change 100 to 2500 |
| TASK-06 (partial) | `analytics-dashboard.tsx` | Change `/ 5` to `/ 4` in mastery bar width |

---

**Last updated:** June 23, 2026  
**Source:** Full code audit of all pages, components, and server actions  
**Total tasks:** 20 (6 critical, 8 important, 6 polish)
