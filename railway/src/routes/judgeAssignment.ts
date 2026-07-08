import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canManageProgram } from '../middleware/programManagement.js';
import {
  autoRandomAssign,
  autoSegmentedAssign,
  manualAssign,
  getAssignmentsByRound,
  removeAssignment,
  clearRoundAssignments,
} from '../services/judgeAssignment.js';
import { getRound } from '../services/roundEngine.js';
import { getSupabaseAdmin } from '../supabase.js';
import { deleteCache, cacheKeys } from '../cache/redisCache.js';

const router = Router();
const MIN_JUDGES_PER_SUBMISSION = 1;
const MAX_JUDGES_PER_SUBMISSION = 20;

function validationError(fields: Record<string, string>) {
  return {
    error: 'Validation failed',
    fields,
  };
}

async function assertCanManageRound(req: AuthenticatedRequest, roundId: string) {
  const round = await getRound(roundId);
  if (!round) {
    return { ok: false as const, status: 404 as const, body: { error: 'Round not found' } };
  }

  const permitted = await canManageProgram(req.userId || '', round.program_id);
  if (!permitted) {
    return { ok: false as const, status: 403 as const, body: { error: 'Insufficient permissions' } };
  }

  return {
    ok: true as const,
    round,
    programId: round.program_id,
  };
}

router.post('/rounds/:roundId/assign-judges', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  const { strategy, config } = req.body || {};
  const rawJudgesPerSubmission = config?.judges_per_submission;
  const judgesPerSubmission = rawJudgesPerSubmission === undefined ? 3 : Number(rawJudgesPerSubmission);

  try {
    const managedRound = await assertCanManageRound(req, roundId);
    if (!managedRound.ok) {
      return res.status(managedRound.status).json(managedRound.body);
    }

    if (!strategy) {
      return res.status(400).json(validationError({ strategy: 'strategy is required' }));
    }

    if (!['random', 'segmented', 'manual'].includes(strategy)) {
      return res.status(400).json(validationError({ strategy: `Unsupported strategy: ${strategy}` }));
    }

    if (strategy !== 'manual') {
      if (!Number.isInteger(judgesPerSubmission)) {
        return res.status(400).json(validationError({
          judges_per_submission: 'judges_per_submission must be an integer',
        }));
      }
      if (judgesPerSubmission < MIN_JUDGES_PER_SUBMISSION || judgesPerSubmission > MAX_JUDGES_PER_SUBMISSION) {
        return res.status(400).json(validationError({
          judges_per_submission: `judges_per_submission must be between ${MIN_JUDGES_PER_SUBMISSION} and ${MAX_JUDGES_PER_SUBMISSION}`,
        }));
      }
    }

    if (strategy === 'segmented') {
      const segmentField = String(config?.segment_field || '').trim();
      if (!segmentField) {
        return res.status(400).json(validationError({
          segment_field: 'segment_field is required for segmented assignments',
        }));
      }
    }

    if (strategy === 'manual') {
      if (!Array.isArray(config?.assignments)) {
        return res.status(400).json(validationError({
          assignments: 'assignments array is required for manual strategy',
        }));
      }
    }

    let result;
    switch (strategy) {
      case 'random':
        result = await autoRandomAssign(
          roundId,
          managedRound.programId,
          judgesPerSubmission,
          req.userId
        );
        break;
      case 'segmented':
        result = await autoSegmentedAssign(
          roundId,
          managedRound.programId,
          config?.segment_field || 'category_id',
          judgesPerSubmission,
          req.userId
        );
        break;
      case 'manual':
        result = await manualAssign(
          roundId,
          config?.assignments || [],
          req.userId
        );
        break;
      default:
        return res.status(400).json(validationError({ strategy: `Unsupported strategy: ${strategy}` }));
    }

    await deleteCache(cacheKeys.roundSubmissions(roundId));

    if (!result.ok) {
      return res.status(400).json({ error: result.error, assigned: result.assigned });
    }

    return res.json({ ok: true, assigned: result.assigned });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/rounds/:roundId/assignments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const managedRound = await assertCanManageRound(req, roundId);
    if (!managedRound.ok) {
      return res.status(managedRound.status).json(managedRound.body);
    }

    const data = await getAssignmentsByRound(roundId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/rounds/:roundId/assignments/:assignmentId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId, assignmentId } = req.params;
  try {
    const managedRound = await assertCanManageRound(req, roundId);
    if (!managedRound.ok) {
      return res.status(managedRound.status).json(managedRound.body);
    }

    const supabase = getSupabaseAdmin();
    const { data: assignment, error: assignmentError } = await supabase
      .from('submission_judges')
      .select('id, round_id')
      .eq('id', assignmentId)
      .maybeSingle();

    if (assignmentError) {
      throw new Error(assignmentError.message || 'Failed to load assignment');
    }
    if (!assignment || assignment.round_id !== roundId) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await removeAssignment(assignmentId);
    await deleteCache(cacheKeys.roundSubmissions(roundId));
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/rounds/:roundId/assignments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  try {
    const managedRound = await assertCanManageRound(req, roundId);
    if (!managedRound.ok) {
      return res.status(managedRound.status).json(managedRound.body);
    }

    await clearRoundAssignments(roundId);
    await deleteCache(cacheKeys.roundSubmissions(roundId));
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
