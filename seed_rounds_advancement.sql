-- Seed: Create 3 rounds for "test award" program and enroll all 100 submissions
-- with realistic advancement/elimination data for certificate generation testing.
--
-- Round 1 (Nomination): 100 enter → 70 advance, 30 eliminated
-- Round 2 (Shortlisting): 70 enter → 40 advance, 30 eliminated
-- Round 3 (Finals): 40 enter → 10 winners, 30 eliminated
--
-- Run AFTER seed_100_submissions.sql and seed_judge_scores.sql

DO $$
DECLARE
  v_program_id uuid;
  v_round1_id uuid;
  v_round2_id uuid;
  v_round3_id uuid;
  v_sub record;
  v_counter int := 0;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE lower(title) LIKE '%test award%' LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Program "test award" not found. Run seed_100_submissions.sql first.';
  END IF;

  -- Delete existing rounds for clean re-seed (optional, comment out if you want to keep existing)
  DELETE FROM public.round_submissions WHERE round_id IN (SELECT id FROM public.rounds WHERE program_id = v_program_id);

  -- Create Round 1: Nomination (if not exists)
  INSERT INTO public.rounds (program_id, title, type, status, sort_order, start_date, end_date)
  VALUES (v_program_id, 'Round 1 - Nomination', 'judging', 'completed', 1, now() - interval '30 days', now() - interval '20 days')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_round1_id;

  IF v_round1_id IS NULL THEN
    SELECT id INTO v_round1_id FROM public.rounds WHERE program_id = v_program_id AND sort_order = 1;
  END IF;

  -- Create Round 2: Shortlisting
  INSERT INTO public.rounds (program_id, title, type, status, sort_order, start_date, end_date)
  VALUES (v_program_id, 'Round 2 - Shortlisting', 'judging', 'completed', 2, now() - interval '19 days', now() - interval '10 days')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_round2_id;

  IF v_round2_id IS NULL THEN
    SELECT id INTO v_round2_id FROM public.rounds WHERE program_id = v_program_id AND sort_order = 2;
  END IF;

  -- Create Round 3: Finals
  INSERT INTO public.rounds (program_id, title, type, status, sort_order, start_date, end_date)
  VALUES (v_program_id, 'Round 3 - Finals', 'judging', 'completed', 3, now() - interval '9 days', now() - interval '1 day')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_round3_id;

  IF v_round3_id IS NULL THEN
    SELECT id INTO v_round3_id FROM public.rounds WHERE program_id = v_program_id AND sort_order = 3;
  END IF;

  -- Enroll all 100 submissions in Round 1
  -- First 70 advance, last 30 eliminated (ordered by submitted_at)
  v_counter := 0;
  FOR v_sub IN
    SELECT id FROM public.submissions
    WHERE program_id = v_program_id
    ORDER BY submitted_at ASC
    LIMIT 100
  LOOP
    v_counter := v_counter + 1;

    IF v_counter <= 70 THEN
      -- Advanced from Round 1
      INSERT INTO public.round_submissions (round_id, submission_id, status, enrolled_at, advanced_at)
      VALUES (v_round1_id, v_sub.id, 'advanced', now() - interval '30 days', now() - interval '20 days')
      ON CONFLICT (round_id, submission_id) DO UPDATE SET status = 'advanced', advanced_at = now() - interval '20 days';
    ELSE
      -- Eliminated in Round 1
      INSERT INTO public.round_submissions (round_id, submission_id, status, enrolled_at, eliminated_at, elimination_reason)
      VALUES (v_round1_id, v_sub.id, 'eliminated', now() - interval '30 days', now() - interval '20 days', 'Did not meet minimum score threshold')
      ON CONFLICT (round_id, submission_id) DO UPDATE SET status = 'eliminated', eliminated_at = now() - interval '20 days';
    END IF;
  END LOOP;

  -- Enroll top 70 in Round 2: 40 advance, 30 eliminated
  v_counter := 0;
  FOR v_sub IN
    SELECT id FROM public.submissions
    WHERE program_id = v_program_id
    ORDER BY submitted_at ASC
    LIMIT 70
  LOOP
    v_counter := v_counter + 1;

    IF v_counter <= 40 THEN
      INSERT INTO public.round_submissions (round_id, submission_id, status, enrolled_at, advanced_at, source_round_id)
      VALUES (v_round2_id, v_sub.id, 'advanced', now() - interval '19 days', now() - interval '10 days', v_round1_id)
      ON CONFLICT (round_id, submission_id) DO UPDATE SET status = 'advanced', advanced_at = now() - interval '10 days';
    ELSE
      INSERT INTO public.round_submissions (round_id, submission_id, status, enrolled_at, eliminated_at, source_round_id, elimination_reason)
      VALUES (v_round2_id, v_sub.id, 'eliminated', now() - interval '19 days', now() - interval '10 days', v_round1_id, 'Below shortlisting cutoff')
      ON CONFLICT (round_id, submission_id) DO UPDATE SET status = 'eliminated', eliminated_at = now() - interval '10 days';
    END IF;
  END LOOP;

  -- Enroll top 40 in Round 3: 10 winners, 30 eliminated
  v_counter := 0;
  FOR v_sub IN
    SELECT id FROM public.submissions
    WHERE program_id = v_program_id
    ORDER BY submitted_at ASC
    LIMIT 40
  LOOP
    v_counter := v_counter + 1;

    IF v_counter <= 10 THEN
      INSERT INTO public.round_submissions (round_id, submission_id, status, enrolled_at, advanced_at, source_round_id)
      VALUES (v_round3_id, v_sub.id, 'advanced', now() - interval '9 days', now() - interval '1 day', v_round2_id)
      ON CONFLICT (round_id, submission_id) DO UPDATE SET status = 'advanced', advanced_at = now() - interval '1 day';
    ELSE
      INSERT INTO public.round_submissions (round_id, submission_id, status, enrolled_at, eliminated_at, source_round_id, elimination_reason)
      VALUES (v_round3_id, v_sub.id, 'eliminated', now() - interval '9 days', now() - interval '1 day', v_round2_id, 'Did not qualify for final award')
      ON CONFLICT (round_id, submission_id) DO UPDATE SET status = 'eliminated', eliminated_at = now() - interval '1 day';
    END IF;
  END LOOP;

  RAISE NOTICE 'Seeded 3 rounds with advancement data: 10 winners, 30 merit (round 2), 30 merit (round 1), 30 participation-only';
END $$;
