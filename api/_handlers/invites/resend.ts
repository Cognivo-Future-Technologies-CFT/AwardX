import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { resendInviteSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { getOrgResendMailer } from '../../_utils/orgResend.js';
import { resendInvite } from '../../../lib/handlers/resendInvite.js';
import { applyServiceResult } from '../../../lib/serviceResult.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`invite-resend:${ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    applyServiceResult(res, {
      status: 429,
      body: { error: 'Rate limit exceeded. Try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
    return;
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.user) {
    res.status(401).json({ error: auth.error || 'Authentication required' });
    return;
  }

  const parsed = resendInviteSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await resendInvite(
      createSupabaseAdmin(),
      auth.user,
      parsed.data,
      (organizationId) => getOrgResendMailer(organizationId),
    );
    applyServiceResult(res, result);
  } catch (error: any) {
    console.error('Invite resend error:', error);
    res.status(500).json({ error: error?.message || 'Failed to resend invite' });
  }
}
