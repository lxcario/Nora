import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  hasEmbeddingSupport,
  calculateRetryWait,
  batchChunks,
  shouldEmbed,
  generateEmbeddings,
  generateQueryEmbedding,
} from "./embedder";

describe("embedder", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("hasEmbeddingSupport", () => {
    it("returns true when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      expect(hasEmbeddingSupport()).toBe(true);
    });

    it("returns false when OPENAI_API_KEY is not set", () => {
      delete process.env.OPENAI_API_KEY;
      expect(hasEmbeddingSupport()).toBe(false);
    });

    it("returns false when OPENAI_API_KEY is empty string", () => {
      process.env.OPENAI_API_KEY = "";
      expect(hasEmbeddingSupport()).toBe(false);
    });
  });

  describe("calculateRetryWait", () => {
    it("returns 60000ms when header is null", () => {
      expect(calculateRetryWait(null)).toBe(60_000);
    });

    it("returns 60000ms when header is empty string", () => {
      expect(calculateRetryWait("")).toBe(60_000);
    });

    it("returns parsed seconds * 1000 for valid numeric header", () => {
      expect(calculateRetryWait("30")).toBe(30_000);
      expect(calculateRetryWait("5")).toBe(5_000);
      expect(calculateRetryWait("120")).toBe(120_000);
    });

    it("returns 60000ms for non-numeric header", () => {
      expect(calculateRetryWait("abc")).toBe(60_000);
      expect(calculateRetryWait("not-a-number")).toBe(60_000);
    });

    it("returns 60000ms for zero or negative values", () => {
      expect(calculateRetryWait("0")).toBe(60_000);
      expect(calculateRetryWait("-5")).toBe(60_000);
    });
  });

  describe("batchChunks", () => {
    it("creates a single batch for items <= batch size", () => {
      const items = [1, 2, 3, 4, 5];
      const batches = batchChunks(items, 20);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2, 3, 4, 5]);
    });

    it("splits items into correct number of batches", () => {
      const items = Array.from({ length: 45 }, (_, i) => i);
      const batches = batchChunks(items, 20);
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(20);
      expect(batches[1]).toHaveLength(20);
      expect(batches[2]).toHaveLength(5);
    });

    it("handles empty array", () => {
      expect(batchChunks([], 20)).toEqual([]);
    });

    it("handles exactly batch size items", () => {
      const items = Array.from({ length: 20 }, (_, i) => i);
      const batches = batchChunks(items, 20);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(20);
    });
  });

  describe("shouldEmbed", () => {
    it("returns true for non-empty text", () => {
      expect(shouldEmbed("hello world")).toBe(true);
      expect(shouldEmbed("a")).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(shouldEmbed("")).toBe(false);
    });

    it("returns false for whitespace-only text", () => {
      expect(shouldEmbed("   ")).toBe(false);
      expect(shouldEmbed("\t\n ")).toBe(false);
      expect(shouldEmbed("\n\n")).toBe(false);
    });
  });

  describe("generateEmbeddings (free mode)", () => {
    it("returns all nulls when OPENAI_API_KEY is not set", async () => {
      delete process.env.OPENAI_API_KEY;
      const texts = ["hello", "world", "test"];
      const results = await generateEmbeddings(texts);
      expect(results).toEqual([null, null, null]);
    });

    it("returns empty array for empty input", async () => {
      delete process.env.OPENAI_API_KEY;
      const results = await generateEmbeddings([]);
      expect(results).toEqual([]);
    });
  });

  describe("generateEmbeddings (with API key)", () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = "sk-test-key";
    });

    it("returns null for empty/whitespace texts without calling API", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const texts = ["", "  ", "\n\t"];
      const results = await generateEmbeddings(texts);
      expect(results).toEqual([null, null, null]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls OpenAI API with correct parameters for non-empty texts", async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ embedding: mockEmbedding, index: 0 }],
          }),
      });
      global.fetch = mockFetch;

      const results = await generateEmbeddings(["hello world"]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/embeddings");
      expect(options.headers["Authorization"]).toBe("Bearer sk-test-key");
      expect(JSON.parse(options.body)).toEqual({
        model: "text-embedding-3-small",
        input: ["hello world"],
      });
      expect(results).toEqual([mockEmbedding]);
    });

    it("uses custom model from OPENAI_EMBEDDING_MODEL env var", async () => {
      process.env.OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002";
      const mockEmbedding = Array(1536).fill(0.2);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ embedding: mockEmbedding, index: 0 }],
          }),
      });
      global.fetch = mockFetch;

      await generateEmbeddings(["test"]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe("text-embedding-ada-002");
    });

    it("maps nulls correctly for mixed empty/non-empty texts", async () => {
      const mockEmbedding1 = Array(1536).fill(0.1);
      const mockEmbedding2 = Array(1536).fill(0.2);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              { embedding: mockEmbedding1, index: 0 },
              { embedding: mockEmbedding2, index: 1 },
            ],
          }),
      });
      global.fetch = mockFetch;

      const texts = ["hello", "", "world", "  "];
      const results = await generateEmbeddings(texts);

      expect(results[0]).toEqual(mockEmbedding1);
      expect(results[1]).toBeNull(); // empty
      expect(results[2]).toEqual(mockEmbedding2);
      expect(results[3]).toBeNull(); // whitespace-only
    });
  });

  describe("generateQueryEmbedding", () => {
    it("returns null when no API key", async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await generateQueryEmbedding("test query");
      expect(result).toBeNull();
    });

    it("returns embedding for valid query", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key";
      const mockEmbedding = Array(1536).fill(0.5);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ embedding: mockEmbedding, index: 0 }],
          }),
      });

      const result = await generateQueryEmbedding("test query");
      expect(result).toEqual(mockEmbedding);
    });
  });
});
