/**
 * SSRF protection for server-side outbound fetches of user-supplied URLs.
 *
 * Used by the RAG "ingest PDF from URL" flow, where the server downloads an
 * arbitrary URL provided by the user. Without these checks an attacker could
 * point the server at internal services or the cloud metadata endpoint
 * (169.254.169.254) to exfiltrate credentials.
 *
 * Strategy: parse the URL, require http/https, resolve the hostname via DNS,
 * and reject any URL that resolves to a private, loopback, link-local, or
 * otherwise non-public IP address.
 */

import dns from "node:dns/promises";
import net from "node:net";

export interface SsrfCheckResult {
  ok: boolean;
  error?: string;
  /** The resolved public IP address (when ok). */
  address?: string;
}

/**
 * Returns true if the given IP string is in a private, loopback, link-local,
 * unique-local, or otherwise non-routable range.
 */
export function isBlockedIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 0) return true; // not a valid IP → block

  if (kind === 4) {
    const parts = ip.split(".").map((n) => parseInt(n, 10));
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8 "this network"
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
    return false;
  }

  // IPv6
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower === "::") return true; // unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) → validate the embedded v4 address
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIp(mapped[1]);
  return false;
}

/**
 * Validates that a user-supplied URL is safe for the server to fetch.
 *
 * - Must be a syntactically valid http/https URL.
 * - Hostname must resolve to a public (non-private) IP address.
 *
 * @param rawUrl The URL to validate.
 * @param maxLength Maximum allowed URL length (default 2048).
 */
export async function assertPublicHttpUrl(
  rawUrl: string,
  maxLength = 2048
): Promise<SsrfCheckResult> {
  if (!rawUrl || rawUrl.length > maxLength) {
    return { ok: false, error: "URL is missing or too long" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "URL is not valid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "URL must use http or https scheme" };
  }

  // Reject embedded credentials (user:pass@host) — a common SSRF/obfuscation vector.
  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed" };
  }

  const hostname = parsed.hostname;

  // If the host is already a literal IP, validate it directly.
  if (net.isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      return { ok: false, error: "URL resolves to a non-public address" };
    }
    return { ok: true, address: hostname };
  }

  // Block obvious localhost aliases before doing DNS.
  const lowerHost = hostname.toLowerCase();
  if (lowerHost === "localhost" || lowerHost.endsWith(".localhost")) {
    return { ok: false, error: "URL resolves to a non-public address" };
  }

  // Resolve all A/AAAA records and ensure every result is public.
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    return { ok: false, error: "Could not resolve URL host" };
  }

  if (addresses.length === 0) {
    return { ok: false, error: "Could not resolve URL host" };
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      return { ok: false, error: "URL resolves to a non-public address" };
    }
  }

  return { ok: true, address: addresses[0].address };
}
