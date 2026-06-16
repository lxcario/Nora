/**
 * Text Chunker module — splits parsed PDF sections into 256-512 token chunks
 * with 10-15% overlap between consecutive chunks.
 *
 * Token approximation: 1 word ≈ 1.3 tokens.
 * We target 200-400 words per chunk (≈ 256-512 tokens).
 */

import { Section } from "./parser";

export interface Chunk {
  chunkIndex: number; // zero-based sequential
  content: string; // the chunk text (256-512 tokens)
  sectionHeading: string; // associated heading, or "" if none
}

// --- Constants ---
const MIN_WORDS = 200; // ≈ 256 tokens
const MAX_WORDS = 400; // ≈ 512 tokens
const OVERLAP_RATIO = 0.12; // 12% overlap (within the 10-15% range)

// --- Helpers ---

/** Split text into words (whitespace-delimited). */
function getWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Count words in text. */
function wordCount(text: string): number {
  return getWords(text).length;
}

/** Split text into sentences using common sentence-ending punctuation. */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end
  const sentences = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
  if (!sentences) return [text];
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Join words back into text. */
function joinWords(words: string[]): string {
  return words.join(" ");
}

/**
 * Split a block of text into raw chunk strings, each within word bounds.
 * Splits at sentence boundaries when possible; falls back to word boundaries.
 */
function splitBlock(text: string): string[] {
  const totalWords = wordCount(text);
  if (totalWords <= MAX_WORDS) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  const sentences = splitSentences(text);
  let currentWords: string[] = [];

  for (const sentence of sentences) {
    const sentenceWords = getWords(sentence);

    // If a single sentence exceeds MAX_WORDS, split it at word boundaries
    if (sentenceWords.length > MAX_WORDS) {
      // First, flush current accumulator if non-empty
      if (currentWords.length > 0) {
        if (currentWords.length >= MIN_WORDS) {
          chunks.push(joinWords(currentWords));
          currentWords = [];
        }
        // If current is too small, we'll merge with the sentence split
      }

      // Merge any leftover currentWords with the start of this sentence
      const allWords = [...currentWords, ...sentenceWords];
      currentWords = [];

      for (let i = 0; i < allWords.length; i += MAX_WORDS) {
        const slice = allWords.slice(i, i + MAX_WORDS);
        if (slice.length >= MIN_WORDS) {
          chunks.push(joinWords(slice));
        } else {
          // Remainder — will be handled by merge logic later
          currentWords = slice;
        }
      }
      continue;
    }

    // Would adding this sentence exceed MAX_WORDS?
    if (currentWords.length + sentenceWords.length > MAX_WORDS) {
      // Flush current chunk if it meets minimum
      if (currentWords.length >= MIN_WORDS) {
        chunks.push(joinWords(currentWords));
        currentWords = sentenceWords;
      } else {
        // Keep accumulating — we haven't reached minimum yet
        currentWords.push(...sentenceWords);
      }
    } else {
      currentWords.push(...sentenceWords);
    }
  }

  // Handle remaining words
  if (currentWords.length > 0) {
    chunks.push(joinWords(currentWords));
  }

  return chunks;
}

/**
 * Apply overlap: prepend the last ~12% of the previous chunk's words
 * to the beginning of the current chunk.
 */
function applyOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevWords = getWords(chunks[i - 1]);
    const overlapCount = Math.floor(prevWords.length * OVERLAP_RATIO);

    if (overlapCount > 0) {
      const overlapWords = prevWords.slice(prevWords.length - overlapCount);
      const currentText = chunks[i];
      result.push(joinWords(overlapWords) + " " + currentText);
    } else {
      result.push(chunks[i]);
    }
  }

  return result;
}

/**
 * Merge the final chunk with the preceding one if it's undersized (< MIN_WORDS).
 */
function mergeUndersizedFinal(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  const lastChunk = chunks[chunks.length - 1];
  if (wordCount(lastChunk) < MIN_WORDS) {
    const merged = [...chunks];
    const last = merged.pop()!;
    if (merged.length > 0) {
      merged[merged.length - 1] = merged[merged.length - 1] + " " + last;
    } else {
      merged.push(last);
    }
    return merged;
  }

  return chunks;
}

/**
 * Main chunking function.
 * Takes structured sections (from PDF parser) and produces chunks
 * with proper sizing, overlap, and section heading metadata.
 */
export function chunkText(sections: Section[]): Chunk[] {
  // Phase 1: Build raw chunk candidates per section, respecting heading boundaries
  interface RawChunk {
    content: string;
    sectionHeading: string;
  }

  const rawChunks: RawChunk[] = [];

  for (const section of sections) {
    const sectionText = section.paragraphs.join("\n\n").trim();
    if (sectionText.length === 0) continue;

    const sectionWordCount = wordCount(sectionText);

    // Check if we should start a new chunk at this heading boundary
    // (prefer splitting at heading boundaries if current accumulated chunk ≥ MIN_WORDS)
    if (sectionWordCount <= MAX_WORDS) {
      // Entire section fits in one chunk
      rawChunks.push({
        content: sectionText,
        sectionHeading: section.heading,
      });
    } else {
      // Section is too large — split it
      const splitChunks = splitBlock(sectionText);
      for (const chunkContent of splitChunks) {
        rawChunks.push({
          content: chunkContent,
          sectionHeading: section.heading,
        });
      }
    }
  }

  // Phase 2: Merge undersized chunks at section boundaries
  // If a section chunk is < MIN_WORDS and it's at the boundary, merge with adjacent
  const mergedRaw: RawChunk[] = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const current = rawChunks[i];
    const currentWc = wordCount(current.content);

    if (currentWc < MIN_WORDS && mergedRaw.length > 0) {
      // Merge with preceding chunk
      const prev = mergedRaw[mergedRaw.length - 1];
      prev.content = prev.content + " " + current.content;
      // Keep the previous chunk's heading (it started there)
    } else if (currentWc < MIN_WORDS && mergedRaw.length === 0 && i < rawChunks.length - 1) {
      // First chunk is undersized — merge with next (handled by just pushing and letting
      // the next iteration see it's undersized). Actually just push and handle at end.
      mergedRaw.push(current);
    } else {
      mergedRaw.push(current);
    }
  }

  // Phase 3: Handle the case where merged chunks might now exceed MAX_WORDS
  const resplit: RawChunk[] = [];
  for (const raw of mergedRaw) {
    const wc = wordCount(raw.content);
    if (wc > MAX_WORDS) {
      const parts = splitBlock(raw.content);
      for (const part of parts) {
        resplit.push({ content: part, sectionHeading: raw.sectionHeading });
      }
    } else {
      resplit.push(raw);
    }
  }

  // Phase 4: Merge final undersized chunk
  if (resplit.length > 1) {
    const lastWc = wordCount(resplit[resplit.length - 1].content);
    if (lastWc < MIN_WORDS) {
      const last = resplit.pop()!;
      resplit[resplit.length - 1].content += " " + last.content;
    }
  }

  // Phase 5: Apply overlap between consecutive chunks
  const contents = resplit.map((r) => r.content);
  const overlapped = applyOverlap(contents);

  // Phase 6: Build final Chunk[] output
  const chunks: Chunk[] = overlapped.map((content, index) => ({
    chunkIndex: index,
    content: content.trim(),
    sectionHeading: resplit[index]?.sectionHeading ?? "",
  }));

  return chunks;
}
