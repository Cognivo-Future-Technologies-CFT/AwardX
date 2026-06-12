-- Migration 028: Public form access
-- Allows any visitor (anon + authenticated) to READ active forms, fields, and
-- categories for active + public programs.
-- Allows any authenticated user to INSERT a submission into an active public program.
-- Org-member read/write policies are unchanged.

begin;

-- =========================================================
-- program_forms: public read for active forms
-- =========================================================

drop policy if exists program_forms_public_read on public.program_forms;
create policy program_forms_public_read on public.program_forms
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.programs p
      where p.id = program_forms.program_id
        and coalesce(p.status, 'draft') = 'active'
        and coalesce(p.visibility, 'public') = 'public'
    )
  );

-- =========================================================
-- program_form_fields: public read for fields of active forms
-- =========================================================

drop policy if exists program_form_fields_public_read on public.program_form_fields;
create policy program_form_fields_public_read on public.program_form_fields
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.program_forms pf
      join public.programs p on p.id = pf.program_id
      where pf.id = program_form_fields.form_id
        and pf.is_active = true
        and coalesce(p.status, 'draft') = 'active'
        and coalesce(p.visibility, 'public') = 'public'
    )
  );

-- =========================================================
-- categories: public read for award selector options
-- =========================================================

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = categories.program_id
        and coalesce(p.status, 'draft') = 'active'
        and coalesce(p.visibility, 'public') = 'public'
    )
  );

-- =========================================================
-- submissions: any authenticated user can INSERT into
--              active + public programs
-- =========================================================

drop policy if exists submissions_public_insert on public.submissions;
create policy submissions_public_insert on public.submissions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.programs p
      where p.id = submissions.program_id
        and coalesce(p.status, 'draft') = 'active'
        and coalesce(p.visibility, 'public') = 'public'
    )
  );

-- =========================================================
-- submissions: a submitter can read their own submissions
-- (needed so the form page can detect duplicates client-side)
-- =========================================================

drop policy if exists submissions_own_read on public.submissions;
create policy submissions_own_read on public.submissions
  for select
  to authenticated
  using (applicant_id = auth.uid());

commit;
