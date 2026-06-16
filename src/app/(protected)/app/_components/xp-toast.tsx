"use client";

import { useEffect, useState } from "react";
import { playXpGained } from "@/lib/sfx";

interface XpToastProps {
  xp: number;
  coins?: number;
  visible: boolean;
}

/**
 * Floating "+XP" toast that animates upward and fades out.
 * Automatically dismisses after the 2-second animation completes.
 */
export function XpToast({ xp, coins, visible }: XpToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true); // eslint-disable-line react-hooks/set-state-in-effect
      playXpGained();
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 z-50 -translate-x-1/2 pointer-events-none animate-float-up motion-reduce:animate-none motion-reduce:opacity-100"
    >
      <div className="flex flex-col items-center gap-0.5 rounded-lg bg-zinc-900/90 px-4 py-2 shadow-lg border border-amber-500/40">
        <span className="font-pixel text-lg text-amber-400 font-bold tracking-wide">
          +{xp} XP
        </span>
        {coins != null && coins > 0 && (
          <span className="font-pixel text-sm text-yellow-300">
            +{coins} coins
          </span>
        )}
      </div>
    </div>
  );
}
