import { Router } from 'express';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase.js';

const router = Router();

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
	const { data: profile } = await supabase
		.from('profiles')
		.select('organization_id')
		.eq('id', userId)
		.maybeSingle();
	if (profile?.organization_id === organizationId) return true;

	const { data: memberships } = await supabase
		.from('organization_members')
		.select('status, roles(name, permissions)')
		.eq('organization_id', organizationId)
		.eq('user_id', userId)
		.in('status', ['active', 'pending']);

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
				<h2>The AwardX team for ${programTitle} wants you to join</h2>
				<p>${roleLine}</p>
				<p>Accept your invite: <a href="${inviteUrl}">${inviteUrl}</a></p>
			</div>`,
		});

		if (sendError) {
			console.error('Resend error (team invite):', sendError);
			if (emailLogId) await updateEmailLog(supabase, emailLogId, 'failed', { errorMessage: sendError.message });
			return res.status(200).json({
				ok: true,
				inviteId: inviteRow.id,
				token: inviteRow.token,
				emailSent: false,
				warning: sendError.message || 'Email provider rejected the send',
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
		const { email, name, programTitle, inviteId, inviteUrl: passedUrl } = req.body || {};
		if (!email || !programTitle) {
			return res.status(400).json({ error: 'email and programTitle are required' });
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
				<p>for <strong>${programTitle}</strong></p>
				<p>Hi ${judgeName},</p>
				<p>Click to access your judging portal: <a href="${actionUrl}">${actionUrl}</a></p>
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

		if (!profile?.organization_id) {
			return res.status(400).json({ error: 'Could not resolve inviter organization' });
		}

		const permitted = await canManage(supabase, authResult.user.id, profile.organization_id);
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

			const newToken = randomUUID();
			await supabase.from('organization_invites').update({ token: newToken }).eq('id', invite.id).eq('status', 'pending');

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

		return res.status(400).json({ error: 'Judge resend not implemented in this endpoint' });
	} catch (err: any) {
		console.error('Invite resend error:', err);
		return res.status(500).json({ error: err?.message || 'Failed to resend invite' });
	}
});

export default router;
