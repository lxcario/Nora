"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Study Session Tracker — Global Context
// ---------------------------------------------------------------------------
// Tracks what the student does across pages during a timed study session.
// Lives in the app layout so it persists across navigation.
// ---------------------------------------------------------------------------

export type ActivityType = "review" | "feynman" | "research" | "study-room" | "study-mix" | "planner" | "exam" | "focus" | "other";

export interface ActivityEntry {
  type: ActivityType;
  label: string;
  startedAt: number; // epoch ms
  endedAt: number | null;
  /** Route where this activity happened */
  route: string;
}

export interface StudySessionState {
  isActive: boolean;
  isPaused: boolean;
  startedAt: number | null;
  totalElapsedMs: number;
  activities: ActivityEntry[];
  /** If the session just ended, this holds the summary for the receipt */
  completedSession: CompletedSession | null;
}

export interface CompletedSession {
  startedAt: number;
  endedAt: number;
  totalMinutes: number;
  activities: ActivityEntry[];
}

interface StudySessionActions {
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  dismissReceipt: () => void;
}

const StudySessionContext = createContext<(StudySessionState & StudySessionActions) | null>(null);

export function useStudySession() {
  const ctx = useContext(StudySessionContext);
  if (!ctx) throw new Error("useStudySession must be used within StudySessionProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Route → activity type mapping
// ---------------------------------------------------------------------------

function routeToActivity(pathname: string): { type: ActivityType; label: string } {
  if (pathname.startsWith("/app/review")) return { type: "review", label: "Reviewing cards" };
  if (pathname.startsWith("/app/feynman")) return { type: "feynman", label: "Feynman explanation" };
  if (pathname.startsWith("/app/research")) return { type: "research", label: "Research desk" };
  if (pathname.startsWith("/app/study-room")) return { type: "study-room", label: "Video study room" };
  if (pathname.startsWith("/app/study")) return { type: "study-mix", label: "Study mix" };
  if (pathname.startsWith("/app/planner")) return { type: "planner", label: "Planning sessions" };
  if (pathname.startsWith("/app/exam")) return { type: "exam", label: "Practice exam" };
  if (pathname.startsWith("/app/focus")) return { type: "focus", label: "Focus timer" };
  return { type: "other", label: "Browsing" };
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const LS_KEY = "nora_study_session";

interface PersistedSession {
  isActive: boolean;
  isPaused: boolean;
  startedAt: number | null;
  pausedAtElapsed: number;
  activities: ActivityEntry[];
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch { return null; }
}

function saveSession(s: PersistedSession) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* */ }
}

function clearSession() {
  try { localStorage.removeItem(LS_KEY); } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function StudySessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [completedSession, setCompletedSession] = useState<CompletedSession | null>(null);

  // Track elapsed when paused
  const pausedElapsedRef = useRef(0);
  const hydrated = useRef(false);

  // ── Hydrate from localStorage ─────────────────────────────────────────────
  useEffect(() => {
    hydrated.current = true;
    const saved = loadSession();
    if (saved && saved.isActive && saved.startedAt) {
      setIsActive(true);
      setIsPaused(saved.isPaused);
      setStartedAt(saved.startedAt);
      setActivities(saved.activities);
      pausedElapsedRef.current = saved.pausedAtElapsed;
    }
  }, []);

  // ── Persist on change ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated.current) return;
    if (!isActive) { clearSession(); return; }
    saveSession({
      isActive,
      isPaused,
      startedAt,
      pausedAtElapsed: pausedElapsedRef.current,
      activities,
    });
  }, [isActive, isPaused, startedAt, activities]);

  // ── Tick elapsed time ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || isPaused || !startedAt) return;
    const id = setInterval(() => {
      setTotalElapsedMs(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(id);
  }, [isActive, isPaused, startedAt]);

  // ── Track route changes as activities ─────────────────────────────────────
  useEffect(() => {
    if (!isActive || isPaused) return;
    const { type, label } = routeToActivity(pathname);

    setActivities((prev) => {
      // Close previous activity
      const updated = prev.map((a, i) =>
        i === prev.length - 1 && a.endedAt === null
          ? { ...a, endedAt: Date.now() }
          : a
      );
      // Don't duplicate if same type
      if (updated.length > 0 && updated[updated.length - 1].type === type) {
        // Reopen the last one instead
        return prev;
      }
      // Add new activity
      return [...updated, { type, label, startedAt: Date.now(), endedAt: null, route: pathname }];
    });
  }, [pathname, isActive, isPaused]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    const now = Date.now();
    setIsActive(true);
    setIsPaused(false);
    setStartedAt(now);
    setTotalElapsedMs(0);
    setCompletedSession(null);
    pausedElapsedRef.current = 0;

    const { type, label } = routeToActivity(pathname);
    setActivities([{ type, label, startedAt: now, endedAt: null, route: pathname }]);
  }, [pathname]);

  const pauseSession = useCallback(() => {
    setIsPaused(true);
    pausedElapsedRef.current = totalElapsedMs;
    // Close current activity
    setActivities((prev) =>
      prev.map((a, i) =>
        i === prev.length - 1 && a.endedAt === null ? { ...a, endedAt: Date.now() } : a
      )
    );
  }, [totalElapsedMs]);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
    // Adjust startedAt so elapsed continues from where it paused
    setStartedAt(Date.now() - pausedElapsedRef.current);
    // Open a new activity for current page
    const { type, label } = routeToActivity(pathname);
    setActivities((prev) => [...prev, { type, label, startedAt: Date.now(), endedAt: null, route: pathname }]);
  }, [pathname]);

  const endSession = useCallback(() => {
    const now = Date.now();
    // Close last activity
    const finalActivities = activities.map((a, i) =>
      i === activities.length - 1 && a.endedAt === null ? { ...a, endedAt: now } : a
    );

    // Build completed session for the receipt
    if (startedAt) {
      setCompletedSession({
        startedAt,
        endedAt: now,
        totalMinutes: Math.round(totalElapsedMs / 60_000),
        activities: finalActivities,
      });
    }

    setIsActive(false);
    setIsPaused(false);
    setStartedAt(null);
    setActivities([]);
    setTotalElapsedMs(0);
    clearSession();
  }, [activities, startedAt, totalElapsedMs]);

  const dismissReceipt = useCallback(() => {
    setCompletedSession(null);
  }, []);

  return (
    <StudySessionContext.Provider
      value={{
        isActive, isPaused, startedAt, totalElapsedMs, activities, completedSession,
        startSession, pauseSession, resumeSession, endSession, dismissReceipt,
      }}
    >
      {children}
    </StudySessionContext.Provider>
  );
}
