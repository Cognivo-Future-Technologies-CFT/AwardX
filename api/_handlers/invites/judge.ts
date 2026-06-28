import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { judgeInviteSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { getOrgResendMailer } from '../../_utils/orgResend.js';
import { sendJudgeInvite } from '../../../lib/handlers/sendJudgeInvite.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`judge-invite:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    applyServiceResult(res, {
      status: 429,
      body: { error: 'Rate limit exceeded. Try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
    return;
  }

  const parsed = judgeInviteSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.user) {
    res.status(401).json({ error: auth.error || 'Authentication required' });
    return;
  }

  try {
    const supabase = createSupabaseAdmin(auth.token || undefined);
    const result = await sendJudgeInvite(
      supabase,
      auth.user,
      parsed.data,
      (organizationId) => getOrgResendMailer(organizationId),
    );
    applyServiceResult(res, result);
  } catch (error: any) {
    console.error('Judge invite error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create or send invite' });
  }
}
