create policy notifications_insert_policy
  on public.notifications
  for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = notifications.organization_id
        and om.user_id = auth.uid()
    )
  );
