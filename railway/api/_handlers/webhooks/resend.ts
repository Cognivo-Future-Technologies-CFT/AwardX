import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { resendWebhookSchema } from '../../_utils/validation';

function mapEventTypeToStatus(eventType: string): 'delivered' | 'bounced' | 'complained' | 'sent' | null {
  const normalized = eventType.toLowerCase();
  if (normalized.includes('delivered')) return 'delivered';
  if (normalized.includes('bounced')) return 'bounced';
  if (normalized.includes('complained')) return 'complained';
  if (normalized.includes('sent')) return 'sent';
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const configuredSecret = process.env.RESEND_WEBHOOK_SECRET || '';
  if (!configuredSecret) {
    res.status(500).json({ error: 'RESEND_WEBHOOK_SECRET is not configured; cannot verify webhook' });
    return;
  }

  const authHeader = String(req.headers?.authorization || '');
  const expected = `Bearer ${configuredSecret}`;
  if (authHeader !== expected) {
    res.status(401).json({ error: 'Unauthorized webhook request' });
    return;
  }

  const parsed = resendWebhookSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid webhook payload', details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const emailId = payload.data?.email_id;
  if (!emailId) {
    res.status(202).json({ ok: true, ignored: true, reason: 'missing_email_id' });
    return;
  }

  const nextStatus = mapEventTypeToStatus(payload.type);
  if (!nextStatus) {
    res.status(202).json({ ok: true, ignored: true, reason: 'unsupported_event_type' });
    return;
  }

  const supabase = createSupabaseAdmin();
  const update: Record<string, any> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === 'delivered') {
    update.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('email_logs')
    .update(update)
    .eq('resend_message_id', emailId);

  if (error) {
    res.status(500).json({ error: error.message || 'Failed to update email log' });
    return;
  }

  res.json({ ok: true });
}
