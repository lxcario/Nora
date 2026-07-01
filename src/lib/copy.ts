/**
 * Centralized user-facing copy, in Nora's voice (docs/VOICE.md).
 *
 * The point of this module is enforceability: loading/error/empty strings live
 * in one place so the voice can't quietly drift back to generic SaaS wording
 * ("Loading…", "Retry", "Error 500") the next time someone adds a feature.
 *
 * Voice rules encoded here:
 *  - Loading says what NORA is doing for you ("Thinking…", "Reading your paper…"),
 *    never the machine's state ("Loading…").
 *  - Errors are gentle, plainspoken, and offer a way forward — never a raw code
 *    or stack. (NN/g: plain language + a path forward.)
 */

export const LOADING = {
  /** Generic wait — AI or server work in flight. */
  default: "Thinking…",
  /** Searching the user's own indexed papers. */
  papers: "Looking through your papers…",
  /** Ingesting/parsing an uploaded PDF. */
  readingPaper: "Reading your paper…",
  /** Queued for background processing. */
  queued: "Waiting its turn…",
  /** Video player buffering/initializing. */
  video: "Getting the video ready…",
  /** Fetching an attached source. */
  source: "Finding your source…",
  /** In-flight save. */
  saving: "Saving…",
  /** Save complete (no exclamation). */
  saved: "Saved",
} as const;

export const ERRORS = {
  /** Retry button label. */
  retry: "Let's try again",
  /** Generic action failure. */
  generic: "That didn't work just now. A moment and another try usually does it.",
  /** A page/route failed to load. */
  load: "This didn't load. It usually sorts itself out in a moment.",
  /** A search/query failed. */
  search: "That search didn't come through. Want to try again?",
} as const;

export const EMPTY = {
  /** Fallback for an empty search/command list. */
  noResults: "Nothing here by that name",
} as const;

export type LoadingKey = keyof typeof LOADING;
export type ErrorKey = keyof typeof ERRORS;
