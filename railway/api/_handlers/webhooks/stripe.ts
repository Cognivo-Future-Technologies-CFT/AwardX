import Stripe from 'stripe';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { stripeWebhookFallbackSchema } from '../../_utils/validation';
import { logError, logInfo, logWarn } from '../../_utils/logger';
import { deriveStripeConnectStatus } from '../../_utils/stripeConnect';

const readRawBody = async (req: any): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body);
  }
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const markSubmissionPaid = async (submissionId: string, paymentId: string, amountTotal?: number | null) => {
  const supabase = createSupabaseAdmin();
  const normalizedAmount = typeof amountTotal === 'number' ? amountTotal / 100 : null;

  await supabase
    .from('submissions')
    .update({
      payment_status: 'paid',
      payment_id: paymentId,
      ...(normalizedAmount !== null ? { payment_amount: normalizedAmount } : {}),
    })
    .eq('id', submissionId);
};

const markSubmissionFailed = async (submissionId: string, paymentId: string) => {
  const supabase = createSupabaseAdmin();
  await supabase
    .from('submissions')
    .update({
      payment_status: 'failed',
      payment_id: paymentId,
    })
    .eq('id', submissionId);
};

const syncConnectedAccount = async (account: Stripe.Account) => {
  const supabase = createSupabaseAdmin();
  const status = deriveStripeConnectStatus(account);

  await supabase
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
    .eq('provider', 'stripe')
    .eq('provider_account_id', account.id);

  return status;
};

const markAccountDeauthorized = async (accountId: string) => {
  const supabase = createSupabaseAdmin();
  await supabase
    .from('program_payment_configs')
    .update({
      connected: false,
      onboarding_completed: false,
      provider_metadata: {
        accountId,
        deauthorizedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'stripe')
    .eq('provider_account_id', accountId);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    let event: Stripe.Event;

    if (!webhookSecret) {
      logWarn('payments.stripe_webhook.secret_not_configured', {});
      res.status(400).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured; cannot verify webhook signature' });
      return;
    }

    if (typeof signature !== 'string') {
      logWarn('payments.stripe_webhook.missing_signature', {});
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const submissionId = session.metadata?.submissionId;
      if (submissionId) {
        await markSubmissionPaid(submissionId, String(session.payment_intent || session.id), session.amount_total);
        logInfo('payments.stripe_webhook.payment_succeeded', { submissionId, sessionId: session.id });
      }
    }

    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const submissionId = session.metadata?.submissionId;
      if (submissionId) {
        await markSubmissionFailed(submissionId, String(session.payment_intent || session.id));
        logWarn('payments.stripe_webhook.payment_failed', { submissionId, sessionId: session.id });
      }
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      const status = await syncConnectedAccount(account);
      logInfo('payments.stripe_webhook.account_updated', {
        accountId: account.id,
        connected: status.connected,
        onboardingCompleted: status.onboardingCompleted,
      });
    }

    if (event.type === 'account.application.deauthorized') {
      const payload = event.data.object as { account?: string };
      if (payload?.account) {
        await markAccountDeauthorized(payload.account);
        logWarn('payments.stripe_webhook.account_deauthorized', {
          accountId: payload.account,
        });
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    logError('payments.stripe_webhook.exception', { message: error?.message });
    res.status(400).json({ error: error?.message || 'Webhook error' });
  }
}
