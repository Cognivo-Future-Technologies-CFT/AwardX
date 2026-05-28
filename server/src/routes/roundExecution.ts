import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  activateRound,
  completeRound,
  finalizeRound,
  cancelRound,
  getRound,
  getRoundStatus,
  getPipelineStatus,
} from '../services/roundEngine.js';
import { canManageProgram } from '../middleware/programManagement.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

async function invalidateRound(programId: string) {
  await Promise.all([
    deleteCache(cacheKeys.programRounds(programId)),
    deleteCache(cacheKeys.pipelineStatus(programId)),
    deleteCache(cacheKeys.programStats(programId)),
  ]);
}

router.post('/rounds/:roundId/activate', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await activateRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(round.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/complete', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await completeRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(round.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/finalize', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await finalizeRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(round.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await cancelRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(round.program_id);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/rounds/:roundId/status', requireAuth, async (req, res) => {
  const { roundId } = req.params;
  try {
    const status = await getRoundStatus(roundId);
    if (!status) return res.status(404).json({ error: 'Round not found' });
    return res.json({ data: status });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/programs/:programId/pipeline-status', requireAuth, async (req, res) => {
  const { programId } = req.params;
  try {
    const data = await wrapWithCache(cacheKeys.pipelineStatus(programId), cacheTtls.short, async () => {
      return getPipelineStatus(programId);
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
