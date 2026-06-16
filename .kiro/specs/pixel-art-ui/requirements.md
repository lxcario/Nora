# Requirements Document

## Introduction

This feature transforms Nora's current modern UI (zinc/white dark mode with Geist font) into a cozy pixel-art aesthetic inspired by Stardew Valley and RPG life-sim games. The system uses sprite assets from the Sprout Lands UI Pack to create reusable pixel-art UI components (buttons, panels, dialog frames, sidebar, form inputs) and a cohesive theme that applies across the entire application. The goal is a warm, inviting "Pixel Study OS" feel while preserving usability, accessibility, and responsiveness.

## Glossary

- **Pixel_Theme**: The global CSS theme layer providing pixel-art colors, spacing (8px grid), and typography (SproutLands font) to all UI components
- **Sprite_Component**: A React component that renders a specific region from a spritesheet PNG using CSS `background-position` and `image-rendering: pixelated`
- **Nine_Slice**: A technique for rendering scalable pixel-art panels by splitting a sprite into 9 regions (4 corners, 4 edges, 1 center) that tile or stretch independently
- **Dialog_Frame**: A pixel-art bordered container rendered via Nine_Slice from the Sprout Lands dialog-box sprites, used for cards, modals, and content panels
- **Pixel_Button**: A clickable UI element rendered from the Sprout Lands buttons spritesheet with distinct idle, hover, active, disabled, and focus visual states
- **Pixel_Sidebar**: The main navigation sidebar reskinned with pixel-art panel frames, pixel font labels, and sprite-based icons
- **Icon_Sprite**: A single icon extracted from the Sprout Lands icons spritesheet via background-position offset
- **Integer_Scaling**: Rendering pixel art at exact whole-number multiples (2x, 3x) to prevent sub-pixel blurring
- **Color_Palette**: A limited set of harmonious colors derived from the Sprout Lands sprites used for backgrounds, text, accents, and borders
- **Pixel_Input**: A form input element (text field, textarea, select, toggle) styled with pixel-art borders and focus states from the Color_Palette
- **UI_State**: A defined visual treatment (color change, sprite frame swap, or overlay effect) representing a component's interactive state (disabled, loading, focus, selected, success, warning, error)
- **Empty_State**: A pixel-styled placeholder component displayed when a list or view has no data to show
- **Bottom_Nav**: A mobile-optimized bottom navigation bar providing thumb-accessible access to primary app sections
- **Toast_Notification**: A transient feedback message rendered within a mini Dialog_Frame that auto-dismisses after a set duration, used for XP rewards, level-ups, and action confirmations
- **Analytics_Display**: The collection of pixel-art styled data visualization components (stat cards, bar charts, heatmap, progress bars) used on the analytics dashboard

## Requirements

### Requirement 1: Pixel Theme, Color System & Typography

**User Story:** As a student using Nora, I want the entire application to have a consistent cozy pixel-art look with warm colors and a pixel font, so that the interface feels like a charming RPG life-sim and motivates me to study.

#### Acceptance Criteria

1. THE Pixel_Theme SHALL define CSS custom properties for the Color_Palette with warm earth tones: cream/parchment backgrounds, dark brown text, amber/gold accents, sage green for success states, and muted red for error states in both light and dark mode variants
2. THE Pixel_Theme SHALL define Tailwind CSS v4 theme tokens for all Color_Palette values so components can reference them as utility classes
3. THE Pixel_Theme SHALL enforce an 8px base spacing grid for all padding, margin, and gap values across the application
4. THE Pixel_Theme SHALL set the SproutLands font as the primary display font for all heading elements (h1 through h6), labels, and navigation items
5. THE Pixel_Theme SHALL retain a legible sans-serif body font (Geist) for paragraph text and long-form content to preserve readability
6. WHEN text is rendered in the SproutLands pixel font, THE Pixel_Theme SHALL disable font smoothing (antialiased) to maintain sharp pixel edges
7. THE Pixel_Theme SHALL apply `image-rendering: pixelated` globally to all elements with the `pixel-art` class
8. WHEN a user has their system set to dark mode, THE Pixel_Theme SHALL switch to the dark Color_Palette variant without requiring manual toggling

### Requirement 2: Nine-Slice Panel Component

**User Story:** As a developer building Nora's pages, I want a reusable pixel-art panel component that scales to any content size, so that I can wrap cards, modals, and sections in consistent Sprout Lands-style frames.

#### Acceptance Criteria

