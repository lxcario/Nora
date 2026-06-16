import { describe, it, expect } from "vitest";
import {
  sliceTranscript,
  parseTimeInput,
  formatSeconds,
  validateTimeRange,
  buildNotePrompt,
} from "./transcript-utils";
import type { TranscriptSegment } from "@/lib/supabase/database.types";

describe("sliceTranscript", () => {
  const segments: TranscriptSegment[] = [
    { text: "Hello world", offset: 0, duration: 5 },
    { text: "Second segment", offset: 10, duration: 5 },
    { text: "Third segment", offset: 20, duration: 5 },
    { text: "Fourth segment", offset: 30, duration: 5 },
    { text: "Fifth segment", offset: 40, duration: 5 },
  ];

  it("should return segments within [start, end) range", () => {
    const result = sliceTranscript(segments, 10, 30);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Second segment");
    expect(result[1].text).toBe("Third segment");
  });

  it("should include segment at exact start boundary", () => {
    const result = sliceTranscript(segments, 20, 40);
    expect(result).toHaveLength(2);
    expect(result[0].offset).toBe(20);
    expect(result[1].offset).toBe(30);
  });

  it("should exclude segment at exact end boundary", () => {
    const result = sliceTranscript(segments, 0, 10);
    expect(result).toHaveLength(1);
    expect(result[0].offset).toBe(0);
  });

  it("should return empty array when no segments in range", () => {
    const result = sliceTranscript(segments, 50, 60);
    expect(result).toHaveLength(0);
  });

  it("should return all segments when range covers full duration", () => {
    const result = sliceTranscript(segments, 0, 100);
    expect(result).toHaveLength(5);
  });

  it("should return segments sorted by offset", () => {
    const unsorted: TranscriptSegment[] = [
      { text: "B", offset: 20, duration: 5 },
      { text: "A", offset: 5, duration: 5 },
      { text: "C", offset: 35, duration: 5 },
    ];
    const result = sliceTranscript(unsorted, 0, 40);
    expect(result[0].offset).toBe(5);
    expect(result[1].offset).toBe(20);
    expect(result[2].offset).toBe(35);
  });
});

describe("parseTimeInput", () => {
  it("should parse MM:SS format", () => {
    expect(parseTimeInput("4:22")).toBe(262);
    expect(parseTimeInput("04:22")).toBe(262);
  });

  it("should parse HH:MM:SS format", () => {
    expect(parseTimeInput("1:04:22")).toBe(3862);
    expect(parseTimeInput("01:04:22")).toBe(3862);
  });

  it("should parse zero values", () => {
    expect(parseTimeInput("0:00")).toBe(0);
    expect(parseTimeInput("00:00")).toBe(0);
    expect(parseTimeInput("0:00:00")).toBe(0);
  });

  it("should return null for empty string", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("  ")).toBeNull();
  });

  it("should return null for invalid formats", () => {
    expect(parseTimeInput("abc")).toBeNull();
    expect(parseTimeInput("12")).toBeNull();
    expect(parseTimeInput("1:2:3:4")).toBeNull();
    expect(parseTimeInput("1:60")).toBeNull();
    expect(parseTimeInput("1:00:60")).toBeNull();
    expect(parseTimeInput("-1:00")).toBeNull();
    expect(parseTimeInput("1:ab")).toBeNull();
  });

  it("should handle whitespace around input", () => {
    expect(parseTimeInput("  4:22  ")).toBe(262);
  });
});

describe("formatSeconds", () => {
  it("should format seconds under an hour as MM:SS", () => {
    expect(formatSeconds(262)).toBe("04:22");
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(59)).toBe("00:59");
    expect(formatSeconds(60)).toBe("01:00");
    expect(formatSeconds(3599)).toBe("59:59");
  });

  it("should format seconds at or above an hour as H:MM:SS", () => {
    expect(formatSeconds(3600)).toBe("1:00:00");
    expect(formatSeconds(3862)).toBe("1:04:22");
    expect(formatSeconds(7200)).toBe("2:00:00");
    expect(formatSeconds(36000)).toBe("10:00:00");
  });

  it("should handle negative values as 0", () => {
    expect(formatSeconds(-5)).toBe("00:00");
  });

  it("should floor fractional seconds", () => {
    expect(formatSeconds(262.7)).toBe("04:22");
  });
});

describe("validateTimeRange", () => {
  it("should accept valid ranges", () => {
    expect(validateTimeRange(0, 60, 120)).toEqual({ valid: true });
    expect(validateTimeRange(10, 50, 100)).toEqual({ valid: true });
    expect(validateTimeRange(0, 100, 100)).toEqual({ valid: true });
  });

  it("should reject negative start", () => {
    const result = validateTimeRange(-1, 60, 120);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject negative end", () => {
    const result = validateTimeRange(0, -1, 120);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject start >= end", () => {
    expect(validateTimeRange(60, 60, 120).valid).toBe(false);
    expect(validateTimeRange(70, 60, 120).valid).toBe(false);
  });

  it("should reject end > duration", () => {
    const result = validateTimeRange(0, 130, 120);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("duration");
  });
});

describe("buildNotePrompt", () => {
  const segments: TranscriptSegment[] = [
    { text: "Introduction to calculus", offset: 60, duration: 10 },
    { text: "Derivatives explained", offset: 70, duration: 10 },
    { text: "Integration basics", offset: 80, duration: 10 },
  ];

  it("should include the video title in system prompt", () => {
    const { system } = buildNotePrompt("Calculus 101", 60, 90, segments);
    expect(system).toContain('"Calculus 101"');
  });

  it("should include formatted start and end times", () => {
    const { system, user } = buildNotePrompt("Test Video", 60, 3662, segments);
    expect(system).toContain("01:00");
    expect(system).toContain("1:01:02");
    expect(user).toContain("01:00");
    expect(user).toContain("1:01:02");
  });

  it("should include all segment texts with timestamp prefixes", () => {
    const { user } = buildNotePrompt("Test Video", 60, 90, segments);
    expect(user).toContain("[01:00] Introduction to calculus");
    expect(user).toContain("[01:10] Derivatives explained");
    expect(user).toContain("[01:20] Integration basics");
  });

  it("should contain the segment markers", () => {
    const { user } = buildNotePrompt("Test Video", 60, 90, segments);
    expect(user).toContain("[TRANSCRIPT SEGMENT:");
    expect(user).toContain("[END SEGMENT]");
  });

  it("should request JSON output in system prompt", () => {
    const { system } = buildNotePrompt("Test", 0, 60, segments);
    expect(system).toContain("valid JSON object");
    expect(system).toContain("summary");
    expect(system).toContain("key_concepts");
    expect(system).toContain("flashcards");
  });
});
