-- 1. Function to search user IDs by email
create or replace function public.search_users_by_email(search_term text)
returns table(id uuid)
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email ilike '%' || search_term || '%';
$$;

revoke execute on function public.search_users_by_email(text) from public;
grant execute on function public.search_users_by_email(text) to authenticated;
grant execute on function public.search_users_by_email(text) to service_role;

-- 2. Function to fetch emails for specific user IDs
create or replace function public.get_user_emails(user_ids uuid[])
returns table(id uuid, email varchar)
language sql
security definer
set search_path = public
as $$
  select id, email::varchar from auth.users where id = any(user_ids);
$$;

revoke execute on function public.get_user_emails(uuid[]) from public;
grant execute on function public.get_user_emails(uuid[]) to authenticated;
grant execute on function public.get_user_emails(uuid[]) to service_role;
