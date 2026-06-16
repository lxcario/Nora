# Implementation Plan: Pixel Art UI

## Overview

Transform Nora's modern zinc/white UI into a cozy pixel-art aesthetic using the Sprout Lands UI Pack. Implementation proceeds bottom-up: theme layer → sprite infrastructure → primitive components → composite components → integration with existing pages.

## Tasks

- [x] 1. Theme Layer & CSS Foundation
  - [x] 1.1 Add pixel Color_Palette CSS custom properties to globals.css
    - Add `:root` light and dark mode custom properties for all pixel theme colors (cream backgrounds, brown text, amber accents, sage green, muted red)
    - Add dark mode variant via `@media (prefers-color-scheme: dark)` block
    - Add cursor CSS rules for default and pointer states using sprite cursors
    - Add `[data-state]` attribute selectors for disabled, loading, focus, selected, success, warning, error treatments
    - _Requirements: 1.1, 1.6, 1.7, 1.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 11.6_

  - [x] 1.2 Extend `@theme inline` block with pixel Tailwind v4 tokens
    - Add `--color-pixel-*` tokens mapping to CSS custom properties
    - Add `--spacing-pixel: 8px` base grid token
    - Add `--font-pixel` token reference
    - Ensure existing tokens remain intact
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 2. Sprite Infrastructure
  - [x] 2.1 Create the sprite map registry (`src/components/pixel-ui/sprite-map.ts`)
    - Define `SpriteCoord` interface and `SpriteMap` type
    - Export `SPRITE_SHEETS` constant with paths to all spritesheets in `/sprites/ui/`
    - Export `spriteMap` object mapping logical names to coordinates for buttons, dialog nine-slice regions, icons, and emojis
    - Use naming convention: `"{category}-{variant}-{state}"`
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 2.2 Create the base SpriteRegion component (`src/components/pixel-ui/sprite-region.tsx`)
    - Implement as a Server Component rendering a `<div>` with CSS background-image, background-position, background-size
    - Apply `image-rendering: pixelated` and integer scaling via `transform: scale(N)`
    - Accept `name`, `scale`, `className`, `style`, `aria-label`, `aria-hidden` props
    - Look up coordinates from sprite map; return `null` with dev warning for unknown names
    - _Requirements: 11.3, 4.2_

  - [ ]* 2.3 Write property test: sprite map entries within bounds (Property 3)
    - **Property 3: Sprite map entries fall within spritesheet bounds**
    - **Validates: Requirements 11.1**
    - File: `test/pixel-ui/sprite-map.property.test.ts`
    - For each entry in the sprite map, verify `x + width <= sheetWidth` and `y + height <= sheetHeight`

  - [ ]* 2.4 Write property test: integer scaling produces exact dimensions (Property 4)
    - **Property 4: Integer scaling produces exact pixel dimensions**
    - **Validates: Requirements 2.4, 4.3, 10.6**
    - File: `test/pixel-ui/nine-slice.property.test.ts`
    - For any sprite with native (w, h) and scale in {1, 2, 3}, rendered dimensions equal (w×scale, h×scale) exactly

- [x] 3. Nine-Slice Panel Component
  - [x] 3.1 Implement NineSlice component (`src/components/pixel-ui/nine-slice.tsx`)
    - Implement as a Server Component using CSS Grid 3×3 layout (`auto 1fr auto`)
    - Corners: fixed size via background-position clipping from sprite map
    - Edges: `background-repeat: repeat-x` / `repeat-y` tiling the edge slice
    - Center: `background-repeat: repeat` or solid fill
    - Support `variant` prop ("standard" | "large") selecting dialog-box.png vs dialog-box-big.png
    - Support `scale` prop (2 | 3) for integer scaling
    - Accept `className`, `style`, `children` props
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Write property test: nine-slice regions partition (Property 1)
    - **Property 1: Nine-slice regions form a complete non-overlapping partition**
    - **Validates: Requirements 2.1**
    - File: `test/pixel-ui/nine-slice.property.test.ts`
    - For any source rectangle and corner size, verify 9 sub-regions tile exactly with zero overlap/gaps

