# Security

*Students trust Nora with their notes, their pace, and their quiet off-days. Protecting that trust is part of the craft, not an afterthought.*

Nora handles student data, so security is enforced at the database and network edges — not just in the UI. This document describes the model, the controls in place, and how to report an issue.

---

## Authentication & sessions

- Authentication is handled by **Supabase Auth**. Sessions are carried in HTTP-only cookies.
- `proxy.ts` runs at the edge on every matched request: it refreshes the session and redirects unauthenticated users away from `/app` routes before any page renders.
- The protected layout independently re-resolves the user server-side (`getCurrentUser()`), so a page never renders with a stale or absent session.

---

## Authorization: Row-Level Security

Every user-owned table in Postgres enforces **Row-Level Security** with policies keyed on `auth.uid()`. Application code cannot read or write another user's rows even if a query is malformed — the database rejects it. RLS is treated as the last line of defense, independent of the client and the Server Actions layer.

---

## Database functions (`SECURITY DEFINER`)

A few operations run as `SECURITY DEFINER` functions (they bypass RLS by design — e.g. awarding rewards, advancing shared party quests). These are the highest-risk surface in a Postgres app, so each one:

- **Sets `search_path = public`** to prevent search-path hijacking.
- **Asserts the caller's identity.** Reward functions reject any call whose target user is not `auth.uid()`; the trusted server (`service_role`, where `auth.uid()` is null) is the only path allowed to perform legitimate cross-user writes (e.g. rewarding every member when a group quest completes).
- **Locks down execution.** `EXECUTE` is revoked from `PUBLIC` and from `anon`, and granted only to `authenticated` and `service_role`.

This closes an IDOR class where the public API could otherwise be used to inflate arbitrary users' XP/coins or advance any group's quest. See migration [`supabase/migrations/020_secure_reward_rpcs.sql`](supabase/migrations/020_secure_reward_rpcs.sql); migration `005` is the reference pattern for party helpers.

---

## Outbound requests: SSRF protection

Nora fetches external content (academic PDFs, university calendars, web results). All outbound fetches pass through an **SSRF guard** (`src/lib/ssrf.ts`) that blocks requests to private, loopback, link-local, and cloud-metadata addresses. University auto-discovery is additionally constrained to official-domain allowlists and per-request timeouts.

**Fetched content is always treated as data, never as instructions.** A retrieved page or document can never act as a prompt to the model.

---

## Secrets

- Provider keys (Groq, OpenRouter, OpenAI, Tavily, Firecrawl, etc.) and the Supabase **service-role** key are server-only. They are read from environment variables inside Server Actions and never sent to the browser.
- Only `NEXT_PUBLIC_*` values (the Supabase URL and the anon key) are exposed to the client — the anon key is public by design and is constrained by RLS.
- `.env.local` is git-ignored. Never commit real keys. If a key is ever exposed, rotate it in the provider dashboard.

---

## Input handling & AI safety

- **Grounded generation.** AI answers are constrained to retrieved sources; unverified output is labelled and insufficient data is declared rather than fabricated.
- **Rate limiting.** AI-backed actions are rate-limited per action type to contain abuse and cost.
- **File uploads** are size-capped (PDFs to 20 MB local / 50 MB by URL) and parsed defensively.

---

## Reporting a vulnerability

If you find a security issue, please **do not open a public issue**. Email the maintainer at the address in the app footer / `NEXT_PUBLIC_SUPPORT_EMAIL` with:

- a description of the issue and its impact,
- steps to reproduce, and
- any relevant logs or proof-of-concept.

You'll get an acknowledgement, and we'll work with you on a fix and disclosure timeline. Nora is a non-commercial educational project maintained by a small team, so please allow reasonable time to respond.
