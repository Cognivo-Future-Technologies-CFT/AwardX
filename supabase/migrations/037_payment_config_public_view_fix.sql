-- Fix: program_payment_configs_public view must be accessible to anon users
-- for the public form submission page to display payment info.
-- The view intentionally excludes secret keys and only exposes safe fields.
-- Change from security_invoker (which applies RLS of the caller) to
-- security_definer (runs as view owner, bypassing the anon-deny policy).

CREATE OR REPLACE VIEW public.program_payment_configs_public
WITH (security_barrier = true) AS
SELECT
  program_id,
  enabled,
  provider,
  currency,
  fee_amount,
  connected,
  public_key,
  onboarding_completed,
  (coalesce(secret_key_encrypted, secret_key) IS NOT NULL) AS has_secret_key
FROM public.program_payment_configs;

-- Ensure both anon and authenticated can read the public view
GRANT SELECT ON public.program_payment_configs_public TO anon, authenticated;
