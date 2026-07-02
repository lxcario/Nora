"use client";

import { useEffect, useState } from "react";
import { playCardSaved } from "@/lib/sfx";

interface SuccessCheckProps {
  message: string;
  visible: boolean;
}

/**
 * Green checkmark that pops in with a scale animation.
 * Auto-hides after 3 seconds.
 */
export function SuccessCheck({ message, visible }: SuccessCheckProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true); // eslint-disable-line react-hooks/set-state-in-effect
      playCardSaved();
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="flex flex-col items-center gap-3 animate-pop-in motion-reduce:animate-none">
        <div
          className="flex h-16 w-16 items-center justify-center"
          style={{
            backgroundColor: "var(--pixel-success)",
            border: "3px solid var(--pixel-border)",
            boxShadow: "0 0 12px color-mix(in srgb, var(--pixel-success) 40%, transparent)",
          }}
        >
          <img src="/sprites/travel-book/icons/Flower.png" alt="" width={32} height={32} className="pixel-art" />
        </div>
        <span
          className="pixel-panel font-pixel text-sm px-3 py-1"
          style={{ color: "var(--pixel-text-primary)" }}
        >
          {message}
        </span>
      </div>
    </div>
  );
}
