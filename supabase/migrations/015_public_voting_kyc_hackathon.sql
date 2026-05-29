-- Public voting slugs, access control, DIDIT KYC, hackathon application mode

ALTER TABLE public.voting_configs
  ADD COLUMN IF NOT EXISTS public_voting_slug character varying,
  ADD COLUMN IF NOT EXISTS access_mode character varying DEFAULT 'open'
    CHECK (access_mode IN ('open', 'org_only', 'authenticated'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_voting_configs_public_slug
  ON public.voting_configs (public_voting_slug)
  WHERE public_voting_slug IS NOT NULL;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS kyc_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_provider character varying DEFAULT 'didit',
  ADD COLUMN IF NOT EXISTS application_mode character varying DEFAULT 'standard'
    CHECK (application_mode IN ('standard', 'hackathon')),
  ADD COLUMN IF NOT EXISTS require_github_auth boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider character varying NOT NULL DEFAULT 'didit',
  status character varying NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  provider_session_id character varying,
  metadata jsonb DEFAULT '{}',
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kyc_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT kyc_verifications_program_user UNIQUE (program_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_program ON public.kyc_verifications(program_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user ON public.kyc_verifications(user_id);

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_verifications_select_own" ON public.kyc_verifications;
CREATE POLICY "kyc_verifications_select_own"
  ON public.kyc_verifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_verifications_insert_own" ON public.kyc_verifications;
CREATE POLICY "kyc_verifications_insert_own"
  ON public.kyc_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_verifications_update_own" ON public.kyc_verifications;
CREATE POLICY "kyc_verifications_update_own"
  ON public.kyc_verifications FOR UPDATE
  USING (auth.uid() = user_id);
