import { Router } from 'express';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase.js';

const router = Router();

type RateLimitResult = {
	ok: boolean;
	retryAfterSeconds: number;
};

type HitMap = Map<string, number[]>;

const rateLimitStore: HitMap = new Map();

// Cleanup stale rate limit entries every 60 seconds
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		const now = Date.now();
		for (const [key, entries] of rateLimitStore.entries()) {
			const valid = entries.filter((ts: number) => now - ts < 15 * 60 * 1000);
			if (valid.length === 0) rateLimitStore.delete(key);
			else rateLimitStore.set(key, valid);
		}
	}, 60_000);
}

function getClientIp(req: any): string {
	const forwarded = req.headers?.['x-forwarded-for'];
	if (typeof forwarded === 'string' && forwarded.length > 0) {
		return forwarded.split(',')[0].trim();
	}
	return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

function enforceRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const windowStart = now - windowMs;

	const existingHits = rateLimitStore.get(key) || [];
	const freshHits = existingHits.filter((timestamp) => timestamp > windowStart);

	if (freshHits.length >= maxRequests) {
		const oldestHit = freshHits[0] || now;
		const retryAfterSeconds = Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000));
		rateLimitStore.set(key, freshHits);
		return { ok: false, retryAfterSeconds };
	}

	freshHits.push(now);
	rateLimitStore.set(key, freshHits);
	return { ok: true, retryAfterSeconds: 0 };
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getResend() {
	const key = process.env.RESEND_API_KEY || '';
	return key ? new Resend(key) : null;
}

