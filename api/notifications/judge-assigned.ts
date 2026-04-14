import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../_utils/authUser';
import { judgeAssignedNotificationSchema } from '../_utils/validation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    res.status(401).json({ error: authError || 'Unauthorized' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`notify-judge-assigned:${ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const parsed = judgeAssignedNotificationSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const { organizationId, programId, submissionId, judgeId, judgeName, submissionTitle } = parsed.data;

  try {
    const supabase = createSupabaseAdmin();

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId);

    const recipients = (members || []).map((member: any) => member.user_id).filter(Boolean);
    const title = 'Judge assigned';
    const body = `${judgeName} was assigned to review "${submissionTitle}".`;

    const records = recipients.length > 0
      ? recipients.map((recipientUserId: string) => ({
          organization_id: organizationId,
          program_id: programId,
          recipient_user_id: recipientUserId,
          type: 'judging',
          title,
          body,
          metadata: { submissionId, judgeId },
        }))
      : [{
          organization_id: organizationId,
          program_id: programId,
          type: 'judging',
          title,
          body,
          metadata: { submissionId, judgeId },
        }];

    const { error } = await supabase.from('notifications').insert(records);
    if (error) {
      res.status(500).json({ error: error.message || 'Failed to create notification' });
      return;
    }

    res.json({ ok: true, inserted: records.length });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