- [x] 4. Primitive Components (Button, Icon, Input)
  - [x] 4.1 Implement PixelButton component (`src/components/pixel-ui/pixel-button.tsx`)
    - Client Component (`"use client"`) for interaction handling
    - Render idle/hover/active/disabled/focus states from buttons-26x26.png spritesheet
    - Support `size` ("small" | "default"), `variant` ("primary" | "secondary" | "danger"), `disabled`, `loading`, `type`, `onClick` props
    - Apply SproutLands pixel font for label text
    - Ensure minimum 44×44 CSS pixel touch target via padding/min-width/min-height
    - Handle keyboard activation (Enter/Space)
    - Apply `data-state` attributes for UI state system integration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2, 8.8, 10.4_

  - [x] 4.2 Implement IconSprite component (`src/components/pixel-ui/icon-sprite.tsx`)
    - Server Component rendering a single icon from the sprite map
    - Support `name`, `size` (1 | 2 | 3), `aria-label`, `fallback` (Lucide component), `className` props
    - Fall back to Lucide icon when sprite name unknown, log dev warning
    - Apply `image-rendering: pixelated`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Implement PixelInput component (`src/components/pixel-ui/pixel-input.tsx`)
    - Client Component supporting `type`: "text" | "textarea" | "select" | "search" | "toggle"
    - Text: 2px solid border from Color_Palette, cream background, amber focus glow
    - Textarea: lightweight nine-slice frame with 8px internal padding
    - Toggle: sage green on / muted gray off with pixel-art styling
    - Select: pixel-art dropdown arrow icon from spritesheet
    - Search: magnifying glass IconSprite prefix
    - Labels in pixel font, value text in Geist sans-serif
    - Support `label`, `value`, `checked`, `onChange`, `options`, `placeholder`, `disabled`, `error` props
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 4.4 Write property test: minimum touch target (Property 2)
    - **Property 2: Interactive elements meet minimum touch target**
    - **Validates: Requirements 3.8, 10.2**
    - File: `test/pixel-ui/touch-target.property.test.ts`
    - For any PixelButton size variant, verify clickable area >= 44×44 CSS pixels

  - [ ]* 4.5 Write property test: color contrast WCAG AA (Property 5)
    - **Property 5: Color palette pairs meet WCAG AA contrast**
    - **Validates: Requirements 10.3**
    - File: `test/pixel-ui/contrast.property.test.ts`
    - For all text/background color pairs in the palette, verify contrast ratio >= 4.5:1

- [x] 5. Checkpoint - Core primitives complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Composite Components (Dialog, Empty, Error, Loading)
  - [x] 6.1 Implement DialogFrame component (`src/components/pixel-ui/dialog-frame.tsx`)
    - Wrap NineSlice with optional `title` header (pixel font), `state` styling, internal 8px grid padding
    - Support `variant`, `state` ("default" | "success" | "warning" | "error"), `className`, `children` props
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Implement EmptyState and ErrorState components (`src/components/pixel-ui/empty-state.tsx`, `src/components/pixel-ui/error-state.tsx`)
    - EmptyState: pixel-art illustration inside DialogFrame, descriptive pixel font message, optional action PixelButton
    - ErrorState: DialogFrame with error UI_State treatment (muted red border), failure description, retry PixelButton
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 6.3 Implement LoadingSkeleton component (`src/components/pixel-ui/loading-skeleton.tsx`)
    - Render placeholder rectangles/lines with pixel shimmer animation
    - Match Color_Palette surface/muted tones
    - Occupy approximate expected content dimensions to prevent layout shift
    - _Requirements: 9.6, 9.7_

- [x] 7. Toast Notification System
  - [x] 7.1 Implement ToastProvider context (`src/components/pixel-ui/toast-provider.tsx`)
    - Client Component wrapping app layout with React context
    - Manage toast queue state (max 3 visible, FIFO eviction)
    - Expose `addToast` and `dismissToast` via context
    - Auto-dismiss timers with cleanup on unmount
    - Throw descriptive error if `useToast` called outside provider
    - _Requirements: 12.6_

  - [x] 7.2 Implement Toast component (`src/components/pixel-ui/toast.tsx`)
    - Client Component rendering within a mini NineSlice DialogFrame
    - Slide-in from top-right animation
    - Support variants: success (sage green), warning (amber), error (red), info (cream), level-up (large variant)
    - Render pixel-art progress bar shrinking over dismiss duration (default 3s)
    - XP/coin rewards use float-up-fade animation
    - Level-up variant triggers sound effect
    - Stack up to 3 toasts vertically
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 7.3 Write property test: toast queue capacity (Property 6)
    - **Property 6: Toast queue never exceeds maximum capacity**
    - **Validates: Requirements 12.6**
    - File: `test/pixel-ui/toast-queue.property.test.ts`
    - For any sequence of N additions where N > 3, queue never exceeds 3 items; oldest evicted

  - [ ]* 7.4 Write property test: toast auto-dismiss timing (Property 7)
    - **Property 7: Toast auto-dismiss respects configured duration**
    - **Validates: Requirements 12.5**
    - File: `test/pixel-ui/toast-queue.property.test.ts`
    - For any toast with duration D, it persists for D ms then is removed

