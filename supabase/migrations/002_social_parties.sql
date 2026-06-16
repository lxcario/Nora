-- ============================================================
-- Pixel Study OS – Social Parties Schema
-- Party tables with RLS: membership-based access control
-- ============================================================

-- ============================================================
-- 1. PARTIES
-- ============================================================
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 30),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  invite_code TEXT UNIQUE,
  invite_code_expires_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  quest_templates JSONB DEFAULT '[]',
  last_help_check_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. PARTY MEMBERS
-- ============================================================
CREATE TABLE party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_one_party UNIQUE (user_id)
);

-- ============================================================
-- 3. PARTY QUESTS
-- ============================================================
CREATE TABLE party_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('cards_reviewed', 'feynman_sessions', 'study_minutes')),
  target INTEGER NOT NULL CHECK (target > 0),
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  is_help_quest BOOLEAN DEFAULT false,
  helped_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 4. PARTY MESSAGES
-- ============================================================
CREATE TABLE party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 200),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. PARTY CHEERS
-- ============================================================
CREATE TABLE party_cheers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('fire', 'star', 'clap', 'heart', 'rocket', 'sparkles')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================

-- Party lookups
CREATE INDEX idx_parties_visibility ON parties (visibility, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_parties_invite_code ON parties (invite_code) WHERE invite_code IS NOT NULL;

-- Member lookups
CREATE INDEX idx_party_members_party ON party_members (party_id);
CREATE INDEX idx_party_members_user ON party_members (user_id);

-- Quest lookups
CREATE INDEX idx_party_quests_party_status ON party_quests (party_id, status);
CREATE INDEX idx_party_quests_cycle ON party_quests (party_id, cycle_start, cycle_end);

-- Message feed (newest first)
CREATE INDEX idx_party_messages_party_created ON party_messages (party_id, created_at DESC);

-- Cheer rate limiting & totals
CREATE INDEX idx_party_cheers_sender_date ON party_cheers (sender_id, created_at);
CREATE INDEX idx_party_cheers_receiver_party ON party_cheers (receiver_id, party_id, created_at);

-- ============================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- --- parties ---
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own party"
  ON parties FOR SELECT
  USING (
    deleted_at IS NULL AND (
      id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
      OR visibility = 'public'
    )
  );

CREATE POLICY "Authenticated users can create parties"
  ON parties FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update own party"
  ON parties FOR UPDATE
  USING (owner_id = auth.uid());

-- --- party_members ---
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view party members"
  ON party_members FOR SELECT
  USING (
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System inserts members via server actions"
  ON party_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own membership"
  ON party_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Owner can remove members"
  ON party_members FOR DELETE
  USING (
    party_id IN (
      SELECT id FROM parties
      WHERE owner_id = auth.uid()
    )
  );

-- --- party_quests ---
ALTER TABLE party_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view party quests"
  ON party_quests FOR SELECT
  USING (
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update quest progress"
  ON party_quests FOR UPDATE
  USING (
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

-- --- party_messages ---
ALTER TABLE party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view party messages"
  ON party_messages FOR SELECT
  USING (
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert messages"
  ON party_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

-- --- party_cheers ---
ALTER TABLE party_cheers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view party cheers"
  ON party_cheers FOR SELECT
  USING (
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert cheers"
  ON party_cheers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    party_id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid())
  );