1. THE Nine_Slice component SHALL render a scalable bordered frame from the dialog-box.png sprite by splitting it into 9 regions (4 corners, 4 edges, 1 center)
2. THE Nine_Slice component SHALL support a `variant` prop with values "standard" (dialog-box.png) and "large" (dialog-box-big.png) to select the source sprite
3. THE Nine_Slice component SHALL scale to fit its children content without distorting corner or edge pixel art
4. THE Nine_Slice component SHALL render all sprite regions using Integer_Scaling at a 2x or 3x multiplier to maintain crisp pixel edges
5. THE Nine_Slice component SHALL accept optional className and style props for layout customization by consuming components

### Requirement 3: Pixel Button Component

**User Story:** As a student, I want buttons that look like pixel-art RPG buttons with clear press feedback and visible focus/disabled states, so that interacting with Nora feels playful and responsive.

#### Acceptance Criteria

1. THE Pixel_Button component SHALL render its idle state using a frame from the buttons-26x26.png spritesheet
2. WHEN a user hovers over a Pixel_Button, THE Pixel_Button SHALL display a visually distinct hover state (highlighted or brightened frame from the spritesheet)
3. WHEN a user presses a Pixel_Button, THE Pixel_Button SHALL display an active/pressed state (depressed frame from the spritesheet) with a 1-2 pixel downward offset
4. WHEN a Pixel_Button is disabled, THE Pixel_Button SHALL display a grayed/desaturated sprite frame and SHALL NOT respond to click, hover, or keyboard interaction
5. WHEN a Pixel_Button receives keyboard focus, THE Pixel_Button SHALL display a visible pixel-art focus ring (amber/gold outline or highlight) that is visually distinct from the hover state
6. THE Pixel_Button component SHALL support size variants "small" (1x scale) and "default" (2x scale) via a `size` prop
7. THE Pixel_Button component SHALL render its label text using the SproutLands pixel font
8. THE Pixel_Button component SHALL maintain a minimum touch target of 44x44 CSS pixels for accessibility compliance regardless of visual size

### Requirement 4: Icon Sprite Component

**User Story:** As a developer, I want a component that extracts individual icons from the Sprout Lands icon spritesheet, so that I can use pixel-art icons throughout the app without loading individual image files.

#### Acceptance Criteria

1. THE Icon_Sprite component SHALL render a single icon from the icons.png spritesheet by accepting a `name` prop that maps to a specific background-position offset
2. THE Icon_Sprite component SHALL apply `image-rendering: pixelated` to prevent anti-aliasing blur on the rendered icon
3. THE Icon_Sprite component SHALL support a `size` prop controlling the rendered dimensions using Integer_Scaling (1x, 2x, 3x)
4. THE Icon_Sprite component SHALL accept an `aria-label` prop and render it for screen reader accessibility
5. WHEN an unknown icon name is provided, THE Icon_Sprite component SHALL fall back to the corresponding Lucide icon if one is available, otherwise render nothing, and log a development-mode warning

### Requirement 5: Pixel Sidebar Navigation

**User Story:** As a student, I want the sidebar navigation to match the pixel-art theme with RPG-style frames and icons, so that navigating Nora feels immersive and consistent with the cozy aesthetic.

#### Acceptance Criteria

1. THE Pixel_Sidebar SHALL render its outer container using a Nine_Slice Dialog_Frame as the background panel
2. THE Pixel_Sidebar SHALL display the "NORA" brand text using the SproutLands font in an amber/gold color
3. THE Pixel_Sidebar SHALL render each navigation item with an Icon_Sprite (where a matching sprite icon exists) or fall back to the existing Lucide icon
4. WHEN a navigation item is active, THE Pixel_Sidebar SHALL highlight it with a distinct pixel-art selected state (brighter background color from the Color_Palette)
5. WHEN a user hovers over a navigation item, THE Pixel_Sidebar SHALL display a subtle highlight using the Color_Palette accent color
6. THE Pixel_Sidebar SHALL maintain all existing navigation links, music player, SFX toggle, and sign-out functionality

### Requirement 6: Pixel Card Component

**User Story:** As a student, I want content cards (flashcards, research results, planner items) wrapped in pixel-art frames, so that all information panels match the cozy theme.

#### Acceptance Criteria

1. THE Dialog_Frame component SHALL render a bordered pixel-art card container using the Nine_Slice technique with the standard dialog-box.png sprite
2. THE Dialog_Frame component SHALL support an optional `title` prop rendered as a pixel-font header within the top border region
3. THE Dialog_Frame component SHALL provide internal padding matching the 8px grid for consistent content spacing
4. THE Dialog_Frame component SHALL accept children elements and render them within the inner content region without clipping

### Requirement 7: Pixel Form Inputs

