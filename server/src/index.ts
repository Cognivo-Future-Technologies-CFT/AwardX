import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:3000',
	credentials: true,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.post('/api/invites/team', async (req, res) => {
	const { email, roleName, programTitle, inviteUrl } = req.body || {};
	if (!resend) {
		return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
	}
	if (!email || !programTitle) {
		return res.status(400).json({ error: 'email and programTitle are required' });
	}

	const subject = `You are invited to ${programTitle}`;
	const roleLine = roleName ? `Role: ${roleName}` : 'Role: Team member';
	const inviteLine = inviteUrl ? `Accept your invite: ${inviteUrl}` : 'Sign in to join your workspace.';

	try {
		const { data, error: sendError } = await resend.emails.send({
			from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.one>',
			to: email,
			subject,
			text: `You have been invited to ${programTitle}.\n${roleLine}\n${inviteLine}`,
			html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
				<h2>You have been invited to ${programTitle}</h2>
				<p>${roleLine}</p>
				<p>${inviteLine}</p>
			</div>`,
		});

		if (sendError) {
			console.error('Resend error:', sendError);
			return res.status(500).json({ error: sendError.message || 'Resend rejected the email' });
		}

		return res.json({ ok: true, id: data?.id });
	} catch (error: any) {
		console.error('Team invite error:', error);
		return res.status(500).json({ error: error?.message || 'Failed to send invite' });
	}
});

app.post('/api/invites/judge', async (req, res) => {
	const { email, name, programTitle, inviteUrl } = req.body || {};
	if (!resend) {
		return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
	}
	if (!email || !programTitle) {
		return res.status(400).json({ error: 'email and programTitle are required' });
	}

	const subject = `You're invited to judge: ${programTitle}`;
	const previewText = `You have been invited to judge ${programTitle}. Click to access your judging portal.`;
	const actionUrl = inviteUrl || 'https://awardstuff.vercel.app/';
	const judgeName = name || 'Judge';

	try {
		const { data, error: sendError } = await resend.emails.send({
			from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.one>',
			to: email,
			subject,
			text: `Hi ${judgeName},\n\nYou have been invited to judge "${programTitle}".\n\nClick the link below to access your judging portal and view the shortlisted submissions:\n${actionUrl}\n\nIMPORTANT: This is a one-time link. It will expire after you click it.\n\nBest,\nThe AwardX team`,
			html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${previewText}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">AwardX</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">You're Invited to Judge</h2>
                <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.5;">for <strong style="color:#4f46e5;">${programTitle}</strong></p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi ${judgeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">You've been selected as a judge for <strong>${programTitle}</strong>. Click the button below to access your judging portal where you can review the shortlisted submissions and provide your scores.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${actionUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Access Judging Portal</a>
                </div>
                <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                    <strong>&#9888; One-time link:</strong> This link will expire after you click it. Please make sure to bookmark or save the portal page once opened.
                  </p>
                </div>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The AwardX Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent by AwardX on behalf of the program organizer.<br />
                  470 Noor Ave STE B #1148, South San Francisco, CA 94080
                </p>
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
			return res.status(500).json({ error: sendError.message || 'Resend rejected the email' });
		}

		return res.json({ ok: true, id: data?.id });
	} catch (error: any) {
		console.error('Judge invite error:', error);
		return res.status(500).json({ error: error?.message || 'Failed to send invite' });
	}
});

app.listen(port, () => {
	console.log(`Invite server listening on port ${port}`);
});
