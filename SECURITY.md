# Security

Nora handles student data, so security is enforced at the database and network edges — not just in the UI. This document describes the model, the controls in place, and how to report an issue.

---

## Authentication & sessions

- Authentication is handled by **Supabase Auth**. Sessions are carried in HTTP-only cookies.
- `proxy.ts` runs at the edge on every matched request: it refreshes the session and redirects unauthenticated users away from `/app` routes before any page renders.
- The protected layout independently re-resolves the user server-side (`getCurrentUser()`), so a page never renders with a stale or absent session.

---

## Authorization: Row-Level Security

## Authorization: Row-Level Security

Every user-owned table in Postgres enforces **Row-Level Security** with policies keyed on `auth.uid()`. Application code cannot read or write another user's rows even if a query is malformed — the database rejects it. RLS is treated as the last line of defense, independent of the client and the Server Actions layer.

The canonical pattern on every user-owned table (`cards`, `topics`, `subjects`, `feynman_sessions`, `reviews`, `profiles`, …):

```sql
alter table cards enable row level security;

create policy "owner reads own cards"
  on cards for select
  using (auth.uid() = user_id);

create policy "owner writes own cards"
  on cards for insert
  with check (auth.uid() = user_id);

create policy "owner updates own cards"
  on cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Two properties make this robust:

- **`USING` gates reads and the pre-image of writes; `WITH CHECK` gates the post-image.** Both are present on mutating policies so a user can neither read another row nor rewrite a row into someone else's ownership.
- **Default-deny.** With RLS enabled and no matching policy, Postgres denies. New tables are locked until an explicit policy opens them to their owner — the safe default, not the permissive one.

**This is not taken on faith.** The claim "an anonymous or cross-user client cannot read these rows" is verified directly against the database by the backend test suite (see *Security testing* below), not merely assumed because the UI looks locked.

## Database functions (`SECURITY DEFINER`)

A few operations run as `SECURITY DEFINER` functions (they bypass RLS by design — e.g. awarding rewards, advancing shared party quests). These are the highest-risk surface in a Postgres app, so each one:

- **Sets `search_path = public`** to prevent search-path hijacking.
- **Asserts the caller's identity.** Reward functions reject any call whose target user is not `auth.uid()`; the trusted server (`service_role`, where `auth.uid()` is null) is the only path allowed to perform legitimate cross-user writes (e.g. rewarding every member when a group quest completes).
- **Locks down execution.** `EXECUTE` is revoked from `PUBLIC` and from `anon`, and granted only to `authenticated` and `service_role`.

This closes an IDOR class where the public API could otherwise be used to inflate arbitrary users' XP/coins or advance any group's quest. See migration [`supabase/migrations/020_secure_reward_rpcs.sql`](supabase/migrations/020_secure_reward_rpcs.sql); migration `005` is the reference pattern for party helpers.

---

## Outbound requests: SSRF protection

Nora fetches external content (academic PDFs, university calendars, web results). All outbound fetches pass through an **SSRF guard** (`src/lib/ssrf.ts`) before the request leaves the server. The guard:

- **Rejects non-`http(s)` schemes** outright (`file:`, `ftp:`, `gopher:`, `data:` — classic SSRF pivots).
- **Resolves the host and blocks private ranges** — loopback (`127.0.0.0/8`, `::1`), private (`10/8`, `172.16/12`, `192.168/16`), link-local (`169.254/16`), and the **cloud metadata endpoint** (`169.254.169.254`), which is the single highest-value SSRF target on a cloud host.
- **Applies a per-request timeout** so a slow or hanging target can't tie up a Server Action.
- **Constrains university auto-discovery to an official-domain allowlist**, so calendar discovery can't be redirected to an arbitrary internal host.

**Fetched content is always treated as data, never as instructions.** A retrieved page, PDF, or search result can never act as a prompt to the model — the AI-safety layer (below) keeps retrieved text on the "data" side of the boundary.

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

## Security testing

Security controls that can't be seen in the UI are verified directly, as part of the TestSprite loop:

- **RLS is proven, not assumed.** Backend tests (`testsprite test create --type backend`) run as an unauthorized client and confirm the database *rejects* the request:
  - anon cannot read another user's `cards`,
  - anon/cross-user cannot insert into `topics`,
  - `feynman_sessions` are unreadable without the owner's session.
  A page looks identical whether RLS is airtight or wide open — the only way to know is to hit the database as an attacker would and confirm the denial. The browser runner can't do that; the backend runner can, so both are used.
- **Schema invariants are checked** — the tables and the columns the reward/scheduling logic depends on (`stability`, `difficulty`, `due`, `state`, `xp`, `coins`) exist and are typed as expected.
- **`SECURITY DEFINER` functions are covered by the reward round-trip tests** — a user can earn XP through the legitimate path, but the identity assertion blocks awarding XP to an arbitrary target user.

See [`LOOP.md`](LOOP.md) → *Backend Testing on TestSprite* for the per-test table.

---

## Threat model at a glance

| Threat | Control | Where |
|---|---|---|
| Unauthenticated access to `/app` | Edge session gate + server-side re-resolve | `proxy.ts`, protected `layout.tsx` |
| One user reading/modifying another's data | RLS `USING` + `WITH CHECK` on every owned table | Postgres policies (migrations) |
| IDOR on rewards / group quests (inflate any user's XP) | Identity-asserting `SECURITY DEFINER` RPCs, `EXECUTE` revoked from `anon`/`PUBLIC` | migration `020`, party helpers in `005` |
| SSRF via user-supplied URLs | Scheme + private-range + metadata blocking, allowlist, timeout | `src/lib/ssrf.ts` |
| Prompt injection from retrieved content | Retrieved text treated as data; grounded generation; unverified output labelled | AI-safety layer |
| Secret leakage to the browser | Provider + service-role keys are server-only; only `NEXT_PUBLIC_*` exposed | Server Actions, env handling |
| Abuse / cost blowout on AI actions | Per-action-type rate limiting | AI action wrappers |
| Malicious file upload | Size caps (20 MB local / 50 MB by URL), defensive parsing | upload handlers |

---

## Reporting a vulnerability

If you find a security issue, please **do not open a public issue**. Email the maintainer at the address in the app footer / `NEXT_PUBLIC_SUPPORT_EMAIL` with:

- a description of the issue and its impact,
- steps to reproduce, and
- any relevant logs or proof-of-concept.

You'll get an acknowledgement, and we'll work with you on a fix and disclosure timeline. Nora is a non-commercial educational project maintained by a small team, so please allow reasonable time to respond.
