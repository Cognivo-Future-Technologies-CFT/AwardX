-- SQL changes for 2026 workspace scoping
-- Add program_id to judges
ALTER TABLE public.judges
  ADD COLUMN program_id uuid;

ALTER TABLE public.judges
  ADD CONSTRAINT judges_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.programs(id);

-- Add program_id to organization_invites
ALTER TABLE public.organization_invites
  ADD COLUMN program_id uuid;

ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.programs(id);

-- Add program_id to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN program_id uuid;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.programs(id);

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_org_user_program_key
  UNIQUE (organization_id, user_id, program_id);

-- Add program_id to roles
ALTER TABLE public.roles
  ADD COLUMN program_id uuid;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.programs(id);
