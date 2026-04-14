import crypto from 'crypto';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { razorpayVerifySchema } from '../_utils/validation';
import { logError, logInfo, logWarn } from '../_utils/logger';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = razorpayVerifySchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!razorpaySecret) {
    res.status(500).json({ error: 'RAZORPAY_KEY_SECRET not configured' });
    return;
  }

  const { submissionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  try {
    const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(signaturePayload)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      logWarn('payments.razorpay_verify.signature_mismatch', { submissionId, razorpayOrderId });
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    const supabase = createSupabaseAdmin();

    // Verify that the submission's stored payment_id matches the Razorpay order
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, payment_id')
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      logWarn('payments.razorpay_verify.submission_not_found', { submissionId });
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.payment_id !== razorpayOrderId) {
      logWarn('payments.razorpay_verify.order_mismatch', {
        submissionId,
        expected: submission.payment_id,
        received: razorpayOrderId,
      });
      res.status(400).json({ error: 'Razorpay order ID does not match the submission' });
      return;
    }

    const { error } = await supabase
      .from('submissions')
      .update({
        payment_status: 'paid',
        payment_id: razorpayPaymentId,
      })
      .eq('id', submissionId);

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update submission payment status' });
      return;
    }

    logInfo('payments.razorpay_verify.success', { submissionId, razorpayPaymentId });
    res.json({ ok: true });
  } catch (error: any) {
    logError('payments.razorpay_verify.exception', { message: error?.message, submissionId });
    res.status(500).json({ error: error?.message || 'Failed to verify Razorpay payment' });
  }
}
