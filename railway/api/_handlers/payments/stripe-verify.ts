import Stripe from 'stripe';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { stripeVerifySchema } from '../../_utils/validation';
import { logError, logInfo, logWarn } from '../../_utils/logger';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = stripeVerifySchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
    return;
  }

  const { sessionId, submissionId } = parsed.data;

  try {
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      logWarn('payments.stripe_verify.not_paid', { submissionId, sessionId, status: session.payment_status });
      res.status(400).json({ error: 'Payment has not been completed' });
      return;
    }

    const metadataSubmissionId = session.metadata?.submissionId;
    if (metadataSubmissionId && metadataSubmissionId !== submissionId) {
      logWarn('payments.stripe_verify.submission_mismatch', {
        submissionId,
        metadataSubmissionId,
        sessionId,
      });
      res.status(400).json({ error: 'Checkout session does not match this submission' });
      return;
    }

    const supabase = createSupabaseAdmin();
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, payment_id, payment_status')
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.payment_id && submission.payment_id !== sessionId) {
      logWarn('payments.stripe_verify.session_mismatch', {
        submissionId,
        expected: submission.payment_id,
        received: sessionId,
      });
      res.status(400).json({ error: 'Checkout session does not match the submission payment record' });
      return;
    }

    const amountTotal = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;

    const { error } = await supabase
      .from('submissions')
      .update({
        payment_status: 'paid',
        payment_id: sessionId,
        ...(amountTotal !== null ? { payment_amount: amountTotal } : {}),
      })
      .eq('id', submissionId);

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update submission payment status' });
      return;
    }

    logInfo('payments.stripe_verify.success', { submissionId, sessionId });
    res.json({ ok: true, paid: true });
  } catch (error: any) {
    logError('payments.stripe_verify.exception', { message: error?.message, submissionId, sessionId });
    res.status(500).json({ error: error?.message || 'Failed to verify Stripe payment' });
  }
}
