import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
	cacheKeys,
	cacheTtls,
	deleteCache,
	deleteCacheByPrefix,
	wrapWithCache,
} from '../cache/redisCache.js';

const router = Router();

const ORG_SELECT = 'id,name,slug,logo_url,website,industry,plan,created_at,updated_at';

function createSlug(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

router.get('/current/info', requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const supabase = getSupabaseAdmin();
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('organization_id')
			.eq('id', userId)
			.maybeSingle();

		if (profileError) {
			return res.status(500).json({ error: profileError.message || 'Failed to fetch profile' });
		}

		if (!profile?.organization_id) {
			return res.json({ data: null });
		}

		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select(ORG_SELECT)
			.eq('id', profile.organization_id)
			.maybeSingle();

		if (orgError) {
			return res.status(500).json({ error: orgError.message || 'Failed to fetch organization' });
		}

		return res.json({ data: organization || null });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.get('/:id', requireAuth, async (req, res) => {
	const { id } = req.params;
	if (!id) {
		return res.status(400).json({ error: 'Organization id is required' });
	}

	try {
		const organization = await wrapWithCache(cacheKeys.org(id), cacheTtls.long, async () => {
			const supabase = getSupabaseAdmin();
			const { data, error } = await supabase
				.from('organizations')
				.select(ORG_SELECT)
				.eq('id', id)
				.maybeSingle();

			if (error) {
				throw new Error(error.message || 'Failed to fetch organization');
			}

			return data || null;
		});

		if (!organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		return res.json({ data: organization });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.post('/', requireAuth, async (req, res) => {
	const { name, slug, logo_url, website, industry, plan } = req.body || {};

	if (!name || typeof name !== 'string') {
		return res.status(400).json({ error: 'name is required' });
	}

	const safeSlug = (typeof slug === 'string' && slug.trim()) || createSlug(name);

	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from('organizations')
			.insert({
				name,
				slug: safeSlug,
				logo_url: logo_url || null,
				website: website || null,
				industry: industry || null,
				plan: plan || 'starter',
			})
			.select(ORG_SELECT)
			.single();

		if (error || !data) {
			return res.status(500).json({ error: error?.message || 'Failed to create organization' });
		}

		await deleteCache(cacheKeys.org(data.id));
		return res.status(201).json({ data });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

router.put('/:id', requireAuth, async (req, res) => {
	const { id } = req.params;
	const patch = req.body || {};

	if (!id) {
		return res.status(400).json({ error: 'Organization id is required' });
	}

	try {
		const supabase = getSupabaseAdmin();
		const updates = {
			name: patch.name,
			slug: patch.slug,
			logo_url: patch.logo_url,
			website: patch.website,
			industry: patch.industry,
			plan: patch.plan,
			updated_at: new Date().toISOString(),
		};

		const { data, error } = await supabase
			.from('organizations')
			.update(updates)
			.eq('id', id)
			.select(ORG_SELECT)
			.single();

		if (error || !data) {
			return res.status(500).json({ error: error?.message || 'Failed to update organization' });
		}

		await Promise.all([
			deleteCache(cacheKeys.org(id)),
			deleteCacheByPrefix(cacheKeys.programsByOrg(id)),
		]);

		return res.json({ data });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

export default router;
