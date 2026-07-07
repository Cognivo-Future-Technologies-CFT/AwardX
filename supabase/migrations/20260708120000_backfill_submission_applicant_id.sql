-- Backfill applicant_id on submissions that have a matching profile email but no owner link.
UPDATE public.submissions s
SET applicant_id = p.id
FROM public.profiles p
WHERE s.applicant_id IS NULL
  AND s.applicant_email IS NOT NULL
  AND lower(trim(s.applicant_email)) = lower(trim(p.email));
