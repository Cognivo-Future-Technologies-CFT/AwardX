-- Add is_super_admin to profiles
alter table public.profiles
  add column if not exists is_super_admin boolean default false;

-- Drop insecure policies from previous migration that allowed ANY authenticated user to manage them
drop policy if exists "Admins can view all pre-registrations" on public.pre_registrations;
drop policy if exists "Admins can update pre-registrations" on public.pre_registrations;
drop policy if exists "Admins can delete pre-registrations" on public.pre_registrations;

-- Create secure policies for super admins
create policy "Super admins can select pre-registrations"
    on public.pre_registrations for select
    to authenticated
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_super_admin = true
      )
    );

create policy "Super admins can update pre-registrations"
    on public.pre_registrations for update
    to authenticated
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_super_admin = true
      )
    )
    with check (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_super_admin = true
      )
    );

create policy "Super admins can delete pre-registrations"
    on public.pre_registrations for delete
    to authenticated
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_super_admin = true
      )
    );
