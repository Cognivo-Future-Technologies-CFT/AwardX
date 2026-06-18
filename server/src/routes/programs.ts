import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import { ensureCanManageProgram } from '../middleware/programManagement.js';
import { canAccessOrganization, requireProgramAccess } from '../middleware/programAccess.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
	cacheKeys,
	cacheTtls,
	deleteCache,
	deleteCacheByPrefix,
	wrapWithCache,
} from '../cache/redisCache.js';

const router = Router();

const PROGRAM_SELECT = `
	id,
	organization_id,
	title,
	slug,
	description,
	cover_image_url,
	industry_category,
	event_type_id,
	status,
	visibility,
	deadline,
	timezone,
	entries_count,
	created_at,
	updated_at,
	created_by,
	event_types(name, icon)
`;

router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
	const orgId = typeof req.query.organizationId === 'string' ? req.query.organizationId : '';
	const userId = req.userId;
	if (!userId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (orgId) {
		const permitted = await canAccessOrganization(userId, orgId);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have access to this organization' });
		}
	}

	const key = orgId ? cacheKeys.programsByOrg(orgId) : cacheKeys.programsAll();

	try {
		const programs = await wrapWithCache(key, cacheTtls.medium, async () => {
			const supabase = getSupabaseAdmin();
			let query = supabase
				.from('programs')
				.select(PROGRAM_SELECT)
				.order('created_at', { ascending: false });

			if (orgId) {
				query = query.eq('organization_id', orgId);
			} else {
				const supabaseForOrgs = getSupabaseAdmin();
				const { data: memberships } = await supabaseForOrgs
					.from('organization_members')
					.select('organization_id')
					.eq('user_id', userId)
					.eq('status', 'active');
				const orgIds = new Set<string>();
				for (const row of memberships || []) {
					if (row.organization_id) orgIds.add(row.organization_id);
				}
				if (orgIds.size === 0) return [];
				query = query.in('organization_id', Array.from(orgIds));
			}

			const { data, error } = await query;
			if (error) {
				throw new Error(error.message || 'Failed to fetch programs');
			}

			return data || [];
		});

		return res.json({ data: programs });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.get('/:id/stats', requireAuth, requireProgramAccess('id'), async (req, res) => {
	const { id } = req.params;
	if (!id) {
		return res.status(400).json({ error: 'Program id is required' });
	}

	try {
		const stats = await wrapWithCache(cacheKeys.programStats(id), cacheTtls.short, async () => {
			const supabase = getSupabaseAdmin();

			const [
				submissionsResult,
				activeJudgesResult,
				totalJudgesResult,
			] = await Promise.all([
				supabase
					.from('submissions')
					.select('status,payment_status,payment_amount,submitted_at')
					.eq('program_id', id),
				supabase
					.from('judges')
					.select('id', { count: 'exact', head: true })
					.eq('program_id', id)
					.eq('status', 'active'),
				supabase
					.from('judges')
					.select('id', { count: 'exact', head: true })
					.eq('program_id', id),
			]);

			if (submissionsResult.error) {
				throw new Error(submissionsResult.error.message || 'Failed to fetch submissions stats');
			}

			if (activeJudgesResult.error) {
				throw new Error(activeJudgesResult.error.message || 'Failed to fetch active judges count');
			}

			if (totalJudgesResult.error) {
				throw new Error(totalJudgesResult.error.message || 'Failed to fetch judges count');
			}

			const submissions = submissionsResult.data || [];
			const pendingReview = submissions.filter((s) => {
				const status = String(s.status || '').toLowerCase();
				return status === 'pending' || status === 'under_review' || status === 'under review';
			}).length;

			const paidRevenue = submissions.reduce((sum, s) => {
				const isPaid = String(s.payment_status || '').toLowerCase() === 'paid';
				if (!isPaid) {
					return sum;
				}
				return sum + Number(s.payment_amount || 0);
			}, 0);

			const last7Days = [...Array(7)].map((_, idx) => {
				const date = new Date();
				date.setDate(date.getDate() - (6 - idx));
				return date.toISOString().split('T')[0];
			});

			const submissionTrend = last7Days.map((day) => {
				const count = submissions.filter((submission) => {
					if (!submission.submitted_at) {
						return false;
					}
					return new Date(submission.submitted_at).toISOString().split('T')[0] === day;
				}).length;

				return {
					date: day,
					count,
				};
			});

			return {
				totalSubmissions: submissions.length,
				pendingReview,
				revenue: paidRevenue,
				activeJudges: activeJudgesResult.count || 0,
				totalJudges: totalJudgesResult.count || 0,
				submissionTrend,
			};
		});

		return res.json({ data: stats });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.get('/:id', requireAuth, requireProgramAccess('id'), async (req, res) => {
	const { id } = req.params;
	if (!id) {
		return res.status(400).json({ error: 'Program id is required' });
	}

	try {
		const program = await wrapWithCache(cacheKeys.program(id), cacheTtls.long, async () => {
			const supabase = getSupabaseAdmin();
			const { data, error } = await supabase
				.from('programs')
				.select(PROGRAM_SELECT)
				.eq('id', id)
				.maybeSingle();

			if (error) {
				throw new Error(error.message || 'Failed to fetch program');
			}

			return data || null;
		});

		if (!program) {
			return res.status(404).json({ error: 'Program not found' });
		}

		return res.json({ data: program });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
	const {
		organization_id,
		title,
		slug,
		description,
		cover_image_url,
		industry_category,
		event_type_id,
		status,
		visibility,
		deadline,
		timezone,
	} = req.body || {};

	if (!organization_id || !title) {
		return res.status(400).json({ error: 'organization_id and title are required' });
	}

	const userId = req.userId;
	if (!userId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const permitted = await canAccessOrganization(userId, organization_id);
	if (!permitted) {
		return res.status(403).json({ error: 'You do not have access to this organization' });
	}

	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from('programs')
			.insert({
				organization_id,
				title,
				slug: slug || null,
				description: description || null,
				cover_image_url: cover_image_url || null,
				industry_category: industry_category || null,
				event_type_id: event_type_id || null,
				status: status || 'draft',
				visibility: visibility || 'public',
				deadline: deadline || null,
				timezone: timezone || 'UTC',
			})
			.select(PROGRAM_SELECT)
			.single();

		if (error || !data) {
			return res.status(500).json({ error: error?.message || 'Failed to create program' });
		}

		await deleteCacheByPrefix(cacheKeys.programsByOrg(organization_id));
		await deleteCache(cacheKeys.programsAll());

		return res.status(201).json({ data });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.put('/:id', requireAuth, requireProgramAccess('id'), async (req: AuthenticatedRequest, res) => {
	const { id } = req.params;
	if (!id) {
		return res.status(400).json({ error: 'Program id is required' });
	}

	const userId = req.userId;
	if (!userId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const manageCheck = await ensureCanManageProgram(userId, id);
	if (!manageCheck.ok) {
		return res.status(manageCheck.status).json({ error: manageCheck.error });
	}

	try {
		const supabase = getSupabaseAdmin();

		const { data: existingProgram } = await supabase
			.from('programs')
			.select('organization_id')
			.eq('id', id)
			.maybeSingle();

		const updates = {
			organization_id: req.body?.organization_id,
			title: req.body?.title,
			slug: req.body?.slug,
			description: req.body?.description,
			cover_image_url: req.body?.cover_image_url,
			industry_category: req.body?.industry_category,
			event_type_id: req.body?.event_type_id,
			status: req.body?.status,
			visibility: req.body?.visibility,
			deadline: req.body?.deadline,
			timezone: req.body?.timezone,
			updated_at: new Date().toISOString(),
		};

		const filteredUpdates = Object.fromEntries(
			Object.entries(updates).filter(([, v]) => v !== undefined)
		);

		const { data, error } = await supabase
			.from('programs')
			.update(filteredUpdates)
			.eq('id', id)
			.select(PROGRAM_SELECT)
			.single();

		if (error || !data) {
			return res.status(500).json({ error: error?.message || 'Failed to update program' });
		}

		const affectedOrgIds = new Set<string>();
		if (existingProgram?.organization_id) {
			affectedOrgIds.add(existingProgram.organization_id);
		}
		if (data.organization_id) {
			affectedOrgIds.add(data.organization_id);
		}

		await Promise.all([
			deleteCache(cacheKeys.program(id)),
			deleteCache(cacheKeys.programStats(id)),
			deleteCache(cacheKeys.programsAll()),
			...Array.from(affectedOrgIds).map((orgId) => deleteCacheByPrefix(cacheKeys.programsByOrg(orgId))),
		]);

		return res.json({ data });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.delete('/:id', requireAuth, requireProgramAccess('id'), async (req: AuthenticatedRequest, res) => {
	const { id } = req.params;
	if (!id) {
		return res.status(400).json({ error: 'Program id is required' });
	}

	const userId = req.userId;
	if (!userId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const manageCheck = await ensureCanManageProgram(userId, id);
	if (!manageCheck.ok) {
		return res.status(manageCheck.status).json({ error: manageCheck.error });
	}

	try {
		const supabase = getSupabaseAdmin();
		const { data: existingProgram, error: lookupError } = await supabase
			.from('programs')
			.select('id,organization_id')
			.eq('id', id)
			.maybeSingle();

		if (lookupError) {
			return res.status(500).json({ error: lookupError.message || 'Failed to fetch program for deletion' });
		}

		if (!existingProgram) {
			return res.status(404).json({ error: 'Program not found' });
		}

		const { error } = await supabase.from('programs').delete().eq('id', id);
		if (error) {
			return res.status(500).json({ error: error.message || 'Failed to delete program' });
		}

		await Promise.all([
			deleteCache(cacheKeys.program(id)),
			deleteCache(cacheKeys.programStats(id)),
			deleteCache(cacheKeys.programsAll()),
			deleteCacheByPrefix(cacheKeys.programsByOrg(existingProgram.organization_id)),
		]);

		return res.status(204).send();
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

export default router;
