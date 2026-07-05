import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase.js';
import {
	RESEND_NOT_CONFIGURED_MESSAGE,
	getOrgResendMailer,
} from '../services/orgResend.js';
import { canManageOrganizationInvites } from '../lib/orgAccess.js';
import { createNotification } from '../services/notifications.js';

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

function getSiteUrl() {
	return (process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
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
	return canManageOrganizationInvites(supabase, userId, organizationId);
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


function isAutoAssignJudging(value?: string | null): boolean {
	return value === 'auto_assign';
}

async function loadScopedCategoryIds(
	supabase: any,
	judgeId: string,
	programId: string,
): Promise<Set<string>> {
	const { data: categoriesData } = await supabase
		.from('categories')
		.select('id, parent_id')
		.eq('program_id', programId);

	const categories = categoriesData || [];
	const childrenByParent = new Map<string, string[]>();
	categories.forEach((category: any) => {
		if (!category.parent_id) return;
		childrenByParent.set(category.parent_id, [...(childrenByParent.get(category.parent_id) || []), category.id]);
	});

	const { data: assignments } = await supabase
		.from('judge_category_assignments')
		.select('category_id')
		.eq('judge_id', judgeId);

	const scopedCategoryIds = new Set<string>();
	const addCategoryAndChildren = (categoryId: string) => {
		if (scopedCategoryIds.has(categoryId)) return;
		scopedCategoryIds.add(categoryId);
		(childrenByParent.get(categoryId) || []).forEach(addCategoryAndChildren);
	};

	(assignments || [])
		.map((row: any) => row.category_id)
		.filter(Boolean)
		.forEach(addCategoryAndChildren);

	return scopedCategoryIds;
}

function submissionInScope(submission: any, scopedCategoryIds: Set<string>): boolean {
	const categoryId = submission?.category_id;
	return !!categoryId && scopedCategoryIds.has(categoryId);
}

async function handleVerifyJudge(req: any, res: any) {
	try {
		if (!isSupabaseConfigured()) {
			return res.status(503).json({ error: 'Database not configured' });
		}

		const ip = getClientIp(req);
		const rl = enforceRateLimit(`verify-judge:${ip}`, 20, 15 * 60 * 1000);
		if (!rl.ok) {
			res.setHeader('Retry-After', String(rl.retryAfterSeconds));
			return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
		}

		const tokenCandidate = req.method === 'GET'
			? String(req.query?.token || '')
			: String(req.body?.token || '');
		const token = normalizeInviteToken(tokenCandidate);
		if (!token) {
			return res.status(400).json({ error: 'Invalid token format' });
		}

		const supabase = getSupabaseAdmin();

		const { data: judge, error: judgeError } = await supabase
			.from('judges')
			.select('id, name, email, avatar_url, bio, status, program_id, organization_id, invite_token_used_at')
			.eq('invite_token', token)
			.single();

		if (judgeError || !judge) {
			return res.status(404).json({ error: 'Invalid or expired invite link. This link may have already been used.' });
		}

		const [programResult, orgResult] = await Promise.all([
			judge.program_id
				? supabase
						.from('programs')
						.select('id, title, slug, description, cover_image_url, status, deadline, timezone, industry_category, judging_type')
						.eq('id', judge.program_id)
						.single()
				: Promise.resolve({ data: null }),
			judge.organization_id
				? supabase
						.from('organizations')
						.select('name')
						.eq('id', judge.organization_id)
						.single()
				: Promise.resolve({ data: null }),
		]);

		const program: any = programResult.data;
		const organizationName: string = (orgResult.data as any)?.name || '';
		const judgingType = program?.judging_type;
		const autoAssign = isAutoAssignJudging(judgingType);

		if (req.method === 'GET' && !judge.invite_token_used_at) {
			return res.json({
				ok: true,
				requiresAcceptance: true,
				judge: {
					id: judge.id,
					name: judge.name,
					email: judge.email,
					avatarUrl: judge.avatar_url,
					bio: judge.bio,
				},
				program: program ? {
					id: program.id,
					title: program.title,
					description: program.description,
					coverImageUrl: program.cover_image_url,
					status: program.status,
					deadline: program.deadline,
					timezone: program.timezone,
					industryCategory: program.industry_category,
				} : null,
				organization: organizationName,
			});
		}

		if (req.method === 'POST') {
			const action = String(req.body?.action || 'accept').trim().toLowerCase();
			if (action !== 'accept' && action !== 'decline') {
				return res.status(400).json({ error: 'Invalid action parameter' });
			}

			if (action === 'decline') {
				const { error: updateError } = await supabase
					.from('judges')
					.update({
						status: 'declined',
						invite_token_used_at: new Date().toISOString(),
					})
					.eq('id', judge.id);

				if (updateError) {
					console.error('Failed to decline judge invite:', updateError);
					return res.status(500).json({ error: 'Failed to process invite' });
				}

				return res.json({ ok: true, declined: true });
			}

			if (!judge.invite_token_used_at) {
				const { error: updateError } = await supabase
					.from('judges')
					.update({
						invite_token_used_at: new Date().toISOString(),
						status: 'active',
						accepted_at: new Date().toISOString(),
					})
					.eq('id', judge.id);

				if (updateError) {
					console.error('Failed to mark judge token as used:', updateError);
					return res.status(500).json({ error: 'Failed to process invite' });
				}
			}
		}

		let assignments: any[] = [];
		let criteria: any[] = [];

		const [assignmentResult, criteriaResult] = await Promise.all([
			supabase
				.from('submission_judges')
				.select(`
					id,
					status,
					completed_at,
					assigned_at,
					submission_id,
					round_id,
					rounds (
						id,
						title,
						type,
						status
					),
					submissions (
						id,
						title,
						description,
						cover_image_url,
						status,
						category_id,
						submitted_at,
						applicant_name,
						votes_count,
						submission_data
					)
				`)
				.eq('judge_id', judge.id)
				.order('assigned_at', { ascending: false }),
			judge.program_id
				? supabase
						.from('judging_criteria')
						.select('id, name, description, weight, min_score, max_score, sort_order')
						.eq('program_id', judge.program_id)
						.order('sort_order')
				: Promise.resolve({ data: [] }),
		]);

		assignments = assignmentResult.data || [];
		criteria = criteriaResult.data || [];

		const effectiveProgramId = judge.program_id || program?.id;

		let scopedCategoryIds = new Set<string>();
		if (autoAssign && effectiveProgramId) {
			scopedCategoryIds = await loadScopedCategoryIds(supabase, judge.id, effectiveProgramId);
		}

		if (autoAssign) {
			// Delete any out-of-scope pending assignments from the database to keep it clean.
			const outOfScope = assignments.filter((row: any) => !submissionInScope(row.submissions, scopedCategoryIds) && row.status === 'pending');
			if (outOfScope.length > 0) {
				const outOfScopeIds = outOfScope.map((row: any) => row.id);
				await supabase
					.from('submission_judges')
					.delete()
					.in('id', outOfScopeIds);
			}
			assignments = assignments.filter((row: any) => submissionInScope(row.submissions, scopedCategoryIds));
		}

		// If no explicit assignments (and NOT auto-assign), auto-assign all program submissions to this judge
		if (!autoAssign && effectiveProgramId && assignments.length === 0) {
			const { data: programSubs } = await supabase
				.from('submissions')
				.select('id, title, description, cover_image_url, status, category_id, submitted_at, applicant_name, votes_count, submission_data')
				.eq('program_id', effectiveProgramId)
				.order('submitted_at', { ascending: false });

			if (programSubs && programSubs.length > 0) {
				// Create real submission_judges entries
				const inserts = programSubs.map((sub: any) => ({
					submission_id: sub.id,
					judge_id: judge.id,
					status: 'pending',
				}));
				const { data: created } = await supabase
					.from('submission_judges')
					.upsert(inserts, { onConflict: 'submission_id,judge_id' })
					.select('id, status, completed_at, assigned_at, submission_id');

				if (created && created.length > 0) {
					// Map submission data onto the created records
					const subMap = new Map(programSubs.map((s: any) => [s.id, s]));
					assignments = created.map((row: any) => ({
						...row,
						submissions: subMap.get(row.submission_id) || null,
					}));
				}
			}
		}

		// Auto Assign: backfill missing submission_judges for in-scope submissions.
		if (autoAssign && effectiveProgramId && scopedCategoryIds.size > 0) {
			const { data: scopedSubs } = await supabase
				.from('submissions')
				.select('id, title, description, cover_image_url, status, category_id, submitted_at, applicant_name, votes_count, submission_data')
				.eq('program_id', effectiveProgramId)
				.in('category_id', Array.from(scopedCategoryIds))
				.order('submitted_at', { ascending: false });

			const existingSubmissionIds = new Set(assignments.map((row: any) => row.submission_id));
			const missingSubs = (scopedSubs || []).filter((sub: any) => !existingSubmissionIds.has(sub.id));

			if (missingSubs.length > 0) {
				const inserts = missingSubs.map((sub: any) => ({
					submission_id: sub.id,
					judge_id: judge.id,
					status: 'pending',
				}));
				const { data: created } = await supabase
					.from('submission_judges')
					.upsert(inserts, { onConflict: 'submission_id,judge_id' })
					.select('id, status, completed_at, assigned_at, submission_id');

				if (created && created.length > 0) {
					const subMap = new Map((scopedSubs || []).map((s: any) => [s.id, s]));
					assignments = [
						...assignments,
						...created.map((row: any) => ({
							...row,
							submissions: subMap.get(row.submission_id) || null,
						})),
					];
				}
			}
		}

		if (assignments.length > 0) {
			const categoryIds = Array.from(new Set(
				assignments.map((row: any) => row.submissions?.category_id).filter(Boolean),
			));
			let categoryMap = new Map<string, string>();
			if (categoryIds.length > 0) {
				const { data: categories } = await supabase
					.from('categories')
					.select('id, title')
					.in('id', categoryIds);
				categoryMap = new Map((categories || []).map((c: any) => [c.id, c.title]));
			}

			// Fetch round info for submissions via round_submissions
			const submissionIds = assignments.map((row: any) => row.submission_id).filter(Boolean);
			let roundMap = new Map<string, { id: string; name: string; type: string; status: string }>();
			if (submissionIds.length > 0) {
				const { data: roundSubs } = await supabase
					.from('round_submissions')
					.select('submission_id, rounds!round_submissions_round_id_fkey(id, title, type, status)')
					.in('submission_id', submissionIds);
				if (roundSubs) {
					for (const rs of roundSubs as any[]) {
						if (rs.rounds && !roundMap.has(rs.submission_id)) {
							roundMap.set(rs.submission_id, {
								id: rs.rounds.id,
								name: rs.rounds.title,
								type: rs.rounds.type,
								status: rs.rounds.status,
							});
						}
					}
				}
			}

			assignments = assignments.map((row: any) => ({
				...row,
				category_name: categoryMap.get(row.submissions?.category_id) || 'Uncategorized',
				round_info: roundMap.get(row.submission_id) || null,
			}));
		}

		return res.json({
			ok: true,
			judge: {
				id: judge.id,
				name: judge.name,
				email: judge.email,
				avatarUrl: judge.avatar_url,
				bio: judge.bio,
			},
			program: program ? {
				id: program.id,
				title: program.title,
				description: program.description,
				coverImageUrl: program.cover_image_url,
				status: program.status,
				deadline: program.deadline,
				timezone: program.timezone,
				industryCategory: program.industry_category,
			} : null,
			organization: organizationName,
			assignments: assignments.map((row: any) => ({
				submissionJudgeId: row.id,
				status: row.status,
				completedAt: row.completed_at,
				round: (row.rounds ? {
					id: row.rounds.id,
					name: row.rounds.title,
					type: row.rounds.type,
					status: row.rounds.status,
				} : null) || row.round_info,
				submission: row.submissions ? {
					id: row.submissions.id,
					title: row.submissions.title,
					description: row.submissions.description,
					coverImageUrl: row.submissions.cover_image_url,
					status: row.submissions.status,
					category: row.category_name || 'Uncategorized',
					submittedAt: row.submissions.submitted_at,
					applicantName: row.submissions.applicant_name,
					voteCount: row.submissions.votes_count,
					submissionData: row.submissions.submission_data || {},
				} : null,
			})),
			criteria: criteria.map((c: any) => ({
				id: c.id,
				name: c.name,
				description: c.description,
				weight: c.weight,
				minScore: c.min_score,
				maxScore: c.max_score,
				sortOrder: c.sort_order,
			})),
		});
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

		const token = normalizeInviteToken(String(req.query?.token || req.query?.teamInviteToken || req.query?.inviteToken || req.query?.url || ''));
		if (!token) return res.status(400).json({ error: 'Invalid token format' });

		const supabase = getSupabaseAdmin();
		const resolved = await resolveTeamInvite(supabase, token);
		if ('error' in resolved) {
			return res.status(resolved.statusCode || 404).json({ error: resolved.error });
		}

		const { data: org } = await supabase
			.from('organizations')
			.select('name')
			.eq('id', resolved.invite.organization_id)
			.maybeSingle();
		const organizationName = org?.name || 'Organization';

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

			return res.json({
				ok: true,
				requiresAcceptance: true,
				invite: {
					organizationId: resolved.invite.organization_id,
					organizationName,
					programId: resolved.invite.program_id,
					email: resolved.invite.email,
				},
			});
		}

		return res.status(401).json({
			error: 'Authentication required to accept invite',
			requiresAuth: true,
			invite: {
				organizationId: resolved.invite.organization_id,
				organizationName,
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

		const action = String(req.body?.action || 'accept').trim().toLowerCase();
		if (action !== 'accept' && action !== 'decline') {
			return res.status(400).json({ error: 'Invalid action parameter' });
		}

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

		if (action === 'decline') {
			const { error: declineError } = await supabase
				.from('organization_invites')
				.update({ status: 'declined', accepted_at: null })
				.eq('id', resolved.invite.id)
				.eq('status', 'pending');

			if (declineError) {
				return res.status(500).json({ error: declineError.message || 'Failed to decline invite' });
			}

			return res.json({ ok: true, declined: true });
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
		await createNotification(supabase, {
			organizationId: resolved.invite.organization_id,
			programId: resolved.invite.program_id,
			recipientUserId: authResult.user.id,
			type: 'team',
			title: 'Team invite accepted',
			body: `You joined ${joinedTitle}.`,
			view: 'teams',
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

		// Check if the user is already an active member of this organization.
		const { data: existingUser } = await supabase
			.from('profiles')
			.select('id')
			.ilike('email', normalizedEmail)
			.maybeSingle();

		if (existingUser) {
			const { data: member } = await supabase
				.from('organization_members')
				.select('id')
				.eq('organization_id', resolvedOrgId)
				.eq('user_id', existingUser.id)
				.eq('status', 'active')
				.maybeSingle();

			if (member) {
				return res.status(400).json({ error: 'This user is already an active member of the team.' });
			}
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

		await createNotification(supabase, {
			organizationId: resolvedOrgId,
			programId: programId || null,
			recipientUserId: user.id,
			type: 'team',
			title: `Invite sent: ${programTitle}`,
			body: `Team invite sent to ${normalizedEmail}.`,
			view: 'teams',
			metadata: { inviteId: inviteRow.id },
		});

		let deadlineText = '';
		if (programId) {
			const { data: program } = await supabase
				.from('programs')
				.select('deadline')
				.eq('id', programId)
				.maybeSingle();
			if (program?.deadline) {
				const d = new Date(program.deadline);
				deadlineText = d.toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric',
				});
			}
		}

		const emailLogId = await createEmailLog(supabase, {
			organizationId: resolvedOrgId,
			programId: programId || null,
			inviteId: inviteRow.id,
			recipientEmail: normalizedEmail,
			templateKey: 'team_invite',
			context: {
				roleName: roleName || null,
				inviterName: profile?.full_name || null,
				programTitle,
				inviteUrl,
				deadlineText,
			},
		});

		const mailer = await getOrgResendMailer(supabase, resolvedOrgId);
		if (!mailer) {
			if (existingProfile?.id) {
				await createNotification(supabase, {
					organizationId: resolvedOrgId,
					programId: programId || null,
					recipientUserId: existingProfile.id,
					type: 'team',
					title: `Team invite: ${programTitle}`,
					body: `You have been invited to join ${programTitle}.`,
					view: 'teams',
					metadata: { inviteId: inviteRow.id, inviteUrl },
				});
			}
			if (emailLogId) await updateEmailLog(supabase, emailLogId, 'failed', { errorMessage: RESEND_NOT_CONFIGURED_MESSAGE });
			return res.status(200).json({
				ok: true,
				inviteId: inviteRow.id,
				token: inviteRow.token,
				emailSent: false,
				warning: RESEND_NOT_CONFIGURED_MESSAGE,
			});
		}

		const previewText = `You have been invited to join the team for ${programTitle}.`;
		const subject = `Team invite: ${programTitle}`;

		const { data: mailData, error: sendError } = await mailer.resend.emails.send({
			from: mailer.from,
			to: normalizedEmail,
			subject,
			text: `The team for ${programTitle} wants you to join this event.\n${roleLine}\nAccept your invite: ${inviteUrl}`,
			html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Join the Team</h2>
                
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi,</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                  ${profile?.full_name ? `<strong>${escapeHtml(profile.full_name)}</strong>` : 'An administrator'} has invited you to join the team on the platform. Please review the details of the invitation below:
                </p>

                <!-- Info Grid -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(roleName || 'Team member')}</td>
                  </tr>
                  ${deadlineText ? `
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>

                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to accept the invitation and configure your workspace profile.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${inviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Accept Team Invite</a>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
                  470 Noor Ave STE B #1148, South San Francisco, CA 94080
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
		});

		if (sendError) {
			console.error('Resend error (team invite):', sendError);
			if (existingProfile?.id) {
				await createNotification(supabase, {
					organizationId: resolvedOrgId,
					programId: programId || null,
					recipientUserId: existingProfile.id,
					type: 'team',
					title: `Team invite: ${programTitle}`,
					body: `You have been invited to join ${programTitle}.`,
					view: 'teams',
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
			await createNotification(supabase, {
				organizationId: resolvedOrgId,
				programId: programId || null,
				recipientUserId: existingProfile.id,
				type: 'team',
				title: `Team invite: ${programTitle}`,
				body: `You have been invited to join ${programTitle}.`,
				view: 'teams',
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
		const { email, name, programTitle, inviteId, inviteUrl: passedUrl, organizationId, programId } = req.body || {};
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
		if (resolvedOrgId) {
			const permitted = await canManage(supabase, authResult.user.id, resolvedOrgId);
			if (!permitted) {
				return res.status(403).json({ error: 'Insufficient permissions to send judge invites' });
			}
		} else {
			// If not associated with an organization, check if system-wide mailer fallback is configured
			const systemApiKey = process.env.RESEND_API_KEY;
			const systemFrom = process.env.RESEND_FROM;
			if (!systemApiKey || !systemFrom) {
				return res.status(400).json({ error: 'organizationId is required for judge invites (no system mailer configured)' });
			}
		}

		const mailer = await getOrgResendMailer(supabase, resolvedOrgId);
		if (!mailer) {
			return res.status(200).json({ ok: true, emailSent: false, warning: RESEND_NOT_CONFIGURED_MESSAGE });
		}

		let deadlineText = '';
		if (programId) {
			const { data: program } = await supabase
				.from('programs')
				.select('deadline')
				.eq('id', programId)
				.maybeSingle();
			if (program?.deadline) {
				const d = new Date(program.deadline);
				deadlineText = d.toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric',
				});
			}
		}

		const siteUrl = getSiteUrl();
		const actionUrl = passedUrl || (inviteId ? `${siteUrl}/judge/${inviteId}` : siteUrl);
		const judgeName = name || 'Judge';
		const subject = `You're invited to judge: ${programTitle}`;
		const previewText = `You have been invited to judge ${programTitle}. Click to access your judging portal.`;

		const { data: mailData, error: sendError } = await mailer.resend.emails.send({
			from: mailer.from,
			to: email,
			subject,
			text: `Hi ${judgeName},\n\nYou have been invited to judge for the upcoming event.\n\nEvent: ${programTitle}\nRole: Judge${deadlineText ? `\nDeadline: ${deadlineText}` : ''}\n\nClick the link below to access your judging portal and view the assigned submissions:\n${actionUrl}\n\nYou can bookmark this link to return to your portal at any time during the judging period.\n\nBest,\nThe team`,
			html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">You're Invited to Judge</h2>
                
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi ${escapeHtml(judgeName)},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You have been selected as a judge. Please review the details of the invitation below:</p>

                <!-- Info Grid -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">Judge</td>
                  </tr>
                  ${deadlineText ? `
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>

                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to access your judging portal where you can view assigned submissions, scoresheets, and evaluation criteria.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${actionUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Access Judging Portal</a>
                </div>

                <!-- Bookmark notice -->
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
                    <strong>🔖 Bookmark this link</strong> to return to your judging portal at any time during the judging period.
                  </p>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
                  470 Noor Ave STE B #1148, South San Francisco, CA 94080
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
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

		if (resolvedOrgId) {
			const permitted = await canManage(supabase, authResult.user.id, resolvedOrgId);
			if (!permitted) {
				const systemApiKey = process.env.RESEND_API_KEY;
				const systemFrom = process.env.RESEND_FROM;
				if (!systemApiKey || !systemFrom) {
					return res.status(403).json({ error: 'Insufficient permissions' });
				}
			}
		} else {
			const systemApiKey = process.env.RESEND_API_KEY;
			const systemFrom = process.env.RESEND_FROM;
			if (!systemApiKey || !systemFrom) {
				return res.status(400).json({ error: 'Could not resolve inviter organization' });
			}
		}

		const siteUrl = getSiteUrl();

		if (inviteType === 'team') {
			const { data: invite, error: inviteErr } = await supabase
				.from('organization_invites')
				.select('id, organization_id, program_id, email, status, role_id, roles(name), programs(title, deadline)')
				.eq('id', recordId)
				.single();

			if (inviteErr || !invite) return res.status(404).json({ error: 'Invite not found' });
			if (invite.status !== 'pending') return res.status(400).json({ error: 'Only pending invites can be resent' });

			const canManageInviteOrg = await canManage(supabase, authResult.user.id, invite.organization_id);
			if (!canManageInviteOrg) {
				const systemApiKey = process.env.RESEND_API_KEY;
				const systemFrom = process.env.RESEND_FROM;
				if (!systemApiKey || !systemFrom) {
					return res.status(403).json({ error: 'Insufficient permissions' });
				}
			}

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

			let deadlineText = '';
			const programDeadline = (invite as any).programs?.deadline;
			if (programDeadline) {
				const d = new Date(programDeadline);
				deadlineText = d.toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric',
				});
			}

			const emailLogId = await createEmailLog(supabase, {
				organizationId: invite.organization_id,
				programId: invite.program_id,
				inviteId: invite.id,
				recipientEmail: invite.email,
				templateKey: 'team_invite_resend',
				context: {
					roleName,
					programTitle,
					inviteUrl,
					deadlineText,
					inviterName: profile?.full_name || null,
				},
			});

			const mailer = await getOrgResendMailer(supabase, invite.organization_id);
			if (!mailer) {
				if (emailLogId) await updateEmailLog(supabase, emailLogId, 'failed', { errorMessage: RESEND_NOT_CONFIGURED_MESSAGE });
				return res.status(503).json({ error: RESEND_NOT_CONFIGURED_MESSAGE });
			}

			const previewText = `You have been invited to join the team for ${programTitle}.`;
			const subject = `Team invite: ${programTitle}`;

			const { data: mailData, error: sendErr } = await mailer.resend.emails.send({
				from: mailer.from,
				to: invite.email,
				subject,
				text: `The team for ${programTitle} wants you to join this event.\nAssigned role: ${roleName}\nAccept your invite: ${inviteUrl}`,
				html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Join the Team</h2>
                
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi,</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                  ${profile?.full_name ? `<strong>${escapeHtml(profile.full_name)}</strong>` : 'An administrator'} has invited you to join the team on the platform. Please review the details of the invitation below:
                </p>

                <!-- Info Grid -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(roleName || 'Team member')}</td>
                  </tr>
                  ${deadlineText ? `
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>

                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to accept the invitation and configure your workspace profile.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${inviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Accept Team Invite</a>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
                  470 Noor Ave STE B #1148, South San Francisco, CA 94080
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
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
			.select('id, organization_id, program_id, email, name, status, invite_token, invite_token_used_at, programs(title, deadline)')
			.eq('id', recordId)
			.single();

		if (judgeErr || !judgeRow) return res.status(404).json({ error: 'Judge invite record not found' });

		const canManageJudgeOrg = await canManage(supabase, authResult.user.id, judgeRow.organization_id);
		if (!canManageJudgeOrg) {
			const systemApiKey = process.env.RESEND_API_KEY;
			const systemFrom = process.env.RESEND_FROM;
			if (!systemApiKey || !systemFrom) {
				return res.status(403).json({ error: 'Insufficient permissions' });
			}
		}

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

		let deadlineText = '';
		const programDeadline = (judgeRow as any).programs?.deadline;
		if (programDeadline) {
			const d = new Date(programDeadline);
			deadlineText = d.toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			});
		}

		const judgeEmailLogId = await createEmailLog(supabase, {
			organizationId: judgeRow.organization_id,
			programId: judgeRow.program_id,
			inviteId: null,
			recipientEmail: judgeRow.email,
			templateKey: 'judge_invite_resend',
			context: { judgeName, programTitle: judgeProgramTitle, inviteUrl: judgeInviteUrl, deadlineText },
		});

		const judgeMailer = await getOrgResendMailer(supabase, judgeRow.organization_id);
		if (!judgeMailer) {
			if (judgeEmailLogId) await updateEmailLog(supabase, judgeEmailLogId, 'failed', { errorMessage: RESEND_NOT_CONFIGURED_MESSAGE });
			return res.status(503).json({ error: RESEND_NOT_CONFIGURED_MESSAGE });
		}

		const previewText = `You have been invited to judge ${judgeProgramTitle}. Click to access your judging portal.`;
		const subject = `You're invited to judge: ${judgeProgramTitle}`;

		const { data: judgeMailData, error: judgeSendErr } = await judgeMailer.resend.emails.send({
			from: judgeMailer.from,
			to: judgeRow.email,
			subject,
			text: `Hi ${judgeName},\n\nYou have been invited to judge for the upcoming event.\n\nEvent: ${judgeProgramTitle}\nRole: Judge${deadlineText ? `\nDeadline: ${deadlineText}` : ''}\n\nClick the link below to access your judging portal and view the assigned submissions:\n${judgeInviteUrl}\n\nYou can bookmark this link to return to your portal at any time during the judging period.\n\nBest,\nThe team`,
			html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">You're Invited to Judge</h2>
                
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi ${escapeHtml(judgeName)},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You have been selected as a judge. Please review the details of the invitation below:</p>

                <!-- Info Grid -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(judgeProgramTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">Judge</td>
                  </tr>
                  ${deadlineText ? `
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>

                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to access your judging portal where you can view assigned submissions, scoresheets, and evaluation criteria.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${judgeInviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Access Judging Portal</a>
                </div>

                <!-- Bookmark notice -->
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
                    <strong>🔖 Bookmark this link</strong> to return to your judging portal at any time during the judging period.
                  </p>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
                  470 Noor Ave STE B #1148, South San Francisco, CA 94080
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
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
