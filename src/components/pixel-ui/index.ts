// Pixel UI — Barrel Export
// Single entry point for all pixel-art UI components.

// Sprite infrastructure
export { SpriteRegion } from "./sprite-region";
export type { SpriteRegionProps } from "./sprite-region";
export { spriteMap, SPRITE_SHEETS } from "./sprite-map";
export type { SpriteCoord, SpriteMap } from "./sprite-map";

// Primitives
export { NineSlice } from "./nine-slice";
export type { NineSliceProps } from "./nine-slice";
export { PixelPanel } from "./pixel-panel";
export type { PixelPanelProps } from "./pixel-panel";
export { PixelButton } from "./pixel-button";
export type { PixelButtonProps } from "./pixel-button";
export { PixelCounter } from "./pixel-counter";
export type { PixelCounterProps } from "./pixel-counter";
export { IconSprite } from "./icon-sprite";
export type { IconSpriteProps } from "./icon-sprite";
export { PixelInput } from "./pixel-input";
export type { PixelInputProps } from "./pixel-input";

// Composites
export { DialogFrame } from "./dialog-frame";
export type { DialogFrameProps } from "./dialog-frame";
export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";
export { ErrorState } from "./error-state";
export type { ErrorStateProps } from "./error-state";
export { LoadingSkeleton } from "./loading-skeleton";
export type { LoadingSkeletonProps } from "./loading-skeleton";
export { PixelConfirmDialog } from "./confirm-dialog";
export type { PixelConfirmDialogProps } from "./confirm-dialog";

// Toast
export { ToastProvider, useToast } from "./toast-provider";
export type { Toast, ToastVariant, ToastContextValue } from "./toast-provider";
export { ToastItem, ToastContainer } from "./toast";
export type { ToastProps } from "./toast";

// Analytics
export { PixelStatCard } from "./pixel-stat-card";
export type { PixelStatCardProps } from "./pixel-stat-card";
export { PixelProgressBar } from "./pixel-progress-bar";
export type { PixelProgressBarProps } from "./pixel-progress-bar";
export { PixelBarChart } from "./pixel-bar-chart";
export type { PixelBarChartProps } from "./pixel-bar-chart";
export { PixelHeatmap } from "./pixel-heatmap";
export type { PixelHeatmapProps } from "./pixel-heatmap";

// Navigation
export { PixelSidebar } from "./pixel-sidebar";
export { BottomNav } from "./bottom-nav";

// Skeleton helpers
export { PageHeaderSkeleton, PanelSkeleton, StatTileSkeleton } from "./skeleton-helpers";

// Preferences
export { PreferencesProvider, usePreferences, PALETTE_PRESETS, ACCENT_PRESETS } from "./preferences-provider";
export type { CursorPack, PaletteId, Preferences } from "./preferences-provider";
export { PreferencesPanel } from "./preferences-panel";
export { CursorPicker } from "./cursor-picker";
export { PixelToggle } from "./pixel-toggle";
export type { PixelToggleProps } from "./pixel-toggle";
