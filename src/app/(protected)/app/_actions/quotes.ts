"use server";

export interface DailyQuote {
  text: string;
  author: string;
}

/**
 * Fetches a motivational quote for the day.
 * Uses ZenQuotes API (free, no key needed).
 */
export async function getDailyQuote(): Promise<DailyQuote> {
  try {
    const res = await fetch("https://zenquotes.io/api/today", {
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.[0]) {
        return { text: data[0].q, author: data[0].a };
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback quotes about learning
  const fallbacks: DailyQuote[] = [
    { text: "The more I read, the more I acquire, the more certain I am that I know nothing.", author: "Voltaire" },
    { text: "Tell me and I forget, teach me and I may remember, involve me and I learn.", author: "Benjamin Franklin" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
    { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
    { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  ];

  const dayIndex = new Date().getDate() % fallbacks.length;
  return fallbacks[dayIndex];
}
