-- Create a secure function to fetch user emails in bulk
-- This runs with SECURITY DEFINER to bypass RLS and access auth.users
create or replace function public.get_user_emails(user_ids uuid[])
returns table(id uuid, email varchar)
language sql
security definer
set search_path = public
as $$
  select id, email::varchar 
  from auth.users 
  where id = any(user_ids);
$$;

-- Restrict access so only authenticated users (or service_role) can call it
revoke execute on function public.get_user_emails(uuid[]) from public;
grant execute on function public.get_user_emails(uuid[]) to authenticated;
grant execute on function public.get_user_emails(uuid[]) to service_role;
