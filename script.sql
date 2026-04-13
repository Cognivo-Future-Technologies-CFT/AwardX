-- =============================================================================
-- AwardX Migration Script
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run on an existing database — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Enable the uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 1. PROGRAMS — add active_form_id column
--    Used by the Form Builder to track which form is the active submission form.
-- =============================================================================
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS active_form_id uuid
    REFERENCES public.program_forms(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_programs_active_form_id
  ON public.programs(active_form_id);


-- =============================================================================
-- 2. ROUND_SUBMISSIONS — new table
--    Tracks which submissions are enrolled in which rounds (pipeline enrollment).
--    Used by Schedule & Rounds view to show participants per round.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.round_submissions (
  id                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
  round_id           uuid        NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  submission_id      uuid        NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status             varchar     NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'advanced', 'eliminated')),
  source_round_id    uuid        REFERENCES public.rounds(id) ON DELETE SET NULL,
  carried_score      numeric,
  enrolled_at        timestamptz NOT NULL DEFAULT now(),
  advanced_at        timestamptz,
  eliminated_at      timestamptz,
  elimination_reason text,
  CONSTRAINT round_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT round_submissions_unique UNIQUE (round_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_round_submissions_round_id
  ON public.round_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_submissions_submission_id
  ON public.round_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_round_submissions_status
  ON public.round_submissions(status);


-- =============================================================================
-- 3. VOTING_CONFIGS — new table
--    Per-round configuration for the Public Voting module.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.voting_configs (
  id                    uuid        NOT NULL DEFAULT uuid_generate_v4(),
  round_id              uuid        NOT NULL UNIQUE REFERENCES public.rounds(id) ON DELETE CASCADE,
  votes_per_user        integer     NOT NULL DEFAULT 5  CHECK (votes_per_user > 0),
  votes_per_submission  integer     NOT NULL DEFAULT 1  CHECK (votes_per_submission > 0),
  require_auth          boolean     NOT NULL DEFAULT false,
  allow_anonymous       boolean     NOT NULL DEFAULT true,
  show_results_publicly boolean     NOT NULL DEFAULT false,
  show_leaderboard      boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voting_configs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_voting_configs_round_id
  ON public.voting_configs(round_id);


-- =============================================================================
-- 4. PUBLIC_VOTES — add missing columns
--    The voting engine writes round_id, voter_name, and voter_email.
-- =============================================================================
ALTER TABLE public.public_votes
  ADD COLUMN IF NOT EXISTS round_id    uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS voter_name  text,
  ADD COLUMN IF NOT EXISTS voter_email text;

CREATE INDEX IF NOT EXISTS idx_public_votes_round_id
  ON public.public_votes(round_id);
CREATE INDEX IF NOT EXISTS idx_public_votes_submission_id
  ON public.public_votes(submission_id);


-- =============================================================================
-- 5. SUBMISSION_JUDGES — add round_id column
--    Allows judge assignments to be scoped to a specific evaluation round.
-- =============================================================================
ALTER TABLE public.submission_judges
  ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.rounds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submission_judges_round_id
  ON public.submission_judges(round_id);


-- =============================================================================
-- 6. ADVANCEMENT_EVENTS — new table
--    Logs each advancement execution (round transitions).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.advancement_events (
  id              uuid        NOT NULL DEFAULT uuid_generate_v4(),
  round_id        uuid        NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  target_round_id uuid        REFERENCES public.rounds(id) ON DELETE SET NULL,
  program_id      uuid        REFERENCES public.programs(id) ON DELETE CASCADE,
  trigger_type    varchar     NOT NULL DEFAULT 'manual'
                    CHECK (trigger_type IN ('manual', 'automatic', 'override')),
  criteria_used   jsonb       DEFAULT '{}'::jsonb,
  advanced_count  integer     DEFAULT 0,
  eliminated_count integer    DEFAULT 0,
  had_ties        boolean     DEFAULT false,
  notes           text,
  executed_by     uuid        REFERENCES public.profiles(id),
  executed_at     timestamptz NOT NULL DEFAULT now(),
  status          varchar     DEFAULT 'completed',
  CONSTRAINT advancement_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_advancement_events_round_id
  ON public.advancement_events(round_id);
CREATE INDEX IF NOT EXISTS idx_advancement_events_program_id
  ON public.advancement_events(program_id);


-- =============================================================================
-- 7. ADVANCEMENT_DETAILS — new table
--    Per-submission outcome record for each advancement event.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.advancement_details (
  id                      uuid        NOT NULL DEFAULT uuid_generate_v4(),
  advancement_event_id    uuid        NOT NULL REFERENCES public.advancement_events(id) ON DELETE CASCADE,
  submission_id           uuid        NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  outcome                 varchar     NOT NULL CHECK (outcome IN ('advanced', 'eliminated', 'held', 'override')),
  rank                    integer,
  score                   numeric,
  was_at_cutoff_boundary  boolean     DEFAULT false,
  override_reason         text,
  CONSTRAINT advancement_details_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_advancement_details_event_id
  ON public.advancement_details(advancement_event_id);
CREATE INDEX IF NOT EXISTS idx_advancement_details_submission_id
  ON public.advancement_details(submission_id);


-- =============================================================================
-- 8. JUDGE_GROUPS — new table
--    Supports the auto-assign by group (round robin) feature.
--    Stores which judges belong to which named group within a program.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.judge_groups (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  program_id  uuid        NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name        varchar     NOT NULL,           -- e.g. 'Group A', 'Group B'
  label       varchar,                        -- e.g. 'A', 'B', 'C'
  color       varchar     DEFAULT '#6366f1',
  sort_order  integer     DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT judge_groups_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_judge_groups_program_id
  ON public.judge_groups(program_id);

-- Junction: judges ↔ groups
CREATE TABLE IF NOT EXISTS public.judge_group_members (
  group_id    uuid NOT NULL REFERENCES public.judge_groups(id) ON DELETE CASCADE,
  judge_id    uuid NOT NULL REFERENCES public.judges(id)       ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT judge_group_members_pkey PRIMARY KEY (group_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_group_members_judge_id
  ON public.judge_group_members(judge_id);


-- =============================================================================
-- 9. NOTIFICATIONS — ensure read_at column exists (used by mark-as-read handler)
-- =============================================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at timestamptz;


-- =============================================================================
-- 10. ROUNDS — ensure sort_order is indexed for fast ordering
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_rounds_program_id_sort
  ON public.rounds(program_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_rounds_status
  ON public.rounds(status);


-- =============================================================================
-- 11. ROUND_EDGES — add edge metadata columns (if not stored in condition jsonb)
-- =============================================================================
-- The app stores sourceHandle/targetHandle/dataStream/name inside condition jsonb.
-- These explicit columns are added for query-ability and future indexing.
ALTER TABLE public.round_edges
  ADD COLUMN IF NOT EXISTS source_handle varchar,
  ADD COLUMN IF NOT EXISTS target_handle varchar,
  ADD COLUMN IF NOT EXISTS data_stream   varchar,
  ADD COLUMN IF NOT EXISTS name          varchar;


-- =============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
--    Policies for all new tables — org-scoped access pattern.
-- =============================================================================

-- Helper function (create if it doesn't exist already)
CREATE OR REPLACE FUNCTION public.current_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM   public.organization_members
  WHERE  user_id = auth.uid()
    AND  status  = 'active';
$$;

-- ── round_submissions ────────────────────────────────────────────────────────
ALTER TABLE public.round_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "round_submissions_select" ON public.round_submissions;
CREATE POLICY "round_submissions_select"
  ON public.round_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN   public.programs p ON p.id = r.program_id
      WHERE  r.id = round_submissions.round_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

DROP POLICY IF EXISTS "round_submissions_insert" ON public.round_submissions;
CREATE POLICY "round_submissions_insert"
  ON public.round_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN   public.programs p ON p.id = r.program_id
      WHERE  r.id = round_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

DROP POLICY IF EXISTS "round_submissions_update" ON public.round_submissions;
CREATE POLICY "round_submissions_update"
  ON public.round_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN   public.programs p ON p.id = r.program_id
      WHERE  r.id = round_submissions.round_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

DROP POLICY IF EXISTS "round_submissions_delete" ON public.round_submissions;
CREATE POLICY "round_submissions_delete"
  ON public.round_submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN   public.programs p ON p.id = r.program_id
      WHERE  r.id = round_submissions.round_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- ── voting_configs ───────────────────────────────────────────────────────────
ALTER TABLE public.voting_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voting_configs_select_org" ON public.voting_configs;
CREATE POLICY "voting_configs_select_org"
  ON public.voting_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN   public.programs p ON p.id = r.program_id
      WHERE  r.id = voting_configs.round_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

DROP POLICY IF EXISTS "voting_configs_select_public" ON public.voting_configs;
CREATE POLICY "voting_configs_select_public"
  ON public.voting_configs FOR SELECT
  USING (true);   -- Public voting page needs to read this without auth

DROP POLICY IF EXISTS "voting_configs_write" ON public.voting_configs;
CREATE POLICY "voting_configs_write"
  ON public.voting_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN   public.programs p ON p.id = r.program_id
      WHERE  r.id = voting_configs.round_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- ── public_votes ─────────────────────────────────────────────────────────────
ALTER TABLE public.public_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_votes_insert_anon" ON public.public_votes;
CREATE POLICY "public_votes_insert_anon"
  ON public.public_votes FOR INSERT
  WITH CHECK (true);  -- Anyone can vote (limit enforced in app logic)

DROP POLICY IF EXISTS "public_votes_select_anon" ON public.public_votes;
CREATE POLICY "public_votes_select_anon"
  ON public.public_votes FOR SELECT
  USING (true);       -- Vote counts visible publicly

-- ── advancement_events ───────────────────────────────────────────────────────
ALTER TABLE public.advancement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advancement_events_org" ON public.advancement_events;
CREATE POLICY "advancement_events_org"
  ON public.advancement_events FOR ALL
  USING (
    program_id IN (
      SELECT p.id FROM public.programs p
      WHERE  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- ── advancement_details ──────────────────────────────────────────────────────
ALTER TABLE public.advancement_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advancement_details_org" ON public.advancement_details;
CREATE POLICY "advancement_details_org"
  ON public.advancement_details FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.advancement_events ae
      JOIN   public.programs p ON p.id = ae.program_id
      WHERE  ae.id = advancement_details.advancement_event_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- ── judge_groups ──────────────────────────────────────────────────────────────
ALTER TABLE public.judge_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "judge_groups_org" ON public.judge_groups;
CREATE POLICY "judge_groups_org"
  ON public.judge_groups FOR ALL
  USING (
    program_id IN (
      SELECT p.id FROM public.programs p
      WHERE  p.organization_id IN (SELECT current_org_ids())
    )
  );

-- ── judge_group_members ───────────────────────────────────────────────────────
ALTER TABLE public.judge_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "judge_group_members_org" ON public.judge_group_members;
CREATE POLICY "judge_group_members_org"
  ON public.judge_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.judge_groups jg
      JOIN   public.programs p ON p.id = jg.program_id
      WHERE  jg.id = judge_group_members.group_id
        AND  p.organization_id IN (SELECT current_org_ids())
    )
  );


-- =============================================================================
-- 13. SEED — default permissions for the RBAC system
--    Only inserts rows that don't already exist.
-- =============================================================================
INSERT INTO public.permissions (key, name, description, category)
VALUES
  ('view_overview',      'View Overview',        'Access the program overview dashboard',         'Dashboard'),
  ('manage_programs',    'Manage Programs',       'Create, edit, and delete programs',             'Programs'),
  ('view_submissions',   'View Submissions',      'Read submission entries',                       'Submissions'),
  ('manage_submissions', 'Manage Submissions',    'Edit, assign, accept, reject submissions',      'Submissions'),
  ('view_judging',       'View Judging',          'Read judge assignments and scores',             'Judging'),
  ('manage_judging',     'Manage Judging',        'Assign judges, configure scoring',              'Judging'),
  ('manage_forms',       'Manage Forms',          'Create and publish submission forms',           'Forms'),
  ('manage_reach',       'Manage Reach',          'Access email campaigns and social reach tools', 'Reach'),
  ('view_analytics',     'View Analytics',        'Read program analytics and reports',            'Analytics'),
  ('manage_teams',       'Manage Teams',          'Invite and remove team members, manage roles',  'Teams'),
  ('view_logs',          'View Logs',             'Read audit logs',                               'Logs'),
  ('manage_settings',    'Manage Settings',       'Update organization and program settings',      'Settings'),
  ('manage_voting',      'Manage Public Voting',  'Configure and manage public voting rounds',     'Voting')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- 14. TRIGGER — auto-update updated_at on voting_configs
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS voting_configs_updated_at ON public.voting_configs;
CREATE TRIGGER voting_configs_updated_at
  BEFORE UPDATE ON public.voting_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 15. HELPFUL VIEWS (optional — safe to skip if not needed)
-- =============================================================================

-- Round participation summary view
CREATE OR REPLACE VIEW public.round_participation_summary AS
SELECT
  rs.round_id,
  r.title                                             AS round_name,
  r.program_id,
  r.status                                            AS round_status,
  COUNT(*)                                            AS total_enrolled,
  COUNT(*) FILTER (WHERE rs.status = 'active')        AS active_count,
  COUNT(*) FILTER (WHERE rs.status = 'advanced')      AS advanced_count,
  COUNT(*) FILTER (WHERE rs.status = 'eliminated')    AS eliminated_count
FROM   public.round_submissions rs
JOIN   public.rounds r ON r.id = rs.round_id
GROUP  BY rs.round_id, r.title, r.program_id, r.status;


-- =============================================================================
-- Done! Summary of changes:
--
--  NEW TABLES:
--    • round_submissions      — submission ↔ round enrollment (pipeline)
--    • voting_configs         — public voting settings per round
--    • advancement_events     — log of round advancement executions
--    • advancement_details    — per-submission advancement outcomes
--    • judge_groups           — judge groupings for auto-assign
--    • judge_group_members    — junction: judges ↔ groups
--
--  MODIFIED TABLES:
--    • programs               — added active_form_id
--    • public_votes           — added round_id, voter_name, voter_email
--    • submission_judges      — added round_id
--    • round_edges            — added source_handle, target_handle, data_stream, name
--    • notifications          — ensured read_at column exists
--
--  NEW PERMISSIONS SEEDED:
--    view_overview, manage_programs, view_submissions, manage_submissions,
--    view_judging, manage_judging, manage_forms, manage_reach,
--    view_analytics, manage_teams, view_logs, manage_settings, manage_voting
--
--  RLS POLICIES added for all new tables.
-- =============================================================================
