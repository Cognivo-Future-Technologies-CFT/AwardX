import { Router } from 'express';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase.js';
import { enforceRateLimit, getClientIp } from '../../../lib/routeRateLimit.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';
import { submitJudgeScores } from '../../../lib/handlers/judgeSubmitScores.js';

const router = Router();

router.post('/judge-submit', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const ip = getClientIp(req);
    const rateLimit = enforceRateLimit(`judge-submit:${ip}`, 30, 15 * 60 * 1000);
    if (!rateLimit.ok) {
      return applyServiceResult(res, {
        status: 429,
        body: { error: 'Rate limit exceeded. Try again later.' },
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      });
    }

    const { token, submissionJudgeId, criteriaScores, overallComment } = req.body || {};
    if (!token || !submissionJudgeId || !Array.isArray(criteriaScores) || criteriaScores.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: token, submissionJudgeId, criteriaScores',
      });
    }

    const result = await submitJudgeScores(getSupabaseAdmin(), {
      token,
      submissionJudgeId,
      criteriaScores,
      overallComment,
    });
    return applyServiceResult(res, result);
  } catch (error: any) {
    console.error('Judge submit scores error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

export default router;
