create table if not exists public.system_api_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique, -- e.g., 'openai', 'groq', 'razorpay', 'twilio'
  api_key_encrypted text not null,
  is_active boolean default true,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- Enable RLS
alter table public.system_api_keys enable row level security;

-- Only super admins can view/manage API keys
create policy "Super Admins can manage API keys"
  on public.system_api_keys
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_super_admin = true
    )
  );
