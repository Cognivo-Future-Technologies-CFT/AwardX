-- Expand Event Manager role permissions so invitees get a usable dashboard.
-- Existing Event Manager roles often only had overview/manage_programs/analytics.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where lower(trim(r.name)) = 'event manager'
  and p.key in (
    'view_submissions',
    'manage_submissions',
    'manage_forms',
    'view_judging',
    'mark_attendance'
  )
on conflict do nothing;
