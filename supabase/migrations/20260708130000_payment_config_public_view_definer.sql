-- Public payment config view must bypass RLS so applicants can read fee/currency
-- without org membership. Only non-secret columns are exposed.
CREATE OR REPLACE VIEW public.program_payment_configs_public
WITH (security_invoker = false) AS
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

GRANT SELECT ON public.program_payment_configs_public TO anon, authenticated;

-- ponytail: existing Razorpay rows should already be INR; normalize any stragglers
UPDATE public.program_payment_configs
SET currency = 'INR'
WHERE lower(provider) = 'razorpay'
  AND upper(coalesce(currency, '')) <> 'INR';
