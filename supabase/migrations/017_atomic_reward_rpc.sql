-- ============================================================
-- Pixel Study OS – Atomic reward helpers (fix race conditions)
-- ============================================================
-- The read-modify-write pattern in gamification.ts and party-quests.ts
-- is susceptible to lost updates under concurrent requests.
-- These RPC functions use atomic SET col = col + N expressions.
-- ============================================================

-- 1. Atomic profile XP/coins increment.
-- Returns the updated row so the caller knows the new totals + level.
CREATE OR REPLACE FUNCTION public.increment_profile_rewards(
  p_user_id UUID,
  p_xp INTEGER,
  p_coins INTEGER
)
RETURNS TABLE (new_xp INTEGER, new_coins INTEGER, new_level INTEGER, old_level INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level INTEGER;
  v_new_xp INTEGER;
  v_new_coins INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Read the old level before the update
  SELECT level INTO v_old_level FROM profiles WHERE id = p_user_id;

  -- Atomic increment
  UPDATE profiles
  SET
    xp = xp + p_xp,
    coins = coins + p_coins,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING xp, coins INTO v_new_xp, v_new_coins;

  -- Compute new level from the updated XP
  v_new_level := floor(sqrt(v_new_xp::numeric / 50)) + 1;

  -- Update level if it changed
  IF v_new_level <> v_old_level THEN
    UPDATE profiles SET level = v_new_level WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT v_new_xp, v_new_coins, v_new_level, v_old_level;
END;
$$;

-- 2. Atomic pet affinity increment.
-- Clamps to [0, 100] and updates state accordingly.
CREATE OR REPLACE FUNCTION public.increment_pet_affinity(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_affinity INTEGER;
BEGIN
  UPDATE pets
  SET
    affinity = LEAST(100, GREATEST(0, affinity + p_amount)),
    state = CASE
      WHEN LEAST(100, GREATEST(0, affinity + p_amount)) > 70 THEN 'happy'
      WHEN LEAST(100, GREATEST(0, affinity + p_amount)) > 40 THEN 'neutral'
      ELSE 'sad'
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 3. Atomic party quest progress increment.
-- Returns the new progress and whether the quest was just completed.
CREATE OR REPLACE FUNCTION public.increment_quest_progress(
  p_quest_id UUID,
  p_amount INTEGER
)
RETURNS TABLE (new_progress INTEGER, target INTEGER, just_completed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_progress INTEGER;
  v_target INTEGER;
  v_old_status TEXT;
BEGIN
  -- Only increment active quests
  SELECT pq.progress, pq.target, pq.status
  INTO v_new_progress, v_target, v_old_status
  FROM party_quests pq
  WHERE pq.id = p_quest_id AND pq.status = 'active'
  FOR UPDATE;

  IF NOT FOUND OR v_old_status <> 'active' THEN
    RETURN QUERY SELECT 0, 0, FALSE;
    RETURN;
  END IF;

  v_new_progress := v_new_progress + p_amount;

  IF v_new_progress >= v_target THEN
    UPDATE party_quests
    SET progress = v_new_progress, status = 'completed', completed_at = now()
    WHERE id = p_quest_id;
    RETURN QUERY SELECT v_new_progress, v_target, TRUE;
  ELSE
    UPDATE party_quests
    SET progress = v_new_progress
    WHERE id = p_quest_id;
    RETURN QUERY SELECT v_new_progress, v_target, FALSE;
  END IF;
END;
$$;
