-- Comprehensive fix for round 6d14d29a-9c26-4141-8ab4-587027dd85d0
-- Run each section separately to diagnose

-- 1. Check round status (must be 'completed')
SELECT id, title, type, status, is_finalized, program_id
FROM public.rounds
WHERE id = '6d14d29a-9c26-4141-8ab4-587027dd85d0';

-- 2. Force round to 'completed' if it's not
UPDATE public.rounds
SET status = 'completed'
WHERE id = '6d14d29a-9c26-4141-8ab4-587027dd85d0'
  AND status != 'completed';

-- 3. Check enrollment count
SELECT count(*) as enrolled
FROM public.round_submissions
WHERE round_id = '6d14d29a-9c26-4141-8ab4-587027dd85d0'
  AND status = 'active';

-- 4. Enroll submissions if missing
INSERT INTO public.round_submissions (round_id, submission_id, status)
SELECT '6d14d29a-9c26-4141-8ab4-587027dd85d0', s.id, 'active'
FROM public.submissions s
WHERE s.program_id = (SELECT program_id FROM public.rounds WHERE id = '6d14d29a-9c26-4141-8ab4-587027dd85d0')
ON CONFLICT (round_id, submission_id) DO NOTHING;

-- 5. Check if submission_judges are linked to this round
SELECT count(*) as judge_assignments
FROM public.submission_judges
WHERE round_id = '6d14d29a-9c26-4141-8ab4-587027dd85d0'
  AND status = 'completed';

-- 6. Fix: link all submission_judges for this program to this round
UPDATE public.submission_judges sj
SET round_id = '6d14d29a-9c26-4141-8ab4-587027dd85d0'
WHERE sj.submission_id IN (
  SELECT id FROM public.submissions
  WHERE program_id = (SELECT program_id FROM public.rounds WHERE id = '6d14d29a-9c26-4141-8ab4-587027dd85d0')
);

-- 7. Verify scores exist for these assignments
SELECT count(*) as total_scores
FROM public.scores sc
JOIN public.submission_judges sj ON sj.id = sc.submission_judge_id
WHERE sj.round_id = '6d14d29a-9c26-4141-8ab4-587027dd85d0';
