// pdf-parse v1 — lazy import. We must pass the buffer directly to avoid
// the library's built-in test file read (which looks for test/data/*.pdf).
async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; numpages: number; info: Record<string, string> }> {
  // pdf-parse v1 default export is a function that accepts (dataBuffer, options)
  // Dynamic import avoids module-evaluation side effects
  const pdfParse = (await import("pdf-parse")).default;
  return pdfParse(buffer);
}

export interface Section {
  heading: string; // empty string if no heading detected
  paragraphs: string[]; // non-empty paragraph text blocks
}

export interface ParseResult {
  sections: Section[];
  metadata: {
    title: string | null;
    author: string | null;
    numPages: number;
  };
}

/**
 * Determines if a line is likely a section heading.
 * Heuristics:
 * - Short line (< 100 chars)
 * - Either ALL CAPS, or ends without terminal punctuation
 */
function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length >= 100) return false;

  // ALL CAPS lines (at least 3 alphabetic chars to avoid noise like "1." or "A")
  const alphaChars = trimmed.replace(/[^a-zA-Z]/g, "");
  if (alphaChars.length >= 3 && trimmed === trimmed.toUpperCase()) {
    return true;
  }

  // Short lines that don't end with sentence-ending punctuation
  if (trimmed.length < 80 && !/[.!?:;,]$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Splits raw PDF text into structured sections with headings and paragraphs.
 * Uses double-newline splitting and heuristic heading detection.
 */
function structureText(rawText: string): Section[] {
  // Split on double-newlines to get text blocks
  const blocks = rawText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  if (blocks.length === 0) return [];

  const sections: Section[] = [];
  let currentHeading = "";
  let currentParagraphs: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length === 1 && isLikelyHeading(lines[0])) {
      // This block is a heading — flush current section
      if (currentParagraphs.length > 0) {
        sections.push({ heading: currentHeading, paragraphs: currentParagraphs });
        currentParagraphs = [];
      }
      currentHeading = lines[0];
    } else if (lines.length > 1 && isLikelyHeading(lines[0])) {
      // First line looks like a heading, rest is paragraph content
      if (currentParagraphs.length > 0) {
        sections.push({ heading: currentHeading, paragraphs: currentParagraphs });
        currentParagraphs = [];
      }
      currentHeading = lines[0];
      const paragraphText = lines.slice(1).join(" ");
      if (paragraphText.trim()) {
        currentParagraphs.push(paragraphText.trim());
      }
    } else {
      // Regular paragraph block
      const paragraphText = lines.join(" ");
      if (paragraphText.trim()) {
        currentParagraphs.push(paragraphText.trim());
      }
    }
  }

  // Flush remaining
  if (currentParagraphs.length > 0 || currentHeading) {
    sections.push({ heading: currentHeading, paragraphs: currentParagraphs });
  }

  // If nothing was captured as sections but we had text, create a single section
  if (sections.length === 0 && rawText.trim().length > 0) {
    sections.push({ heading: "", paragraphs: [rawText.trim()] });
  }

  return sections;
}

/**
 * Parses a PDF buffer and returns structured sections and metadata.
 *
 * - Uses pdf-parse for text extraction
 * - Detects section headings heuristically
 * - Enforces a 60-second timeout
 * - Throws if extracted text has < 20 non-whitespace characters
 */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Race pdf-parse against a 60-second timeout
  const result = await Promise.race([
    parsePdfBuffer(buffer),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("PDF parsing timed out after 60 seconds")),
        60_000
      );
    }),
  ]);

  const rawText = result.text || "";

  // Check minimum text threshold
  const nonWhitespace = rawText.replace(/\s/g, "");
  if (nonWhitespace.length < 20) {
    throw new Error(
      "PDF contains fewer than 20 non-whitespace characters. The document may be scanned/image-only and requires a format not yet supported."
    );
  }

  // Structure the text into sections
  const sections = structureText(rawText);

  // Extract metadata from pdf-parse info object
  const info = result.info || {};
  const title: string | null = info.Title && typeof info.Title === "string" && info.Title.trim()
    ? info.Title.trim()
    : null;
  const author: string | null = info.Author && typeof info.Author === "string" && info.Author.trim()
    ? info.Author.trim()
    : null;

  return {
    sections,
    metadata: {
      title,
      author,
      numPages: result.numpages || 0,
    },
  };
}
