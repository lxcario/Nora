-- ============================================================
-- Pixel Study OS – Seed Data (for local development)
-- Run this AFTER authenticating a test user so auth.uid() exists.
-- Replace the UUID below with your test user's actual ID.
-- ============================================================

-- NOTE: This seed expects a user to already exist in auth.users.
-- The profile trigger (handle_new_user) auto-creates the profile row.
-- Run these INSERT statements via the Supabase SQL Editor after signing up a test account.

-- Example: INSERT demo subjects and topics for the test user.
-- Uncomment and replace 'YOUR_USER_UUID' with the actual user id.

/*
DO $$
DECLARE
  test_user UUID := 'YOUR_USER_UUID';
  subj_cs UUID;
  subj_math UUID;
BEGIN
  -- Subjects
  INSERT INTO subjects (id, user_id, name, color)
  VALUES
    (gen_random_uuid(), test_user, 'Computer Science', '#6366f1')
  RETURNING id INTO subj_cs;

  INSERT INTO subjects (id, user_id, name, color)
  VALUES
    (gen_random_uuid(), test_user, 'Mathematics', '#ec4899')
  RETURNING id INTO subj_math;

  -- Topics
  INSERT INTO topics (user_id, subject_id, name, exam_date) VALUES
    (test_user, subj_cs, 'Data Structures', '2025-03-15'),
    (test_user, subj_cs, 'Algorithms', '2025-03-15'),
    (test_user, subj_math, 'Linear Algebra', '2025-04-01'),
    (test_user, subj_math, 'Calculus II', '2025-04-01');
END $$;
*/
