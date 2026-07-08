import Stripe from 'stripe';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { stripeConnectStatusSchema } from '../../_utils/validation';
import { deriveStripeConnectStatus } from '../../_utils/stripeConnect';
import { logError, logInfo, logWarn } from '../../_utils/logger';
import { resolveEffectivePaymentProgramId } from '../../_utils/programIntegrations';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    res.status(401).json({ error: authError || 'Unauthorized' });
    return;
  }

  const parseResult = stripeConnectStatusSchema.safeParse({ programId: req.query?.programId });
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid program id', details: parseResult.error.flatten() });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  const { programId } = parseResult.data;

  try {
    const supabase = createSupabaseAdmin();

    // Verify the user is a member of the program's organization
    const { data: program } = await supabase
      .from('programs')
      .select('organization_id')
      .eq('id', programId)
      .maybeSingle();

    if (!program) {
      res.status(404).json({ error: 'Program not found' });
      return;
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', program.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this program\'s organization' });
      return;
    }

    const effectiveProgramId = await resolveEffectivePaymentProgramId(supabase, programId);
    const { data: paymentConfig, error: configError } = await supabase
      .from('program_payment_configs')
      .select('id, provider, provider_account_id, connected, onboarding_completed')
      .eq('program_id', effectiveProgramId)
      .maybeSingle();

    if (configError) {
      res.status(500).json({ error: configError.message || 'Failed to load payment configuration' });
      return;
    }

    if (!paymentConfig || String(paymentConfig.provider || '').toLowerCase() !== 'stripe') {
      logWarn('payments.stripe_connect_status.not_stripe', { programId });
      res.status(404).json({ error: 'Stripe payment configuration not found for this program' });
      return;
    }

    if (!paymentConfig.provider_account_id) {
      res.json({
        ok: true,
        connected: false,
        onboardingCompleted: false,
        accountId: null,
      });
      return;
    }

    const account = await stripe.accounts.retrieve(paymentConfig.provider_account_id);
    const status = deriveStripeConnectStatus(account);

    const { error: updateError } = await supabase
      .from('program_payment_configs')
      .update({
        connected: status.connected,
        onboarding_completed: status.onboardingCompleted,
        provider_metadata: {
          accountId: account.id,
          accountType: account.type,
          country: account.country,
          defaultCurrency: account.default_currency,
          ...status,
          syncedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('program_id', programId);

    if (updateError) {
      res.status(500).json({ error: updateError.message || 'Failed to persist Stripe status' });
      return;
    }

    logInfo('payments.stripe_connect_status.reconciled', {
      programId,
      accountId: account.id,
      connected: status.connected,
    });

    res.json({
      ok: true,
      accountId: account.id,
      ...status,
    });
  } catch (error: any) {
    logError('payments.stripe_connect_status.exception', { message: error?.message, programId });
    res.status(500).json({ error: error?.message || 'Failed to reconcile Stripe account status' });
  }
}
