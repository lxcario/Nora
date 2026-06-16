/**
 * Sprite Map Registry
 *
 * Central registry mapping logical sprite names to spritesheet coordinates.
 * Adding a new sprite requires only adding an entry here — no component changes needed.
 *
 * Naming convention: "{category}-{variant}-{state}"
 *   e.g. "button-primary-idle", "dialog-standard-tl", "icon-book"
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpriteCoord {
  x: number; // px offset from left
  y: number; // px offset from top
  width: number; // native width in px
  height: number; // native height in px
  sheet: string; // path to spritesheet
}

export type SpriteMap = Record<string, SpriteCoord>;

// ---------------------------------------------------------------------------
// Spritesheet paths
// ---------------------------------------------------------------------------

export const SPRITE_SHEETS = {
  buttons: "/sprites/ui/buttons-26x26.png",
  dialogStandard: "/sprites/ui/dialog-box.png",
  dialogBig: "/sprites/ui/dialog-box-big.png",
  icons: "/sprites/ui/icons.png",
  emojis: "/sprites/ui/emojis.png",
  moodIcons: "/sprites/ui/mood-icons.png",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a button sprite coordinate (26×28 frames in a 2-col × 4-row sheet) */
function btn(col: number, row: number): SpriteCoord {
  // Columns start at x=11 (col 0) and x=59 (col 1), spaced 48px apart
  // Rows start at y=11, then 59, 107, 155 (spaced 48px apart)
  return {
    x: 11 + col * 48,
    y: 11 + row * 48,
    width: 26,
    height: 28,
    sheet: SPRITE_SHEETS.buttons,
  };
}

/** Create an icon sprite coordinate (16×16 cells in an 18-col × 3-row grid) */
function icon(col: number, row: number): SpriteCoord {
  return {
    x: col * 16,
    y: row * 16,
    width: 16,
    height: 16,
    sheet: SPRITE_SHEETS.icons,
  };
}

/** Create an emoji sprite coordinate (16×16 cells in a 10-col grid) */
function emoji(col: number, row: number): SpriteCoord {
  return {
    x: col * 16,
    y: row * 16,
    width: 16,
    height: 16,
    sheet: SPRITE_SHEETS.emojis,
  };
}

/** Create a mood icon sprite coordinate (16×16 cells in a 6-col × 2-row grid) */
function mood(col: number, row: number): SpriteCoord {
  return {
    x: col * 16,
    y: row * 16,
    width: 16,
    height: 16,
    sheet: SPRITE_SHEETS.moodIcons,
  };
}

// ---------------------------------------------------------------------------
// Nine-slice region helpers
// ---------------------------------------------------------------------------

/**
 * Standard dialog box: source content at (7, 11), size 30×28.
 * Corner size = 8px — enough to cover the rounded diagonal corner.
 * Edge thickness matches corner size on the corresponding axis.
 */
const STD_X = 7;
const STD_Y = 11;
const STD_W = 30;
const STD_H = 28;
const STD_CORNER = 8;

function dialogStd(
  xOff: number,
  yOff: number,
  w: number,
  h: number,
): SpriteCoord {
  return {
    x: STD_X + xOff,
    y: STD_Y + yOff,
    width: w,
    height: h,
    sheet: SPRITE_SHEETS.dialogStandard,
  };
}

/**
 * Big dialog box: source content at (2, 7), size 172×35.
 * Corner size = 8px.
 */
const BIG_X = 2;
const BIG_Y = 7;
const BIG_W = 172;
const BIG_H = 35;
const BIG_CORNER = 8;

function dialogBig(
  xOff: number,
  yOff: number,
  w: number,
  h: number,
): SpriteCoord {
  return {
    x: BIG_X + xOff,
    y: BIG_Y + yOff,
    width: w,
    height: h,
    sheet: SPRITE_SHEETS.dialogBig,
  };
}

// ---------------------------------------------------------------------------
// Sprite Map
// ---------------------------------------------------------------------------

