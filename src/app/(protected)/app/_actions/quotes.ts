"use server";

export interface DailyQuote {
  text: string;
  author: string;
}

/**
 * Nora's own quiet reflections for the day.
 *
 * These replace the old ZenQuotes API + celebrity-quote fallbacks. A random
 * Steve Jobs / Voltaire quote knows nothing about this learner and reads like
 * generic inspirational filler — the opposite of docs/CRAFT.md's "Memory, not
 * personalization." These lines are handwritten in Nora's voice (docs/VOICE.md),
 * carry no real-person attribution, and never leave the app (no external fetch).
 */
const NORA_REFLECTIONS: readonly string[] = [
  "Knowledge grows slowly. That's the whole point.",
  "You don't have to finish today. You just have to come back.",
  "Understanding is quiet. It rarely arrives all at once.",
  "Small and often beats big and rare.",
  "The idea that was hard last week is slowly becoming yours.",
  "Rest counts too. Growing things need their pauses.",
  "One remembered idea today is enough.",
];

/**
 * Returns a quiet reflection for the day, in Nora's voice.
 *
 * Deterministic per calendar day (so it reads like a steady thought rather than
 * a fresh shuffle on every load). No external API, no third-party quotes.
 */
export async function getDailyQuote(): Promise<DailyQuote> {
  const dayIndex = new Date().getDate() % NORA_REFLECTIONS.length;
  return { text: NORA_REFLECTIONS[dayIndex], author: "Nora" };
}
