begin;

create table if not exists public.invite_request_traces (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  path text not null,
  url text not null,
  method character varying not null default 'POST',
  attempt integer not null default 1,
  started_at timestamp with time zone not null,
  finished_at timestamp with time zone not null,
  http_status integer,
  ok boolean not null default false,
  error_message text,
  request_body jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint invite_request_traces_method_check check (method in ('POST')),
  constraint invite_request_traces_attempt_check check (attempt >= 1)
);

create index if not exists idx_inv_req_traces_org_program_created
  on public.invite_request_traces(organization_id, program_id, created_at desc);

create index if not exists idx_inv_req_traces_created
  on public.invite_request_traces(created_at desc);

alter table if exists public.invite_request_traces enable row level security;

drop policy if exists invite_request_traces_org_member_read on public.invite_request_traces;

create policy invite_request_traces_org_member_read on public.invite_request_traces
for select
to authenticated
using (organization_id in (select public.current_org_ids()));

drop policy if exists invite_request_traces_org_member_insert on public.invite_request_traces;

create policy invite_request_traces_org_member_insert on public.invite_request_traces
for insert
to authenticated
with check (organization_id in (select public.current_org_ids()));

drop policy if exists invite_request_traces_org_member_delete on public.invite_request_traces;

create policy invite_request_traces_org_member_delete on public.invite_request_traces
for delete
to authenticated
using (organization_id in (select public.current_org_ids()));

commit;
