create extension if not exists moddatetime with schema extensions;

create table if not exists public.pre_registrations (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    status text not null default 'New',
    admin_notes text,

    -- Personal Details
    full_name text not null,
    email text not null unique,
    phone text,
    country text,
    organization text,
    role text,

    -- Qualification
    interest_reason text,
    referral_source text,
    user_type text,

    -- Product Questions
    use_case text,
    team_size text,
    estimated_users text,
    current_tool text,
    biggest_challenge text,

    -- Organization Details
    org_name text,
    website text,
    industry text,
    employees_count text,

    -- Award Program
    runs_awards boolean,
    award_categories text,
    estimated_nominations text,
    estimated_judges text,
    expected_launch_month text,
    current_workflow text,
    biggest_pain_point text,

    -- Early Access
    join_beta boolean,
    lifetime_discount boolean,
    pilot_customer boolean,
    schedule_demo boolean,
    design_partner boolean,

    -- Marketing
    referral_code text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text,
    browser text,
    
    -- Consent
    updates_consent boolean,
    privacy_consent boolean,
    
    -- Meta
    ip_address text
);

-- RLS Configuration
alter table public.pre_registrations enable row level security;

create policy "Admins can view all pre-registrations"
    on public.pre_registrations for select
    to authenticated
    using (true);

create policy "Admins can update pre-registrations"
    on public.pre_registrations for update
    to authenticated
    using (true)
    with check (true);

create policy "Admins can delete pre-registrations"
    on public.pre_registrations for delete
    to authenticated
    using (true);

create policy "Anyone can insert a pre-registration"
    on public.pre_registrations for insert
    to anon, authenticated
    with check (true);

-- Indexes for common queries
create index pre_registrations_email_idx on public.pre_registrations (email);
create index pre_registrations_status_idx on public.pre_registrations (status);
create index pre_registrations_created_at_idx on public.pre_registrations (created_at desc);

-- Trigger to update updated_at timestamp
create trigger handle_updated_at before update on public.pre_registrations 
  for each row execute procedure moddatetime (updated_at);
