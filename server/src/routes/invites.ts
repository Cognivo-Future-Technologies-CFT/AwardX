import { Router } from 'express';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase.js';
import { getOrgResendMailer } from '../services/orgResend.js';
import { enforceRateLimit, getClientIp } from '../../../lib/routeRateLimit.js';
import { normalizeInviteToken } from '../../../lib/inviteToken.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';
import { verifyJudgeInvite } from '../../../lib/handlers/verifyJudgeInvite.js';
import { verifyTeamInviteGet, verifyTeamInvitePost } from '../../../lib/handlers/teamInviteVerify.js';
import { sendJudgeInvite } from '../../../lib/handlers/sendJudgeInvite.js';
import { sendTeamInvite } from '../../../lib/handlers/sendTeamInvite.js';
import { resendInvite } from '../../../lib/handlers/resendInvite.js';
import {
	judgeInviteSchema,
	resendInviteSchema,
	teamInviteSchema,
} from '../../../lib/inviteSchemas.js';

const router = Router();

async function getAuthUser(req: any) {
	const authHeader = req.headers?.authorization || '';
	if (!authHeader.startsWith('Bearer ')) return null;
	const token = authHeader.slice(7).trim();
	if (!token) return null;
	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase.auth.getUser(token);
		if (error || !data?.user) return null;
		return { user: data.user, token };
	} catch {
		return null;
	}
}

async function insertNotificationSafe(
	supabase: any,
	payload: {
		organizationId: string;
		programId?: string | null;
		recipientUserId?: string | null;
		type: string;
		title: string;
		body: string;
		metadata?: Record<string, any>;
	},
) {
	try {
		await supabase.from('notifications').insert({
			organization_id: payload.organizationId,
			program_id: payload.programId || null,
			recipient_user_id: payload.recipientUserId || null,
			type: payload.type,
			title: payload.title,
			body: payload.body,
			metadata: payload.metadata || {},
		});
	} catch {
		// Notifications are best-effort and should never break invite flows.
	}
}

async function handleVerifyJudge(req: any, res: any) {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const ip = getClientIp(req);
		const rl = enforceRateLimit(`verify-judge:${ip}`, 20, 15 * 60 * 1000);
		if (!rl.ok) {
			return applyServiceResult(res, {
				status: 429,
				body: { error: 'Rate limit exceeded. Try again later.' },
				headers: { 'Retry-After': String(rl.retryAfterSeconds) },
			});
		}

		const tokenCandidate = req.method === 'GET'
			? String(req.query?.token || '')
			: String(req.body?.token || '');
		const token = normalizeInviteToken(tokenCandidate);
		if (!token) {
			return res.status(400).json({ error: 'Invalid token format' });
		}

		const result = await verifyJudgeInvite(getSupabaseAdmin(), {
			method: req.method as 'GET' | 'POST',
			token,
			action: req.body?.action,
		});
		return applyServiceResult(res, result);
	} catch (error: any) {
		console.error('Verify judge error:', error);
		return res.status(500).json({ error: error?.message || 'Internal server error' });
	}
}

router.get('/verify-judge', handleVerifyJudge);
router.post('/verify-judge', handleVerifyJudge);

