import { Resend } from 'resend';
import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { teamInviteSchema } from '../_utils/validation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`team-invite:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const parsed = teamInviteSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const { email, roleName, programTitle, inviteUrl } = parsed.data;

  const resendApiKey = process.env.RESEND_API_KEY || '';
  if (!resendApiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    return;
  }

  const resend = new Resend(resendApiKey);
  const subject = `AwardX invite: ${programTitle}`;
  const roleLine = roleName ? `Assigned role: ${roleName}` : 'Assigned role: Team member';
  const inviteLine = inviteUrl ? `Accept your invite: ${inviteUrl}` : 'Sign in to join your workspace.';

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.one>',
      to: email,
      subject,
      text: `The AwardX team for ${programTitle} wants you to join this event.\n${roleLine}\n${inviteLine}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>The AwardX team for ${programTitle} wants you to join</h2>
        <p>${roleLine}</p>
        <p>${inviteLine}</p>
      </div>`,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      res.status(500).json({ error: sendError.message || 'Resend rejected the email' });
      return;
    }

    res.json({ ok: true, id: data?.id });
  } catch (error: any) {
    console.error('Team invite error:', error);
    res.status(500).json({ error: error?.message || 'Failed to send invite' });
  }
}
