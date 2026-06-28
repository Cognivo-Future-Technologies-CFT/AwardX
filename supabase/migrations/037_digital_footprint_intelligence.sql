-- Migration 037: Digital Footprint Intelligence
-- Adds person profiles, digital footprints, claim extraction, and verification infrastructure.

-- 1. Person profiles — unified identity across submissions
create table if not exists public.person_profiles (
  id                uuid default uuid_generate_v4() primary key,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  email             text not null,
  primary_name      text,
  aliases           text[] default '{}',
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  profile_data      jsonb default '{}',
  profile_confidence real default 0,
  metadata          jsonb default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(organization_id, email)
);

-- 2. Digital footprints — web data collected per person
create table if not exists public.person_digital_footprints (
  id                uuid default uuid_generate_v4() primary key,
  person_profile_id uuid not null references public.person_profiles(id) on delete cascade,
  source_type       text not null,
  source_name       text not null,
  source_url        text,
  title             text,
  snippet           text,
  collected_text    text,
  data              jsonb default '{}',
  confidence        real default 0,
  collected_at      timestamptz not null default now(),
  metadata          jsonb default '{}'
);

-- 3. Submission claims — extracts from submission text
create table if not exists public.submission_claims (
  id                    uuid default uuid_generate_v4() primary key,
  submission_id         uuid not null references public.submissions(id) on delete cascade,
  claim_text            text not null,
  claim_type            text not null,
  claim_subject         text,
  extracted_at          timestamptz not null default now(),
  verification_status   text not null default 'pending',
  verification_confidence real,
  verification_summary  text,
  metadata              jsonb default '{}'
);

-- Add check constraint for claim_type
alter table public.submission_claims
  drop constraint if exists submission_claims_type_check;

alter table public.submission_claims
  add constraint submission_claims_type_check
  check (claim_type in ('achievement', 'education', 'experience', 'skill', 'affiliation', 'award'));

-- Add check constraint for verification_status
alter table public.submission_claims
  drop constraint if exists submission_claims_status_check;

alter table public.submission_claims
  add constraint submission_claims_status_check
  check (verification_status in ('pending', 'verifying', 'verified', 'disputed', 'unverifiable'));

-- 4. Claim verifications — each verification attempt with sources
create table if not exists public.claim_verifications (
  id                  uuid default uuid_generate_v4() primary key,
  claim_id            uuid not null references public.submission_claims(id) on delete cascade,
  source_url          text,
  source_title        text,
  source_snippet      text,
  extracted_evidence  text,
  supports_claim      boolean,
  verification_method text not null,
  relevance_score     real default 0,
  authority_score     real default 0,
  confidence          real default 0,
  created_at          timestamptz not null default now()
);

-- 5. Collected documents — raw crawled pages (deduplicated)
create table if not exists public.collected_documents (
  id                uuid default uuid_generate_v4() primary key,
  url               text not null,
  domain            text,
  title             text,
  content           text,
  extracted_text    text,
  metadata          jsonb default '{}',
  collection_status text default 'pending',
  error             text,
  last_crawled_at   timestamptz,
  created_at        timestamptz not null default now(),
  unique(url)
);

-- Add check constraint for collection_status
alter table public.collected_documents
  drop constraint if exists collected_documents_status_check;

alter table public.collected_documents
  add constraint collected_documents_status_check
  check (collection_status in ('pending', 'collected', 'failed'));

-- 6. Indexes
create index if not exists idx_person_profiles_org
  on public.person_profiles (organization_id);
create index if not exists idx_person_profiles_email
  on public.person_profiles (email);
create index if not exists idx_person_profiles_updated
  on public.person_profiles (updated_at desc);

create index if not exists idx_person_footprints_profile
  on public.person_digital_footprints (person_profile_id);
create index if not exists idx_person_footprints_source
  on public.person_digital_footprints (source_type, source_name);
create index if not exists idx_person_footprints_collected
  on public.person_digital_footprints (collected_at desc);

create index if not exists idx_submission_claims_submission
  on public.submission_claims (submission_id);
create index if not exists idx_submission_claims_status
  on public.submission_claims (verification_status);
create index if not exists idx_submission_claims_type
  on public.submission_claims (claim_type);

create index if not exists idx_claim_verifications_claim
  on public.claim_verifications (claim_id);
create index if not exists idx_claim_verifications_method
  on public.claim_verifications (verification_method);

create index if not exists idx_collected_docs_domain
  on public.collected_documents (domain);
create index if not exists idx_collected_docs_status
  on public.collected_documents (collection_status);

-- 7. Helper function: get person submissions

create or replace function public.get_person_submissions(
  p_person_profile_id uuid
)
returns table (
  submission_id uuid,
  program_id uuid,
  title text,
  description text,
  status text,
  submitted_at timestamptz,
  category_title text
)
language sql
stable
as $$
  select
    s.id,
    s.program_id,
    s.title,
    s.description,
    s.status,
    s.submitted_at,
    c.title as category_title
  from public.submissions s
  left join public.categories c on c.id = s.category_id
  where s.applicant_email = (
    select email from public.person_profiles where id = p_person_profile_id
  )
  order by s.submitted_at desc;
