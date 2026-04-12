-- Migration 012: Enable RLS and add policies for tables created in 007_round_pipeline
-- Fixes 404 errors on round_submissions (and other 007 tables) caused by
-- missing RLS policies — PostgREST hides tables that have RLS enabled at
-- the project level but no matching policies.

begin;

-- =========================================================
-- Enable RLS on all tables from migration 007
-- =========================================================
alter table if exists public.round_submissions    enable row level security;
alter table if exists public.voting_configs       enable row level security;
alter table if exists public.advancement_events   enable row level security;
alter table if exists public.advancement_details  enable row level security;

-- =========================================================
-- round_submissions
-- Access scoped through rounds → programs → organization
-- =========================================================
create policy if not exists round_submissions_org_member_rw on public.round_submissions
for all
to authenticated
using (
  exists (
    select 1
    from public.rounds r
    join public.programs p on p.id = r.program_id
    where r.id = round_submissions.round_id
      and p.organization_id in (select public.current_org_ids())
  )
)
with check (
  exists (
    select 1
    from public.rounds r
    join public.programs p on p.id = r.program_id
    where r.id = round_submissions.round_id
      and p.organization_id in (select public.current_org_ids())
  )
);

-- =========================================================
-- voting_configs
-- Access scoped through rounds → programs → organization
-- =========================================================
create policy if not exists voting_configs_org_member_rw on public.voting_configs
for all
to authenticated
using (
  exists (
    select 1
    from public.rounds r
    join public.programs p on p.id = r.program_id
    where r.id = voting_configs.round_id
      and p.organization_id in (select public.current_org_ids())
  )
)
with check (
  exists (
    select 1
    from public.rounds r
    join public.programs p on p.id = r.program_id
    where r.id = voting_configs.round_id
      and p.organization_id in (select public.current_org_ids())
  )
);

-- =========================================================
-- advancement_events
-- Access scoped through rounds → programs → organization
-- =========================================================
create policy if not exists advancement_events_org_member_rw on public.advancement_events
for all
to authenticated
using (
  exists (
    select 1
    from public.rounds r
    join public.programs p on p.id = r.program_id
    where r.id = advancement_events.round_id
      and p.organization_id in (select public.current_org_ids())
  )
)
with check (
  exists (
    select 1
    from public.rounds r
    join public.programs p on p.id = r.program_id
    where r.id = advancement_events.round_id
      and p.organization_id in (select public.current_org_ids())
  )
);

-- =========================================================
-- advancement_details
-- Access scoped through advancement_events → rounds → programs → organization
-- =========================================================
create policy if not exists advancement_details_org_member_rw on public.advancement_details
for all
to authenticated
using (
  exists (
    select 1
    from public.advancement_events ae
    join public.rounds r on r.id = ae.round_id
    join public.programs p on p.id = r.program_id
    where ae.id = advancement_details.advancement_event_id
      and p.organization_id in (select public.current_org_ids())
  )
)
with check (
  exists (
    select 1
    from public.advancement_events ae
    join public.rounds r on r.id = ae.round_id
    join public.programs p on p.id = r.program_id
    where ae.id = advancement_details.advancement_event_id
      and p.organization_id in (select public.current_org_ids())
  )
);

commit;
