begin;

-- Backfill org creators who only have profiles.organization_id set (no membership row).
insert into public.organization_members (organization_id, user_id, program_id, status, joined_at)
select p.organization_id, p.id, null, 'active', coalesce(p.created_at, now())
from public.profiles p
where p.organization_id is not null
  and not exists (
    select 1
    from public.organization_members om
    where om.user_id = p.id
      and om.organization_id = p.organization_id
  );

-- Clear profile org links for users with no active membership in that org.
update public.profiles p
set organization_id = fallback.next_org_id,
    updated_at = now()
from (
  select
    p2.id as user_id,
    (
      select om.organization_id
      from public.organization_members om
      where om.user_id = p2.id
        and coalesce(om.status, 'active') = 'active'
      order by om.joined_at desc nulls last
      limit 1
    ) as next_org_id
  from public.profiles p2
  where p2.organization_id is not null
    and not exists (
      select 1
      from public.organization_members om
      where om.user_id = p2.id
        and om.organization_id = p2.organization_id
        and coalesce(om.status, 'active') = 'active'
    )
) as fallback
where p.id = fallback.user_id;

-- RLS org scope must follow active membership, not stale profile links.
create or replace function public.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid()
    and om.organization_id is not null
    and coalesce(om.status, 'active') = 'active'
$$;

revoke all on function public.current_org_ids() from public;
grant execute on function public.current_org_ids() to authenticated;

commit;
