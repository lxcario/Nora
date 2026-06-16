import { describe, it, expect } from "vitest";
import { chunkText, Chunk } from "./chunker";
import { Section } from "./parser";

function generateWords(count: number): string {
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(`word${i}`);
  }
  return words.join(" ");
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

describe("chunkText", () => {
  it("returns empty array for empty sections", () => {
    const result = chunkText([]);
    expect(result).toEqual([]);
  });

  it("returns empty array for sections with empty paragraphs", () => {
    const sections: Section[] = [{ heading: "Test", paragraphs: ["", "  "] }];
    const result = chunkText(sections);
    expect(result).toEqual([]);
  });

  it("keeps a small section as a single chunk", () => {
    const text = generateWords(250); // within 200-400 range
    const sections: Section[] = [{ heading: "Intro", paragraphs: [text] }];
    const result = chunkText(sections);

    expect(result.length).toBe(1);
    expect(result[0].chunkIndex).toBe(0);
    expect(result[0].sectionHeading).toBe("Intro");
    expect(result[0].content).toContain("word0");
  });

  it("splits a large section into multiple chunks", () => {
    const text = generateWords(800); // well above 400 words
    const sections: Section[] = [{ heading: "Big", paragraphs: [text] }];
    const result = chunkText(sections);

    expect(result.length).toBeGreaterThan(1);
    // All chunks should have sequential indices
    result.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
      expect(chunk.sectionHeading).toBe("Big");
    });
  });

  it("applies overlap between consecutive chunks", () => {
    const text = generateWords(800);
    const sections: Section[] = [{ heading: "Test", paragraphs: [text] }];
    const result = chunkText(sections);

    if (result.length >= 2) {
      // The second chunk should start with words from the end of the first chunk
      const firstWords = result[0].content.split(/\s+/);
      const secondContent = result[1].content;
      // Last 12% of first chunk should appear at start of second chunk
      const overlapCount = Math.floor(firstWords.length * 0.12);
      if (overlapCount > 0) {
        const overlapWords = firstWords.slice(firstWords.length - overlapCount);
        // At least some of the overlap words should be at the start of chunk 2
        const secondStart = secondContent.split(/\s+/).slice(0, overlapCount);
        expect(secondStart).toEqual(overlapWords);
      }
    }
  });

  it("merges undersized final chunk with preceding chunk", () => {
    // Create a section that would produce a small remainder
    const text = generateWords(500); // will split into ~400 + ~100, remainder should merge
    const sections: Section[] = [{ heading: "Test", paragraphs: [text] }];
    const result = chunkText(sections);

    // No chunk should have fewer than 200 words (our MIN_WORDS)
    // unless it's the only chunk (total text < 200 words)
    for (const chunk of result) {
      const wc = wordCount(chunk.content);
      // After overlap is applied, chunks may be slightly above MAX_WORDS
      // but should not be below MIN_WORDS unless it's the single chunk
      if (result.length > 1) {
        expect(wc).toBeGreaterThanOrEqual(200);
      }
    }
  });

  it("preserves section headings correctly", () => {
    const sections: Section[] = [
      { heading: "Section A", paragraphs: [generateWords(250)] },
      { heading: "Section B", paragraphs: [generateWords(250)] },
    ];
    const result = chunkText(sections);

    expect(result.length).toBe(2);
    expect(result[0].sectionHeading).toBe("Section A");
    expect(result[1].sectionHeading).toBe("Section B");
  });

  it("uses empty string for section heading when none provided", () => {
    const sections: Section[] = [
      { heading: "", paragraphs: [generateWords(250)] },
    ];
    const result = chunkText(sections);

    expect(result[0].sectionHeading).toBe("");
  });

  it("merges small sections that are below MIN_WORDS", () => {
    const sections: Section[] = [
      { heading: "Tiny", paragraphs: [generateWords(50)] },
      { heading: "Also Tiny", paragraphs: [generateWords(50)] },
    ];
    const result = chunkText(sections);

    // Both are below MIN_WORDS (200), so they should be merged
    // The second one should get merged into the first
    expect(result.length).toBe(1);
  });

  it("assigns sequential chunk indices starting from 0", () => {
    const sections: Section[] = [
      { heading: "A", paragraphs: [generateWords(350)] },
      { heading: "B", paragraphs: [generateWords(350)] },
      { heading: "C", paragraphs: [generateWords(350)] },
    ];
    const result = chunkText(sections);

    result.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });
});
