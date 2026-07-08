-- Migration: Group-based submissions
-- Adds support for team/group submissions where a team lead submits on behalf of a team.

BEGIN;

-- 1. Add submission mode and team size config to programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS submission_mode text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS min_team_size integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_team_size integer NOT NULL DEFAULT 5;

-- Constraint: submission_mode must be 'individual' or 'group'
ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_submission_mode_check;
ALTER TABLE public.programs
  ADD CONSTRAINT programs_submission_mode_check
    CHECK (submission_mode IN ('individual', 'group'));

-- Constraint: team sizes must be positive and min <= max
ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_team_size_check;
ALTER TABLE public.programs
  ADD CONSTRAINT programs_team_size_check
    CHECK (min_team_size >= 2 AND max_team_size >= min_team_size AND max_team_size <= 50);


-- 2. Create submission_teams table
CREATE TABLE IF NOT EXISTS public.submission_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  team_lead_id uuid NOT NULL,  -- references auth.users(id)
  submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  invite_code text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'forming', -- forming, ready, submitted, disbanded
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT submission_teams_status_check
    CHECK (status IN ('forming', 'ready', 'submitted', 'disbanded'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_teams_invite_code
  ON public.submission_teams(invite_code);

CREATE INDEX IF NOT EXISTS idx_submission_teams_program
  ON public.submission_teams(program_id);

CREATE INDEX IF NOT EXISTS idx_submission_teams_lead
  ON public.submission_teams(team_lead_id);


-- 3. Create submission_team_members table
CREATE TABLE IF NOT EXISTS public.submission_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.submission_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,  -- references auth.users(id)
  role text NOT NULL DEFAULT 'member', -- lead, member
  joined_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT submission_team_members_role_check
    CHECK (role IN ('lead', 'member')),
  CONSTRAINT submission_team_members_unique_user
    UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_team_members_user
  ON public.submission_team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_submission_team_members_team
  ON public.submission_team_members(team_id);


-- 4. Create team_chat_messages table
CREATE TABLE IF NOT EXISTS public.team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.submission_teams(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,  -- references auth.users(id)
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_team
  ON public.team_chat_messages(team_id, created_at);


-- 5. RLS policies

ALTER TABLE public.submission_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

-- submission_teams: members can read their own teams
DROP POLICY IF EXISTS submission_teams_member_read ON public.submission_teams;
CREATE POLICY submission_teams_member_read ON public.submission_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submission_team_members stm
      WHERE stm.team_id = submission_teams.id
        AND stm.user_id = auth.uid()
    )
  );

-- submission_teams: org members can read all teams in their programs
DROP POLICY IF EXISTS submission_teams_org_read ON public.submission_teams;
CREATE POLICY submission_teams_org_read ON public.submission_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = submission_teams.program_id
        AND p.organization_id IN (SELECT public.current_org_ids())
    )
  );

-- submission_teams: authenticated users can create teams (team lead)
DROP POLICY IF EXISTS submission_teams_insert ON public.submission_teams;
CREATE POLICY submission_teams_insert ON public.submission_teams
  FOR INSERT TO authenticated
  WITH CHECK (team_lead_id = auth.uid());

-- submission_teams: team lead can update their own team
DROP POLICY IF EXISTS submission_teams_lead_update ON public.submission_teams;
CREATE POLICY submission_teams_lead_update ON public.submission_teams
  FOR UPDATE TO authenticated
  USING (team_lead_id = auth.uid())
  WITH CHECK (team_lead_id = auth.uid());

-- submission_team_members: team members can read their team's members
DROP POLICY IF EXISTS submission_team_members_read ON public.submission_team_members;
CREATE POLICY submission_team_members_read ON public.submission_team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submission_team_members my_membership
      WHERE my_membership.team_id = submission_team_members.team_id
        AND my_membership.user_id = auth.uid()
    )
  );

-- submission_team_members: org members can read all
DROP POLICY IF EXISTS submission_team_members_org_read ON public.submission_team_members;
CREATE POLICY submission_team_members_org_read ON public.submission_team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submission_teams st
      JOIN public.programs p ON p.id = st.program_id
      WHERE st.id = submission_team_members.team_id
        AND p.organization_id IN (SELECT public.current_org_ids())
    )
  );

-- submission_team_members: users can insert themselves into a team
DROP POLICY IF EXISTS submission_team_members_insert ON public.submission_team_members;
CREATE POLICY submission_team_members_insert ON public.submission_team_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- submission_team_members: team lead can delete members
DROP POLICY IF EXISTS submission_team_members_lead_delete ON public.submission_team_members;
CREATE POLICY submission_team_members_lead_delete ON public.submission_team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submission_teams st
      WHERE st.id = submission_team_members.team_id
        AND st.team_lead_id = auth.uid()
    )
  );

-- team_chat_messages: team members can read messages
DROP POLICY IF EXISTS team_chat_messages_read ON public.team_chat_messages;
CREATE POLICY team_chat_messages_read ON public.team_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submission_team_members stm
      WHERE stm.team_id = team_chat_messages.team_id
        AND stm.user_id = auth.uid()
    )
  );

-- team_chat_messages: team members can insert messages
DROP POLICY IF EXISTS team_chat_messages_insert ON public.team_chat_messages;
CREATE POLICY team_chat_messages_insert ON public.team_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.submission_team_members stm
      WHERE stm.team_id = team_chat_messages.team_id
        AND stm.user_id = auth.uid()
    )
  );


-- 6. Enable Realtime for team chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;


-- 7. Function to check if team chat is still active (announcement round not ended)
CREATE OR REPLACE FUNCTION public.is_team_chat_active(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
  v_announcement_ended boolean;
BEGIN
  -- Get the program_id for this team
  SELECT program_id INTO v_program_id
  FROM public.submission_teams
  WHERE id = p_team_id;

  IF v_program_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if any announcement round has status 'completed'
  SELECT EXISTS (
    SELECT 1 FROM public.rounds r
    WHERE r.program_id = v_program_id
      AND r.type = 'announcement'
      AND r.status = 'completed'
  ) INTO v_announcement_ended;

  -- Chat is active if no announcement round has completed
  RETURN NOT v_announcement_ended;
END;
$$;

REVOKE ALL ON FUNCTION public.is_team_chat_active(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_team_chat_active(uuid) TO authenticated;

COMMIT;