// List programs the authenticated user has been invited to judge (by email match).
router.get('/my-judge-invites', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const authResult = await getAuthUser(req);
		if (!authResult?.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const email = String(authResult.user.email || '').toLowerCase().trim();
		if (!email) {
			return res.json({ ok: true, invites: [] });
		}

		const supabase = getSupabaseAdmin();
		const { data: judgeRows, error: judgesErr } = await supabase
			.from('judges')
			.select('id, name, email, status, accepted_at, invite_token, program_id, organization_id')
			.ilike('email', email);

		if (judgesErr) {
			return res.status(500).json({ error: judgesErr.message || 'Failed to load judge invites' });
		}

		const rows = judgeRows || [];
		const programIds = Array.from(new Set(rows.map((r: any) => r.program_id).filter(Boolean)));
		const orgIds = Array.from(new Set(rows.map((r: any) => r.organization_id).filter(Boolean)));

		const [programsRes, orgsRes] = await Promise.all([
			programIds.length > 0
				? supabase
						.from('programs')
						.select('id, title, slug, description, cover_image_url, status, deadline, industry_category')
						.in('id', programIds)
				: Promise.resolve({ data: [] }),
			orgIds.length > 0
				? supabase.from('organizations').select('id, name, logo_url').in('id', orgIds)
				: Promise.resolve({ data: [] }),
		]);

		const programMap = new Map<string, any>(((programsRes.data as any[]) || []).map((p) => [p.id, p]));
		const orgMap = new Map<string, any>(((orgsRes.data as any[]) || []).map((o) => [o.id, o]));

		const invites = rows.map((r: any) => {
			const program = programMap.get(r.program_id) || null;
			const organization = orgMap.get(r.organization_id) || null;
			return {
				judgeId: r.id,
				status: r.status,
				acceptedAt: r.accepted_at,
				inviteToken: r.invite_token,
				program: program ? {
					id: program.id,
					title: program.title,
					slug: program.slug,
					description: program.description,
					coverImageUrl: program.cover_image_url,
					status: program.status,
					deadline: program.deadline,
					industryCategory: program.industry_category,
				} : null,
				organization: organization ? {
					id: organization.id,
					name: organization.name,
					logoUrl: organization.logo_url,
				} : null,
			};
		}).filter((i: any) => i.program);

		return res.json({ ok: true, invites });
	} catch (err: any) {
		console.error('my-judge-invites error:', err);
		return res.status(500).json({ error: err?.message || 'Internal server error' });
	}
});

router.get('/verify-team', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const token = normalizeInviteToken(
			String(req.query?.token || req.query?.teamInviteToken || req.query?.inviteToken || req.query?.url || ''),
		);
		if (!token) return res.status(400).json({ error: 'Invalid token format' });

		const authResult = await getAuthUser(req);
		const result = await verifyTeamInviteGet(getSupabaseAdmin(), token, authResult?.user || null);
		return applyServiceResult(res, result);
	} catch (err: any) {
		console.error('Verify team invite (GET) error:', err);
		return res.status(500).json({ error: err?.message || 'Internal server error' });
	}
});

router.post('/verify-team', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const token = normalizeInviteToken(String(req.body?.token || ''));
		if (!token) return res.status(400).json({ error: 'Invalid token format' });

		const authResult = await getAuthUser(req);
		const supabase = getSupabaseAdmin();
		const result = await verifyTeamInvitePost(
			supabase,
			token,
			req.body?.action,
			authResult?.user || null,
		);

		if (
			result.status === 200 &&
			result.body.accepted === true &&
			result.body.alreadyAccepted !== true
		) {
			const { data: invite } = await supabase
				.from('organization_invites')
				.select('id, organization_id, program_id')
				.eq('token', token)
				.maybeSingle();

			if (invite) {
				const { data: program } = invite.program_id
					? await supabase.from('programs').select('title').eq('id', invite.program_id).maybeSingle()
					: { data: null };
				const joinedTitle = program?.title || 'the team';
				await insertNotificationSafe(supabase, {
					organizationId: invite.organization_id,
					programId: invite.program_id,
					recipientUserId: authResult?.user?.id || null,
					type: 'team',
					title: 'Team invite accepted',
					body: `You joined ${joinedTitle}.`,
					metadata: { inviteId: invite.id },
				});
			}
		}

		return applyServiceResult(res, result);
	} catch (err: any) {
		console.error('Verify team invite (POST) error:', err);
		return res.status(500).json({ error: err?.message || 'Internal server error' });
	}
});



async function notifyTeamInviteSideEffects(
	supabase: any,
	payload: {
		inviterUserId: string;
		organizationId: string;
		programId?: string | null;
		programTitle: string;
		normalizedEmail: string;
		inviteId: string;
		inviteUrl?: string;
	},
) {
	await insertNotificationSafe(supabase, {
		organizationId: payload.organizationId,
		programId: payload.programId || null,
		recipientUserId: payload.inviterUserId,
		type: 'team',
		title: `Invite sent: ${payload.programTitle}`,
		body: `Team invite sent to ${payload.normalizedEmail}.`,
		metadata: { inviteId: payload.inviteId },
	});

	const { data: existingProfile } = await supabase
		.from('profiles')
		.select('id')
		.ilike('email', payload.normalizedEmail)
		.maybeSingle();

	if (!existingProfile?.id) return;

	await insertNotificationSafe(supabase, {
		organizationId: payload.organizationId,
		programId: payload.programId || null,
		recipientUserId: existingProfile.id,
		type: 'team',
		title: `Team invite: ${payload.programTitle}`,
		body: `You have been invited to join ${payload.programTitle}.`,
		metadata: { inviteId: payload.inviteId, inviteUrl: payload.inviteUrl },
	});
}

