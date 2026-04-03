import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

router.get('/user', requireAuth, async (req: AuthenticatedRequest, res) => {
	const userId = req.userId;
	if (!userId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from('profiles')
			.select('id,email,full_name,organization_id')
			.eq('id', userId)
			.maybeSingle();

		if (error) {
			return res.status(500).json({ error: error.message || 'Failed to fetch profile' });
		}

		return res.json({ data: data || { id: userId } });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Unexpected server error' });
	}
});

export default router;