export const spriteMap: SpriteMap = {
  // =========================================================================
  // Buttons — 2 columns (primary col 0, secondary col 1) × 4 rows (states)
  // Row 0: idle, Row 1: hover, Row 2: active, Row 3: disabled
  // =========================================================================

  // Primary button states
  "button-primary-idle": btn(0, 0),
  "button-primary-hover": btn(0, 1),
  "button-primary-active": btn(0, 2),
  "button-primary-disabled": btn(0, 3),

  // Secondary button states
  "button-secondary-idle": btn(1, 0),
  "button-secondary-hover": btn(1, 1),
  "button-secondary-active": btn(1, 2),
  "button-secondary-disabled": btn(1, 3),

  // Danger variant — reuses secondary column with different tint applied in CSS
  "button-danger-idle": btn(1, 0),
  "button-danger-hover": btn(1, 1),
  "button-danger-active": btn(1, 2),
  "button-danger-disabled": btn(1, 3),

  // =========================================================================
  // Dialog Nine-Slice — Standard (dialog-box.png, 30×28 content area)
  // Regions: tl, top, tr, left, center, right, bl, bottom, br
  // =========================================================================

  "dialog-standard-tl": dialogStd(0, 0, STD_CORNER, STD_CORNER),
  "dialog-standard-top": dialogStd(
    STD_CORNER,
    0,
    STD_W - STD_CORNER * 2,
    STD_CORNER,
  ),
  "dialog-standard-tr": dialogStd(STD_W - STD_CORNER, 0, STD_CORNER, STD_CORNER),
  "dialog-standard-left": dialogStd(
    0,
    STD_CORNER,
    STD_CORNER,
    STD_H - STD_CORNER * 2,
  ),
  "dialog-standard-center": dialogStd(
    STD_CORNER,
    STD_CORNER,
    STD_W - STD_CORNER * 2,
    STD_H - STD_CORNER * 2,
  ),
  "dialog-standard-right": dialogStd(
    STD_W - STD_CORNER,
    STD_CORNER,
    STD_CORNER,
    STD_H - STD_CORNER * 2,
  ),
  "dialog-standard-bl": dialogStd(0, STD_H - STD_CORNER, STD_CORNER, STD_CORNER),
  "dialog-standard-bottom": dialogStd(
    STD_CORNER,
    STD_H - STD_CORNER,
    STD_W - STD_CORNER * 2,
    STD_CORNER,
  ),
  "dialog-standard-br": dialogStd(
    STD_W - STD_CORNER,
    STD_H - STD_CORNER,
    STD_CORNER,
    STD_CORNER,
  ),

  // =========================================================================
  // Dialog Nine-Slice — Large (dialog-box-big.png, 172×35 content area)
  // =========================================================================

  "dialog-large-tl": dialogBig(0, 0, BIG_CORNER, BIG_CORNER),
  "dialog-large-top": dialogBig(
    BIG_CORNER,
    0,
    BIG_W - BIG_CORNER * 2,
    BIG_CORNER,
  ),
  "dialog-large-tr": dialogBig(BIG_W - BIG_CORNER, 0, BIG_CORNER, BIG_CORNER),
  "dialog-large-left": dialogBig(
    0,
    BIG_CORNER,
    BIG_CORNER,
    BIG_H - BIG_CORNER * 2,
  ),
  "dialog-large-center": dialogBig(
    BIG_CORNER,
    BIG_CORNER,
    BIG_W - BIG_CORNER * 2,
    BIG_H - BIG_CORNER * 2,
  ),
  "dialog-large-right": dialogBig(
    BIG_W - BIG_CORNER,
    BIG_CORNER,
    BIG_CORNER,
    BIG_H - BIG_CORNER * 2,
  ),
  "dialog-large-bl": dialogBig(0, BIG_H - BIG_CORNER, BIG_CORNER, BIG_CORNER),
  "dialog-large-bottom": dialogBig(
    BIG_CORNER,
    BIG_H - BIG_CORNER,
    BIG_W - BIG_CORNER * 2,
    BIG_CORNER,
  ),
  "dialog-large-br": dialogBig(
    BIG_W - BIG_CORNER,
    BIG_H - BIG_CORNER,
    BIG_CORNER,
    BIG_CORNER,
  ),

  // =========================================================================
  // Icons (16×16 from icons.png — 18 cols × 3 rows)
  // Mapped to logical names based on common Sprout Lands icon grid layout
  // =========================================================================

  "icon-book": icon(0, 0),
  "icon-settings": icon(1, 0),
  "icon-star": icon(2, 0),
  "icon-heart": icon(3, 0),
  "icon-home": icon(4, 0),
  "icon-search": icon(5, 0),
  "icon-pen": icon(6, 0),
  "icon-layers": icon(7, 0),
  "icon-flask": icon(8, 0),
  "icon-calendar": icon(9, 0),
  "icon-chart": icon(10, 0),
  "icon-users": icon(11, 0),
  "icon-music": icon(12, 0),
  "icon-volume": icon(13, 0),
  "icon-mail": icon(14, 0),
  "icon-bell": icon(15, 0),
  "icon-check": icon(16, 0),
  "icon-close": icon(17, 0),

  // Row 2
  "icon-plus": icon(0, 1),
  "icon-minus": icon(1, 1),
  "icon-arrow-up": icon(2, 1),
  "icon-arrow-down": icon(3, 1),
  "icon-arrow-left": icon(4, 1),
  "icon-arrow-right": icon(5, 1),
  "icon-play": icon(6, 1),
  "icon-pause": icon(7, 1),
  "icon-stop": icon(8, 1),
  "icon-refresh": icon(9, 1),
  "icon-download": icon(10, 1),
  "icon-upload": icon(11, 1),
  "icon-lock": icon(12, 1),
  "icon-unlock": icon(13, 1),
  "icon-eye": icon(14, 1),
  "icon-eye-off": icon(15, 1),
  "icon-trash": icon(16, 1),
  "icon-edit": icon(17, 1),

  // Row 3
  "icon-folder": icon(0, 2),
  "icon-file": icon(1, 2),
  "icon-image": icon(2, 2),
  "icon-link": icon(3, 2),
  "icon-clock": icon(4, 2),
  "icon-map": icon(5, 2),
  "icon-trophy": icon(6, 2),
  "icon-coin": icon(7, 2),
  "icon-gem": icon(8, 2),
  "icon-shield": icon(9, 2),
  "icon-sword": icon(10, 2),
  "icon-potion": icon(11, 2),
  "icon-scroll": icon(12, 2),
  "icon-key": icon(13, 2),
  "icon-flag": icon(14, 2),
  "icon-lightning": icon(15, 2),
  "icon-fire": icon(16, 2),
  "icon-leaf": icon(17, 2),

  // =========================================================================
  // Emojis (16×16 from emojis.png — 10 cols × 38 rows)
  // First few commonly used emojis
  // =========================================================================

  "emoji-happy": emoji(0, 0),
  "emoji-sad": emoji(1, 0),
  "emoji-angry": emoji(2, 0),
  "emoji-surprised": emoji(3, 0),
  "emoji-love": emoji(4, 0),
  "emoji-cool": emoji(5, 0),
  "emoji-sleepy": emoji(6, 0),
  "emoji-sick": emoji(7, 0),
  "emoji-thinking": emoji(8, 0),
  "emoji-laugh": emoji(9, 0),

  // =========================================================================
  // Mood Icons (16×16 from mood-icons.png — 6 cols × 2 rows)
  // =========================================================================

  "mood-great": mood(0, 0),
  "mood-good": mood(1, 0),
  "mood-okay": mood(2, 0),
  "mood-bad": mood(3, 0),
  "mood-terrible": mood(4, 0),
  "mood-neutral": mood(5, 0),
  "mood-excited": mood(0, 1),
  "mood-tired": mood(1, 1),
  "mood-stressed": mood(2, 1),
  "mood-calm": mood(3, 1),
  "mood-focused": mood(4, 1),
  "mood-confused": mood(5, 1),
};
