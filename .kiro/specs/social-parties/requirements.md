# Requirements Document

## Introduction

Social & Parties adds cooperative study groups to Pixel Study OS. Small parties (3–5 members) share weekly quests, cheer each other on, and convert missed study days into collaborative "help me" quests rather than punishing individual streak resets. The feature reinforces the app's gentle-motivation philosophy by leveraging relatedness (self-determination theory) and cooperative accountability over competition.

## Glossary

- **Party**: A named group of 3–5 users who share weekly quests and social interactions within Pixel Study OS.
- **Party_Owner**: The user who created the Party and holds administrative privileges such as updating settings or disbanding the Party.
- **Party_Member**: A user who has joined a Party and participates in shared quests and social interactions.
- **Party_Quest**: A shared weekly goal assigned to an entire Party that aggregates individual member contributions toward a collective target.
- **Help_Quest**: A special Party_Quest automatically generated when a Party_Member misses consecutive study days, requesting cooperative assistance from the group.
- **Cheer**: A lightweight emoji-based reaction that a Party_Member sends to acknowledge another member's progress or encourage them.
- **Party_Message**: A short text message (up to 200 characters) posted within a Party for soft social communication.
- **Party_Visibility**: A setting that determines whether a Party is discoverable by non-members; values are "public" (searchable) or "private" (invite-only).
- **Contribution**: A measurable study action (card review, Feynman session, study session) that counts toward a Party_Quest target.
- **Weekly_Cycle**: The recurring 7-day period (Monday 00:00 to Sunday 23:59 in the Party_Owner's timezone) during which Party_Quests are active. The cycle boundary is computed relative to the Party_Owner's timezone and stored as explicit cycle_start and cycle_end timestamps per Party.
- **Party_System**: The server-side module responsible for managing Party state, membership, quests, and social interactions.
- **Invite_Code**: A unique alphanumeric code generated for a private Party that allows users to join without a public listing.

## Requirements

### Requirement 1: Party Creation

**User Story:** As a student, I want to create a study party, so that I can form a small cooperative group with friends for mutual accountability.

#### Acceptance Criteria

1. WHEN a user submits a party creation form with a name and a visibility setting of either "public" or "private", THE Party_System SHALL create a new Party with the user as Party_Owner and sole initial Party_Member.
2. THE Party_System SHALL enforce a party name length between 3 and 30 characters inclusive, allowing only alphanumeric characters, spaces, hyphens, and underscores.
3. IF a user submits a party creation form with a name that violates the length or character constraints, THEN THE Party_System SHALL reject the request and return an error message indicating which validation rule was violated.
4. THE Party_System SHALL restrict each user to owning at most 1 Party at a time.
5. THE Party_System SHALL restrict each user to being a Party_Member of at most 1 Party at a time (including owned parties).
6. WHEN a private Party is created, THE Party_System SHALL generate a unique alphanumeric Invite_Code of at least 8 characters for sharing.
7. IF a user attempts to create a Party while already a Party_Member of another Party, THEN THE Party_System SHALL reject the request and return an error message indicating the user must leave their current Party first.

### Requirement 2: Joining a Party

**User Story:** As a student, I want to join an existing study party, so that I can participate in shared goals with other students.

#### Acceptance Criteria

1. WHEN a user submits an Invite_Code that matches an existing private Party, has not expired (within 7 days of generation), and the Party has fewer than 5 Party_Members, THE Party_System SHALL add the user as a Party_Member of that Party.
2. WHEN a user selects a public Party from the discovery list and confirms joining, THE Party_System SHALL add the user as a Party_Member.
3. IF a user attempts to join a Party that already has 5 Party_Members, THEN THE Party_System SHALL reject the request and inform the user that the Party is full.
4. IF a user attempts to join a Party while already a member of another Party, THEN THE Party_System SHALL reject the request and inform the user they must leave their current Party first.
5. WHEN a user successfully joins a Party, THE Party_System SHALL display a non-blocking notification to each existing Party_Member on their next page load indicating the new member's display name.
6. IF a user submits an Invite_Code that does not match any Party, has expired, or belongs to a Party that has reached 5 Party_Members, THEN THE Party_System SHALL reject the request and display an error message indicating the code is invalid or expired.

### Requirement 3: Leaving a Party

**User Story:** As a student, I want to leave my current party, so that I can study independently or join a different group.

#### Acceptance Criteria

1. WHEN a Party_Member requests to leave a Party and confirms the action, THE Party_System SHALL remove the user from the Party within 5 seconds and revoke access to all Party data.
2. WHEN the Party_Owner leaves the Party AND other members remain, THE Party_System SHALL transfer ownership to the remaining Party_Member with the earliest join timestamp; IF two or more members share the same earliest join timestamp, THEN THE Party_System SHALL select the member whose user ID comes first in alphanumeric order.
3. WHEN the last Party_Member leaves a Party, THE Party_System SHALL permanently delete the Party record and all associated Party_Quests.
4. WHEN a Party_Member leaves during an active Weekly_Cycle, THE Party_System SHALL retain their contributions toward active Party_Quests for the remainder of that Weekly_Cycle.
5. WHEN a Party_Member successfully leaves a Party, THE Party_System SHALL notify all remaining Party_Members that the member has departed.
6. WHEN a Party_Member initiates a leave request, THE Party_System SHALL present a confirmation prompt before executing the removal.

### Requirement 4: Party Discovery

**User Story:** As a student, I want to browse available public parties, so that I can find a group with similar study interests.

#### Acceptance Criteria

1. WHEN a user opens the party discovery view, THE Party_System SHALL display a list of public Parties that have fewer than 5 Party_Members, sorted by most recently created first.
2. THE Party_System SHALL display each discoverable Party's name, current member count, and a quest summary consisting of the quest type and progress fraction for each active Party_Quest (maximum 3 quests shown).
3. THE Party_System SHALL limit discovery results to 20 Parties per page and support pagination with next and previous page navigation.
4. WHILE a user is already a Party_Member, THE Party_System SHALL hide the join action on discovery results and display the user's current Party name and member count at the top of the discovery view.
5. IF no public Parties with available capacity exist, THEN THE Party_System SHALL display an empty-state message indicating no parties are available and prompt the user to create a new Party.

### Requirement 5: Shared Weekly Quests

**User Story:** As a party member, I want to work toward shared weekly goals with my group, so that we stay motivated and accountable together.

#### Acceptance Criteria

1. WHEN a new Weekly_Cycle begins, THE Party_System SHALL generate between 1 and 3 Party_Quests for the Party based on the templates selected by the Party_Owner, where each template defines a quest type and a target value within the allowed range for that type.
2. THE Party_System SHALL support quest types that track total cards reviewed (target range: 10 to 1000), total Feynman sessions completed (target range: 5 to 200), and total study session minutes (target range: 30 to 5000) across all Party_Members.
3. WHEN a Party_Member completes a study action that matches an active Party_Quest type, THE Party_System SHALL increment the Party_Quest progress by 1 unit per card reviewed, 1 unit per Feynman session completed, or the actual number of minutes per study session completed.
4. THE Party_System SHALL display each Party_Quest's current progress as a fraction of the target (e.g., "47 / 100 cards reviewed").
5. WHEN a Party_Quest reaches its target within the Weekly_Cycle, THE Party_System SHALL mark the quest as completed and award each Party_Member who contributed at least one Contribution a bonus of 50 XP and 25 coins per completed quest.
6. IF a Party_Quest is not completed by the end of the Weekly_Cycle, THEN THE Party_System SHALL archive the quest without deducting XP or coins from any Party_Member and begin the next cycle's quests.
7. IF the Party_Owner has not selected any quest templates when a new Weekly_Cycle begins, THEN THE Party_System SHALL skip quest generation for that cycle and display a notice to the Party_Owner prompting them to configure quest templates.

### Requirement 6: Help Me Quests

**User Story:** As a student who has missed study days, I want my party to receive a collaborative quest on my behalf, so that I get gentle support instead of punishment for falling behind.

#### Acceptance Criteria

1. WHEN a Party_Member has zero study sessions for 2 or more consecutive calendar days (evaluated at midnight in the Party_Owner's timezone), THE Party_System SHALL automatically generate a Help_Quest for that member's Party.
2. THE Party_System SHALL set the Help_Quest target to the missed member's average daily study sessions over the previous 14 active days multiplied by the number of missed days, with a minimum target of 1 session. IF the member has fewer than 14 active days of history, THEN THE Party_System SHALL compute the average using all available active days.
3. THE Party_System SHALL allow all Party_Members (including the missed member) to contribute toward the Help_Quest target.
4. WHEN a Help_Quest is completed, THE Party_System SHALL award the helped member a "Rescued" badge and award each contributing member bonus XP equal to 10 XP per session they contributed.
5. THE Party_System SHALL limit each Party to at most 2 active Help_Quests simultaneously to prevent quest overload.
6. IF a Party_Member has an active Help_Quest and misses additional days, THEN THE Party_System SHALL retain the existing Help_Quest without generating duplicates.
7. IF a Party already has 2 active Help_Quests and another Party_Member qualifies for a Help_Quest, THEN THE Party_System SHALL queue the new Help_Quest and generate it once an active slot becomes available.
8. IF a Help_Quest is not completed within 7 calendar days of generation, THEN THE Party_System SHALL archive the quest without penalty and free the active Help_Quest slot.
9. WHEN a Help_Quest is generated, THE Party_System SHALL notify all Party_Members that a teammate needs help, identifying the helped member by display name.

### Requirement 7: Cheer Reactions

**User Story:** As a party member, I want to send quick encouragement to my teammates, so that we maintain positive social energy without heavy communication overhead.

#### Acceptance Criteria

1. WHEN a Party_Member selects a cheer emoji and targets another Party_Member in the same Party, THE Party_System SHALL deliver the Cheer to the recipient.
2. THE Party_System SHALL provide a fixed set of 6 positive cheer emojis (e.g., fire, star, clap, heart, rocket, sparkles).
3. THE Party_System SHALL rate-limit Cheers to a maximum of 10 per sender per calendar day (computed in the Party_Owner's timezone) to prevent spam.
4. IF a Party_Member attempts to send a Cheer that would exceed the daily rate limit, THEN THE Party_System SHALL reject the Cheer and inform the sender that their daily limit has been reached.
5. WHEN a Party_Member receives one or more Cheers between page loads, THE Party_System SHALL display a non-blocking notification summarizing pending Cheers on the recipient's next page load that auto-dismisses after 5 seconds.
6. THE Party_System SHALL display the total Cheers received by each Party_Member for the current Weekly_Cycle on the party page.
7. IF a Party_Member attempts to send a Cheer to themselves, THEN THE Party_System SHALL reject the request and inform the sender that self-cheering is not permitted.

### Requirement 8: Party Messages

**User Story:** As a party member, I want to post short messages to my group, so that we can coordinate lightly without needing an external chat app.

#### Acceptance Criteria

1. WHEN a Party_Member submits a message, THE Party_System SHALL store the message and display it to all Party_Members on their next party page load or refresh.
2. THE Party_System SHALL enforce a minimum message length of 1 non-whitespace character and a maximum message length of 200 characters.
3. THE Party_System SHALL display the 20 most recent Party_Messages on the party page, ordered from newest to oldest.
4. THE Party_System SHALL display each Party_Message with the sender's display name and a relative timestamp (e.g., "2m ago", "3h ago", "yesterday").
5. THE Party_System SHALL rate-limit Party_Messages to a maximum of 20 per member per calendar day in the Party_Owner's timezone.
6. IF a Party_Member attempts to send a message after reaching the daily rate limit, THEN THE Party_System SHALL reject the message and inform the sender that they have reached the daily message limit.
7. IF a Party_Message contains prohibited content (server-side blocklist filter), THEN THE Party_System SHALL reject the message and inform the sender that the message was not posted due to content restrictions.

### Requirement 9: Party Page Interface

**User Story:** As a party member, I want a dedicated party page showing members, quests, and activity, so that I can track our collective progress at a glance.

#### Acceptance Criteria

1. WHEN a Party_Member navigates to the party page, THE Party_System SHALL display all current Party_Members with their display names and avatar thumbnails (maximum 32x32 pixels), ordered by join date (earliest first).
2. THE Party_System SHALL display all active Party_Quests with progress bars showing current progress as a fraction of the target (e.g., "47 / 100 cards reviewed") and percentage complete.
3. THE Party_System SHALL display all active Help_Quests with a distinct label identifying the helped member's display name and a visual badge distinguishing them from regular Party_Quests.
4. THE Party_System SHALL display the 20 most recent Party_Messages (as defined in Requirement 8) and the total Cheers received per Party_Member for the current Weekly_Cycle on the party page.
5. WHILE a user is not a member of any Party, THE Party_System SHALL display the party discovery view and party creation option instead of the member view.
6. WHEN a Party_Member navigates to the party page, THE Party_System SHALL render all page sections (members, quests, messages, cheers) within 3 seconds on a standard connection.

### Requirement 10: Party Presence in Pixel Room

**User Story:** As a student studying in my pixel room, I want to see which party members are also online, so that I feel connected to my group during study sessions.

#### Acceptance Criteria

1. WHILE a Party_Member has an active study session (from session start until session end or timeout), THE Party_System SHALL mark that member as "studying" for other Party_Members in the same Party.
2. WHEN Party_Members are marked as studying, THE Party_System SHALL display their avatar thumbnails (maximum 16x16 pixels) in the Pixel Room interface of other Party_Members.
3. WHEN a Party_Member starts or ends a study session, THE Party_System SHALL update the presence indicators visible to other Party_Members within 60 seconds. Presence is best-effort and not security-critical; brief delays or stale indicators are acceptable.
4. THE Party_System SHALL display a maximum of 4 party member presence indicators in the Pixel Room, prioritized by session start time (most recently started sessions shown first).
5. IF no Party_Members in the user's Party are currently marked as studying, THEN THE Party_System SHALL hide the presence indicator area in the Pixel Room rather than displaying an empty container.

### Requirement 11: Privacy and Data Access

**User Story:** As a student, I want my study data to remain private unless I explicitly share it through party mechanics, so that I feel safe using the social features.

#### Acceptance Criteria

1. THE Party_System SHALL restrict Party_Member access to only the following data about other members: per-member contribution counts toward active Party_Quests within the current Weekly_Cycle, Cheers received totals for the current Weekly_Cycle, presence status, display name, and avatar thumbnail.
2. THE Party_System SHALL prevent Party_Members from viewing another member's individual cards, explanations, subjects, session timestamps, session durations, or session details.
3. WHEN a user leaves a Party, THE Party_System SHALL remove all of that user's cheers and messages from the Party within the next Weekly_Cycle reset.
4. THE Party_System SHALL enforce Row Level Security policies so that Party data (quests, messages, cheers) is accessible only to current Party_Members.
5. THE Party_System SHALL ensure Invite_Codes expire after 7 days from generation and are single-use per user (a user cannot reuse the same code to rejoin after leaving), but multiple distinct users may use the same code within the validity window until the Party reaches capacity.
6. IF a user attempts to access Party data for a Party they are not a current member of, THEN THE Party_System SHALL deny the request and return an error message indicating insufficient access.

### Requirement 12: Party Administration

**User Story:** As a party owner, I want to manage my party's settings and members, so that I can maintain a positive and focused study group.

#### Acceptance Criteria

1. WHEN the Party_Owner updates the Party name or visibility setting, THE Party_System SHALL validate the new name against the same constraints (3–30 characters) and apply the changes within 2 seconds of submission.
2. WHEN the Party_Owner removes a Party_Member, THE Party_System SHALL remove that member, revoke their access to Party data, retain their contributions toward active Party_Quests for the remainder of the Weekly_Cycle, and display a notification to the removed member on their next page load indicating they were removed from the Party.
3. WHEN the Party_Owner regenerates the Invite_Code, THE Party_System SHALL invalidate the previous code and generate a new one with a fresh 7-day expiration window.
4. IF a user who is not the Party_Owner attempts an administrative action (remove member, update settings, regenerate invite code, disband), THEN THE Party_System SHALL reject the request and return an error message indicating insufficient permissions.
5. WHEN the Party_Owner disbands the Party, THE Party_System SHALL notify all Party_Members of the disbandment, remove all members, soft-delete the Party record (retaining quest history for analytics), and revoke access to all Party data for former members.
