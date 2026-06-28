import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { verifyJudgeSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { verifyJudgeInvite } from '../../../lib/handlers/verifyJudgeInvite.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`verify-judge:${ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    applyServiceResult(res, {
      status: 429,
      body: { error: 'Rate limit exceeded. Try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
    return;
  }

  const tokenCandidate = req.method === 'GET' ? req.query?.token : req.body?.token;
  const parsed = verifyJudgeSchema.safeParse({ token: tokenCandidate });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid token format', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await verifyJudgeInvite(createSupabaseAdmin(), {
      method: req.method,
      token: parsed.data.token,
      action: req.body?.action,
    });
    applyServiceResult(res, result);
  } catch (error: any) {
    console.error('Verify judge error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
