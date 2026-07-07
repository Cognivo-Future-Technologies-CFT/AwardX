-- Align public_votes uniqueness with product rules:
--   • Authenticated: one vote per (round, submission, user account)
--   • Anonymous: one vote per (round, submission, IP)
-- Drop legacy constraints that ignored round_id or blocked different accounts on the same IP.

ALTER TABLE public.public_votes
  DROP CONSTRAINT IF EXISTS public_votes_submission_id_ip_address_key;

ALTER TABLE public.public_votes
  DROP CONSTRAINT IF EXISTS public_votes_user_submission_unique;

DROP INDEX IF EXISTS public.public_votes_round_user_submission_unique;
DROP INDEX IF EXISTS public.public_votes_round_ip_submission_unique;

CREATE UNIQUE INDEX public_votes_round_user_submission_unique
  ON public.public_votes (round_id, submission_id, user_id)
  WHERE round_id IS NOT NULL
    AND user_id IS NOT NULL;

CREATE UNIQUE INDEX public_votes_round_ip_submission_unique
  ON public.public_votes (round_id, submission_id, ip_address)
  WHERE round_id IS NOT NULL
    AND user_id IS NULL
    AND ip_address IS NOT NULL;
