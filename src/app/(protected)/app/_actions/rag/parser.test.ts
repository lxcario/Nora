import { describe, it, expect, vi } from "vitest";

// parser.ts imports the INNER path "pdf-parse/lib/pdf-parse.js" (to bypass
// pdf-parse's index.js self-test that throws on Vercel). The mock must target
// that exact specifier or it never applies. vi.hoisted lets the mock factory
// reference the spy even though vi.mock is hoisted above these statements, and
// avoids a static import of the untyped inner path.
const { mockPdfParse } = vi.hoisted(() => ({ mockPdfParse: vi.fn() }));
vi.mock("pdf-parse/lib/pdf-parse.js", () => ({ default: mockPdfParse }));

import { parsePdf, type ParseResult } from "./parser";

describe("parsePdf", () => {
  it("should throw when text has fewer than 20 non-whitespace characters", async () => {
    mockPdfParse.mockResolvedValue({
      text: "short",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "default",
    });

    await expect(parsePdf(Buffer.from("fake"))).rejects.toThrow(
      "fewer than 20 non-whitespace characters"
    );
  });

  it("should extract metadata from pdf info object", async () => {
    mockPdfParse.mockResolvedValue({
      text: "This is a long enough text block to pass the minimum threshold for extraction.",
      numpages: 5,
      numrender: 5,
      info: { Title: "My Paper Title", Author: "John Doe" },
      metadata: null,
      version: "default",
    });

    const result = await parsePdf(Buffer.from("fake"));
    expect(result.metadata.title).toBe("My Paper Title");
    expect(result.metadata.author).toBe("John Doe");
    expect(result.metadata.numPages).toBe(5);
  });

  it("should return null metadata when info fields are missing", async () => {
    mockPdfParse.mockResolvedValue({
      text: "This is a long enough text block to pass the minimum threshold for extraction.",
      numpages: 3,
      numrender: 3,
      info: {},
      metadata: null,
      version: "default",
    });

    const result = await parsePdf(Buffer.from("fake"));
    expect(result.metadata.title).toBeNull();
    expect(result.metadata.author).toBeNull();
  });

  it("should detect ALL CAPS headings", async () => {
    const text = `INTRODUCTION\n\nThis is the first paragraph under introduction.\n\nMETHODS\n\nWe used various methods to conduct the study and measure outcomes.`;

    mockPdfParse.mockResolvedValue({
      text,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "default",
    });

    const result = await parsePdf(Buffer.from("fake"));
    expect(result.sections.length).toBe(2);
    expect(result.sections[0].heading).toBe("INTRODUCTION");
    expect(result.sections[0].paragraphs[0]).toContain("first paragraph");
    expect(result.sections[1].heading).toBe("METHODS");
    expect(result.sections[1].paragraphs[0]).toContain("various methods");
  });

  it("should handle text with no clear headings as a single section", async () => {
    const text = `This is a simple document without any clear headings. It just contains regular paragraph text that goes on for a while to exceed the minimum character threshold.`;

    mockPdfParse.mockResolvedValue({
      text,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "default",
    });

    const result = await parsePdf(Buffer.from("fake"));
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections[0].paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it("should split paragraphs at double newlines", async () => {
    const text = `ABSTRACT\n\nThis is the first paragraph of the abstract with enough content.\n\nThis is the second paragraph of the abstract with enough content too.`;

    mockPdfParse.mockResolvedValue({
      text,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "default",
    });

    const result = await parsePdf(Buffer.from("fake"));
    const abstractSection = result.sections.find((s) => s.heading === "ABSTRACT");
    expect(abstractSection).toBeDefined();
    expect(abstractSection!.paragraphs.length).toBe(2);
  });

  it("should timeout after 60 seconds", async () => {
    vi.useFakeTimers();
    
    mockPdfParse.mockImplementation(
      () => new Promise((resolve) => {
        // Never resolves
        setTimeout(resolve, 120_000);
      }) as any
    );

    const promise = parsePdf(Buffer.from("fake"));
    vi.advanceTimersByTime(60_000);

    await expect(promise).rejects.toThrow("timed out after 60 seconds");
    vi.useRealTimers();
  });
});
