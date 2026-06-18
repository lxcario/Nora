# UX Audit — Design

## Architecture Overview

All changes are strictly presentational. No new routes, no schema changes, no server actions. The work consists of:

1. **Wiring existing components** (BottomNav already built, just not rendered)
2. **Replacing component internals** (swap Tailwind classes/lucide icons for pixel-ui components)
3. **One new component** (PixelConfirmDialog — a modal built from existing DialogFrame + PixelButton)

---

## Component Design

### PixelConfirmDialog (New)

```
┌─────────────────────────────────────────┐
│  ░░░░░░░░░░ BACKDROP ░░░░░░░░░░░░░░░░  │
│  ┌───────────────────────────────────┐  │
│  │  DialogFrame                      │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Title (font-pixel)         │  │  │
│  │  │  Message (sans-serif)       │  │  │
│  │  │                             │  │  │
│  │  │  [Cancel]      [Confirm]    │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface PixelConfirmDialogProps {
  open: boolean;
  title?: string;           // default: "Are you sure?"
  message: string;          // describes the destructive action
  confirmLabel?: string;    // default: "Confirm"
  cancelLabel?: string;     // default: "Cancel"
  variant?: "danger" | "warning";  // default: "danger"
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Behavior:**
- Renders a fixed overlay (`inset-0 z-50`) with semi-transparent backdrop (`bg-black/50`)
- Centers a `DialogFrame` with title + message + two buttons
- Cancel: `PixelButton variant="secondary"` → calls `onCancel`
- Confirm: `PixelButton variant="danger"` (or "warning") → calls `onConfirm`
- Focus trap: on mount, focus moves to Cancel button. Tab cycles between Cancel and Confirm only.
- Escape key calls `onCancel`
- Click on backdrop calls `onCancel`
- Uses `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` for title, `aria-describedby` for message

**File:** `src/components/pixel-ui/confirm-dialog.tsx`
**Export:** Added to `src/components/pixel-ui/index.ts`

---

## Re-skin Strategy

### Pattern: "Inside Out" Replacement

For each legacy-styled component, the transformation follows this mechanical pattern:

| Legacy Pattern | Pixel-UI Replacement |
|---|---|
| `rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900` | `pixel-panel` class or `<DialogFrame>` |
| `bg-indigo-600 px-4 py-2 text-sm font-medium text-white` | `<PixelButton variant="primary">` |
| `bg-red-600 hover:bg-red-700 text-white` | `<PixelButton variant="danger">` |
| `border border-zinc-300 px-3 py-2 text-sm` (outline btn) | `<PixelButton variant="secondary">` |
| `h-2 rounded-full bg-indigo-500` (progress bar) | `<PixelProgressBar variant="xp">` |
| `text-zinc-500 dark:text-zinc-400` | `text-[var(--pixel-text-secondary)]` |
| `text-zinc-800 dark:text-zinc-200` | `text-[var(--pixel-text-primary)]` |
| `text-red-500` / `text-red-700` | `text-[var(--pixel-error)]` |
| `text-emerald-500` / `text-green-500` | `text-[var(--pixel-success)]` |
| `text-amber-500` | `text-[var(--pixel-warning)]` |
| `bg-zinc-100 dark:bg-zinc-800` (muted bg) | `bg-[var(--pixel-bg-secondary)]` |
| `border-zinc-100 dark:border-zinc-800` | `border-[var(--pixel-border)]` |
| `<Loader2 className="animate-spin" />` | `<LoadingSkeleton>` or pixel-blink dots |
| Lucide icon as decorator | Sprite image or omit |
| `rounded-full bg-indigo-100 text-indigo-700` (badge) | `pixel-panel pixel-panel-inset` with accent var |

### Grade Buttons (Review/Study Sessions)

The 6-grade button row (0=Blackout → 5=Easy) maps to pixel theme colors:

| Grade | Legacy Class | Pixel Var |
|---|---|---|
| 0 (Blackout) | `bg-red-600` | `var(--pixel-error)` |
| 1 (Wrong) | `bg-red-500` | `var(--pixel-error)` at 85% opacity |
| 2 (Hard) | `bg-orange-500` | `var(--pixel-warning)` |
| 3 (OK) | `bg-amber-500` | `var(--pixel-accent)` |
| 4 (Good) | `bg-emerald-500` | `var(--pixel-success)` at 85% opacity |
| 5 (Easy) | `bg-emerald-600` | `var(--pixel-success)` |

Buttons render as inline-styled `<button>` elements with pixel-font text, 2px borders, no border-radius (pixel aesthetic). Min height 44px for touch targets.

---

## Layout Change: BottomNav

**Current layout structure:**
```
<PreferencesProvider>
  <div class="flex min-h-screen">
    <GameSidebar />           ← hidden on mobile (hidden md:flex)
    <div class="flex-1 flex flex-col">
      <GameTopBar />
      <main class="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  </div>
</PreferencesProvider>
```

**After change:**
```
<PreferencesProvider>
  <div class="flex min-h-screen">
    <GameSidebar />
    <div class="flex-1 flex flex-col min-h-screen overflow-hidden">
      <GameTopBar />
      <main class="flex-1 overflow-y-auto p-8 pb-20 md:pb-8">
        {children}
      </main>
      <BottomNav />           ← NEW: renders only on mobile (md:hidden)
    </div>
  </div>
</PreferencesProvider>
```

The `pb-20 md:pb-8` on main ensures content isn't hidden behind the fixed bottom nav on mobile while keeping normal padding on desktop.

---

## Error/Loading State Design

### error.tsx

```
<DialogFrame state="error">
  <div centered>
    <ErrorIcon (pixel X in box) />
    <h2 font-pixel>"Something went wrong"</h2>
    <p sans-serif>{error.message || fallback}</p>
    <PixelButton variant="danger" onClick={reset}>Try again</PixelButton>
  </div>
</DialogFrame>
```

Uses the existing `ErrorState` component pattern but wraps with proper centering for full-page context.

### loading.tsx

```
<div centered min-h-[50vh]>
  <LoadingSkeleton height={80} />
  <p font-pixel text-pixel-text-secondary>Loading...</p>
</div>
```

Or alternatively, a pixel-panel with three-dot blink animation for a more branded feel.

---

## Files Affected (Sprint 1)

| File | Change Type |
|---|---|
| `src/app/(protected)/app/layout.tsx` | Add BottomNav import + render |
| `src/app/(protected)/app/error.tsx` | Full rewrite (small file) |
| `src/app/(protected)/app/loading.tsx` | Full rewrite (small file) |
| `src/components/pixel-ui/confirm-dialog.tsx` | New file |
| `src/components/pixel-ui/index.ts` | Add export |
| `src/app/(protected)/app/review/page.tsx` | Re-skin stats bar |
| `src/app/(protected)/app/review/_components/review-session.tsx` | Full re-skin |
| `src/app/(protected)/app/study/page.tsx` | Re-skin error/empty states |
| `src/app/(protected)/app/study/_components/study-session.tsx` | Full re-skin |

---

## Testing Strategy

Since this is a UI-only reskin with no behavior changes:
- **Visual verification:** Each changed page renders correctly in dark theme (the only theme)
- **Functional verification:** Review session still grades cards, study session still advances, BottomNav links navigate correctly
- **Accessibility:** PixelConfirmDialog traps focus, Escape closes, aria attributes present
- **Mobile:** BottomNav visible < 768px, hidden ≥ 768px. Content not obscured.
- **Build:** `next build` passes without errors after all changes
