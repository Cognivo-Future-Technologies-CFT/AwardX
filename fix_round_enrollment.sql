-- Fix: Enroll submissions into the round and link judge scores to the correct round_id
-- Use the actual round UUID from the URL error: 6d14d29a-9c26-4141-8ab4-587027dd85d0
DO $$
DECLARE
  v_round_id uuid := '6d14d29a-9c26-4141-8ab4-587027dd85d0';
  v_program_id uuid;
BEGIN
  -- Get program from round
  SELECT program_id INTO v_program_id FROM public.rounds WHERE id = v_round_id;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'Round not found'; END IF;

  -- 1. Enroll all program submissions into this round (if not already)
  INSERT INTO public.round_submissions (round_id, submission_id, status)
  SELECT v_round_id, s.id, 'active'
  FROM public.submissions s
  WHERE s.program_id = v_program_id
  ON CONFLICT (round_id, submission_id) DO NOTHING;

  -- 2. Update submission_judges to reference this round
  UPDATE public.submission_judges sj
  SET round_id = v_round_id
  WHERE sj.submission_id IN (SELECT id FROM public.submissions WHERE program_id = v_program_id)
    AND (sj.round_id IS NULL OR sj.round_id != v_round_id);

  RAISE NOTICE 'Done. Enrolled submissions and linked judges to round %', v_round_id;
END $$;
