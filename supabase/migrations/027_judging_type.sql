-- Paste this into Supabase SQL editor if judging_type is not already on programs.
-- judge_category_assignments already exists (migration 026).

begin;

alter table public.programs
  add column if not exists judging_type text not null default 'parallel'
  check (judging_type in ('parallel', 'auto_assign'));

create index if not exists idx_programs_judging_type
  on public.programs (judging_type);

commit;
