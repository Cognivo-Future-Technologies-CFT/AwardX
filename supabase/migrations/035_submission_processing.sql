-- Migration 035: Submission Processing Pipeline
-- Adds AI detection, vector embeddings, and document processing infrastructure.
-- Requires the pgvector extension.

-- 1. Enable pgvector extension
create extension if not exists vector
with schema public;

-- 2. Add processing columns to submissions table
alter table public.submissions
  add column if not exists processing_status text default 'pending',
  add column if not exists processed_text text,
  add column if not exists ai_detection_score numeric,
  add column if not exists ai_detection_confidence numeric,
  add column if not exists ai_detection_model text,
  add column if not exists processing_error text,
  add column if not exists processed_at timestamptz;

-- Add check constraint for processing_status
alter table public.submissions
  drop constraint if exists submissions_processing_status_check;

alter table public.submissions
  add constraint submissions_processing_status_check
  check (processing_status in ('pending', 'processing', 'completed', 'failed'));

-- 3. Create submission_embeddings table for pgvector storage
create table if not exists public.submission_embeddings (
  id              uuid default uuid_generate_v4() primary key,
  submission_id   uuid references public.submissions(id) on delete cascade not null,
  embedding       vector(384) not null,
  chunk_index     integer not null,
  chunk_text      text not null,
  created_at      timestamptz default now()
);

-- 4. Indexes for performance
create index if not exists idx_submission_embeddings_vector
  on public.submission_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_submission_embeddings_submission
  on public.submission_embeddings (submission_id);

-- 5. Similarity search function
create or replace function public.find_similar_submissions(
  p_embedding vector(384),
  p_program_id uuid,
  p_limit integer default 10,
  p_exclude_submission_id uuid default null
)
returns table (
  submission_id uuid,
  similarity numeric,
  chunk_text text,
  title text,
  applicant_name text
)
language sql stable
as $$
  select distinct on (se.submission_id)
    se.submission_id,
    1 - (se.embedding <=> p_embedding) as similarity,
    se.chunk_text,
    s.title,
    s.applicant_name
  from public.submission_embeddings se
  join public.submissions s on s.id = se.submission_id
  where s.program_id = p_program_id
    and (p_exclude_submission_id is null or se.submission_id != p_exclude_submission_id)
  order by se.submission_id, se.embedding <=> p_embedding
  limit p_limit;
$$;

-- 6. Grant permissions
alter table public.submission_embeddings enable row level security;

create policy submission_embeddings_select
  on public.submission_embeddings for select
  using (true);

create policy submission_embeddings_insert
  on public.submission_embeddings for insert
  with check (true);
