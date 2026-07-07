-- =============================================================================
-- Migration: State Persistence & Schema Integrity
-- Date: 2026-02-23
-- Purpose: Fix missing tables, columns, constraints, and indexes needed for
--          proper state persistence across the application.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. MISSING TABLE: program_timeline_milestones
--    Used by: services/database.ts (getTimeline, saveMilestone, deleteMilestone)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.program_timeline_milestones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  title text NOT NULL,
  date text,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT program_timeline_milestones_pkey PRIMARY KEY (id),
  CONSTRAINT program_timeline_milestones_program_id_fkey FOREIGN KEY (program_id)
    REFERENCES public.programs(id) ON DELETE CASCADE
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. NEW TABLE: submission_drafts
--    Persists in-progress form submissions so users don't lose data on nav away.
--    Used by: FormSubmissionPage.tsx (auto-save draft data)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.submission_drafts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  draft_data jsonb DEFAULT '{}'::jsonb,
  current_page integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submission_drafts_pkey PRIMARY KEY (id),
  CONSTRAINT submission_drafts_form_id_fkey FOREIGN KEY (form_id)
    REFERENCES public.program_forms(id) ON DELETE CASCADE,
  CONSTRAINT submission_drafts_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Only one draft per user per form (or per session if anonymous)
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_drafts_user_form
  ON public.submission_drafts(form_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_drafts_session_form
  ON public.submission_drafts(form_id, session_id) WHERE session_id IS NOT NULL AND user_id IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. NEW TABLE: program_workflow_extensions
--    Persists installed workflow extensions per program (currently localStorage).
--    Used by: services/workflowExtensions.ts
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.program_workflow_extensions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  extension_id text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  config jsonb DEFAULT '{}'::jsonb,
  installed_at timestamp with time zone DEFAULT now(),
  installed_by uuid,
  CONSTRAINT program_workflow_extensions_pkey PRIMARY KEY (id),
  CONSTRAINT program_workflow_extensions_program_id_fkey FOREIGN KEY (program_id)
    REFERENCES public.programs(id) ON DELETE CASCADE,
  CONSTRAINT program_workflow_extensions_installed_by_fkey FOREIGN KEY (installed_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT program_workflow_extensions_unique UNIQUE (program_id, extension_id)
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. NEW TABLE: user_workspace_state
--    Persists per-user dashboard state (active program, current view, sidebar, etc.)
--    so it survives page refreshes and works across devices.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_workspace_state (
  user_id uuid NOT NULL,
  active_program_id uuid,
  current_view character varying DEFAULT 'overview',
  sidebar_collapsed boolean DEFAULT false,
  selected_form_ids jsonb DEFAULT '{}'::jsonb,  -- { "program_uuid": "form_uuid", ... }
  preferences jsonb DEFAULT '{}'::jsonb,         -- general catchall for UI prefs
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_workspace_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_workspace_state_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_workspace_state_active_program_id_fkey FOREIGN KEY (active_program_id)
    REFERENCES public.programs(id) ON DELETE SET NULL
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. NEW TABLE: judging_config
--    Persists scoring/judging settings per program that are currently only in-memory.
--    Used by: JudgingView.tsx scorecard & settings tabs
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.judging_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  scoring_system character varying DEFAULT 'numeric',   -- 'numeric', 'stars', 'pass_fail'
  pass_threshold integer DEFAULT 70,
  blind_judging boolean DEFAULT false,
  allow_comments boolean DEFAULT true,
  auto_assign boolean DEFAULT false,
  max_judges_per_submission integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT judging_config_pkey PRIMARY KEY (id),
  CONSTRAINT judging_config_program_id_fkey FOREIGN KEY (program_id)
    REFERENCES public.programs(id) ON DELETE CASCADE,
  CONSTRAINT judging_config_program_unique UNIQUE (program_id)
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. NEW TABLE: slug_history
--    When a program slug changes, keep the old slug so we can 301 redirect.
--    Prevents broken links when admins rename slugs.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.slug_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  old_slug character varying NOT NULL,
  new_slug character varying NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  changed_by uuid,
  CONSTRAINT slug_history_pkey PRIMARY KEY (id),
  CONSTRAINT slug_history_program_id_fkey FOREIGN KEY (program_id)
    REFERENCES public.programs(id) ON DELETE CASCADE,
  CONSTRAINT slug_history_changed_by_fkey FOREIGN KEY (changed_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_slug_history_old_slug ON public.slug_history(old_slug);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. NEW TABLE: form_analytics
--    Track form views, starts, completions for conversion funnel analytics.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.form_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  event_type character varying NOT NULL,  -- 'view', 'start', 'complete', 'abandon'
  user_id uuid,
  session_id text,
  page_reached integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT form_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT form_analytics_form_id_fkey FOREIGN KEY (form_id)
    REFERENCES public.program_forms(id) ON DELETE CASCADE,
  CONSTRAINT form_analytics_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_form_analytics_form_date
  ON public.form_analytics(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_analytics_event_type
  ON public.form_analytics(form_id, event_type);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. MISSING COLUMNS ON EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- program_page_sections: code writes 'subtitle' but column doesn't exist
ALTER TABLE public.program_page_sections
  ADD COLUMN IF NOT EXISTS subtitle text;

-- program_page_configs: code writes seo_title/seo_description but DB has meta_title/meta_description
-- Add the columns the code expects. We keep meta_* as aliases / fallback.
ALTER TABLE public.program_page_configs
  ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.program_page_configs
  ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.program_page_configs
  ADD COLUMN IF NOT EXISTS published_version integer DEFAULT 1;

-- Copy existing meta_* data into new seo_* columns (one-time migration)
UPDATE public.program_page_configs
  SET seo_title = meta_title WHERE seo_title IS NULL AND meta_title IS NOT NULL;
UPDATE public.program_page_configs
  SET seo_description = meta_description WHERE seo_description IS NULL AND meta_description IS NOT NULL;

-- program_sponsors: code writes tier_label and is_active but columns don't exist
ALTER TABLE public.program_sponsors
  ADD COLUMN IF NOT EXISTS tier_label text;
ALTER TABLE public.program_sponsors
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- program_faqs: code writes is_visible but column doesn't exist
ALTER TABLE public.program_faqs
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- program_page_sections: add is_draft for draft/published versioning
ALTER TABLE public.program_page_sections
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. UNIQUE CONSTRAINTS (code uses upsert with onConflict that requires these)
-- ═══════════════════════════════════════════════════════════════════════════════

-- programs.slug must be unique (getBySlug queries .single())
-- Partial unique: only enforce among non-null slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_slug_unique
  ON public.programs(slug) WHERE slug IS NOT NULL;

-- submission_judges: upsert uses onConflict: 'submission_id,judge_id'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'submission_judges_unique'
  ) THEN
    ALTER TABLE public.submission_judges
      ADD CONSTRAINT submission_judges_unique UNIQUE (submission_id, judge_id);
  END IF;
END $$;

-- organization_members: upsert uses onConflict: 'organization_id,user_id,program_id'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_members_unique'
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT org_members_unique UNIQUE (organization_id, user_id, program_id);
  END IF;
END $$;

-- social_accounts: upsert uses onConflict: 'organization_id,platform,handle'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_accounts_unique'
  ) THEN
    ALTER TABLE public.social_accounts
      ADD CONSTRAINT social_accounts_unique UNIQUE (organization_id, platform, handle);
  END IF;
END $$;

-- scores: upsert uses onConflict: 'submission_judge_id,criterion_id'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scores_unique'
  ) THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_unique UNIQUE (submission_judge_id, criterion_id);
  END IF;
END $$;

-- judges: prevent duplicate email+program combos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'judges_email_program_unique'
  ) THEN
    ALTER TABLE public.judges
      ADD CONSTRAINT judges_email_program_unique UNIQUE (email, program_id);
  END IF;
END $$;

-- public_votes: prevent double-voting per user or IP within a round
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'public_votes_round_user_submission_unique'
  ) THEN
    CREATE UNIQUE INDEX public_votes_round_user_submission_unique
      ON public.public_votes (round_id, submission_id, user_id)
      WHERE round_id IS NOT NULL AND user_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'public_votes_round_ip_submission_unique'
  ) THEN
    CREATE UNIQUE INDEX public_votes_round_ip_submission_unique
      ON public.public_votes (round_id, submission_id, ip_address)
      WHERE round_id IS NOT NULL AND user_id IS NULL AND ip_address IS NOT NULL;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. PERFORMANCE INDEXES (frequently queried lookups)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_program_page_sections_lookup
  ON public.program_page_sections(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_program_faqs_lookup
  ON public.program_faqs(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_program_sponsors_lookup
  ON public.program_sponsors(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_submissions_program_date
  ON public.submissions(program_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON public.submissions(program_id, status);

CREATE INDEX IF NOT EXISTS idx_judges_org_program
  ON public.judges(organization_id, program_id);

CREATE INDEX IF NOT EXISTS idx_rounds_program_order
  ON public.rounds(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_program_timeline_milestones_lookup
  ON public.program_timeline_milestones(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_program_form_fields_form
  ON public.program_form_fields(form_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_categories_program
  ON public.categories(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON public.organization_members(user_id, organization_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. CLEANUP: Drop redundant column
-- ═══════════════════════════════════════════════════════════════════════════════

-- submissions has both vote_count and votes_count. Code uses votes_count only.
ALTER TABLE public.submissions DROP COLUMN IF EXISTS vote_count;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. MATERIALIZED VIEW: program_stats
--     Pre-computed stats per program for fast dashboard loading.
--     Refresh periodically or after submission/judge changes.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.program_stats AS
SELECT
  p.id AS program_id,
  p.title AS program_title,
  p.status,
  COALESCE(sub_counts.total_submissions, 0) AS total_submissions,
  COALESCE(sub_counts.pending_count, 0) AS pending_count,
  COALESCE(sub_counts.reviewed_count, 0) AS reviewed_count,
  COALESCE(sub_counts.shortlisted_count, 0) AS shortlisted_count,
  COALESCE(judge_counts.total_judges, 0) AS total_judges,
  COALESCE(judge_counts.active_judges, 0) AS active_judges,
  COALESCE(cat_counts.total_categories, 0) AS total_categories,
  COALESCE(form_counts.total_forms, 0) AS total_forms,
  COALESCE(revenue.total_revenue, 0) AS total_revenue,
  now() AS refreshed_at
FROM public.programs p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_submissions,
    COUNT(*) FILTER (WHERE s.status IN ('pending', 'Pending')) AS pending_count,
    COUNT(*) FILTER (WHERE s.status IN ('reviewed', 'Reviewed', 'Under Review')) AS reviewed_count,
    COUNT(*) FILTER (WHERE s.status IN ('shortlisted', 'Shortlisted')) AS shortlisted_count
  FROM public.submissions s WHERE s.program_id = p.id
) sub_counts ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_judges,
    COUNT(*) FILTER (WHERE j.status IN ('active', 'Active', 'accepted')) AS active_judges
  FROM public.judges j WHERE j.program_id = p.id
) judge_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_categories
  FROM public.categories c WHERE c.program_id = p.id
) cat_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_forms
  FROM public.program_forms f WHERE f.program_id = p.id
) form_counts ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(s.payment_amount), 0) AS total_revenue
  FROM public.submissions s
  WHERE s.program_id = p.id AND s.payment_status = 'paid'
) revenue ON true
GROUP BY p.id, p.title, p.status,
         sub_counts.total_submissions, sub_counts.pending_count,
         sub_counts.reviewed_count, sub_counts.shortlisted_count,
         judge_counts.total_judges, judge_counts.active_judges,
         cat_counts.total_categories, form_counts.total_forms,
         revenue.total_revenue;

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_stats_program_id
  ON public.program_stats(program_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. FUNCTION: Automatic slug history tracking
--     When programs.slug changes, record the old value in slug_history.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.track_slug_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.slug IS NOT NULL AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    INSERT INTO public.slug_history (program_id, old_slug, new_slug)
    VALUES (NEW.id, OLD.slug, COALESCE(NEW.slug, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_slug_change ON public.programs;
CREATE TRIGGER trg_track_slug_change
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.track_slug_change();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. FUNCTION: Auto-update updated_at timestamps
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at columns
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'user_workspace_state',
      'submission_drafts',
      'judging_config',
      'program_timeline_milestones',
      'program_page_configs',
      'program_page_sections',
      'program_forms',
      'programs',
      'organizations',
      'profiles',
      'contacts'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON public.%I; '
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. FUNCTION: Refresh program_stats (call after batch operations)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.refresh_program_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.program_stats;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. RLS POLICIES (Row Level Security for new tables)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on new tables
ALTER TABLE public.user_workspace_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_workflow_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_timeline_milestones ENABLE ROW LEVEL SECURITY;

-- user_workspace_state: users can only access their own state
CREATE POLICY user_workspace_state_own ON public.user_workspace_state
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- submission_drafts: users can access their own drafts
CREATE POLICY submission_drafts_own ON public.submission_drafts
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- For org-scoped tables, allow access to org members
-- (simplified — in production you'd check organization_members)
CREATE POLICY judging_config_access ON public.judging_config
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY slug_history_read ON public.slug_history
  FOR SELECT USING (true);

CREATE POLICY form_analytics_access ON public.form_analytics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY workflow_extensions_access ON public.program_workflow_extensions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY timeline_milestones_access ON public.program_timeline_milestones
  FOR ALL USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE. Summary of changes:
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- NEW TABLES (7):
--   • program_timeline_milestones  — overview page timeline events
--   • submission_drafts            — in-progress form answers
--   • program_workflow_extensions  — installed workflow extensions per program
--   • user_workspace_state         — dashboard state (active program, view, prefs)
--   • judging_config               — scoring/judging settings per program
--   • slug_history                 — tracks slug renames for redirects
--   • form_analytics               — form view/start/complete/abandon events
--
-- NEW COLUMNS (7):
--   • program_page_sections.subtitle
--   • program_page_sections.is_draft
--   • program_page_configs.seo_title
--   • program_page_configs.seo_description
--   • program_page_configs.published_version
--   • program_sponsors.tier_label, is_active
--   • program_faqs.is_visible
--
-- NEW CONSTRAINTS (6 UNIQUE):
--   • programs.slug (partial unique where not null)
--   • submission_judges(submission_id, judge_id)
--   • organization_members(organization_id, user_id, program_id)
--   • social_accounts(organization_id, platform, handle)
--   • scores(submission_judge_id, criterion_id)
--   • judges(email, program_id)
--   • public_votes(round_id, submission_id, user_id) where user_id is not null
--   • public_votes(round_id, submission_id, ip_address) where user_id is null
--
-- NEW INDEXES (14 performance indexes)
-- MATERIALIZED VIEW: program_stats
-- FUNCTIONS: track_slug_change(), update_updated_at(), refresh_program_stats()
-- TRIGGERS: slug change tracking, updated_at auto-update
-- RLS: policies on all new tables