**User Story:** As a student, I want text inputs, selects, textareas, and toggles to have a pixel-art treatment, so that the heavily form-driven parts of Nora (Feynman editor, research query, settings, planner) feel visually consistent with the rest of the theme.

#### Acceptance Criteria

1. THE Pixel_Input text field SHALL render with a 2px solid border using the Color_Palette border color and a cream/parchment background matching the Pixel_Theme
2. WHEN a Pixel_Input text field receives focus, THE Pixel_Input SHALL display an amber/gold pixel glow or border color change that is visually distinct from the unfocused state
3. THE Pixel_Input textarea SHALL render within a lightweight pixel-art frame (thinner variant of the Dialog_Frame Nine_Slice) with internal padding matching the 8px grid
4. THE Pixel_Input toggle switch SHALL render with pixel-art on/off states using distinct sprite frames or Color_Palette colors (sage green for on, muted gray for off)
5. THE Pixel_Input select dropdown SHALL render with a pixel-art dropdown arrow icon sourced from the Sprout Lands spritesheet
6. THE Pixel_Input search bar SHALL render with a pixel-art magnifying glass Icon_Sprite and the same 2px border styling as standard text fields
7. THE Pixel_Input components SHALL render label text using the SproutLands pixel font and input value text using the Geist sans-serif font for readability

### Requirement 8: UI State System

**User Story:** As a student, I want clear visual feedback when buttons are disabled during AI calls, when actions succeed or fail, and when content is loading, so that I always understand what Nora is doing and can trust the interface.

#### Acceptance Criteria

1. THE UI_State system SHALL define a disabled visual treatment (grayed/desaturated colors, reduced opacity, non-interactive cursor) applicable to Pixel_Button, Pixel_Input, and navigation items
2. THE UI_State system SHALL define a loading visual treatment (pixel-art spinner animation or pulsing frame effect) applicable to Pixel_Button and Dialog_Frame components
3. THE UI_State system SHALL define a focus visual treatment (amber/gold pixel-art outline or border highlight) applicable to Pixel_Button, Pixel_Input, and navigation items
4. THE UI_State system SHALL define a selected visual treatment (brighter background or inverted color from the Color_Palette) applicable to navigation items and card components
5. THE UI_State system SHALL define a success visual treatment (sage green border or background tint with an optional checkmark Icon_Sprite) applicable to Dialog_Frame and Pixel_Input components
6. THE UI_State system SHALL define a warning visual treatment (amber/gold border or background tint with a caution Icon_Sprite) applicable to Dialog_Frame and Pixel_Input components
7. THE UI_State system SHALL define an error visual treatment (muted red border or background tint with an error Icon_Sprite) applicable to Dialog_Frame, Pixel_Input, and Pixel_Button components
8. WHEN an async operation is in progress, THE UI_State system SHALL apply the disabled treatment to the triggering Pixel_Button and the loading treatment to the associated content region

### Requirement 9: Empty & Error State Components

**User Story:** As a student, I want friendly pixel-art empty states and error panels instead of blank screens or raw error text, so that moments without data or with failures still feel polished and guide me toward a next action.

#### Acceptance Criteria

1. THE Empty_State component SHALL render a pixel-art illustration within a Dialog_Frame when a list or view has no data, using either a sprite from the Sprout Lands asset pack OR a composed arrangement of existing UI sprites (e.g., a stack of Dialog_Frame card outlines, a dimmed Icon_Sprite) to avoid requiring custom art production
2. THE Empty_State component SHALL display a descriptive message in the SproutLands pixel font explaining why the view is empty (e.g., "No cards due today")
3. THE Empty_State component SHALL accept an optional action button (Pixel_Button) allowing the user to take a relevant next step (e.g., "Create a card", "Start a session")
4. WHEN an operation fails, THE Error_State component SHALL render an error panel within a Dialog_Frame using the error UI_State treatment (muted red border) with a description of the failure
5. THE Error_State component SHALL include a retry Pixel_Button allowing the user to re-attempt the failed operation
6. THE Loading_Skeleton component SHALL render placeholder shapes (rectangles and lines) with a pixel-art shimmer animation matching the Color_Palette surface and muted tones
7. WHEN content is loading, THE Loading_Skeleton component SHALL occupy the same approximate dimensions as the expected content to prevent layout shift

### Requirement 10: Responsive and Accessible Pixel UI

**User Story:** As a student using Nora on different devices, I want the pixel-art UI to remain usable and accessible on both desktop and mobile screens, so that I can study comfortably regardless of screen size.

#### Acceptance Criteria

