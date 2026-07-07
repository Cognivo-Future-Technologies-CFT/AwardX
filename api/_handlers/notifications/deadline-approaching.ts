import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { insertNotification } from '../../_utils/notifications';
import { deadlineApproachingNotificationSchema } from '../../_utils/validation';

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

    const deadlineDate = new Date(deadlineIso);
    const formattedDeadline = Number.isNaN(deadlineDate.getTime())
      ? deadlineIso
      : deadlineDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const title = 'Deadline approaching';
    const body = `"${programTitle}" closes on ${formattedDeadline}.`;

    const { error } = await insertNotification(supabase, {
      organizationId,
      programId,
      type: 'deadline',
      title,
      body,
      view: 'schedule-rounds',
      metadata: { deadlineIso },
    });

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to create notification' });
      return;
    }

    res.json({ ok: true, inserted: 1 });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
