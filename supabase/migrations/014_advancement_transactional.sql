-- Migration 014: transactional advancement execution
-- Wrap core advancement writes in one transaction-safe RPC.

create or replace function public.execute_round_advancement_tx(
  p_round_id uuid,
  p_target_round_id uuid,
  p_trigger_type text,
  p_transition_triggered_by text,
  p_executed_by uuid,
  p_criteria_used jsonb,
  p_total_participants integer,
  p_had_ties boolean,
  p_tie_resolution jsonb,
  p_advanced jsonb,
  p_eliminated jsonb,
  p_enrollments jsonb,
  p_audit_details text,
  p_audit_metadata jsonb
)
returns table (
  event_id uuid,
  advanced_count integer,
  eliminated_count integer
)
language plpgsql
as $$
declare
  v_round record;
  v_event_id uuid;
begin
  -- Atomic lock: only one advancement can move a completed round to finalized.
  update public.rounds
  set is_finalized = true
  where id = p_round_id
    and status = 'completed'
    and coalesce(is_finalized, false) = false
  returning id, program_id, title, type into v_round;

  if not found then
    raise exception 'Round is already being advanced or finalized.';
  end if;

  insert into public.advancement_events (
    round_id,
    target_round_id,
    trigger_type,
    criteria_used,
    total_participants,
    advanced_count,
    eliminated_count,
    had_ties,
    tie_resolution,
    executed_by
  )
  values (
    p_round_id,
    p_target_round_id,
    p_trigger_type,
    coalesce(p_criteria_used, '{}'::jsonb),
    coalesce(p_total_participants, 0),
    jsonb_array_length(coalesce(p_advanced, '[]'::jsonb)),
    jsonb_array_length(coalesce(p_eliminated, '[]'::jsonb)),
    coalesce(p_had_ties, false),
    p_tie_resolution,
    p_executed_by
  )
  returning id into v_event_id;

  insert into public.advancement_details (
    advancement_event_id,
    submission_id,
    outcome,
    rank,
    score,
    vote_count,
    was_at_cutoff_boundary,
    override_reason
  )
  select
    v_event_id,
    row_data.submission_id,
    row_data.outcome,
    row_data.rank,
    row_data.score,
    row_data.vote_count,
    coalesce(row_data.was_at_cutoff_boundary, false),
    row_data.override_reason
  from jsonb_to_recordset(coalesce(p_advanced, '[]'::jsonb)) as row_data(
    submission_id uuid,
    outcome text,
    rank integer,
    score numeric,
    vote_count integer,
    was_at_cutoff_boundary boolean,
    override_reason text
  );

  insert into public.advancement_details (
    advancement_event_id,
    submission_id,
    outcome,
    rank,
    score,
    vote_count,
    was_at_cutoff_boundary,
    override_reason
  )
  select
    v_event_id,
    row_data.submission_id,
    row_data.outcome,
    row_data.rank,
    row_data.score,
    row_data.vote_count,
    coalesce(row_data.was_at_cutoff_boundary, false),
    row_data.override_reason
  from jsonb_to_recordset(coalesce(p_eliminated, '[]'::jsonb)) as row_data(
    submission_id uuid,
    outcome text,
    rank integer,
    score numeric,
    vote_count integer,
    was_at_cutoff_boundary boolean,
    override_reason text,
    elimination_reason text
  );

  update public.round_submissions as rs
  set
    status = 'advanced',
    advanced_at = now(),
    eliminated_at = null,
    elimination_reason = null
  from jsonb_to_recordset(coalesce(p_advanced, '[]'::jsonb)) as row_data(submission_id uuid)
  where rs.round_id = p_round_id
    and rs.submission_id = row_data.submission_id;

  update public.round_submissions as rs
  set
    status = 'eliminated',
    eliminated_at = now(),
    advanced_at = null,
    elimination_reason = row_data.elimination_reason
  from jsonb_to_recordset(coalesce(p_eliminated, '[]'::jsonb)) as row_data(
    submission_id uuid,
    outcome text,
    rank integer,
    score numeric,
    vote_count integer,
    was_at_cutoff_boundary boolean,
    override_reason text,
    elimination_reason text
  )
  where rs.round_id = p_round_id
    and rs.submission_id = row_data.submission_id;

  if lower(coalesce(v_round.type, '')) = 'shortlisting' then
    update public.submissions
    set status = 'shortlisted'
    where id in (
      select row_data.submission_id
      from jsonb_to_recordset(coalesce(p_advanced, '[]'::jsonb)) as row_data(submission_id uuid)
    );
  end if;

  insert into public.round_submissions (
    round_id,
    submission_id,
    status,
    source_round_id,
    carried_score
  )
  select
    row_data.round_id,
    row_data.submission_id,
    coalesce(row_data.status, 'active'),
    row_data.source_round_id,
    row_data.carried_score
  from jsonb_to_recordset(coalesce(p_enrollments, '[]'::jsonb)) as row_data(
    round_id uuid,
    submission_id uuid,
    status text,
    source_round_id uuid,
    carried_score numeric
  )
  on conflict (round_id, submission_id) do update
  set
    status = excluded.status,
    source_round_id = excluded.source_round_id,
    carried_score = excluded.carried_score,
    advanced_at = null,
    eliminated_at = null,
    elimination_reason = null;

  insert into public.round_transitions (
    round_id,
    from_status,
    to_status,
    triggered_by,
    metadata
  )
  values (
    p_round_id,
    'completed',
    'finalized',
    coalesce(p_transition_triggered_by, 'admin'),
    jsonb_build_object('advancement_event_id', v_event_id, 'is_finalized', true)
  );

  insert into public.audit_logs (
    action,
    action_type,
    resource_type,
    resource_id,
    details,
    metadata
  )
  values (
    'Advanced participants',
    'advancement',
    'round',
    p_round_id,
    coalesce(p_audit_details, 'Advanced participants'),
    coalesce(p_audit_metadata, '{}'::jsonb) || jsonb_build_object('event_id', v_event_id)
  );

  return query
  select
    v_event_id,
    jsonb_array_length(coalesce(p_advanced, '[]'::jsonb)),
    jsonb_array_length(coalesce(p_eliminated, '[]'::jsonb));
end;
$$;
