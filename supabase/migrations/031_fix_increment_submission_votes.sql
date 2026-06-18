-- Fix vote increment function to use votes_count (vote_count column was dropped).

CREATE OR REPLACE FUNCTION public.increment_submission_votes(submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.submissions
  SET votes_count = COALESCE(votes_count, 0) + 1
  WHERE id = submission_id;
END;
$$;
