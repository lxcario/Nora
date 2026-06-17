import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getScrapeClient } from "./scrape-client";
import { hostMatchesDomain } from "./academic/source-ranking";

const ORIGINAL_KEY = process.env.FIRECRAWL_API_KEY;

function restoreKey() {
  if (ORIGINAL_KEY === undefined) delete process.env.FIRECRAWL_API_KEY;
  else process.env.FIRECRAWL_API_KEY = ORIGINAL_KEY;
}

describe("getScrapeClient — manual fallback when no key (Requirement 5.4)", () => {
  beforeEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
  });
  afterEach(restoreKey);

  it("returns the no-op manual client that never fails onboarding", async () => {
    const client = getScrapeClient();
    expect(client.provider).toBe("manual");
    expect(client.available).toBe(false);
    expect((await client.search("akademik takvim")).reason).toBe("no_provider");
    expect((await client.scrape("https://metu.edu.tr")).reason).toBe("no_provider");
  });
});

describe("Firecrawl client guards — reject before any network call (Requirements 5.1, 5.2)", () => {
  beforeEach(() => {
    process.env.FIRECRAWL_API_KEY = "test-key-not-used";
  });
  afterEach(restoreKey);

  it("rejects off-domain URLs (allowlist)", async () => {
    const client = getScrapeClient();
    expect(client.provider).toBe("firecrawl");
    const r = await client.scrape("https://evil.example/metu.edu.tr", {
      allowedDomains: ["metu.edu.tr"],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("off_domain");
  });

  it("rejects private/loopback addresses via the SSRF guard", async () => {
    const client = getScrapeClient();
    const r = await client.scrape("http://127.0.0.1/admin", { allowedDomains: ["127.0.0.1"] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ssrf_blocked");
  });

  it("rejects the cloud metadata endpoint", async () => {
    const client = getScrapeClient();
    const r = await client.scrape("http://169.254.169.254/latest/meta-data/", {
      allowedDomains: ["169.254.169.254"],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ssrf_blocked");
  });
});

describe("domain audit (Requirement 5.2)", () => {
  it("treats only the primary domain and its subdomains as official", () => {
    expect(hostMatchesDomain("oidb.metu.edu.tr", "metu.edu.tr")).toBe(true);
    expect(hostMatchesDomain("metu.edu.tr", "metu.edu.tr")).toBe(true);
    expect(hostMatchesDomain("catalog2.metu.edu.tr", "metu.edu.tr")).toBe(true);
    expect(hostMatchesDomain("evil.com", "metu.edu.tr")).toBe(false);
    expect(hostMatchesDomain("metu.edu.tr.evil.com", "metu.edu.tr")).toBe(false);
  });
});
