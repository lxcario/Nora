# Implementation Plan: Social Parties

## Overview

Implements cooperative study parties (3–5 members) with shared weekly quests, cheer reactions, messages, help quests, and Pixel Room presence. The implementation follows an incremental approach: database schema first, then core server actions, then quest logic, social features, UI components, and finally integration hooks into existing study actions.

## Tasks

- [x] 1. Database migration — schema, RLS, and indexes
  - [x] 1.1 Create Supabase migration file with party tables and constraints
    - Create `supabase/migrations/002_social_parties.sql`
    - Define `parties` table with all columns (id, owner_id, name, visibility, invite_code, invite_code_expires_at, timezone, cycle_start, cycle_end, quest_templates, last_help_check_at, deleted_at, created_at, updated_at)
    - Define `party_members` table with UNIQUE constraint on `user_id` (one party per user)
    - Define `party_quests` table with status enum, help quest columns, cycle timestamps
    - Define `party_messages` table with 1-200 char constraint on content
    - Define `party_cheers` table with emoji CHECK constraint for the 6 allowed values
    - Add all foreign key references to `auth.users`
    - _Requirements: 1.1, 1.2, 1.6, 2.1, 5.2, 7.2, 8.2_

  - [x] 1.2 Add RLS policies for all party tables
    - Enable RLS on all 5 tables
    - `parties`: members can SELECT own party, public parties visible for discovery, owner can UPDATE, authenticated users can INSERT
    - `party_members`: members can SELECT co-members, users can INSERT own membership, users can DELETE own row, owner can DELETE any member
    - `party_quests`: members can SELECT and UPDATE quests for their party
    - `party_messages`: members can SELECT, members can INSERT with sender_id = auth.uid()
    - `party_cheers`: members can SELECT, members can INSERT with sender_id = auth.uid()
    - _Requirements: 11.4, 11.6_

  - [x] 1.3 Add indexes for performance
    - `idx_parties_visibility` on parties (visibility, deleted_at) WHERE deleted_at IS NULL
    - `idx_parties_invite_code` on parties (invite_code) WHERE invite_code IS NOT NULL
    - `idx_party_members_party` on party_members (party_id)
    - `idx_party_members_user` on party_members (user_id)
    - `idx_party_quests_party_status` on party_quests (party_id, status)
    - `idx_party_quests_cycle` on party_quests (party_id, cycle_start, cycle_end)
    - `idx_party_messages_party_created` on party_messages (party_id, created_at DESC)
    - `idx_party_cheers_sender_date` on party_cheers (sender_id, created_at)
    - `idx_party_cheers_receiver_party` on party_cheers (receiver_id, party_id, created_at)
    - _Requirements: 4.1, 9.6_

