-- Migration 036: Persist submission summaries and org-scoped similarity search

alter table public.submissions
  add column if not exists processed_summary text,
  add column if not exists summary_confidence numeric,
  add column if not exists summary_mode text,
  add column if not exists processing_metadata jsonb default '{}'::jsonb;

-- Org-scoped similarity search (across all programs in an organization)
create or replace function public.find_similar_submissions_in_org(
  p_embedding vector(384),
  p_organization_id uuid,
  p_limit integer default 10,
  p_exclude_submission_id uuid default null
)
returns table (
  submission_id uuid,
  similarity numeric,
  chunk_text text,
  title text,
  applicant_name text,
  program_id uuid
)
language sql stable
as $$
  select distinct on (se.submission_id)
    se.submission_id,
    1 - (se.embedding <=> p_embedding) as similarity,
    se.chunk_text,
    s.title,
    s.applicant_name,
    s.program_id
  from public.submission_embeddings se
  join public.submissions s on s.id = se.submission_id
  join public.programs p on p.id = s.program_id
  where p.organization_id = p_organization_id
    and (p_exclude_submission_id is null or se.submission_id != p_exclude_submission_id)
  order by se.submission_id, se.embedding <=> p_embedding
  limit p_limit;
$$;
