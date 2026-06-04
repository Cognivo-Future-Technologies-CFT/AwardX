-- Seed judge scores for all 100 cold-start submissions in "test award"
DO $$
DECLARE
  v_program_id uuid;
  v_round_id uuid;
  v_judge record;
  v_sub record;
  v_sj_id uuid;
  v_criterion record;
  v_score int;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE lower(title) LIKE '%test award%' LIMIT 1;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'Program not found'; END IF;

  -- Get the first round (Nomination) for this program
  SELECT id INTO v_round_id FROM public.rounds WHERE program_id = v_program_id ORDER BY sort_order LIMIT 1;

  -- Loop through each judge assigned to this program
  FOR v_judge IN SELECT id FROM public.judges WHERE program_id = v_program_id LOOP
    -- Loop through each submission
    FOR v_sub IN
      SELECT id FROM public.submissions
      WHERE program_id = v_program_id
      ORDER BY submitted_at
      LIMIT 100
    LOOP
      -- Create submission_judges assignment
      INSERT INTO public.submission_judges (submission_id, judge_id, status, completed_at, round_id)
      VALUES (v_sub.id, v_judge.id, 'completed', now(), v_round_id)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_sj_id;

      -- If assignment already existed, fetch it
      IF v_sj_id IS NULL THEN
        SELECT id INTO v_sj_id FROM public.submission_judges
        WHERE submission_id = v_sub.id AND judge_id = v_judge.id;
        -- Update status to completed
        UPDATE public.submission_judges SET status = 'completed', completed_at = now() WHERE id = v_sj_id;
      END IF;

      -- Score each criterion
      FOR v_criterion IN SELECT id, min_score, max_score FROM public.judging_criteria WHERE program_id = v_program_id LOOP
        v_score := v_criterion.min_score + floor(random() * (v_criterion.max_score - v_criterion.min_score + 1))::int;
        INSERT INTO public.scores (submission_judge_id, criterion_id, score)
        VALUES (v_sj_id, v_criterion.id, v_score)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Update average_score on submissions
  UPDATE public.submissions s
  SET average_score = sub_avg.avg_score,
      total_scores = sub_avg.cnt
  FROM (
    SELECT sj.submission_id,
           round(avg(sc.score)::numeric, 2) as avg_score,
           count(sc.id)::int as cnt
    FROM public.submission_judges sj
    JOIN public.scores sc ON sc.submission_judge_id = sj.id
    WHERE sj.submission_id IN (SELECT id FROM public.submissions WHERE program_id = v_program_id)
    GROUP BY sj.submission_id
  ) sub_avg
  WHERE s.id = sub_avg.submission_id;
END $$;
