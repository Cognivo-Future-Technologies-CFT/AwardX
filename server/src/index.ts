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