1. WHILE the viewport width is below 768px, THE Pixel_Sidebar SHALL collapse into a Bottom_Nav fixed to the bottom of the screen with pixel-art styled icon tabs for primary navigation sections
2. THE Bottom_Nav SHALL display Icon_Sprite icons for each primary section with pixel-font labels beneath and maintain a minimum touch target of 44x44 CSS pixels per tab
3. THE Pixel_Theme SHALL ensure a minimum contrast ratio of 4.5:1 between text colors and background colors for WCAG AA compliance
4. THE Pixel_Button component SHALL be fully operable via keyboard (focusable, activatable with Enter and Space keys)
5. WHEN a user has prefers-reduced-motion enabled, THE Pixel_Theme SHALL disable all hover animations and sprite transitions
6. THE Nine_Slice component SHALL scale its border proportionally when rendered on high-DPI (retina) displays using Integer_Scaling to prevent half-pixel artifacts

### Requirement 11: Sprite Asset Integration

**User Story:** As a developer, I want a clear system for mapping Sprout Lands spritesheet coordinates to component states, so that adding new sprite-based UI elements is straightforward.

#### Acceptance Criteria

1. THE Sprite_Component system SHALL define a sprite map configuration file that maps logical names (e.g., "button-idle", "button-hover", "icon-book") to spritesheet coordinates (x, y, width, height)
2. THE Sprite_Component system SHALL load spritesheet images from the `/sprites/ui/` public directory
3. THE Sprite_Component system SHALL use CSS `background-image`, `background-position`, and `background-size` properties rather than canvas rendering for standard UI elements
4. WHEN a new sprite asset is added to the public directory, THE Sprite_Component system SHALL require only a sprite map update (no code changes to components) to make it available
5. THE Sprite_Component system SHALL preload spritesheet images on application mount to prevent visual pop-in during navigation
6. THE Pixel_Theme SHALL apply a custom pixel-art mouse cursor sprite via CSS `cursor: url(...)` for the default pointer state on the application root element, and a pixel-art pointer/hand cursor for interactive elements (buttons, links, clickable cards)

### Requirement 12: Pixel Toast & Notification System

**User Story:** As a student, I want XP rewards, level-up events, and action confirmations to appear as pixel-art toast notifications, so that I receive immediate visual feedback for my progress without interrupting my study flow.

#### Acceptance Criteria

1. THE Toast_Notification component SHALL render within a mini Dialog_Frame (Nine_Slice) container that slides in from the top-right corner of the viewport
2. THE Toast_Notification component SHALL support four visual variants mapped to the Color_Palette: success (sage green), warning (amber), error (muted red), and info (cream)
3. WHEN an XP or coin reward is earned, THE Toast_Notification component SHALL display the reward text (e.g., "+15 XP", "+5 coins") using the SproutLands pixel font with the float-up-fade animation defined in globals.css
4. WHEN a level-up event occurs, THE Toast_Notification component SHALL render a larger Dialog_Frame variant (Nine_Slice "large") and trigger the level-up sound effect at the moment of display
5. THE Toast_Notification component SHALL auto-dismiss after 3 seconds, displaying a pixel-art progress bar along its bottom edge that shrinks from full width to zero over the dismiss duration
6. THE Toast_Notification system SHALL stack up to 3 toasts vertically in the top-right region; WHEN the 3-toast limit is reached, THE Toast_Notification system SHALL dismiss the oldest toast before displaying a new one

### Requirement 13: Pixel Analytics & Data Display

**User Story:** As a student, I want my analytics dashboard (stats, charts, heatmap, progress bars) to be styled with pixel-art elements, so that reviewing my study performance feels consistent with Nora's cozy pixel aesthetic.

#### Acceptance Criteria

1. THE Analytics_Display SHALL render stat cards (Level, XP, Cards Due, Streak) within Dialog_Frame components, displaying the stat value in the SproutLands pixel font and the stat label in the Geist sans-serif font
2. THE Analytics_Display SHALL render bar charts with pixel-art styled bars using solid Color_Palette colors, no gradients, 1px solid borders, and axis labels rendered in the SproutLands pixel font
3. THE Analytics_Display SHALL render the consistency heatmap as a grid of small pixel squares using Color_Palette intensity shading from cream (lowest activity) through sage green (moderate) to dark green (highest activity)
4. THE Analytics_Display SHALL render progress bars as pixel-art HP/MP-style bars with a segmented fill pattern (1px gaps between segments) using Color_Palette colors within a thin pixel-art border
5. WHEN a user hovers over a chart element or heatmap cell, THE Analytics_Display SHALL display a tooltip rendered within a small Nine_Slice Dialog_Frame containing pixel-font text describing the data point