- [x] 8. Analytics Display Components
  - [x] 8.1 Implement PixelStatCard, PixelProgressBar (`src/components/pixel-ui/pixel-stat-card.tsx`, `src/components/pixel-ui/pixel-progress-bar.tsx`)
    - StatCard: DialogFrame wrapper with pixel font value, Geist label, optional IconSprite
    - ProgressBar: HP/MP-style segmented fill with 1px gaps, pixel border, variant coloring (xp/hp/mp)
    - _Requirements: 13.1, 13.4_

  - [x] 8.2 Implement PixelBarChart and PixelHeatmap (`src/components/pixel-ui/pixel-bar-chart.tsx`, `src/components/pixel-ui/pixel-heatmap.tsx`)
    - BarChart: solid Color_Palette bars, no gradients, 1px borders, pixel font axis labels
    - Heatmap: grid of pixel squares with cream→sage→dark green intensity shading
    - Both support hover tooltips rendered in mini NineSlice DialogFrame with pixel font
    - _Requirements: 13.2, 13.3, 13.5_

  - [ ]* 8.3 Write property test: heatmap intensity mapping (Property 8)
    - **Property 8: Heatmap intensity maps to correct color band**
    - **Validates: Requirements 13.3**
    - File: `test/pixel-ui/analytics.property.test.ts`
    - For any count value, assigned color is in the correct intensity band; mapping is monotonically non-decreasing

  - [ ]* 8.4 Write property test: progress bar proportionality (Property 9)
    - **Property 9: Progress bar segments are proportional to value**
    - **Validates: Requirements 13.4**
    - File: `test/pixel-ui/analytics.property.test.ts`
    - For any value V in [0, max], filled segments = round(V/max × S); monotonically non-decreasing

- [x] 9. Checkpoint - All components built
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Sidebar Integration & Responsive Layout
  - [x] 10.1 Implement PixelSidebar component (`src/components/pixel-ui/pixel-sidebar.tsx`)
    - Client Component (uses `usePathname`)
    - Render outer container with NineSlice DialogFrame background
    - "NORA" brand in pixel font amber/gold
    - Navigation items with IconSprite icons (Lucide fallback), pixel font labels
    - Active item with distinct selected state highlight
    - Hover state using Color_Palette accent
    - Preserve all existing nav links, MusicPlayer, SfxToggle, sign-out
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 10.2 Implement BottomNav component (`src/components/pixel-ui/bottom-nav.tsx`)
    - Client Component fixed to bottom on mobile (<768px)
    - IconSprite icons with pixel font labels beneath
    - Minimum 44×44 touch targets per tab
    - Show primary navigation sections only
    - _Requirements: 10.1, 10.2_

  - [x] 10.3 Update existing sidebar.tsx to use PixelSidebar
    - Replace the current `Sidebar` component export with `PixelSidebar`
    - Add responsive logic: render PixelSidebar on desktop, BottomNav on mobile
    - Ensure `prefers-reduced-motion` disables hover animations
    - _Requirements: 10.1, 10.5_

- [x] 11. Barrel Export & Spritesheet Preloading
  - [x] 11.1 Create barrel export file (`src/components/pixel-ui/index.ts`)
    - Export all components from single entry point
    - _Requirements: 11.4_

  - [x] 11.2 Add spritesheet preloading to the app layout
    - Add `<link rel="preload">` tags for spritesheet PNGs in the root layout
    - Prevents visual pop-in during navigation
    - _Requirements: 11.5_

- [x] 12. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The sprite map coordinates in task 2.1 will need to be measured from the actual Sprout Lands spritesheet PNGs in `public/sprites/ui/`
- All Client Components use `"use client"` directive; Server Components are the default
- Tailwind v4 `@theme inline` is used in globals.css — no separate tailwind.config file

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "4.5", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["8.1", "8.2"] },
    { "id": 9, "tasks": ["8.3", "8.4", "10.1"] },
    { "id": 10, "tasks": ["10.2"] },
    { "id": 11, "tasks": ["10.3", "11.1", "11.2"] }
  ]
}
```
