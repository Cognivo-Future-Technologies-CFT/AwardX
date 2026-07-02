-- Create audit logs table for Super Admin grants/revokes
create table if not exists public.super_admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    target_user_id uuid references public.profiles(id) on delete cascade not null,
    action text not null check (action in ('GRANT', 'REVOKE')),
    acted_by uuid references public.profiles(id) on delete set null,
    acted_at timestamptz default now() not null
);

-- Enable RLS on audit logs
alter table public.super_admin_audit_logs enable row level security;

-- Super admins can view audit logs
create policy "Super admins can view audit logs"
    on public.super_admin_audit_logs for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_super_admin = true
        )
    );

-- Add metadata tracking fields to profiles for quick reads
alter table public.profiles
  add column if not exists super_admin_granted_by uuid references public.profiles(id) on delete set null,
  add column if not exists super_admin_granted_at timestamptz;
