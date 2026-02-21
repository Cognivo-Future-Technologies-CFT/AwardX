import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, roleName, programTitle, inviteUrl } = req.body || {};
  if (!email || !programTitle) {
    res.status(400).json({ error: 'email and programTitle are required' });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY || '';
  if (!resendApiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    return;
  }

  const resend = new Resend(resendApiKey);
  const subject = `You are invited to ${programTitle}`;
  const roleLine = roleName ? `Role: ${roleName}` : 'Role: Team member';
  const inviteLine = inviteUrl ? `Accept your invite: ${inviteUrl}` : 'Sign in to join your workspace.';

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.app>',
      to: email,
      subject,
      text: `You have been invited to ${programTitle}.\n${roleLine}\n${inviteLine}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>You have been invited to ${programTitle}</h2>
        <p>${roleLine}</p>
        <p>${inviteLine}</p>
      </div>`,
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to send invite' });
  }
}