function getSiteUrl() {
	return (process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getFromAddress() {
	return process.env.RESEND_FROM || 'AwardX <onboarding@resend.dev>';
}

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

async function createEmailLog(
	supabase: any,
	payload: {
		organizationId?: string | null;
		programId?: string | null;
		inviteId?: string | null;
		recipientEmail: string;
		templateKey: string;
		context?: Record<string, any>;
	},
) {
	const { data } = await supabase
		.from('email_logs')
		.insert({
			organization_id: payload.organizationId || null,
			program_id: payload.programId || null,
			invite_id: payload.inviteId || null,
			recipient_email: payload.recipientEmail.toLowerCase().trim(),
			template_key: payload.templateKey,
			template_version: 'v1',
			context_json: payload.context || {},
			status: 'pending',
		})
		.select('id')
		.single();
	return data?.id as string | null;
}

async function updateEmailLog(
	supabase: any,
	id: string,
	status: string,
	extra: { resendMessageId?: string | null; errorMessage?: string | null } = {},
) {
	await supabase
		.from('email_logs')
		.update({
			status,
			resend_message_id: extra.resendMessageId || null,
			error_message: extra.errorMessage || null,
			updated_at: new Date().toISOString(),
			...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
		})
		.eq('id', id);
}

async function canManage(supabase: any, userId: string, organizationId: string): Promise<boolean> {
	const { data: memberships } = await supabase
		.from('organization_members')
		.select('status, roles(name, permissions)')
		.eq('organization_id', organizationId)
		.eq('user_id', userId)
		.eq('status', 'active');

	if (!memberships || memberships.length === 0) return false;
	const ALLOWED_ROLES = new Set(['admin', 'program manager']);
	const ALLOWED_PERMS = new Set(['manage_teams', 'manage_programs']);
	return memberships.some((m: any) => {
		const name = String(m.roles?.name || '').toLowerCase().trim();
		const perms: string[] = Array.isArray(m.roles?.permissions)
			? m.roles.permissions.map((p: unknown) => String(p).toLowerCase().trim())
			: [];
		return ALLOWED_ROLES.has(name) || perms.some((p) => ALLOWED_PERMS.has(p));
	});
}

// ── POST /api/invites/team ─────────────────────────────────────────────────

function isValidEmail(s: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const INVITE_TOKEN_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const INVITE_TTL_DAYS = 30;

function normalizeInviteToken(raw?: string | null): string {
	if (!raw) return '';
	const text = (() => {
		try {
			return decodeURIComponent(String(raw));
		} catch {
			return String(raw);
		}
	})().trim();

	const directMatch = text.match(INVITE_TOKEN_RE);
	if (directMatch?.[0]) return directMatch[0];

	try {
		const maybeUrl = new URL(text);
		const queryCandidate = maybeUrl.searchParams.get('teamInviteToken') || maybeUrl.searchParams.get('token') || maybeUrl.searchParams.get('inviteToken');
		const queryMatch = queryCandidate?.match(INVITE_TOKEN_RE);
		if (queryMatch?.[0]) return queryMatch[0];
		const pathMatch = maybeUrl.pathname.match(INVITE_TOKEN_RE);
		if (pathMatch?.[0]) return pathMatch[0];
	} catch {
		// Not a URL value.
	}

	return '';
}

async function resolveTeamInvite(supabase: any, token: string) {
	const { data: invite, error: inviteError } = await supabase
		.from('organization_invites')
		.select('id, organization_id, program_id, role_id, invited_by, email, status, accepted_at, expires_at')
		.eq('token', token)
		.single();

	if (inviteError || !invite) {
		return { error: 'Invalid or expired invite link.' as const };
	}

	if (invite.status === 'accepted' || invite.accepted_at) {
		return { error: 'This invite has already been accepted.' as const, statusCode: 403 };
	}

	if (invite.status === 'expired' || (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now())) {
		await supabase
			.from('organization_invites')
			.update({ status: 'expired', accepted_at: null })
			.eq('id', invite.id)
			.eq('status', 'pending');

		return { error: 'This invite has expired.' as const, statusCode: 403 };
	}

	return { invite };
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

router.get('/verify-team', async (req, res) => {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const token = normalizeInviteToken(String(req.query?.token || req.query?.teamInviteToken || req.query?.inviteToken || req.query?.url || ''));
		if (!token) return res.status(400).json({ error: 'Invalid token format' });

		const supabase = getSupabaseAdmin();
		const resolved = await resolveTeamInvite(supabase, token);
		if ('error' in resolved) {
			return res.status(resolved.statusCode || 404).json({ error: resolved.error });
		}

		const authResult = await getAuthUser(req);
		if (authResult?.user) {
			const authEmail = String(authResult.user.email || '').toLowerCase().trim();
			const inviteEmail = String(resolved.invite.email || '').toLowerCase().trim();
			if (!authEmail || authEmail !== inviteEmail) {
				return res.status(403).json({ error: 'This invite is for a different email address.' });
			}

			const { data: profile } = await supabase
				.from('profiles')
				.select('id, email, full_name')
				.eq('id', authResult.user.id)
				.maybeSingle();

			const profileEmail = String(profile?.email || '').toLowerCase().trim();
			if (profileEmail && profileEmail !== inviteEmail) {
				return res.status(403).json({ error: 'This invite is for a different email address.' });
			}

			const fullName = profile?.full_name || authResult.user.user_metadata?.full_name || authResult.user.user_metadata?.name || authEmail.split('@')[0] || 'User';
			const { data: acceptanceResult, error: acceptError } = await supabase.rpc('accept_organization_invite', {
				p_token: token,
				p_user_id: authResult.user.id,
				p_user_email: inviteEmail,
				p_user_full_name: fullName,
			});

			if (acceptError) {
				return res.status(500).json({ error: acceptError.message || 'Failed to accept invite' });
			}

			const resultRow = Array.isArray(acceptanceResult) ? acceptanceResult[0] : acceptanceResult;
			if (!resultRow?.ok) {
				const reason = resultRow?.error || 'accept_failed';
				if (reason === 'already_processed') {
					return res.json({ ok: true, accepted: true, alreadyAccepted: true });
				}
				if (reason === 'expired') {
					return res.status(403).json({ error: 'This invite has expired.' });
				}
				if (reason === 'email_mismatch') {
					return res.status(403).json({ error: 'This invite is for a different email address.' });
				}
				return res.status(500).json({ error: 'Failed to accept invite' });
			}

			return res.json({ ok: true, accepted: true });
		}

		return res.status(401).json({
			error: 'Authentication required to accept invite',
			requiresAuth: true,
			invite: {
				organizationId: resolved.invite.organization_id,
				programId: resolved.invite.program_id,
				email: resolved.invite.email,
			},
		});
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
		if (!authResult?.user) {
			return res.status(401).json({ error: 'Authentication required to accept invite', requiresAuth: true });
		}

		const supabase = getSupabaseAdmin();
		const resolved = await resolveTeamInvite(supabase, token);
		if ('error' in resolved) {
			if (resolved.statusCode === 403 && resolved.error === 'This invite has already been accepted.') {
				const { data: acceptedInvite } = await supabase
					.from('organization_invites')
					.select('organization_id')
					.eq('token', token)
					.maybeSingle();

				const { data: existingMember } = await supabase
					.from('organization_members')
					.select('id')
					.eq('organization_id', acceptedInvite?.organization_id || null)
					.eq('user_id', authResult.user.id)
					.maybeSingle();
				if (existingMember?.id) {
					return res.json({ ok: true, accepted: true, alreadyAccepted: true });
				}
			}
			return res.status(resolved.statusCode || 404).json({ error: resolved.error });
		}

		const profileEmail = String(authResult.user.email || '').toLowerCase().trim();
		const inviteEmail = String(resolved.invite.email || '').toLowerCase().trim();
		if (!profileEmail || profileEmail !== inviteEmail) {
			return res.status(403).json({ error: 'This invite is for a different email address.' });
		}

		const { data: existingProfile } = await supabase
			.from('profiles')
			.select('id, email, full_name')
			.eq('id', authResult.user.id)
			.maybeSingle();

		const existingProfileEmail = String(existingProfile?.email || '').toLowerCase().trim();
		if (existingProfileEmail && existingProfileEmail !== inviteEmail) {
			return res.status(403).json({ error: 'This invite is for a different email address.' });
		}

		const fullName = existingProfile?.full_name || authResult.user.user_metadata?.full_name || authResult.user.user_metadata?.name || profileEmail.split('@')[0] || 'User';
		const { data: acceptanceResult, error: acceptError } = await supabase.rpc('accept_organization_invite', {
			p_token: token,
			p_user_id: authResult.user.id,
			p_user_email: inviteEmail,
			p_user_full_name: fullName,
		});

		if (acceptError) {
			return res.status(500).json({ error: acceptError.message || 'Failed to accept invite' });
		}

		const resultRow = Array.isArray(acceptanceResult) ? acceptanceResult[0] : acceptanceResult;
		if (!resultRow?.ok) {
			const reason = resultRow?.error || 'accept_failed';
			if (reason === 'already_processed') {
				return res.json({ ok: true, accepted: true, alreadyAccepted: true });
			}
			if (reason === 'expired') {
				return res.status(403).json({ error: 'This invite has expired.' });
			}
			if (reason === 'email_mismatch') {
				return res.status(403).json({ error: 'This invite is for a different email address.' });
			}
			return res.status(500).json({ error: 'Failed to accept invite' });
		}

		const { data: program } = resolved.invite.program_id
			? await supabase.from('programs').select('title').eq('id', resolved.invite.program_id).maybeSingle()
			: ({ data: null } as any);
		const joinedTitle = program?.title || 'the team';
		await insertNotificationSafe(supabase, {
			organizationId: resolved.invite.organization_id,
			programId: resolved.invite.program_id,
			recipientUserId: authResult.user.id,
			type: 'team',
			title: 'Team invite accepted',
			body: `You joined ${joinedTitle}.`,
			metadata: { inviteId: resolved.invite.id },
		});

		return res.json({ ok: true, accepted: true });
	} catch (err: any) {
		console.error('Verify team invite (POST) error:', err);
		return res.status(500).json({ error: err?.message || 'Internal server error' });
	}
});

router.post('/team', async (req, res) => {
	try {
		const { email, roleId, roleName, programTitle, organizationId, programId } = req.body || {};
		if (!email || !isValidEmail(email) || !programTitle) {
			return res.status(400).json({ error: 'Valid email and programTitle are required' });
		}
		const normalizedEmail = email.toLowerCase().trim();

		const authResult = await getAuthUser(req);
		if (!authResult) {
			return res.status(401).json({ error: 'Authentication required' });
		}
		const { user } = authResult;

		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' });
		}
		const supabase = getSupabaseAdmin();

		const { data: profile } = await supabase
			.from('profiles')
			.select('id, organization_id, full_name')
			.eq('id', user.id)
			.maybeSingle();

		const resolvedOrgId = organizationId || profile?.organization_id || null;
		if (!resolvedOrgId) {
			return res.status(400).json({ error: 'organizationId is required for team invites' });
		}

		const permitted = await canManage(supabase, user.id, resolvedOrgId);
		if (!permitted) {
			return res.status(403).json({ error: 'Insufficient permissions to send team invites' });
		}

		const ip = getClientIp(req);
		const ipRateLimit = enforceRateLimit(`team-invite:${ip}`, 10, 15 * 60 * 1000);
		if (!ipRateLimit.ok) {
			res.setHeader('Retry-After', String(ipRateLimit.retryAfterSeconds));
			return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
		}

		const actorRateLimit = enforceRateLimit(`team-invite:${resolvedOrgId}:${user.id}`, 30, 15 * 60 * 1000);
		if (!actorRateLimit.ok) {
			res.setHeader('Retry-After', String(actorRateLimit.retryAfterSeconds));
			return res.status(429).json({ error: 'Invite limit reached for this user and organization. Try again later.' });
		}

		// Expire any existing pending invite for this email in the same scope.
		let expireQ = supabase
			.from('organization_invites')
			.update({ status: 'expired' })
			.eq('organization_id', resolvedOrgId)
			.eq('email', normalizedEmail)
			.eq('status', 'pending');
		if (programId) {
			expireQ = expireQ.eq('program_id', programId);
		} else {
			expireQ = expireQ.is('program_id', null);
		}
		await expireQ;

		const { data: inviteRow, error: inviteError } = await supabase
			.from('organization_invites')
			.insert({
				organization_id: resolvedOrgId,
				email: normalizedEmail,
				role_id: roleId || null,
				invited_by: user.id,
				status: 'pending',
				program_id: programId || null,
				expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
			})
			.select('id, token')
			.single();

		if (inviteError || !inviteRow?.token) {
			console.error('organization_invites insert error:', inviteError);
			return res.status(500).json({ error: inviteError?.message || 'Failed to create invite record' });
		}

		const siteUrl = getSiteUrl();
		const inviteUrl = `${siteUrl}/signup?teamInviteToken=${inviteRow.token}`;
		const roleLine = roleName ? `Assigned role: ${roleName}` : 'Assigned role: Team member';
		const { data: existingProfile } = await supabase
			.from('profiles')
			.select('id')
			.eq('email', normalizedEmail)
			.maybeSingle();

		await insertNotificationSafe(supabase, {
			organizationId: resolvedOrgId,
			programId: programId || null,
			recipientUserId: user.id,
			type: 'team',
			title: `Invite sent: ${programTitle}`,
			body: `Team invite sent to ${normalizedEmail}.`,
			metadata: { inviteId: inviteRow.id },
		});

		const emailLogId = await createEmailLog(supabase, {
			organizationId: resolvedOrgId,
			programId: programId || null,
			inviteId: inviteRow.id,
			recipientEmail: normalizedEmail,
			templateKey: 'team_invite',
			context: { roleName: roleName || null, programTitle, inviteUrl },
		});

		const resend = getResend();
		if (!resend) {
			if (existingProfile?.id) {
				await insertNotificationSafe(supabase, {
					organizationId: resolvedOrgId,
					programId: programId || null,
					recipientUserId: existingProfile.id,
					type: 'team',
					title: `Team invite: ${programTitle}`,
					body: `You have been invited to join ${programTitle}.`,
					metadata: { inviteId: inviteRow.id, inviteUrl },
				});
			}
			if (emailLogId) await updateEmailLog(supabase, emailLogId, 'failed', { errorMessage: 'RESEND_API_KEY not configured' });
			return res.status(200).json({
				ok: true,
				inviteId: inviteRow.id,
				token: inviteRow.token,
				emailSent: false,
				warning: 'Invite created but email service is not configured',
			});
		}

		const { data: mailData, error: sendError } = await resend.emails.send({
			from: getFromAddress(),
			to: normalizedEmail,
			subject: `AwardX invite: ${programTitle}`,
			text: `The AwardX team for ${programTitle} wants you to join this event.\n${roleLine}\nAccept your invite: ${inviteUrl}`,
			html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
				<h2>The AwardX team for ${escapeHtml(programTitle)} wants you to join</h2>
				<p>${escapeHtml(roleLine)}</p>
				<p>Accept your invite: <a href="${inviteUrl}">${escapeHtml(inviteUrl)}</a></p>
			</div>`,
		});

		if (sendError) {
			console.error('Resend error (team invite):', sendError);
			if (existingProfile?.id) {
				await insertNotificationSafe(supabase, {
					organizationId: resolvedOrgId,
					programId: programId || null,
					recipientUserId: existingProfile.id,
					type: 'team',
					title: `Team invite: ${programTitle}`,
					body: `You have been invited to join ${programTitle}.`,
					metadata: { inviteId: inviteRow.id, inviteUrl },
				});
			}
			if (emailLogId) await updateEmailLog(supabase, emailLogId, 'failed', { errorMessage: sendError.message });
			return res.status(200).json({
				ok: true,
				inviteId: inviteRow.id,
				token: inviteRow.token,
				emailSent: false,
				warning: sendError.message || 'Email provider rejected the send',
			});
		}

		if (existingProfile?.id) {
			await insertNotificationSafe(supabase, {
				organizationId: resolvedOrgId,
				programId: programId || null,
				recipientUserId: existingProfile.id,
				type: 'team',
				title: `Team invite: ${programTitle}`,
				body: `You have been invited to join ${programTitle}.`,
				metadata: { inviteId: inviteRow.id, inviteUrl },
			});
		}

		if (emailLogId) await updateEmailLog(supabase, emailLogId, 'sent', { resendMessageId: mailData?.id });
		return res.json({ ok: true, id: mailData?.id, inviteId: inviteRow.id, token: inviteRow.token, emailSent: true });
	} catch (err: any) {
		console.error('Team invite error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to create or send invite' });
	}
});

// ── POST /api/invites/judge ────────────────────────────────────────────────

router.post('/judge', async (req, res) => {
	try {
		const { email, name, programTitle, inviteId, inviteUrl: passedUrl, organizationId } = req.body || {};
		if (!email || !programTitle) {
			return res.status(400).json({ error: 'email and programTitle are required' });
		}

		const authResult = await getAuthUser(req);
		if (!authResult?.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}
		const supabase = getSupabaseAdmin();
		const { data: profile } = await supabase
			.from('profiles')
			.select('organization_id')
			.eq('id', authResult.user.id)
			.maybeSingle();

		const resolvedOrgId = organizationId || profile?.organization_id || null;
		if (!resolvedOrgId) {
			return res.status(400).json({ error: 'organizationId is required for judge invites' });
		}

		const permitted = await canManage(supabase, authResult.user.id, resolvedOrgId);
		if (!permitted) {
			return res.status(403).json({ error: 'Insufficient permissions to send judge invites' });
		}

		const resend = getResend();
		if (!resend) {
			return res.status(200).json({ ok: true, emailSent: false, warning: 'Email service not configured' });
		}

		const siteUrl = getSiteUrl();
		const actionUrl = passedUrl || (inviteId ? `${siteUrl}/judge/${inviteId}` : siteUrl);
		const judgeName = name || 'Judge';
		const subject = `You're invited to judge: ${programTitle}`;

		const { data: mailData, error: sendError } = await resend.emails.send({
			from: getFromAddress(),
			to: email,
			subject,
			text: `Hi ${judgeName},\n\nYou have been invited to judge "${programTitle}".\n\nAccess your portal: ${actionUrl}\n\nBest,\nThe AwardX team`,
			html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
				<h2>You're Invited to Judge</h2>
				<p>for <strong>${escapeHtml(programTitle)}</strong></p>
				<p>Hi ${escapeHtml(judgeName)},</p>
				<p>Click to access your judging portal: <a href="${actionUrl}">${escapeHtml(actionUrl)}</a></p>
			</div>`,
		});

		if (sendError) {
			console.error('Resend error (judge invite):', sendError);
			return res.status(200).json({ ok: true, emailSent: false, warning: sendError.message });
		}

		return res.json({ ok: true, id: mailData?.id, emailSent: true });
	} catch (err: any) {
		console.error('Judge invite error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to send judge invite' });
	}
});

// ── POST /api/invites/resend ───────────────────────────────────────────────

router.post('/resend', async (req, res) => {
	try {
		const { inviteType, recordId, programTitleFallback } = req.body || {};
		if (!inviteType || !recordId) {
			return res.status(400).json({ error: 'inviteType and recordId are required' });
		}

		const authResult = await getAuthUser(req);
		if (!authResult) return res.status(401).json({ error: 'Authentication required' });

		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}
		const supabase = getSupabaseAdmin();

		const { data: profile } = await supabase
			.from('profiles')
			.select('organization_id, full_name')
			.eq('id', authResult.user.id)
			.maybeSingle();

		let resolvedOrgId = profile?.organization_id || null;
		if (!resolvedOrgId) {
			const { data: membership } = await supabase
				.from('organization_members')
				.select('organization_id')
				.eq('user_id', authResult.user.id)
				.eq('status', 'active')
				.order('joined_at', { ascending: false })
				.limit(1)
				.maybeSingle();
			resolvedOrgId = membership?.organization_id || null;
		}

		if (!resolvedOrgId) {
			return res.status(400).json({ error: 'Could not resolve inviter organization' });
		}

		const permitted = await canManage(supabase, authResult.user.id, resolvedOrgId);
		if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

		const resend = getResend();
		if (!resend) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

		const siteUrl = getSiteUrl();

		if (inviteType === 'team') {
			const { data: invite, error: inviteErr } = await supabase
				.from('organization_invites')
				.select('id, organization_id, program_id, email, status, role_id, roles(name), programs(title)')
				.eq('id', recordId)
				.single();

			if (inviteErr || !invite) return res.status(404).json({ error: 'Invite not found' });
			if (invite.status !== 'pending') return res.status(400).json({ error: 'Only pending invites can be resent' });

			const canManageInviteOrg = await canManage(supabase, authResult.user.id, invite.organization_id);
			if (!canManageInviteOrg) return res.status(403).json({ error: 'Insufficient permissions' });

			const newToken = randomUUID();
			await supabase
				.from('organization_invites')
				.update({
					token: newToken,
					expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
				})
				.eq('id', invite.id)
				.eq('status', 'pending');

			const inviteUrl = `${siteUrl}/signup?teamInviteToken=${newToken}`;
			const programTitle = (invite as any).programs?.title || programTitleFallback || 'your workspace';
			const roleName = (invite as any).roles?.name || 'Team member';

			const emailLogId = await createEmailLog(supabase, {
				organizationId: invite.organization_id,
				programId: invite.program_id,
				inviteId: invite.id,
				recipientEmail: invite.email,
				templateKey: 'team_invite_resend',
				context: { roleName, programTitle, inviteUrl },
			});

			const { data: mailData, error: sendErr } = await resend.emails.send({
				from: getFromAddress(),
				to: invite.email,
				subject: `AwardX invite: ${programTitle}`,
				text: `The AwardX team for ${programTitle} wants you to join.\nAssigned role: ${roleName}\nAccept: ${inviteUrl}`,
				html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>The AwardX team for ${programTitle} wants you to join</h2><p>Assigned role: ${roleName}</p><p><a href="${inviteUrl}">Accept invite</a></p></div>`,
			});

			if (sendErr) {
				if (emailLogId) await updateEmailLog(supabase, emailLogId, 'failed', { errorMessage: sendErr.message });
				return res.status(500).json({ error: sendErr.message });
			}

			if (emailLogId) await updateEmailLog(supabase, emailLogId, 'sent', { resendMessageId: mailData?.id });
			return res.json({ ok: true, id: mailData?.id });
		}

		// Judge resend
		const { data: judgeRow, error: judgeErr } = await supabase
			.from('judges')
			.select('id, organization_id, program_id, email, name, status, invite_token, invite_token_used_at, programs(title)')
			.eq('id', recordId)
			.single();

		if (judgeErr || !judgeRow) return res.status(404).json({ error: 'Judge invite record not found' });

		const canManageJudgeOrg = await canManage(supabase, authResult.user.id, judgeRow.organization_id);
		if (!canManageJudgeOrg) return res.status(403).json({ error: 'Insufficient permissions' });

		if (judgeRow.status !== 'invited' && judgeRow.status !== 'active') {
			return res.status(400).json({ error: 'Only invited or active judges can receive a resend' });
		}

		const newJudgeToken = randomUUID();
		const { error: rotateJudgeErr } = await supabase
			.from('judges')
			.update({ invite_token: newJudgeToken, invite_token_used_at: null })
			.eq('id', judgeRow.id)
			.in('status', ['invited', 'active']);

		if (rotateJudgeErr) {
			return res.status(500).json({ error: rotateJudgeErr.message || 'Failed to rotate judge invite token' });
		}

		const judgeInviteUrl = `${siteUrl}/judge/${newJudgeToken}`;
		const judgeProgramTitle = (judgeRow as any).programs?.title || programTitleFallback || 'your workspace';
		const judgeName = judgeRow.name || 'Judge';

		const judgeEmailLogId = await createEmailLog(supabase, {
			organizationId: judgeRow.organization_id,
			programId: judgeRow.program_id,
			inviteId: null,
			recipientEmail: judgeRow.email,
			templateKey: 'judge_invite_resend',
			context: { judgeName, programTitle: judgeProgramTitle, inviteUrl: judgeInviteUrl },
		});

		const { data: judgeMailData, error: judgeSendErr } = await resend.emails.send({
			from: getFromAddress(),
			to: judgeRow.email,
			subject: `You're invited to judge: ${judgeProgramTitle}`,
			text: `Hi ${judgeName},\n\nYou have been invited to judge "${judgeProgramTitle}".\n\nClick the link below to access your judging portal:\n${judgeInviteUrl}\n\nBest,\nThe AwardX team`,
			html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6"><h2>You're Invited to Judge</h2><p>for <strong>${judgeProgramTitle}</strong></p><p>Hi ${judgeName},</p><p>You have been selected as a judge. Access your portal using this secure link:</p><p><a href="${judgeInviteUrl}">Access Judging Portal</a></p></body></html>`,
		});

		if (judgeSendErr) {
			if (judgeEmailLogId) await updateEmailLog(supabase, judgeEmailLogId, 'failed', { errorMessage: judgeSendErr.message });
			return res.status(500).json({ error: judgeSendErr.message });
		}

		if (judgeEmailLogId) await updateEmailLog(supabase, judgeEmailLogId, 'sent', { resendMessageId: judgeMailData?.id });
		return res.json({ ok: true, id: judgeMailData?.id, inviteType: 'judge', recordId: judgeRow.id });
	} catch (err: any) {
		console.error('Invite resend error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to resend invite' });
	}
});

export default router;
