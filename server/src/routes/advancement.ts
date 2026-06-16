import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canManageProgram } from '../middleware/programManagement.js';
import { getRound } from '../services/roundEngine.js';
import { executeAdvancement, getAdvancementHistory, previewAdvancement } from '../services/advancementEngine.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

router.post('/rounds/:roundId/preview', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const data = await previewAdvancement(roundId, req.body?.criteriaOverride);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/execute', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await executeAdvancement(
      roundId,
      req.body?.overrides,
      req.userId,
      req.body?.criteriaOverride,
      req.body?.tieResolutions,
      req.body?.targetRoundId,
    );

    if (!result.ok) {
      return res.status(400).json({
        error: result.error || 'Failed to execute advancement',
        paused: result.paused || false,
        reason: result.reason || null,
        ties: result.ties || [],
      });
    }

    await Promise.all([
      deleteCache(cacheKeys.programRounds(round.program_id)),
      deleteCache(cacheKeys.pipelineStatus(round.program_id)),
      deleteCache(cacheKeys.advancementHistory(round.program_id)),
    ]);

    return res.json({ data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/override', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  const { submissionId, action, reason } = req.body || {};

  if (!submissionId || !action || !reason) {
    return res.status(400).json({ error: 'submissionId, action, and reason are required' });
  }
  if (!['force_advance', 'force_eliminate'].includes(action)) {
    return res.status(400).json({ error: 'Invalid override action' });
  }

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await executeAdvancement(
      roundId,
      [{ submissionId, action, reason }],
      req.userId,
      req.body?.criteriaOverride,
      req.body?.tieResolutions,
    );

    if (!result.ok) {
      return res.status(400).json({
        error: result.error || 'Failed to apply override',
        paused: result.paused || false,
        reason: result.reason || null,
        ties: result.ties || [],
      });
    }

    await Promise.all([
      deleteCache(cacheKeys.programRounds(round.program_id)),
      deleteCache(cacheKeys.pipelineStatus(round.program_id)),
      deleteCache(cacheKeys.advancementHistory(round.program_id)),
    ]);

    return res.json({ data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/programs/:programId/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;

  try {
    const permitted = await canManageProgram(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const data = await wrapWithCache(cacheKeys.advancementHistory(programId), cacheTtls.short, async () => {
      return getAdvancementHistory(programId);
    });

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
