-- Fix public_votes triggers that still reference dropped submissions.vote_count column.
-- The insert trigger update_submission_votes_count is redundant with the recount trigger.

CREATE OR REPLACE FUNCTION public.update_submission_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _submission_id uuid := COALESCE(NEW.submission_id, OLD.submission_id);
BEGIN
  UPDATE public.submissions
  SET votes_count = (
    SELECT COUNT(*)::integer
    FROM public.public_votes
    WHERE submission_id = _submission_id
  )
  WHERE id = _submission_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_submission_votes_count ON public.public_votes;

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
