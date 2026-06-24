import { Router } from 'express';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canAccessProgram } from '../middleware/programAccess.js';
import { getSupabaseAdmin } from '../supabase.js';
import {
  processSubmission,
  queueSubmissionProcessing,
} from '../services/submissionProcessor.js';
import { findSimilarToSubmission } from '../services/submissionEmbedder.js';

const router = Router();

async function getSubmissionProgramId(submissionId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('submissions')
    .select('program_id')
    .eq('id', submissionId)
    .maybeSingle();
  return data?.program_id ?? null;
}

async function canAccessSubmission(userId: string, submissionId: string): Promise<boolean> {
  const programId = await getSubmissionProgramId(submissionId);
  if (!programId) return false;
  return canAccessProgram(userId, programId);
}

/** Verify judge invite token has access to a submission. */
async function canJudgeAccessSubmission(
  token: string,
  submissionId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: judge } = await supabase
    .from('judges')
    .select('id')
    .eq('invite_token', token)
    .maybeSingle();

  if (!judge) return false;

  const { data: assignment } = await supabase
    .from('submission_judges')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('judge_id', judge.id)
    .maybeSingle();

  return !!assignment;
}

async function resolveAccess(
  req: AuthenticatedRequest,
  submissionId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const judgeToken =
    typeof req.query.judgeToken === 'string' ? req.query.judgeToken.trim() : '';

  if (judgeToken) {
    const allowed = await canJudgeAccessSubmission(judgeToken, submissionId);
    if (!allowed) {
      return { ok: false, status: 403, error: 'You are not assigned to this submission' };
    }
    return { ok: true };
  }

  if (!req.userId) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const permitted = await canAccessSubmission(req.userId, submissionId);
  if (!permitted) {
    return { ok: false, status: 403, error: 'You do not have access to this submission' };
  }

  return { ok: true };
}

/** GET /api/submissions/:submissionId/processing — auth user or ?judgeToken= */
router.get('/:submissionId/processing', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const access = await resolveAccess(req, submissionId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        processing_status,
        processed_summary,
        summary_confidence,
        summary_mode,
        ai_detection_score,
        ai_detection_confidence,
        ai_detection_model,
        processing_metadata,
        processing_error,
        processed_at
      `)
      .eq('id', submissionId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (data.processing_status === 'pending' || data.processing_status === 'failed') {
      queueSubmissionProcessing(submissionId);
    } else if (
      data.processing_status === 'completed' &&
      typeof data.ai_detection_model === 'string' &&
      data.ai_detection_model.includes('roberta')
    ) {
      // Re-run with updated open-source detector
      queueSubmissionProcessing(submissionId);
    }

    return res.json({
      data: {
        submissionId: data.id,
        status: data.processing_status,
        summary: data.processed_summary,
        summaryConfidence: data.summary_confidence != null ? Number(data.summary_confidence) : null,
        summaryMode: data.summary_mode,
        aiPercentage: data.ai_detection_score != null ? Number(data.ai_detection_score) : null,
        aiConfidence: data.ai_detection_confidence != null ? Number(data.ai_detection_confidence) : null,
        aiModel: data.ai_detection_model,
        metadata: data.processing_metadata || {},
        error: data.processing_error,
        processedAt: data.processed_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/** POST /api/submissions/:submissionId/process */
router.post('/:submissionId/process', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;
  const force = req.body?.force === true;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const permitted = await canAccessSubmission(req.userId || '', submissionId);
    if (!permitted) {
      return res.status(403).json({ error: 'You do not have access to this submission' });
    }

    const result = await processSubmission(submissionId, { force });
    return res.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/** GET /api/submissions/:submissionId/similar — auth user or ?judgeToken= */
router.get('/:submissionId/similar', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;
  const limit = Math.max(1, Math.min(20, Number.parseInt(String(req.query.limit ?? '8'), 10) || 8));
  const scope = req.query.scope === 'program' ? 'program' : 'org';

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const access = await resolveAccess(req, submissionId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const similar = await findSimilarToSubmission(submissionId, { limit, scope });
    return res.json({ data: similar });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    if (message.includes('No embeddings')) {
      return res.json({ data: [] });
    }
    return res.status(500).json({ error: message });
  }
});

/** POST /api/submissions/:submissionId/trigger — queue processing after public form submit */
router.post('/:submissionId/trigger', async (req, res) => {
  const { submissionId } = req.params;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('submissions')
      .select('id, submitted_at, processing_status')
      .eq('id', submissionId)
      .maybeSingle();

    if (!data) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submittedAt = new Date(data.submitted_at).getTime();
    const ageMs = Date.now() - submittedAt;
    if (ageMs > 30 * 60 * 1000) {
      return res.status(403).json({ error: 'Submission is too old to auto-trigger processing' });
    }

    if (data.processing_status !== 'completed') {
      queueSubmissionProcessing(submissionId);
    }

    return res.json({ ok: true, queued: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/** POST /api/submissions/:submissionId/queue — internal trigger (no auth for service calls) */
router.post('/:submissionId/queue', async (req, res) => {
  const { submissionId } = req.params;
  const serviceKey = req.headers['x-service-key'];
  const expectedKey = process.env.SUBMISSION_PROCESSING_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || serviceKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  queueSubmissionProcessing(submissionId);
  return res.json({ ok: true, queued: true });
});

export default router;
