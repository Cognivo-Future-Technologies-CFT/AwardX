import { Resend } from 'resend';
import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { judgeInviteSchema } from '../_utils/validation';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { createEmailLog, updateEmailLog } from '../_utils/emailLogs';
import { getAuthenticatedUser } from '../_utils/authUser';
import { canManageInvites } from '../_utils/invitePermissions';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`judge-invite:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const parsed = judgeInviteSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const { email, name, programTitle, inviteUrl, organizationId, programId, inviteId } = parsed.data;

  const auth = await getAuthenticatedUser(req);
  if (!auth.user) {
    res.status(401).json({ error: auth.error || 'Authentication required' });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY || '';
  if (!resendApiKey) {
    res.status(200).json({
      ok: true,
      emailSent: false,
      warning: 'Invite request accepted but email service is not configured',
    });
    return;
  }

  const resend = new Resend(resendApiKey);
  const fromAddress = process.env.RESEND_FROM || 'AwardX <onboarding@resend.dev>';
  const subject = `You're invited to judge: ${programTitle}`;
  const previewText = `You have been invited to judge ${programTitle}. Click to access your judging portal.`;
  const actionUrl = inviteUrl || 'https://awardstuff.vercel.app/';
  const judgeName = name || 'Judge';
  const normalizedEmail = email.toLowerCase().trim();
  let supabase: any;
  try {
    supabase = createSupabaseAdmin(auth.token || undefined);
  } catch (envError: any) {
    res.status(503).json({ error: envError?.message || 'Server environment is not configured for invites' });
    return;
  }

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', auth.user.id)
    .maybeSingle();

  const resolvedOrganizationId = organizationId || inviterProfile?.organization_id || null;
  if (!resolvedOrganizationId) {
    res.status(400).json({ error: 'organizationId is required for judge invites' });
    return;
  }

  const permitted = await canManageInvites(supabase, auth.user.id, resolvedOrganizationId);
  if (!permitted) {
    res.status(403).json({ error: 'Insufficient permissions to send judge invites' });
    return;
  }

  const { id: emailLogId } = await createEmailLog(supabase, {
    organizationId: resolvedOrganizationId,
    programId: programId || null,
    inviteId: inviteId || null,
    recipientEmail: normalizedEmail,
    templateKey: 'judge_invite',
    templateVersion: 'v1',
    context: {
      programTitle,
      inviteUrl: actionUrl,
      judgeName,
    },
  });

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: normalizedEmail,
      subject,
      text: `Hi ${judgeName},\n\nYou have been invited to judge "${programTitle}".\n\nClick the link below to access your judging portal and view the assigned submissions:\n${actionUrl}\n\nYou can bookmark this link to return to your portal at any time during the judging period.\n\nBest,\nThe AwardX team`,
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
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">AwardX</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">You're Invited to Judge</h2>
                <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.5;">for <strong style="color:#4f46e5;">${programTitle}</strong></p>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi ${judgeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">You've been selected as a judge for <strong>${programTitle}</strong>. Click the button below to access your judging portal where you can review the assigned submissions and provide your scores.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${actionUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Access Judging Portal</a>
                </div>

                <!-- Bookmark notice -->
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
                    <strong>🔖 Bookmark this link</strong> to return to your judging portal at any time during the judging period.
                  </p>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The AwardX Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
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
      if (emailLogId) {
        await updateEmailLog(supabase, emailLogId, {
          status: 'failed',
          errorMessage: sendError.message || 'Resend rejected the email',
        });
      }
      res.status(200).json({
        ok: true,
        emailSent: false,
        warning: sendError.message || 'Resend rejected the email',
      });
      return;
    }

    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'sent',
        resendMessageId: data?.id || null,
      });
    }

    res.json({ ok: true, id: data?.id, emailSent: true });
  } catch (error: any) {
    console.error('Judge invite error:', error);
    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'failed',
        errorMessage: error?.message || 'Failed to send invite',
      });
    }
    res.status(500).json({ error: error?.message || 'Failed to create or send invite' });
  }
}
