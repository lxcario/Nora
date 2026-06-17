-- ============================================================
-- University Registry seed (Task 2.1)
-- Mirrors SEED_UNIVERSITIES in src/lib/academic/university-registry.ts
--
-- Launch target: Orta Doğu Teknik Üniversitesi (METU/ODTÜ),
-- Electrical & Electronics Engineering. All URLs verified against
-- official metu.edu.tr sources.
--
-- HOW TO RUN: paste into the Supabase SQL Editor AFTER applying
-- 007_university_onboarding.sql. Runs as the table owner, so the
-- authenticated-read/no-user-write RLS on the registry is bypassed.
-- Idempotent: re-running is a no-op once METU exists.
-- ============================================================

DO $$
DECLARE
  uni_id UUID;
  fac_id UUID;
BEGIN
  SELECT id INTO uni_id FROM universities WHERE primary_domain = 'metu.edu.tr' LIMIT 1;

  IF uni_id IS NULL THEN
    INSERT INTO universities
      (name, aliases, country, primary_domain, registrar_url, academic_calendar_url, timezone, locale, verified)
    VALUES (
      'Middle East Technical University',
      ARRAY['METU','ODTÜ','ODTU','Orta Doğu Teknik Üniversitesi','Orta Dogu Teknik Universitesi','Orta Doğu','Middle East Technical University (METU)'],
      'Turkey',
      'metu.edu.tr',
      'https://oidb.metu.edu.tr/en',
      'https://oidb.metu.edu.tr/en/academic-calendar',
      'Europe/Istanbul',
      'tr-TR',
      TRUE
    )
    RETURNING id INTO uni_id;

    INSERT INTO faculties (university_id, name, aliases, url)
    VALUES (
      uni_id,
      'Faculty of Engineering',
      ARRAY['Mühendislik Fakültesi','Muhendislik Fakultesi','Engineering'],
      'https://eng.metu.edu.tr/'
    )
    RETURNING id INTO fac_id;

    INSERT INTO programs
      (university_id, faculty_id, name, aliases, degree_level, curriculum_url, course_catalog_url, language)
    VALUES (
      uni_id,
      fac_id,
      'Electrical and Electronics Engineering',
      ARRAY['EEE','EE','Elektrik-Elektronik Mühendisliği','Elektrik Elektronik Muhendisligi','Electrical & Electronics Engineering','Electrical-Electronics Engineering'],
      'undergraduate',
      'https://catalog2.metu.edu.tr/',
      'https://catalog2.metu.edu.tr/',
      'en'
    );

    RAISE NOTICE 'Seeded METU/ODTÜ registry (university %, faculty %)', uni_id, fac_id;
  ELSE
    RAISE NOTICE 'METU already present (university %); skipping seed.', uni_id;
  END IF;
END $$;