$$;

-- 8. RLS Policies
-- person_profiles — org members can read/write their org's profiles
alter table public.person_profiles enable row level security;

drop policy if exists person_profiles_select on public.person_profiles;
create policy person_profiles_select
  on public.person_profiles for select
  using (organization_id in (select current_org_ids()));

drop policy if exists person_profiles_insert on public.person_profiles;
create policy person_profiles_insert
  on public.person_profiles for insert
  with check (organization_id in (select current_org_ids()));

drop policy if exists person_profiles_update on public.person_profiles;
create policy person_profiles_update
  on public.person_profiles for update
  using (organization_id in (select current_org_ids()));

-- person_digital_footprints — through profile → org
alter table public.person_digital_footprints enable row level security;

drop policy if exists person_footprints_select on public.person_digital_footprints;
create policy person_footprints_select
  on public.person_digital_footprints for select
  using (
    person_profile_id in (
      select id from public.person_profiles
      where organization_id in (select current_org_ids())
    )
  );

drop policy if exists person_footprints_insert on public.person_digital_footprints;
create policy person_footprints_insert
  on public.person_digital_footprints for insert
  with check (
    person_profile_id in (
      select id from public.person_profiles
      where organization_id in (select current_org_ids())
    )
  );

drop policy if exists person_footprints_delete on public.person_digital_footprints;
create policy person_footprints_delete
  on public.person_digital_footprints for delete
  using (
    person_profile_id in (
      select id from public.person_profiles
      where organization_id in (select current_org_ids())
    )
  );

-- submission_claims — through submission → program → org
alter table public.submission_claims enable row level security;

drop policy if exists submission_claims_select on public.submission_claims;
create policy submission_claims_select
  on public.submission_claims for select
  using (
    submission_id in (
      select id from public.submissions
      where program_id in (
        select id from public.programs
        where organization_id in (select current_org_ids())
      )
    )
  );

drop policy if exists submission_claims_insert on public.submission_claims;
create policy submission_claims_insert
  on public.submission_claims for insert
  with check (
    submission_id in (
      select id from public.submissions
      where program_id in (
        select id from public.programs
        where organization_id in (select current_org_ids())
      )
    )
  );

drop policy if exists submission_claims_update on public.submission_claims;
create policy submission_claims_update
  on public.submission_claims for update
  using (
    submission_id in (
      select id from public.submissions
      where program_id in (
        select id from public.programs
        where organization_id in (select current_org_ids())
      )
    )
  );

-- claim_verifications — through claims → submission → program → org
alter table public.claim_verifications enable row level security;

drop policy if exists claim_verifications_select on public.claim_verifications;
create policy claim_verifications_select
  on public.claim_verifications for select
  using (
    claim_id in (
      select sc.id from public.submission_claims sc
      where sc.submission_id in (
        select id from public.submissions
        where program_id in (
          select id from public.programs
          where organization_id in (select current_org_ids())
        )
      )
    )
  );

drop policy if exists claim_verifications_insert on public.claim_verifications;
create policy claim_verifications_insert
  on public.claim_verifications for insert
  with check (
    claim_id in (
      select sc.id from public.submission_claims sc
      where sc.submission_id in (
        select id from public.submissions
        where program_id in (
          select id from public.programs
          where organization_id in (select current_org_ids())
        )
      )
    )
  );

drop policy if exists claim_verifications_delete on public.claim_verifications;
create policy claim_verifications_delete
  on public.claim_verifications for delete
  using (
    claim_id in (
      select sc.id from public.submission_claims sc
      where sc.submission_id in (
        select id from public.submissions
        where program_id in (
          select id from public.programs
          where organization_id in (select current_org_ids())
        )
      )
    )
  );

-- collected_documents — open select for reference, insert only from server
alter table public.collected_documents enable row level security;

drop policy if exists collected_documents_select on public.collected_documents;
create policy collected_documents_select
  on public.collected_documents for select
  using (true);

drop policy if exists collected_documents_insert on public.collected_documents;
create policy collected_documents_insert
  on public.collected_documents for insert
  with check (true);

-- 9. Updated_at trigger for person_profiles
drop trigger if exists trg_person_profiles_updated_at on public.person_profiles;
create trigger trg_person_profiles_updated_at
  before update on public.person_profiles
  for each row
  execute function public.update_updated_at();

-- 10. Grant permissions
grant select on public.person_profiles to authenticated, anon;
grant insert, update on public.person_profiles to authenticated;

grant select on public.person_digital_footprints to authenticated, anon;
grant insert, delete on public.person_digital_footprints to authenticated;

grant select on public.submission_claims to authenticated, anon;
grant insert, update on public.submission_claims to authenticated;

grant select on public.claim_verifications to authenticated, anon;
grant insert, delete on public.claim_verifications to authenticated;

grant select, insert on public.collected_documents to authenticated;
