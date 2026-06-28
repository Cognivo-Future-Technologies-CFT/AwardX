import { Router } from 'express';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canAccessProgram } from '../middleware/programAccess.js';
import { getSupabaseAdmin } from '../supabase.js';
import {
  processSubmission,
  queueSubmissionProcessing,
} from '../services/submissionProcessor.js';
import { findSimilarToSubmission } from '../services/submissionEmbedder.js';
import { mapClaimRow, mapFootprintRow } from '../lib/footprintMappers.js';
import { resolvePersonForSubmission } from '../lib/submissionPerson.js';
import { resolveApplicantIdentity } from '../lib/submissionApplicant.js';
import { collectFootprints } from '../services/footprintCollector.js';
import { buildProfile } from '../services/profileBuilder.js';
import {
  isEmailIntelligenceConfigured,
  isHoleheEnabled,
  isPersonIntelligenceEnabled,
} from '../lib/intelligenceConfig.js';
import { isHoleheRuntimeAvailable } from '../services/emailIntelligence/EmailIntelligenceService.js';

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

/** GET /api/submissions/:submissionId/claims — auth user or ?judgeToken= */
router.get('/:submissionId/claims', optionalAuth, async (req: AuthenticatedRequest, res) => {
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
      .from('submission_claims')
      .select(`
        *,
        claim_verifications(*)
      `)
      .eq('submission_id', submissionId)
      .order('extracted_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data: (data || []).map((row) => mapClaimRow(row as Record<string, unknown>)) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

async function fetchFootprintsForSubmission(personProfileId: string) {
  const supabase = getSupabaseAdmin();
  const { data, count, error } = await supabase
    .from('person_digital_footprints')
    .select('*', { count: 'exact' })
    .eq('person_profile_id', personProfileId)
    .order('collected_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return {
    data: (data || []).map((row) => mapFootprintRow(row as Record<string, unknown>)),
    total: count || 0,
    personProfileId,
  };
}

/** GET /api/submissions/:submissionId/footprints — auth user or ?judgeToken= */
router.get('/:submissionId/footprints', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const access = await resolveAccess(req, submissionId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const person = await resolvePersonForSubmission(submissionId);
    if (!person) {
      return res.json({ data: [], total: 0, personProfileId: null });
    }

    const result = await fetchFootprintsForSubmission(person.id);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/** GET /api/submissions/:submissionId/intelligence — aggregated dossier */
router.get('/:submissionId/intelligence', optionalAuth, async (req: AuthenticatedRequest, res) => {
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
    const { data: submission } = await supabase
      .from('submissions')
      .select('applicant_email, applicant_name, submission_data, processing_status')
      .eq('id', submissionId)
      .maybeSingle();

    const person = await resolvePersonForSubmission(submissionId);
    let profile = null;
    let footprints: ReturnType<typeof mapFootprintRow>[] = [];
    let footprintsTotal = 0;

    if (person) {
      try {
        profile = await buildProfile(person.id);
        const fp = await fetchFootprintsForSubmission(person.id);
        footprints = fp.data;
        footprintsTotal = fp.total;
      } catch (profileErr) {
        console.warn('[intelligence] Profile/footprints fetch failed:', profileErr);
      }
    }

    const { data: claims, error: claimsError } = await supabase
      .from('submission_claims')
      .select(`*, claim_verifications(*)`)
      .eq('submission_id', submissionId)
      .order('extracted_at', { ascending: false });

    if (claimsError && !claimsError.message?.includes('submission_claims')) {
      return res.status(500).json({ error: claimsError.message });
    }

    const applicant = resolveApplicantIdentity({
      applicant_email: submission?.applicant_email,
      applicant_name: submission?.applicant_name,
      submission_data: submission?.submission_data as Record<string, unknown> | undefined,
    });

    const profileData = (person?.profileData || {}) as Record<string, unknown>;
    const emailIntelligence =
      (profileData.emailIntelligence as Record<string, unknown> | undefined)
      ?? (profileData.behindTheEmail as Record<string, unknown> | undefined)
      ?? null;

    const holeheAvailable = await isHoleheRuntimeAvailable();

    return res.json({
      personProfileId: person?.id ?? null,
      applicantEmail: applicant.email ?? null,
      applicantName: applicant.name ?? null,
      processingStatus: submission?.processing_status ?? null,
      profile,
      footprints,
      footprintsTotal,
      claims: (claims || []).map((row) => mapClaimRow(row as Record<string, unknown>)),
      emailIntelligence,
      intelligenceEnabled: isPersonIntelligenceEnabled(),
      holeheEnabled: isHoleheEnabled(),
      holeheAvailable,
      emailIntelligenceConfigured: isEmailIntelligenceConfigured(),
      setupRequired: claimsError?.message?.includes('submission_claims') ?? false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/** POST /api/submissions/:submissionId/footprints/refresh — auth user or ?judgeToken= */
router.post('/:submissionId/footprints/refresh', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const access = await resolveAccess(req, submissionId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const person = await resolvePersonForSubmission(submissionId, true);
    if (!person) {
      return res.status(400).json({
        error: 'Applicant email is required to collect footprints. Ensure the submission has an email field filled in.',
      });
    }

    try {
      await collectFootprints(person, { force: true });
      await buildProfile(person.id);
    } catch (collectErr) {
      const message = collectErr instanceof Error ? collectErr.message : 'Collection failed';
      if (message.includes('person_profiles') || message.includes('person_digital_footprints')) {
        return res.status(503).json({
          error: 'Database tables not ready. Run migrations 037 and 038 in Supabase SQL Editor.',
        });
      }
      throw collectErr;
    }
    const result = await fetchFootprintsForSubmission(person.id);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
