-- Allow DIDIT as an organization-level integration provider

ALTER TABLE public.organization_integrations
  DROP CONSTRAINT IF EXISTS organization_integrations_provider_check;

ALTER TABLE public.organization_integrations
  ADD CONSTRAINT organization_integrations_provider_check
  CHECK (provider IN ('resend', 'didit'));