- [x] 2. Core server actions — create, join, leave, discover
  - [x] 2.1 Create `party.ts` server action module with `createParty`
    - Create `src/app/(protected)/app/_actions/party.ts`
    - Implement `validatePartyName(name: string)` utility: 3-30 chars, only alphanumeric + space/hyphen/underscore
    - Implement `createParty({ name, visibility })`: validate name, check user not in a party, create party row with owner, insert party_members row with role='owner', generate invite code if private, compute initial cycle_start/cycle_end from user's timezone
    - Implement `generateInviteCode()`: 8-char alphanumeric random string
    - Return `{ data?: { partyId, inviteCode? }; error?: string }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 Implement `joinParty` (by invite code and by public discovery)
    - `joinPartyByCode(code: string)`: validate code exists, not expired (7 days), party not full (<5 members), user not in another party, insert membership
    - `joinPartyPublic(partyId: string)`: validate party is public, not full, user not in party, insert membership
    - On successful join, insert a notification-style message for existing members
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.3 Implement `leaveParty` with ownership transfer logic
    - Check user is a member, present confirmation requirement (client-side)
    - If user is owner and other members remain: transfer ownership to member with earliest `joined_at`; tiebreak by alphanumeric user_id
    - If user is last member: delete party record and associated quests
    - Retain departing member's quest contributions for the current cycle
    - Notify remaining members of departure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.4 Implement `discoverParties` with pagination
    - Query public parties with `deleted_at IS NULL` and member count < 5
    - Order by `created_at DESC`, limit 20 per page
    - For each party, include name, member count, and up to 3 active quest summaries (type + progress/target)
    - Return current page, total pages, and user's current party info if applicable
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.5 Implement `getPartyState` — main data fetch for party page
    - If user is not in a party, return `{ party: null }` (client renders discovery view)
    - If user is in a party, fetch: party details, members (with display_name, avatar, join date), active quests, help quests, recent 20 messages, cheer totals for current cycle, isOwner flag, invite code (owner only)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 2.6 Write property tests for party CRUD (Properties 1–5)
    - **Property 1: Party name validation accepts valid names and rejects invalid ones**
    - **Property 2: One party per user invariant**
    - **Property 3: Private party invite code format**
    - **Property 4: Invite code join validity**
    - **Property 5: Party capacity ceiling**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.3, 2.4, 2.6**

- [x] 3. Checkpoint — Verify database migration and core party actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Quest logic — weekly generation, progress tracking, help quests
  - [x] 4.1 Create `party-quests.ts` with weekly quest generation
    - Create `src/app/(protected)/app/_actions/party-quests.ts`
    - Implement `generateWeeklyQuests(partyId)`: read quest_templates from party, create 1-3 party_quest rows with cycle boundaries, validate targets within allowed ranges (cards: 10-1000, feynman: 5-200, minutes: 30-5000)
    - Implement `archiveExpiredQuests(partyId)`: mark active quests past cycle_end as 'archived'
    - Implement `advanceWeeklyCycle(partyId)`: compute new cycle_start/cycle_end, archive old quests, generate new ones
    - Skip generation if no templates configured (notify owner)
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

  - [x] 4.2 Implement `incrementQuestProgress` for study action tracking
    - `incrementQuestProgress(userId, actionType, amount)`: find user's party, find active quests matching type, increment progress
    - On progress reaching target: mark quest completed, set `completed_at`, award 50 XP + 25 coins to each contributing member (members with progress > 0)
    - Use a `party_quest_contributors` approach: track per-member contributions via a query on the existing action tables within the cycle window
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 4.3 Implement `checkAndGenerateHelpQuests`
    - Triggered on party page load, throttled by `last_help_check_at` (1 hour minimum)
    - For each member: count study_sessions in last N days, detect 2+ consecutive days with 0 sessions
    - Compute target: `max(1, ceil(avgDailySessions * missedDays))` using up to 14 active days of history
    - Respect max 2 active help quests per party, queue overflow
    - Skip if member already has an active help quest
    - Notify party members when help quest is generated
    - Archive help quests after 7 days without completion
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 4.4 Implement `getActiveQuests` for party page display
    - Return all active quests (regular + help) for user's party
    - Include progress, target, type, status, help quest metadata (helped member name)
    - _Requirements: 9.2, 9.3_

  - [ ]* 4.5 Write property tests for quest logic (Properties 10–16)
    - **Property 10: Quest generation from templates**
    - **Property 11: Quest progress increment correctness**
    - **Property 12: Quest completion awards correct bonus**
    - **Property 13: Expired quests incur no penalty**
    - **Property 14: Help quest generation trigger**
    - **Property 15: Help quest target calculation**
    - **Property 16: Help quest idempotence**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5, 5.6, 6.1, 6.2, 6.5, 6.6, 6.8**

- [x] 5. Social features — messages and cheers
  - [x] 5.1 Create `party-social.ts` with message actions
    - Create `src/app/(protected)/app/_actions/party-social.ts`
    - Implement `sendMessage(content)`: validate 1-200 chars, at least 1 non-whitespace, check blocklist, check daily rate limit (20/day in party timezone), insert message
    - Implement `getMessages(partyId)`: return 20 most recent messages with sender display_name and created_at for relative time rendering
    - Content blocklist: server-side word-boundary regex against blocked terms array
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 5.2 Implement cheer actions
    - Implement `sendCheer(receiverId, emoji)`: validate emoji in allowed set, reject self-cheer, check daily rate limit (10/day in party timezone), validate sender and receiver in same party, insert cheer
    - Implement `getCheers(partyId)`: return weekly cheer totals per member (receiver_id → count) for current cycle
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

  - [ ]* 5.3 Write property tests for social features (Properties 17–23)
    - **Property 17: Cheer delivery and self-cheer rejection**
    - **Property 18: Cheer emoji validation**
    - **Property 19: Cheer daily rate limit**
    - **Property 20: Cheer weekly totals accuracy**
    - **Property 21: Message validation**
    - **Property 22: Message ordering and limit**
    - **Property 23: Message daily rate limit**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6, 7.7, 8.2, 8.3, 8.5, 8.6, 8.7**

- [x] 6. Checkpoint — Verify quest logic and social features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Party page UI — discovery, member view, quests, messages
  - [x] 7.1 Create party route page (`/app/party`) with server component
    - Create `src/app/(protected)/app/party/page.tsx`
    - Server component that calls `getPartyState()`
    - If user not in party → render `<PartyDiscovery />`
    - If user in party → render `<PartyPage state={state} />`
    - _Requirements: 9.5_

  - [x] 7.2 Build `party-discovery.tsx` component
    - Create `src/app/(protected)/app/party/_components/party-discovery.tsx`
    - Display list of public parties (name, member count, quest summaries)
    - Pagination (next/prev) with 20 per page
    - "Join" button per party (hidden if user already in a party)
    - Show user's current party info at top if already in one
    - Empty state message + "Create Party" prompt when no results
    - Include `<JoinPartyDialog />` for invite code entry
    - Include `<CreatePartyForm />` for party creation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.3 Build `create-party-form.tsx` component
    - Create `src/app/(protected)/app/party/_components/create-party-form.tsx`
    - Form fields: name (text input, 3-30 chars), visibility (public/private toggle)
    - Client-side validation matching server rules
    - Display invite code on successful private party creation
    - Error display for validation failures
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 7.4 Build `party-page.tsx` main party view
    - Create `src/app/(protected)/app/party/_components/party-page.tsx`
    - Layout: members section, quests section, messages section, cheers section
    - Pass `PartyState` data to child components
    - Owner sees admin panel
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.5 Build `party-members.tsx` component
    - Create `src/app/(protected)/app/party/_components/party-members.tsx`
    - Display members with 32×32 avatar thumbnails, display names, ordered by join date
    - Show presence dot (green = studying) using `isStudying` field
    - Show contribution count per member for current cycle
    - _Requirements: 9.1, 10.2_

  - [x] 7.6 Build `party-quests.tsx` component
    - Create `src/app/(protected)/app/party/_components/party-quests.tsx`
    - Progress bars with fraction display (e.g., "47 / 100 cards reviewed") and percentage
    - Distinct styling for help quests (different label, helped member name badge)
    - Completed quest celebration state
    - _Requirements: 9.2, 9.3, 5.4_

  - [x] 7.7 Build `party-messages.tsx` component
    - Create `src/app/(protected)/app/party/_components/party-messages.tsx`
    - Display 20 most recent messages, newest first
    - Show sender display name + relative timestamp ("2m ago", "3h ago", "yesterday")
    - Message input with character counter (200 max)
    - Rate limit feedback display
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 7.8 Build `party-cheers.tsx` component
    - Create `src/app/(protected)/app/party/_components/party-cheers.tsx`
    - 6 emoji buttons (fire, star, clap, heart, rocket, sparkles) using Lucide icons or emoji characters
    - Target selector to pick which member to cheer
    - Weekly cheer totals per member display
    - Rate limit feedback
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [x] 7.9 Build `party-admin.tsx` owner settings panel
    - Create `src/app/(protected)/app/party/_components/party-admin.tsx`
    - Edit party name, toggle visibility
    - Regenerate invite code button (with confirmation)
    - Remove member buttons (with confirmation)
    - Disband party button (with confirmation)
    - Leave party button (available to all members)
    - _Requirements: 3.6, 12.1, 12.2, 12.3, 12.5_

- [x] 8. Admin server actions
  - [x] 8.1 Create `party-admin.ts` server action module
    - Create `src/app/(protected)/app/_actions/party-admin.ts`
    - Implement `updatePartySettings({ name?, visibility? })`: validate owner, validate name constraints, apply changes
    - Implement `removeMember(memberId)`: validate owner, remove member, retain quest contributions, notify removed member
    - Implement `regenerateInviteCode()`: validate owner, invalidate old code, generate new 8+ char code with 7-day expiry
    - Implement `disbandParty()`: validate owner, notify all members, remove all memberships, soft-delete party (set deleted_at)
    - All actions reject with "Insufficient permissions" if caller is not owner
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 8.2 Write property tests for admin and security (Properties 26–29)
    - **Property 26: Party data isolation via RLS**
    - **Property 27: Invite code expiration and reuse**
    - **Property 28: Invite code regeneration invalidates previous**
    - **Property 29: Admin actions restricted to owner**
    - **Validates: Requirements 11.1, 11.4, 11.5, 11.6, 12.3, 12.4**

- [x] 9. Checkpoint — Verify UI components and admin actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Pixel Room presence integration
  - [x] 10.1 Create `party-presence.ts` server action
    - Create `src/app/(protected)/app/_actions/party-presence.ts`
    - Implement `getPartyPresence()`: find user's party, query `study_sessions` for members with active sessions (ended_at IS NULL, started_at within last 2 hours), return up to 4 members ordered by started_at DESC (most recent first)
    - Update `last_seen_at` on party_members when user loads room or party page
    - Return `{ members: { userId, displayName, avatarThumbnail, startedAt }[] }`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 10.2 Add presence indicators to Pixel Room UI
    - Modify `src/app/(protected)/app/room/` to call `getPartyPresence()`
    - Display up to 4 party member 16×16 avatar thumbnails when studying
    - Hide presence area entirely when no members are studying
    - Poll or refresh presence on room page load
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

  - [ ]* 10.3 Write property tests for presence (Properties 24–25)
    - **Property 24: Presence reflects active study sessions**
    - **Property 25: Presence limited to 4, ordered by recency**
    - **Validates: Requirements 10.1, 10.4**

- [x] 11. Integration with existing study actions
  - [x] 11.1 Hook quest progress into `submitReview` (card reviews)
    - Modify `src/app/(protected)/app/_actions/review.ts`
    - After successful review, call `incrementQuestProgress(userId, 'cards_reviewed', 1)`
    - Import incrementQuestProgress dynamically to avoid circular deps
    - _Requirements: 5.3_

  - [x] 11.2 Hook quest progress into `evaluateExplanation` (Feynman sessions)
    - Modify `src/app/(protected)/app/_actions/feynman.ts`
    - After successful explanation save, call `incrementQuestProgress(userId, 'feynman_sessions', 1)`
    - _Requirements: 5.3_

  - [x] 11.3 Hook quest progress into study session completion
    - Identify or create the study session completion action
    - After session ends with duration, call `incrementQuestProgress(userId, 'study_minutes', durationMinutes)`
    - _Requirements: 5.3_

  - [x] 11.4 Add party route to sidebar navigation
    - Modify `src/app/(protected)/app/_components/sidebar.tsx`
    - Add `{ href: "/app/party", label: "Party", icon: Users }` to navItems array (between Analytics and Settings)
    - Import `Users` icon from lucide-react
    - _Requirements: 9.5_

  - [ ]* 11.5 Write property tests for ownership transfer (Property 6–7)
    - **Property 6: Ownership transfer on owner departure**
    - **Property 7: Contributions preserved after member departure**
    - **Validates: Requirements 3.2, 3.4, 12.2**

  - [ ]* 11.6 Write property tests for discovery (Properties 8–9)
    - **Property 8: Discovery returns only eligible public parties**
    - **Property 9: Discovery result data completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (29 total)
- Unit tests validate specific examples and edge cases
- The design specifies polling (60s) for presence rather than Supabase Realtime — keep it simple
- Quest progress integration uses dynamic imports to avoid circular dependencies between action modules
- Weekly cycle boundaries use the party owner's timezone from their profile
- Help quest evaluation happens on party page load (throttled to 1 check/hour) — no cron needed
- Blocklist filtering uses simple word-boundary regex on a server-side array

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.6", "4.1", "5.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.3"] },
    { "id": 5, "tasks": ["4.5", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "8.1"] },
    { "id": 7, "tasks": ["7.5", "7.6", "7.7", "7.8", "7.9", "8.2"] },
    { "id": 8, "tasks": ["10.1", "11.1", "11.2", "11.3", "11.4"] },
    { "id": 9, "tasks": ["10.2", "10.3", "11.5", "11.6"] }
  ]
}
```