router.post('/team', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const authResult = await getAuthUser(req);
		if (!authResult?.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const ip = getClientIp(req);
		const ipRateLimit = enforceRateLimit(`team-invite:${ip}`, 10, 15 * 60 * 1000);
		if (!ipRateLimit.ok) {
			return applyServiceResult(res, {
				status: 429,
				body: { error: 'Rate limit exceeded. Try again later.' },
				headers: { 'Retry-After': String(ipRateLimit.retryAfterSeconds) },
			});
		}

		const parsed = teamInviteSchema.safeParse(req.body || {});
		if (!parsed.success) {
			return res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
		}

		const supabase = getSupabaseAdmin();
		let resolvedOrgId = parsed.data.organizationId;
		if (!resolvedOrgId) {
			const { data: profile } = await supabase
				.from('profiles')
				.select('organization_id')
				.eq('id', authResult.user.id)
				.maybeSingle();
			resolvedOrgId = profile?.organization_id || undefined;
		}

		if (resolvedOrgId) {
			const actorRateLimit = enforceRateLimit(
				`team-invite:${resolvedOrgId}:${authResult.user.id}`,
				30,
				15 * 60 * 1000,
			);
			if (!actorRateLimit.ok) {
				return applyServiceResult(res, {
					status: 429,
					body: { error: 'Invite limit reached for this user and organization. Try again later.' },
					headers: { 'Retry-After': String(actorRateLimit.retryAfterSeconds) },
				});
			}
		}

		const result = await sendTeamInvite(
			supabase,
			authResult.user,
			parsed.data,
			(organizationId) => getOrgResendMailer(supabase, organizationId),
		);

		if (result.status === 200 && result.body.inviteId && resolvedOrgId) {
			await notifyTeamInviteSideEffects(supabase, {
				inviterUserId: authResult.user.id,
				organizationId: resolvedOrgId,
				programId: parsed.data.programId || null,
				programTitle: parsed.data.programTitle,
				normalizedEmail: parsed.data.email.toLowerCase().trim(),
				inviteId: String(result.body.inviteId),
				inviteUrl: typeof result.body.inviteUrl === 'string' ? result.body.inviteUrl : undefined,
			});
		}

		return applyServiceResult(res, result);
	} catch (err: any) {
		console.error('Team invite error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to create or send invite' });
	}
});

router.post('/judge', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const authResult = await getAuthUser(req);
		if (!authResult?.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const ip = getClientIp(req);
		const rateLimit = enforceRateLimit(`judge-invite:${ip}`, 10, 15 * 60 * 1000);
		if (!rateLimit.ok) {
			return applyServiceResult(res, {
				status: 429,
				body: { error: 'Rate limit exceeded. Try again later.' },
				headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
			});
		}

		const parsed = judgeInviteSchema.safeParse(req.body || {});
		if (!parsed.success) {
			return res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
		}

		const supabase = getSupabaseAdmin();
		const result = await sendJudgeInvite(
			supabase,
			authResult.user,
			parsed.data,
			(organizationId) => getOrgResendMailer(supabase, organizationId || ''),
		);
		return applyServiceResult(res, result);
	} catch (err: any) {
		console.error('Judge invite error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to send judge invite' });
	}
});

router.post('/resend', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const authResult = await getAuthUser(req);
		if (!authResult?.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const ip = getClientIp(req);
		const rateLimit = enforceRateLimit(`invite-resend:${ip}`, 20, 15 * 60 * 1000);
		if (!rateLimit.ok) {
			return applyServiceResult(res, {
				status: 429,
				body: { error: 'Rate limit exceeded. Try again later.' },
				headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
			});
		}

		const parsed = resendInviteSchema.safeParse(req.body || {});
		if (!parsed.success) {
			return res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
		}

		const supabase = getSupabaseAdmin();
		const result = await resendInvite(
			supabase,
			authResult.user,
			parsed.data,
			(organizationId) => getOrgResendMailer(supabase, organizationId),
		);
		return applyServiceResult(res, result);
	} catch (err: any) {
		console.error('Invite resend error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to resend invite' });
	}
});

export default router;
