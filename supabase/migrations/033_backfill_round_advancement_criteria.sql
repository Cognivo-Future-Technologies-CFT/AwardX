-- Backfill advancement_criteria from settings.shortlistConfig / settings.advancementCriteria
-- for rounds that still have the default all_pass value.

UPDATE public.rounds r
SET advancement_criteria = CASE
  WHEN LOWER(COALESCE(r.settings->>'type', r.type, '')) IN ('nomination', 'announce', 'announcement', 'submission')
    OR LOWER(COALESCE(r.type, '')) IN ('nomination', 'announce', 'announcement', 'submission')
  THEN '{"type": "all_pass"}'::jsonb

  WHEN r.settings->'advancementCriteria' IS NOT NULL
    AND (r.settings->'advancementCriteria'->>'type') IS NOT NULL
    AND (r.settings->'advancementCriteria'->>'type') <> 'all_pass'
  THEN r.settings->'advancementCriteria'

  WHEN COALESCE(r.settings->'shortlistConfig'->>'enabled', 'false') = 'true' THEN
    CASE COALESCE(r.settings->'shortlistConfig'->>'method', 'percentage')
      WHEN 'score_match' THEN jsonb_build_object(
        'type', 'score_threshold',
        'value', LEAST(100, GREATEST(0, COALESCE((r.settings->'shortlistConfig'->>'value')::int, 50)))
      )
      WHEN 'fixed_count' THEN jsonb_build_object(
        'type', 'top_n',
        'value', GREATEST(1, COALESCE((r.settings->'shortlistConfig'->>'value')::int, 1))
      )
      ELSE jsonb_build_object(
        'type', 'top_percent',
        'value', LEAST(100, GREATEST(1, COALESCE((r.settings->'shortlistConfig'->>'value')::int, 50)))
      )
    END

  WHEN LOWER(COALESCE(r.settings->>'type', r.type, '')) IN ('shortlisting', 'public voting', 'public rating', 'public', 'jury', 'hybrid')
    OR LOWER(COALESCE(r.type, '')) IN ('shortlisting', 'public voting', 'public rating', 'public', 'jury', 'hybrid')
  THEN jsonb_build_object('type', 'top_percent', 'value', 50)

  ELSE r.advancement_criteria
END
WHERE r.advancement_criteria IS NULL
   OR r.advancement_criteria = '{"type": "all_pass"}'::jsonb;

UPDATE public.rounds r
SET settings = jsonb_set(
  COALESCE(r.settings, '{}'::jsonb),
  '{advancementCriteria}',
  r.advancement_criteria,
  true
)
WHERE r.advancement_criteria IS NOT NULL
  AND (
    r.settings->'advancementCriteria' IS NULL
    OR r.settings->'advancementCriteria' = '{"type": "all_pass"}'::jsonb
    OR r.settings->'advancementCriteria' <> r.advancement_criteria
  );
