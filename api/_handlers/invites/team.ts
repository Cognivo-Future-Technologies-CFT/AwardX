import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { teamInviteSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { getOrgResendMailer } from '../../_utils/orgResend.js';
import { sendTeamInvite } from '../../../lib/handlers/sendTeamInvite.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`team-invite:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    applyServiceResult(res, {
      status: 429,
      body: { error: 'Rate limit exceeded. Try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
    return;
  }

  const parsed = teamInviteSchema.safeParse(req.body || {});
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
    const supabase = createSupabaseAdmin();
    const actorOrgId = parsed.data.organizationId;
    if (actorOrgId) {
      const actorRateLimit = enforceRateLimit(
        `team-invite:${actorOrgId}:${auth.user.id}`,
        30,
        15 * 60 * 1000,
      );
      if (!actorRateLimit.ok) {
        applyServiceResult(res, {
          status: 429,
          body: { error: 'Invite limit reached for this user and organization. Try again later.' },
          headers: { 'Retry-After': String(actorRateLimit.retryAfterSeconds) },
        });
        return;
      }
    }

    const result = await sendTeamInvite(
      supabase,
      auth.user,
      parsed.data,
      (organizationId) => getOrgResendMailer(organizationId),
    );
    applyServiceResult(res, result);
  } catch (error: any) {
    console.error('Team invite error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create or send invite' });
  }
}
