import Stripe from 'stripe';
import Razorpay from 'razorpay';
import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { createCheckoutSchema } from '../../_utils/validation';
import { logError, logInfo, logWarn } from '../../_utils/logger';
import { resolveEffectivePaymentProgramId } from '../../_utils/programIntegrations';
const toMinorUnits = (amount) => Math.max(0, Math.round(amount * 100));
const resolveCheckoutCurrency = (provider, dbCurrency, clientCurrency) => {
    const normalizedProvider = String(provider || 'stripe').toLowerCase();
    const fromDb = String(dbCurrency || '').trim().toUpperCase();
    if (fromDb)
        return fromDb;
    const fromClient = String(clientCurrency || '').trim().toUpperCase();
    if (fromClient)
        return fromClient;
    return normalizedProvider === 'razorpay' ? 'INR' : 'USD';
};
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
        res.status(401).json({ error: authError || 'Unauthorized' });
        return;
    }
    const ip = getClientIp(req);
    const rateLimit = enforceRateLimit(`create-checkout:${ip}`, 20, 15 * 60 * 1000);
    if (!rateLimit.ok) {
        res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
        logWarn('payments.create_checkout.rate_limited', { ip });
        res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
        return;
    }
    const parsed = createCheckoutSchema.safeParse(req.body || {});
    if (!parsed.success) {
        logWarn('payments.create_checkout.invalid_payload', { details: parsed.error.flatten() });
        res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
        return;
    }
    const { submissionId, programId, formId, currency } = parsed.data;
    try {
        const supabase = createSupabaseAdmin();
        const effectiveProgramId = await resolveEffectivePaymentProgramId(supabase, programId);
        const { data: paymentConfig, error: paymentConfigError } = await supabase
            .from('program_payment_configs')
            .select('enabled, fee_amount, currency, provider, public_key, secret_key_encrypted')
            .eq('program_id', effectiveProgramId)
            .maybeSingle();
        if (paymentConfigError) {
            logError('payments.create_checkout.payment_config_error', { message: paymentConfigError.message, programId });
            res.status(500).json({ error: paymentConfigError.message || 'Failed to load payment configuration' });
            return;
        }
        if (!paymentConfig?.enabled) {
            logWarn('payments.create_checkout.not_enabled', { programId });
            res.status(400).json({ error: 'Payments are not enabled for this program' });
            return;
        }
        const provider = String(paymentConfig.provider || 'stripe').toLowerCase();
        const feeAmount = Number(paymentConfig.fee_amount || 0);
        const amount = toMinorUnits(feeAmount);
        const checkoutCurrency = resolveCheckoutCurrency(provider, paymentConfig.currency, currency);
        if (amount <= 0) {
            res.status(400).json({ error: 'Submission fee is not configured' });
            return;
        }
        const { data: submission } = await supabase
            .from('submissions')
            .select('id, title, payment_status')
            .eq('id', submissionId)
            .maybeSingle();
        if (!submission) {
            logWarn('payments.create_checkout.submission_not_found', { submissionId, programId });
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        // Verify the authenticated user owns this submission
        const { data: fullSubmission } = await supabase
            .from('submissions')
            .select('applicant_id')
            .eq('id', submissionId)
            .maybeSingle();
        if (fullSubmission?.applicant_id && fullSubmission.applicant_id !== user.id) {
            logWarn('payments.create_checkout.not_owner', { submissionId, userId: user.id });
            res.status(403).json({ error: 'You can only pay for your own submissions' });
            return;
        }
        if (submission.payment_status === 'paid') {
            logWarn('payments.create_checkout.already_paid', { submissionId });
            res.status(409).json({ error: 'Submission has already been paid' });
            return;
        }
        const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : undefined;
        const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || requestOrigin || 'http://localhost:3000';
        const successPath = formId
            ? `/form/${formId}?payment=success&submission_id=${submissionId}&session_id={CHECKOUT_SESSION_ID}`
            : `/dashboard?payment=success&submission_id=${submissionId}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelPath = formId
            ? `/form/${formId}?payment=cancelled`
            : '/dashboard?payment=cancelled';
        if (provider === 'razorpay') {
            const razorpayKeyId = paymentConfig.public_key || process.env.RAZORPAY_KEY_ID || '';
            const razorpayKeySecret = paymentConfig.secret_key_encrypted || process.env.RAZORPAY_KEY_SECRET || '';
            if (!razorpayKeyId || !razorpayKeySecret) {
                res.status(500).json({ error: 'RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not configured' });
                return;
            }
            const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
            const order = await razorpay.orders.create({
                amount,
                currency: checkoutCurrency,
                receipt: submissionId,
                notes: {
                    submissionId,
                    programId,
                    formId: formId || '',
                },
            });
            await supabase
                .from('submissions')
                .update({
                payment_id: order.id,
                payment_amount: feeAmount,
                payment_status: 'pending',
            })
                .eq('id', submissionId);
            logInfo('payments.create_checkout.razorpay_order_created', {
                submissionId,
                programId,
                orderId: order.id,
            });
            res.json({
                ok: true,
                provider: 'razorpay',
                orderId: order.id,
                amount,
                currency: checkoutCurrency,
                keyId: razorpayKeyId,
                name: 'Submission Fee',
                description: submission.title || 'Program submission',
                prefill: {},
                notes: { submissionId, programId },
                successPath,
                cancelPath,
            });
            return;
        }
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
        if (!stripeSecretKey) {
            res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
            return;
        }
        const stripe = new Stripe(stripeSecretKey);
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            success_url: `${siteUrl}${successPath}`,
            cancel_url: `${siteUrl}${cancelPath}`,
            currency: checkoutCurrency.toLowerCase(),
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: checkoutCurrency.toLowerCase(),
                        unit_amount: amount,
                        product_data: {
                            name: 'Submission Fee',
                            description: submission.title || 'Program submission',
                        },
                    },
                },
            ],
            metadata: {
                submissionId,
                programId,
                formId: formId || '',
            },
        });
        await supabase
            .from('submissions')
            .update({
            payment_id: session.id,
            payment_amount: feeAmount,
            payment_status: 'pending',
        })
            .eq('id', submissionId);
        logInfo('payments.create_checkout.stripe_session_created', {
            submissionId,
            programId,
            sessionId: session.id,
        });
        res.json({
            ok: true,
            provider: 'stripe',
            sessionId: session.id,
            url: session.url,
        });
    }
    catch (error) {
        logError('payments.create_checkout.exception', { message: error?.message, submissionId, programId });
        res.status(500).json({ error: error?.message || 'Failed to create checkout session' });
    }
}
