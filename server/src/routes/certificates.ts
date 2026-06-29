/**
 * Certificate Routes
 *
 * - POST /:programId/send — email certificates, record delivery with verification codes
 * - GET /verify/:code — public verification page (renders certificate on demand)
 * - GET /:programId/deliveries — list delivery statuses for a program
 * - GET /:programId/overrides — list participant override values for certificates
 * - PUT /:programId/overrides/:submissionId — upsert participant override values
 * - DELETE /:programId/overrides/:submissionId — remove participant override values
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { requireProgramAccess } from '../middleware/programAccess.js';
import { getSupabaseAdmin } from '../supabase.js';
import {
	getOrgResendMailer,
	RESEND_NOT_CONFIGURED_MESSAGE,
} from '../services/orgResend.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

function generateVerificationCode(): string {
	return crypto.randomBytes(16).toString('hex');
}

/**
 * POST /:programId/send
 * Body: { recipients: [{ email, name, submissionId, certificateType, roundsCleared, totalRounds, certificateDataUrl }] }
 * Records a delivery row per recipient and emails the certificate.
 */
router.post('/:programId/send', requireAuth, requireProgramAccess('programId'), rateLimit({ windowMs: 60_000, max: 60 }), async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	const { recipients } = req.body || {};

	if (!Array.isArray(recipients) || !recipients.length) {
		return res.status(400).json({ error: 'recipients array is required' });
	}

	const supabase = getSupabaseAdmin();

	const { data: program } = await supabase
		.from('programs')
		.select('id, title, organization_id')
		.eq('id', programId)
		.maybeSingle();

	if (!program) return res.status(404).json({ error: 'Program not found' });

	const mailer = await getOrgResendMailer(supabase, program.organization_id);
	if (!mailer) return res.status(503).json({ error: RESEND_NOT_CONFIGURED_MESSAGE });

	const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

	const results: Array<{ email: string; success: boolean; verificationCode?: string; error?: string }> = [];

	for (const recipient of recipients) {
		const { email, name, submissionId, certificateType, roundsCleared, totalRounds, certificateDataUrl } = recipient;
		if (!email || !certificateDataUrl) {
			results.push({ email: email || 'unknown', success: false, error: 'Missing email or certificate data' });
			continue;
		}

		const verificationCode = generateVerificationCode();

		try {
			const base64Data = certificateDataUrl.split(',')[1];
			const buffer = Buffer.from(base64Data, 'base64');

			const verifyUrl = `${siteUrl}/certificates/verify/${verificationCode}`;

			await mailer.resend.emails.send({
				from: mailer.from,
				to: email,
				subject: `Your Certificate — ${program.title}`,
				html: `
					<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
						<h2 style="color: #1e293b;">Congratulations, ${name || 'Participant'}!</h2>
						<p style="color: #475569;">Please find your certificate for <strong>${program.title}</strong> attached below.</p>
						<p style="color: #475569; margin-top: 16px;">You can verify this certificate at any time:</p>
						<p><a href="${verifyUrl}" style="color: #4f46e5; text-decoration: underline;">${verifyUrl}</a></p>
						<p style="color: #64748b; font-size: 14px; margin-top: 24px;">Thank you for your participation.</p>
					</div>
				`,
				attachments: [
					{
						filename: `certificate-${(name || 'participant').replace(/\s+/g, '_')}.png`,
						content: buffer,
					},
				],
			});

			// Record delivery
			await supabase.from('certificate_deliveries').insert({
				program_id: programId,
				submission_id: submissionId,
				recipient_email: email,
				recipient_name: name || 'Participant',
				certificate_type: certificateType || 'participation',
				rounds_cleared: roundsCleared || 0,
				total_rounds: totalRounds || 0,
				verification_code: verificationCode,
			});

			results.push({ email, success: true, verificationCode });
		} catch (err: any) {
			results.push({ email, success: false, error: err?.message || 'Send failed' });
		}
	}

	const sent = results.filter((r) => r.success).length;
	return res.json({ sent, total: recipients.length, results });
});

/**
 * GET /:programId/deliveries
 * Returns all delivery records for the program (for the dashboard to show delivered status).
 */
router.get('/:programId/deliveries', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	const supabase = getSupabaseAdmin();

	const { data, error } = await supabase
		.from('certificate_deliveries')
		.select('id, submission_id, recipient_email, recipient_name, certificate_type, verification_code, delivered_at')
		.eq('program_id', programId)
		.order('delivered_at', { ascending: false });

	if (error) return res.status(500).json({ error: error.message });
	return res.json({ deliveries: data || [] });
});

