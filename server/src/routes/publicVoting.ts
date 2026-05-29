import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getVotingRoundPublic,
  castVote,
  getVotingResults,
  getLeaderboard,
  getMyVotes,
  upsertVotingConfig,
  resolveRoundId,
} from '../services/votingEngine.js';
import { getSupabaseAdmin } from '../supabase.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

async function extractVoterFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
  body?: Record<string, unknown>;
}) {
  let userId: string | undefined;
  const authHeader = req.headers.authorization || '';
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (token) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    } catch {
      // anonymous
    }
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.socket.remoteAddress ||
    undefined;

  const body = req.body || {};
  return {
    userId,
    email: typeof body.email === 'string' ? body.email : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    ipAddress,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

router.get('/s/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const data = await getVotingRoundPublic(slug);
    if (!data) return res.status(404).json({ error: 'Voting round not found.' });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:roundId/my-votes', async (req, res) => {
  const { roundId } = req.params;
  try {
    const voter = await extractVoterFromRequest(req);
    const data = await getMyVotes(roundId, voter);
    if (!data) return res.status(404).json({ error: 'Voting round not found.' });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:roundId/vote', async (req, res) => {
  const { roundId } = req.params;
  const { submission_id } = req.body || {};

  if (!submission_id) {
    return res.status(400).json({ error: 'submission_id is required' });
  }

  try {
    const voter = await extractVoterFromRequest(req);
    const result = await castVote(roundId, submission_id, voter);

    if (!result.ok) return res.status(400).json({ error: result.error });

    const resolvedId = await resolveRoundId(roundId);
    if (resolvedId) {
      await deleteCache(cacheKeys.votingResults(resolvedId));
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:roundId/leaderboard', async (req, res) => {
  const { roundId } = req.params;
  try {
    const resolvedId = await resolveRoundId(roundId);
    if (!resolvedId) return res.status(404).json({ error: 'Voting round not found.' });

    const data = await getLeaderboard(resolvedId);
    if (!data) return res.status(403).json({ error: 'Leaderboard is not enabled for this round.' });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:roundId/results', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const resolvedId = await resolveRoundId(roundId);
    if (!resolvedId) return res.status(404).json({ error: 'Voting round not found.' });

    const data = await wrapWithCache(cacheKeys.votingResults(resolvedId), cacheTtls.short, async () => {
      return getVotingResults(resolvedId);
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:roundId/config', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const supabase = getSupabaseAdmin();
    const resolvedId = await resolveRoundId(roundId);
    if (!resolvedId) return res.status(404).json({ error: 'Voting round not found.' });

    const { data, error } = await supabase
      .from('voting_configs')
      .select('*')
      .eq('round_id', resolvedId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ data: data || null });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:roundId/config', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  const config = req.body || {};
  try {
    const resolvedId = await resolveRoundId(roundId);
    if (!resolvedId) return res.status(404).json({ error: 'Voting round not found.' });

    const data = await upsertVotingConfig(resolvedId, config);
    await deleteCache(cacheKeys.votingConfig(resolvedId));
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:roundId/voters', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
  const offset = (page - 1) * pageSize;

  try {
    const resolvedId = await resolveRoundId(roundId);
    if (!resolvedId) return res.status(404).json({ error: 'Voting round not found.' });

    const supabase = getSupabaseAdmin();
    const { data, error, count } = await supabase
      .from('public_votes')
      .select('*, submissions(id, title, applicant_name)', { count: 'exact' })
      .eq('round_id', resolvedId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data, total: count || 0, page, pageSize });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/** Catch-all round fetch — must be last among GET routes */
router.get('/:roundId', async (req, res) => {
  const { roundId } = req.params;
  try {
    const data = await getVotingRoundPublic(roundId);
    if (!data) return res.status(404).json({ error: 'Voting round not found.' });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
