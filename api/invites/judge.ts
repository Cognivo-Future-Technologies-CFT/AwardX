import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, name, programTitle, inviteUrl } = req.body || {};
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
  const subject = `Judge invite for ${programTitle}`;
  const inviteLine = inviteUrl ? `Get started: ${inviteUrl}` : 'Sign in to access your judging portal.';

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.app>',
      to: email,
      subject,
      text: `Hi ${name || 'Judge'},\nYou have been invited to judge ${programTitle}.\n${inviteLine}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Judge invite for ${programTitle}</h2>
        <p>Hi ${name || 'Judge'},</p>
        <p>You have been invited to judge ${programTitle}.</p>
        <p>${inviteLine}</p>
      </div>`,
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to send invite' });
  }
}
