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
		return res.json({ ok: true });
	} catch (error: any) {
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
		return res.json({ ok: true });
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Failed to send invite' });
	}
});

app.listen(port, () => {
	console.log(`Invite server listening on port ${port}`);
});
