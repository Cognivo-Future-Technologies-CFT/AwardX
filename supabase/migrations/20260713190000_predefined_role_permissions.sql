-- Ensure all predefined role names get the same usable permission sets as the UI presets.
-- Safe to re-run: inserts only missing role_permissions rows.

with preset_keys(role_name, perm_key) as (
  values
    ('judge', 'view_overview'),
    ('judge', 'view_submissions'),
    ('judge', 'view_judging'),
    ('lead judge', 'view_overview'),
    ('lead judge', 'view_submissions'),
    ('lead judge', 'view_judging'),
    ('lead judge', 'manage_judging'),
    ('event manager', 'view_overview'),
    ('event manager', 'manage_programs'),
    ('event manager', 'view_analytics'),
    ('event manager', 'view_submissions'),
    ('event manager', 'manage_submissions'),
    ('event manager', 'manage_forms'),
    ('event manager', 'view_judging'),
    ('event manager', 'mark_attendance'),
    ('attendance marker', 'view_overview'),
    ('attendance marker', 'mark_attendance'),
    ('admin', 'view_overview'),
    ('admin', 'manage_programs'),
    ('admin', 'view_submissions'),
    ('admin', 'manage_submissions'),
    ('admin', 'view_judging'),
    ('admin', 'manage_judging'),
    ('admin', 'manage_forms'),
    ('admin', 'view_analytics'),
    ('admin', 'manage_teams'),
    ('admin', 'view_logs'),
    ('admin', 'manage_settings'),
    ('admin', 'mark_attendance'),
    ('admin', 'view_subscription')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join preset_keys pk on lower(trim(r.name)) = pk.role_name
join public.permissions p on p.key = pk.perm_key
on conflict do nothing;
