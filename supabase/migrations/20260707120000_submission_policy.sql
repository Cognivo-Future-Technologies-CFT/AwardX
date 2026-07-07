-- Submission Policy: per-program submission limits.
-- Adds fields to control whether participants can submit multiple times.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS allow_multiple_submissions boolean NOT NULL DEFAULT false;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS max_submissions integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.programs.allow_multiple_submissions IS 'When false, each participant may submit only one completed application.';
COMMENT ON COLUMN public.programs.max_submissions IS 'Maximum number of completed submissions per participant when multiple submissions are allowed. Must be >= 1.';
