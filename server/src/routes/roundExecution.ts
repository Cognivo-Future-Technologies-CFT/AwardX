import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  activateRound,
  completeRound,
  finalizeRound,
  cancelRound,
  promoteRound,
  getRound,
  getRoundStatus,
  getPipelineStatus,
  resetPipeline,
  syncProgramNominationEnrollments,
  enrollSubmissionsInRootRound,
} from '../services/roundEngine.js';
import { canManageProgram } from '../middleware/programManagement.js';
import { getSupabaseAdmin } from '../supabase.js';
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

router.post('/rounds/:roundId/promote', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await promoteRound(roundId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(round.program_id);

    return res.json({ ok: true, enrolled: result.enrolled });
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

router.post('/programs/:programId/reset-pipeline', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  try {
    const permitted = await canManageProgram(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await resetPipeline(programId, req.userId || 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(programId);

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/programs/:programId/sync-enrollments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  try {
    const permitted = await canManageProgram(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await syncProgramNominationEnrollments(programId);
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(programId);

    return res.json({ ok: true, enrolled: result.enrolled });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/programs/:programId/enroll-submission', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const submissionId = typeof req.body?.submissionId === 'string' ? req.body.submissionId : '';
  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, program_id, applicant_id')
      .eq('id', submissionId)
      .maybeSingle();

    if (!submission || submission.program_id !== programId) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const isOwner = submission.applicant_id && submission.applicant_id === req.userId;
    const canManage = await canManageProgram(req.userId || '', programId);
    if (!isOwner && !canManage) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await enrollSubmissionsInRootRound(programId, [submissionId]);
    if (!result.ok) return res.status(400).json({ error: result.error });

    await invalidateRound(programId);

    return res.json({ ok: true, enrolled: result.enrolled });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
