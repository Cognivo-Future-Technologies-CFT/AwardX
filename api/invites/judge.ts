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
  const previewText = `You have been invited to judge ${programTitle}.`;
  const actionUrl = inviteUrl || 'https://awardstuff.vercel.app/';

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.app>',
      to: email,
      subject,
      text: `Hi ${name || 'Judge'},\nYou have been invited to judge ${programTitle}.\n${inviteLine}`,
      html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;background-color:#ffffff;font-family:Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${previewText}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ffffff;">
      <tr>
        <td align="center" style="padding:20px 0 40px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;">
            <tr>
              <td style="padding:0 20px 20px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#111827;">Hi ${name || 'Judge'},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#111827;">You have been invited to judge ${programTitle}.</p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${actionUrl}" style="background:#5F51E8;color:#ffffff;text-decoration:none;font-size:16px;line-height:16px;padding:12px 20px;border-radius:3px;display:inline-block;">Get started</a>
                </div>
                <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#111827;">${inviteLine}</p>
                <p style="margin:0;font-size:16px;line-height:26px;color:#111827;">Best,<br />The AwardX team</p>
                <hr style="border:none;border-top:1px solid #cccccc;margin:20px 0;" />
                <p style="margin:0;font-size:12px;line-height:20px;color:#8898aa;">470 Noor Ave STE B #1148, South San Francisco, CA 94080</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      res.status(500).json({ error: sendError.message || 'Resend rejected the email' });
      return;
    }

    res.json({ ok: true, id: data?.id });
  } catch (error: any) {
    console.error('Judge invite error:', error);
    res.status(500).json({ error: error?.message || 'Failed to send invite' });
  }
}
