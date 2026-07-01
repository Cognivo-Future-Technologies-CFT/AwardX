/**
 * Certificate Routes
 *
 * - POST /:programId/send — email certificates, record delivery with verification codes
 * - GET /verify/:code — public verification page (renders certificate on demand)
 * - GET /:programId/deliveries — list delivery statuses for a program
 * - GET /:programId/certificate-round-labels — list global certificate display labels for rounds
 * - PUT /:programId/certificate-round-labels/:roundId — upsert a global certificate display label for a round
 * - DELETE /:programId/certificate-round-labels/:roundId — remove a global certificate display label
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
 * GET /:programId/certificate-round-labels
 * Returns global certificate display labels for rounds.
 */
router.get('/:programId/certificate-round-labels', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	const supabase = getSupabaseAdmin();

	const { data, error } = await supabase
		.from('certificate_round_display_labels')
		.select('round_id, certificate_display_name, updated_at')
		.eq('program_id', programId);

	if (error) return res.status(500).json({ error: error.message });
	return res.json({ labels: data || [] });
});

/**
 * PUT /:programId/certificate-round-labels/:roundId
 * Body: { certificateDisplayName: string }
 */
router.put('/:programId/certificate-round-labels/:roundId', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId, roundId } = req.params;
	const supabase = getSupabaseAdmin();

	const certificateDisplayName = typeof req.body?.certificateDisplayName === 'string' ? req.body.certificateDisplayName.trim() : null;

	if (!roundId) return res.status(400).json({ error: 'roundId is required' });
	if (!certificateDisplayName) return res.status(400).json({ error: 'certificateDisplayName is required' });

	const payload = {
		program_id: programId,
		round_id: roundId,
		certificate_display_name: certificateDisplayName,
	};

	const { data, error } = await supabase
		.from('certificate_round_display_labels')
		.upsert(payload, { onConflict: 'program_id,round_id' })
		.select('round_id, certificate_display_name, updated_at')
		.single();

	if (error) return res.status(500).json({ error: error.message });
	return res.json({ label: data });
});

/**
 * DELETE /:programId/certificate-round-labels/:roundId
 * Removes the global certificate display label for a round.
 */
router.delete('/:programId/certificate-round-labels/:roundId', requireAuth, requireProgramAccess('programId'), async (req: AuthenticatedRequest, res) => {
	const { programId, roundId } = req.params;
	const supabase = getSupabaseAdmin();

	if (!roundId) return res.status(400).json({ error: 'roundId is required' });

	const { error } = await supabase
		.from('certificate_round_display_labels')
		.delete()
		.eq('program_id', programId)
		.eq('round_id', roundId);

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
		.select('id, program_id, submission_id, recipient_name, recipient_email, certificate_type, rounds_cleared, total_rounds, delivered_at')
		.eq('verification_code', code)
		.maybeSingle();

	if (!data) return res.status(404).json({ error: 'Certificate not found or invalid code' });

	// Get program title
	const { data: program } = await supabase
		.from('programs')
		.select('title')
		.eq('id', data.program_id)
		.maybeSingle();

	let roundTitle = null;

	const { data: rounds } = await supabase
		.from('rounds')
		.select('id, title')
		.eq('program_id', data.program_id)
		.order('sort_order', { ascending: true });
		
	if (rounds && rounds.length > 0) {
		let activeRound = null;
		if (data.certificate_type === 'winner') {
			activeRound = rounds[rounds.length - 1];
		} else if (data.certificate_type === 'round_advance') {
			const clearedCount = Math.min(data.rounds_cleared, rounds.length);
			if (clearedCount > 0) {
				activeRound = rounds[clearedCount - 1];
			}
		} else {
			activeRound = rounds[0];
		}

		if (activeRound) {
			const { data: globalLabel } = await supabase
				.from('certificate_round_display_labels')
				.select('certificate_display_name')
				.eq('program_id', data.program_id)
				.eq('round_id', activeRound.id)
				.maybeSingle();

			roundTitle = globalLabel?.certificate_display_name || activeRound.title;
		}
	}

	return res.json({
		valid: true,
		recipientName: data.recipient_name,
		certificateType: data.certificate_type,
		roundsCleared: data.rounds_cleared,
		totalRounds: data.total_rounds,
		programTitle: program?.title || 'Awards Program',
		roundTitle: roundTitle || null,
		issuedAt: data.delivered_at,
	});
});

export default router;
