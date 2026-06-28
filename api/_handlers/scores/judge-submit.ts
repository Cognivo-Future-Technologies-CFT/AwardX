import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { judgeSubmitScoresSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { submitJudgeScores } from '../../../lib/handlers/judgeSubmitScores.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`judge-submit:${ip}`, 30, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    applyServiceResult(res, {
      status: 429,
      body: { error: 'Rate limit exceeded. Try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
    return;
  }

  const parsed = judgeSubmitScoresSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await submitJudgeScores(createSupabaseAdmin(), parsed.data);
    applyServiceResult(res, result);
  } catch (error: any) {
    console.error('Judge submit scores error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
