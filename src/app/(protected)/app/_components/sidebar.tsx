"use client";

import { PixelSidebar } from "@/components/pixel-ui/pixel-sidebar";
import { BottomNav } from "@/components/pixel-ui/bottom-nav";

/**
 * Responsive sidebar wrapper.
 * - Desktop (md and up): renders the full PixelSidebar with NineSlice frame
 * - Mobile (< md): renders the BottomNav fixed to the bottom of the screen
 *
 * The BottomNav is already configured with `md:hidden` so it only shows on mobile.
 * The prefers-reduced-motion handling is managed globally via globals.css.
 */
export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:flex">
        <PixelSidebar />
      </div>
      {/* Mobile bottom nav - hidden on desktop */}
      <BottomNav />
    </>
  );
}