/**
 * GET /:programId/overrides
 * Returns participant-level certificate overrides for round label and round counts.
 */
router.get('/:programId/overrides', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	const supabase = getSupabaseAdmin();

	const { data, error } = await supabase
		.from('certificate_participant_overrides')
		.select('submission_id, round_label, rounds_cleared, total_rounds, updated_at')
		.eq('program_id', programId)
		.order('updated_at', { ascending: false });

	if (error) return res.status(500).json({ error: error.message });
	return res.json({ overrides: data || [] });
});

/**
 * PUT /:programId/overrides/:submissionId
 * Body: { roundLabel?: string, roundsCleared?: number, totalRounds?: number }
 */
router.put('/:programId/overrides/:submissionId', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId, submissionId } = req.params;
	const supabase = getSupabaseAdmin();

	const roundLabel = typeof req.body?.roundLabel === 'string' ? req.body.roundLabel.trim() : null;
	const roundsClearedRaw = req.body?.roundsCleared;
	type NumericLike = number | string | null | undefined;
	const toNullableInt = (value: NumericLike): number | null => {
		if (value === null || value === undefined || value === '') return null;
		const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
		if (!Number.isFinite(parsed) || parsed < 0) return null;
		return Math.floor(parsed);
	};

	const roundsCleared = toNullableInt(roundsClearedRaw);
	const totalRounds = toNullableInt(req.body?.totalRounds);

	if (!submissionId) return res.status(400).json({ error: 'submissionId is required' });
	if (roundsClearedRaw !== undefined && roundsCleared === null) return res.status(400).json({ error: 'roundsCleared must be a non-negative integer' });
	if (req.body?.totalRounds !== undefined && totalRounds === null) return res.status(400).json({ error: 'totalRounds must be a non-negative integer' });
	if (roundsCleared !== null && totalRounds !== null && roundsCleared > totalRounds) {
		return res.status(400).json({ error: 'roundsCleared cannot be greater than totalRounds' });
	}

	const payload = {
		program_id: programId,
		submission_id: submissionId,
		round_label: roundLabel && roundLabel.length ? roundLabel : null,
		rounds_cleared: roundsCleared,
		total_rounds: totalRounds,
		updated_by: req.user?.id || null,
	};

	const { data, error } = await supabase
		.from('certificate_participant_overrides')
		.upsert(payload, { onConflict: 'program_id,submission_id' })
		.select('submission_id, round_label, rounds_cleared, total_rounds, updated_at')
		.single();

	if (error) return res.status(500).json({ error: error.message });
	return res.json({ override: data });
});

/**
 * DELETE /:programId/overrides/:submissionId
 * Removes participant override and falls back to schedule-derived values.
 */
router.delete('/:programId/overrides/:submissionId', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId, submissionId } = req.params;
	const supabase = getSupabaseAdmin();

	if (!submissionId) return res.status(400).json({ error: 'submissionId is required' });

	const { error } = await supabase
		.from('certificate_participant_overrides')
		.delete()
		.eq('program_id', programId)
		.eq('submission_id', submissionId);

	if (error) return res.status(500).json({ error: error.message });
	return res.json({ ok: true });
});

/**
 * GET /verify/:code
 * Public endpoint — returns certificate metadata for verification.
 * No auth required. The frontend renders the certificate from this data.
 */
router.get('/verify/:code', async (req: Request, res: Response) => {
	const { code } = req.params;
	const supabase = getSupabaseAdmin();

	const { data, error } = await supabase
		.from('certificate_deliveries')
		.select('id, program_id, recipient_name, recipient_email, certificate_type, rounds_cleared, total_rounds, delivered_at')
		.eq('verification_code', code)
		.maybeSingle();

	if (!data) return res.status(404).json({ error: 'Certificate not found or invalid code' });

	// Get program title
	const { data: program } = await supabase
		.from('programs')
		.select('title')
		.eq('id', data.program_id)
		.maybeSingle();

	return res.json({
		valid: true,
		recipientName: data.recipient_name,
		certificateType: data.certificate_type,
		roundsCleared: data.rounds_cleared,
		totalRounds: data.total_rounds,
		programTitle: program?.title || 'Awards Program',
		issuedAt: data.delivered_at,
	});
});

export default router;
