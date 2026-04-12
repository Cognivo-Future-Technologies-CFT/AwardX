begin;

-- =========================================================
-- Task 1: Unique constraint on scores (submission_judge_id, criterion_id)
-- Backs the upsert key used by submitScores() to prevent duplicate rows on rescore.
-- =========================================================
alter table public.scores
  drop constraint if exists scores_submission_judge_criterion_unique;
alter table public.scores
  add constraint scores_submission_judge_criterion_unique
  unique (submission_judge_id, criterion_id);

-- =========================================================
-- Task 5: Unique constraint on submission_judges (submission_id, judge_id)
-- Prevents the same judge being assigned to the same submission twice.
-- =========================================================
alter table public.submission_judges
  drop constraint if exists submission_judges_submission_judge_unique;
alter table public.submission_judges
  add constraint submission_judges_submission_judge_unique
  unique (submission_id, judge_id);

-- =========================================================
-- Tasks 2, 3, 4: Maintain judges.assigned_count and judges.completed_count
-- via a single AFTER INSERT OR UPDATE OR DELETE trigger on submission_judges.
-- =========================================================
create or replace function public.trg_fn_submission_judges_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- A new assignment was created: bump assigned_count.
    update public.judges
    set assigned_count = coalesce(assigned_count, 0) + 1
    where id = NEW.judge_id;

  elsif TG_OP = 'UPDATE' then
    -- Status transition to/from 'completed': adjust completed_count only.
    if OLD.status is distinct from NEW.status then
      if NEW.status = 'completed' and coalesce(OLD.status, '') <> 'completed' then
        update public.judges
        set completed_count = coalesce(completed_count, 0) + 1
        where id = NEW.judge_id;
      elsif OLD.status = 'completed' and coalesce(NEW.status, '') <> 'completed' then
        update public.judges
        set completed_count = greatest(coalesce(completed_count, 0) - 1, 0)
        where id = NEW.judge_id;
      end if;
    end if;

  elsif TG_OP = 'DELETE' then
    -- Assignment removed: decrement assigned_count; also decrement completed_count
    -- if the row was in 'completed' status.
    update public.judges
    set
      assigned_count  = greatest(coalesce(assigned_count, 0)  - 1, 0),
      completed_count = case
                          when OLD.status = 'completed'
                          then greatest(coalesce(completed_count, 0) - 1, 0)
                          else coalesce(completed_count, 0)
                        end
    where id = OLD.judge_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_submission_judges_counts on public.submission_judges;
create trigger trg_submission_judges_counts
  after insert or update or delete on public.submission_judges
  for each row execute function public.trg_fn_submission_judges_counts();

-- =========================================================
-- Task 6: Recalculate submissions.average_score whenever scores change.
-- Uses a weighted average across judging_criteria.weight.
-- =========================================================
create or replace function public.trg_fn_recalculate_average_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id uuid;
  v_avg           numeric;
begin
  -- Identify which submission was affected.
  if TG_OP = 'DELETE' then
    select sj.submission_id into v_submission_id
    from public.submission_judges sj
    where sj.id = OLD.submission_judge_id;
  else
    select sj.submission_id into v_submission_id
    from public.submission_judges sj
    where sj.id = NEW.submission_judge_id;
  end if;

  if v_submission_id is null then
    return null;
  end if;

  -- Weighted average: sum(score * weight) / sum(weight), null when no scores.
  select
    sum(s.score * coalesce(jc.weight, 1))
    / nullif(sum(coalesce(jc.weight, 1)), 0)
  into v_avg
  from public.scores s
  join public.submission_judges sj on sj.id = s.submission_judge_id
  join public.judging_criteria jc  on jc.id = s.criterion_id
  where sj.submission_id = v_submission_id;

  update public.submissions
  set average_score = v_avg
  where id = v_submission_id;

  return null;
end;
$$;

drop trigger if exists trg_scores_recalculate_avg on public.scores;
create trigger trg_scores_recalculate_avg
  after insert or update or delete on public.scores
  for each row execute function public.trg_fn_recalculate_average_score();

commit;
