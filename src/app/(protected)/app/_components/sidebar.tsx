"use client";

import { BottomNav } from "@/components/pixel-ui/bottom-nav";

// Top-bar layout replaces the sidebar on desktop.
// BottomNav is still used on mobile as a fixed bottom bar.
export function Sidebar() {
  return <BottomNav />;
}
