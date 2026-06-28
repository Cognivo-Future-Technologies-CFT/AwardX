-- Migration 038: Intelligence job queue and profile enhancements

create table if not exists public.intelligence_jobs (
  id                uuid default uuid_generate_v4() primary key,
  job_type          text not null,
  person_profile_id uuid references public.person_profiles(id) on delete cascade,
  submission_id     uuid references public.submissions(id) on delete cascade,
  payload           jsonb default '{}',
  status            text not null default 'pending',
  error             text,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  completed_at      timestamptz
);

alter table public.intelligence_jobs
  drop constraint if exists intelligence_jobs_status_check;

alter table public.intelligence_jobs
  add constraint intelligence_jobs_status_check
  check (status in ('pending', 'processing', 'completed', 'failed'));

alter table public.intelligence_jobs
  drop constraint if exists intelligence_jobs_type_check;

alter table public.intelligence_jobs
  add constraint intelligence_jobs_type_check
  check (job_type in ('footprint_collect', 'claim_verify', 'profile_rebuild'));

create index if not exists idx_intelligence_jobs_status
  on public.intelligence_jobs (status, created_at);

create index if not exists idx_intelligence_jobs_person
  on public.intelligence_jobs (person_profile_id);

alter table public.intelligence_jobs enable row level security;

drop policy if exists intelligence_jobs_service on public.intelligence_jobs;
create policy intelligence_jobs_service
  on public.intelligence_jobs for all
  using (true)
  with check (true);

grant all on public.intelligence_jobs to service_role;
