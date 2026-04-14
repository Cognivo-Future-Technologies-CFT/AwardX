import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { deadlineApproachingNotificationSchema } from '../_utils/validation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`notify-deadline-approaching:${ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const parsed = deadlineApproachingNotificationSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const { organizationId, programId, programTitle, deadlineIso } = parsed.data;

  try {
    const supabase = createSupabaseAdmin();

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId);

    const deadlineDate = new Date(deadlineIso);
    const formattedDeadline = Number.isNaN(deadlineDate.getTime())
      ? deadlineIso
      : deadlineDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const title = 'Deadline approaching';
    const body = `"${programTitle}" closes on ${formattedDeadline}.`;
    const recipients = (members || []).map((member: any) => member.user_id).filter(Boolean);

    const records = recipients.length > 0
      ? recipients.map((recipientUserId: string) => ({
          organization_id: organizationId,
          program_id: programId,
          recipient_user_id: recipientUserId,
          type: 'deadline',
          title,
          body,
          metadata: { deadlineIso },
        }))
      : [{
          organization_id: organizationId,
          program_id: programId,
          type: 'deadline',
          title,
          body,
          metadata: { deadlineIso },
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
