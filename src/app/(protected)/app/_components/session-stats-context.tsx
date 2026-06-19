"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Session Stats Context
//
// Tracks in-session XP/coin deltas so the persistent TopBar can update
// immediately without waiting for server revalidation. Resets when the
// server-rendered baseline changes (e.g. after a level-up revalidation
// or a real navigation that re-executes the layout).
// ---------------------------------------------------------------------------

interface SessionStats {
  xpDelta: number;
  coinsDelta: number;
}

interface SessionStatsContextValue {
  stats: SessionStats;
  addReward: (xp: number, coins: number) => void;
}

const SessionStatsContext = createContext<SessionStatsContextValue | null>(null);

interface SessionStatsProviderProps {
  children: ReactNode;
  /**
   * A key derived from the server-rendered profile baseline (e.g. xp-coins).
   * When this changes (revalidation happened), deltas reset to 0 to avoid
   * double-counting against the new baseline.
   */
  resetKey: string;
}

export function SessionStatsProvider({ children, resetKey }: SessionStatsProviderProps) {
  const [stats, setStats] = useState<SessionStats>({ xpDelta: 0, coinsDelta: 0 });
  const prevKeyRef = useRef(resetKey);

  // Reset deltas when the server-rendered baseline changes.
  // This is a synchronous state reset during render — safe because we're
  // comparing a ref against a prop (the "derived state from props" pattern).
  if (prevKeyRef.current !== resetKey) {
    prevKeyRef.current = resetKey;
    setStats({ xpDelta: 0, coinsDelta: 0 });
  }

  const addReward = useCallback((xp: number, coins: number) => {
    setStats((prev) => ({
      xpDelta: prev.xpDelta + xp,
      coinsDelta: prev.coinsDelta + coins,
    }));
  }, []);

  return (
    <SessionStatsContext.Provider value={{ stats, addReward }}>
      {children}
    </SessionStatsContext.Provider>
  );
}

export function useSessionStats(): SessionStatsContextValue {
  const ctx = useContext(SessionStatsContext);
  if (!ctx) {
    throw new Error("useSessionStats must be used within a SessionStatsProvider");
  }
  return ctx;
}
