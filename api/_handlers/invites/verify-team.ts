import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { verifyTeamSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { normalizeInviteToken } from '../../../lib/inviteToken.js';
import { verifyTeamInviteGet, verifyTeamInvitePost } from '../../../lib/handlers/teamInviteVerify.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`verify-team:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    applyServiceResult(res, {
      status: 429,
      body: { error: 'Rate limit exceeded. Try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
    return;
  }

  const tokenCandidate =
    req.method === 'GET'
      ? req.query?.token || req.query?.teamInviteToken || req.query?.inviteToken || req.query?.url
      : req.body?.token;
  const normalizedToken = normalizeInviteToken(tokenCandidate);
  const parsed = verifyTeamSchema.safeParse({ token: normalizedToken });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid token format', details: parsed.error.flatten() });
    return;
  }

  try {
    const supabase = createSupabaseAdmin();
    const auth = await getAuthenticatedUser(req);

    if (req.method === 'GET') {
      applyServiceResult(res, await verifyTeamInviteGet(supabase, parsed.data.token, auth.user));
      return;
    }

    applyServiceResult(
      res,
      await verifyTeamInvitePost(supabase, parsed.data.token, req.body?.action, auth.user),
    );
  } catch (error: any) {
    console.error('Verify team invite error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
