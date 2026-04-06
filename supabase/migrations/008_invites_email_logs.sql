begin;

create table if not exists public.email_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id),
  program_id uuid references public.programs(id),
  invite_id uuid references public.organization_invites(id),
  recipient_email character varying not null,
  template_key character varying not null,
  template_version character varying default 'v1',
  context_json jsonb default '{}'::jsonb,
  resend_message_id character varying,
  status character varying not null default 'pending',
  error_message text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint email_logs_status_check check (status in ('pending', 'sent', 'delivered', 'bounced', 'complained', 'failed'))
);

create index if not exists idx_email_logs_org_created on public.email_logs(organization_id, created_at desc);
create index if not exists idx_email_logs_program_created on public.email_logs(program_id, created_at desc);
create index if not exists idx_email_logs_recipient on public.email_logs(recipient_email);
create index if not exists idx_email_logs_status_created on public.email_logs(status, created_at desc);
create index if not exists idx_email_logs_resend_message_id on public.email_logs(resend_message_id);

alter table if exists public.email_logs enable row level security;

create policy if not exists email_logs_org_member_read on public.email_logs
for select
to authenticated
using (organization_id in (select public.current_org_ids()));

create policy if not exists email_logs_org_member_insert on public.email_logs
for insert
to authenticated
with check (organization_id in (select public.current_org_ids()));

create policy if not exists email_logs_org_member_update on public.email_logs
for update
to authenticated
using (organization_id in (select public.current_org_ids()))
with check (organization_id in (select public.current_org_ids()));

create index if not exists idx_org_invites_org_program_status on public.organization_invites(organization_id, program_id, status);
create index if not exists idx_org_invites_email_status on public.organization_invites(email, status);

commit;