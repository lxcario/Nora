/**
 * Unit tests for the academic-search clients.
 *
 * All external HTTP calls are intercepted via `vi.stubGlobal('fetch', ...)`.
 * Tests verify:
 *   - Correct parsing of realistic API responses.
 *   - Graceful handling of empty responses, HTTP errors, network failures,
 *     and missing configuration (spec Req 8.5).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchOpenAlex } from "./openalex";
import { searchCrossref } from "./crossref";
import { lookupUnpaywall, enrichWithUnpaywall } from "./unpaywall";

// ---------------------------------------------------------------------------
// Fixtures — realistic API response shapes
// ---------------------------------------------------------------------------

const OPENALEX_HIT = {
  id: "https://openalex.org/W2964306162",
  display_name: "Attention Is All You Need",
  authorships: [
    { author: { display_name: "Ashish Vaswani" } },
    { author: { display_name: "Noam Shazeer" } },
  ],
  publication_year: 2017,
  doi: "https://doi.org/10.48550/arxiv.1706.03762",
  open_access: { is_oa: true, oa_url: "https://arxiv.org/pdf/1706.03762" },
  abstract_inverted_index: {
    The: [0],
    dominant: [1],
    sequence: [2],
    transduction: [3],
    models: [4],
  },
  cited_by_count: 80000,
  primary_location: { landing_page_url: "https://arxiv.org/abs/1706.03762" },
};

const OPENALEX_RESPONSE = { results: [OPENALEX_HIT] };

const CROSSREF_ITEM = {
  DOI: "10.1145/3290605.3300700",
  title: ["Attention Is All You Need"],
  author: [
    { given: "Ashish", family: "Vaswani" },
    { given: "Noam", family: "Shazeer" },
  ],
  published: { "date-parts": [[2017, 12, 6]] },
  URL: "https://dl.acm.org/doi/10.1145/3290605.3300700",
  abstract:
    "<jats:p>The dominant sequence transduction models are based on complex RNNs.</jats:p>",
  "is-referenced-by-count": 42000,
  type: "journal-article",
};

const CROSSREF_RESPONSE = { message: { items: [CROSSREF_ITEM] } };

const UNPAYWALL_RESPONSE = {
  doi: "10.48550/arxiv.1706.03762",
  title: "Attention Is All You Need",
  is_oa: true,
  best_oa_location: {
    url: "https://arxiv.org/abs/1706.03762",
    url_for_pdf: "https://arxiv.org/pdf/1706.03762",
    is_best: true,
    host_type: "repository",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(message = "Network error") {
  return vi.fn().mockRejectedValue(new Error(message));
}

// ---------------------------------------------------------------------------
// OpenAlex
// ---------------------------------------------------------------------------

describe("searchOpenAlex", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed AcademicWork objects from a realistic response", async () => {
    vi.stubGlobal("fetch", mockFetch(OPENALEX_RESPONSE));
    const works = await searchOpenAlex("transformer attention");
    expect(works).toHaveLength(1);
    const w = works[0];
    expect(w.title).toBe("Attention Is All You Need");
    expect(w.authors).toContain("Ashish Vaswani");
    expect(w.year).toBe(2017);
    expect(w.doi).toBe("10.48550/arxiv.1706.03762");
    expect(w.isOpenAccess).toBe(true);
    expect(w.oaPdfUrl).toBe("https://arxiv.org/pdf/1706.03762");
    expect(w.abstract).toContain("dominant");
    expect(w.citationCount).toBe(80000);
    expect(w.source).toBe("openalex");
  });

  it("includes mailto in the request URL when env is set", async () => {
    const fetchMock = mockFetch(OPENALEX_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    process.env.ACADEMIC_API_MAILTO = "test@example.com";
    await searchOpenAlex("spaced repetition");
    const calledUrl = (fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain("mailto=test%40example.com");
    delete process.env.ACADEMIC_API_MAILTO;
  });

  it("returns empty array on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    const works = await searchOpenAlex("anything");
    expect(works).toEqual([]);
  });

  it("returns empty array on network failure", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    const works = await searchOpenAlex("anything");
    expect(works).toEqual([]);
  });

  it("returns empty array for too-short query", async () => {
    const fetchMock = mockFetch(OPENALEX_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    const works = await searchOpenAlex("ab");
    expect(works).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns empty array when results array is absent", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    expect(await searchOpenAlex("test query")).toEqual([]);
  });

  it("handles missing abstract_inverted_index gracefully", async () => {
    const noAbstract = { results: [{ ...OPENALEX_HIT, abstract_inverted_index: null }] };
    vi.stubGlobal("fetch", mockFetch(noAbstract));
    const works = await searchOpenAlex("transformer attention");
    expect(works[0].abstract).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Crossref
// ---------------------------------------------------------------------------

describe("searchCrossref", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed AcademicWork objects from a realistic response", async () => {
    vi.stubGlobal("fetch", mockFetch(CROSSREF_RESPONSE));
    const works = await searchCrossref("transformer neural networks");
    expect(works).toHaveLength(1);
    const w = works[0];
    expect(w.title).toBe("Attention Is All You Need");
    expect(w.authors).toContain("Ashish Vaswani");
    expect(w.year).toBe(2017);
    expect(w.doi).toBe("10.1145/3290605.3300700");
    expect(w.abstract).toContain("dominant sequence transduction");
    expect(w.abstract).not.toContain("<jats:p>"); // JATS tags stripped
    expect(w.citationCount).toBe(42000);
    expect(w.source).toBe("crossref");
  });

  it("includes mailto param when env is set", async () => {
    const fetchMock = mockFetch(CROSSREF_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    process.env.ACADEMIC_API_MAILTO = "dev@example.com";
    await searchCrossref("memory consolidation");
    const calledUrl = (fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain("mailto=dev%40example.com");
    delete process.env.ACADEMIC_API_MAILTO;
  });

  it("returns empty array on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({ message: {} }, 429));
    expect(await searchCrossref("test")).toEqual([]);
  });

  it("returns empty array on network failure", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    expect(await searchCrossref("test")).toEqual([]);
  });

  it("returns empty array for too-short query", async () => {
    const fetchMock = mockFetch(CROSSREF_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchCrossref("xy")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles missing message.items gracefully", async () => {
    vi.stubGlobal("fetch", mockFetch({ message: {} }));
    expect(await searchCrossref("spaced repetition")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unpaywall
// ---------------------------------------------------------------------------

describe("lookupUnpaywall", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ACADEMIC_API_EMAIL;
  });

  it("returns OA location data from a realistic response", async () => {
    vi.stubGlobal("fetch", mockFetch(UNPAYWALL_RESPONSE));
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    const result = await lookupUnpaywall("10.48550/arxiv.1706.03762");
    expect(result).not.toBeNull();
    expect(result!.isOa).toBe(true);
    expect(result!.bestOaLocation?.urlForPdf).toBe(
      "https://arxiv.org/pdf/1706.03762"
    );
    expect(result!.bestOaLocation?.hostType).toBe("repository");
  });

  it("returns null when ACADEMIC_API_EMAIL is not set", async () => {
    const fetchMock = mockFetch(UNPAYWALL_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    const result = await lookupUnpaywall("10.1234/test");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null on 404 (DOI not in database)", async () => {
    vi.stubGlobal("fetch", mockFetch({ message: "Not found" }, 404));
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    expect(await lookupUnpaywall("10.9999/nonexistent")).toBeNull();
  });

  it("returns null on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    expect(await lookupUnpaywall("10.1234/test")).toBeNull();
  });

  it("returns null on network failure", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    expect(await lookupUnpaywall("10.1234/test")).toBeNull();
  });

  it("returns null for a DOI not starting with '10.'", async () => {
    const fetchMock = mockFetch(UNPAYWALL_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    expect(await lookupUnpaywall("not-a-doi")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for empty DOI", async () => {
    const fetchMock = mockFetch(UNPAYWALL_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    expect(await lookupUnpaywall("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles missing best_oa_location gracefully", async () => {
    vi.stubGlobal("fetch", mockFetch({ ...UNPAYWALL_RESPONSE, best_oa_location: null }));
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    const result = await lookupUnpaywall("10.48550/arxiv.1706.03762");
    expect(result).not.toBeNull();
    expect(result!.bestOaLocation).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// enrichWithUnpaywall
// ---------------------------------------------------------------------------

describe("enrichWithUnpaywall", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ACADEMIC_API_EMAIL;
  });

  it("adds oaPdfUrl to works that have a DOI and a PDF location", async () => {
    vi.stubGlobal("fetch", mockFetch(UNPAYWALL_RESPONSE));
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    const works = [
      {
        doi: "10.48550/arxiv.1706.03762",
        oaPdfUrl: null,
        isOpenAccess: false,
        title: "Test",
      },
    ];
    const result = await enrichWithUnpaywall(works);
    expect(result[0].oaPdfUrl).toBe("https://arxiv.org/pdf/1706.03762");
    expect(result[0].isOpenAccess).toBe(true);
  });

  it("skips works without a DOI", async () => {
    const fetchMock = mockFetch(UNPAYWALL_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    process.env.ACADEMIC_API_EMAIL = "test@example.com";
    const works = [{ doi: null, oaPdfUrl: null, isOpenAccess: false, title: "No DOI" }];
    await enrichWithUnpaywall(works);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns unchanged works when email is not configured", async () => {
    const fetchMock = mockFetch(UNPAYWALL_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);
    const works = [
      { doi: "10.1234/test", oaPdfUrl: null, isOpenAccess: false, title: "Test" },
    ];
    const result = await enrichWithUnpaywall(works);
    expect(result[0].oaPdfUrl).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
