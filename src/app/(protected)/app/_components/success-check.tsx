"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30">
          <Check className="h-9 w-9 text-white" strokeWidth={3} />
        </div>
        <span className="font-pixel text-sm text-zinc-100 dark:text-zinc-200 bg-zinc-900/80 px-3 py-1 rounded">
          {message}
        </span>
      </div>
    </div>
  );
}
