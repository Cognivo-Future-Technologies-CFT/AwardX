import { randomUUID } from 'crypto';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { getOrgResendMailer, RESEND_NOT_CONFIGURED_MESSAGE } from '../../_utils/orgResend.js';
import { canManageInvites } from '../../_utils/invitePermissions';
import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { resendInviteSchema } from '../../_utils/validation';
import { createEmailLog, updateEmailLog } from '../../_utils/emailLogs';

const INVITE_TTL_DAYS = 30;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`invite-resend:${ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth.user) {
    res.status(401).json({ error: auth.error || 'Authentication required' });
    return;
  }

  const parsed = resendInviteSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const { inviteType, recordId, programTitleFallback } = parsed.data;
  const supabase = createSupabaseAdmin();

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', auth.user.id)
    .maybeSingle();

  let resolvedOrganizationId = inviterProfile?.organization_id || null;
  if (!resolvedOrganizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedOrganizationId = membership?.organization_id || null;
  }

  if (resolvedOrganizationId) {
    const permitted = await canManageInvites(supabase, auth.user.id, resolvedOrganizationId);
    if (!permitted) {
      const systemApiKey = process.env.RESEND_API_KEY;
      const systemFrom = process.env.RESEND_FROM;
      if (!systemApiKey || !systemFrom) {
        res.status(403).json({ error: 'Insufficient permissions to resend invites' });
        return;
      }
    }
  } else {
    const systemApiKey = process.env.RESEND_API_KEY;
    const systemFrom = process.env.RESEND_FROM;
    if (!systemApiKey || !systemFrom) {
      res.status(400).json({ error: 'Could not resolve inviter organization (no system mailer configured)' });
      return;
    }
  }

  try {
    if (inviteType === 'team') {
      const { data: inviteRow, error: inviteError } = await supabase
        .from('organization_invites')
        .select('id, organization_id, program_id, email, status, token, role_id, programs(title, deadline), roles(name)')
        .eq('id', recordId)
        .single();

      if (inviteError || !inviteRow) {
        res.status(404).json({ error: 'Team invite record not found' });
        return;
      }

      const canManageTargetOrg = await canManageInvites(supabase, auth.user.id, inviteRow.organization_id);
      if (!canManageTargetOrg) {
        const systemApiKey = process.env.RESEND_API_KEY;
        const systemFrom = process.env.RESEND_FROM;
        if (!systemApiKey || !systemFrom) {
          res.status(403).json({ error: 'You cannot resend invites outside your organization' });
          return;
        }
      }

      if (inviteRow.status !== 'pending') {
        res.status(400).json({ error: 'Only pending invites can be resent' });
        return;
      }

      const rotatedToken = randomUUID();
      const { error: rotateError } = await supabase
        .from('organization_invites')
        .update({
          token: rotatedToken,
          expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', inviteRow.id)
        .eq('status', 'pending');

      if (rotateError) {
        res.status(500).json({ error: rotateError.message || 'Failed to rotate invite token' });
        return;
      }

      const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://awardstuff.vercel.app').replace(/\/$/, '');
      const inviteUrl = `${siteUrl}/team-invite/${rotatedToken}`;
      const programTitle = (inviteRow as any).programs?.title || programTitleFallback || 'your workspace';
      const roleName = (inviteRow as any).roles?.name || 'Team member';
      const subject = `Team invite: ${programTitle}`;

      let deadlineText = '';
      const programDeadline = (inviteRow as any).programs?.deadline;
      if (programDeadline) {
        const d = new Date(programDeadline);
        deadlineText = d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }

      const { id: emailLogId } = await createEmailLog(supabase, {
        organizationId: inviteRow.organization_id,
        programId: inviteRow.program_id,
        inviteId: inviteRow.id,
        recipientEmail: inviteRow.email,
        templateKey: 'team_invite_resend',
        templateVersion: 'v1',
        context: {
          roleName,
          inviterName: inviterProfile.full_name || null,
          programTitle,
          inviteUrl,
          deadlineText,
        },
      });

      const mailer = await getOrgResendMailer(inviteRow.organization_id);
      if (!mailer) {
        if (emailLogId) {
          await updateEmailLog(supabase, emailLogId, {
            status: 'failed',
            errorMessage: RESEND_NOT_CONFIGURED_MESSAGE,
          });
        }
        res.status(503).json({ error: RESEND_NOT_CONFIGURED_MESSAGE });
        return;
      }

      const { data, error: sendError } = await mailer.resend.emails.send({
        from: mailer.from,
        to: inviteRow.email,
        subject,
        text: `The team for ${programTitle} wants you to join this event.\nAssigned role: ${roleName}\nAccept your invite: ${inviteUrl}`,
        html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">You have been invited to join the team for ${escapeHtml(programTitle)}.</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Join the Team</h2>
                
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi,</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                  ${inviterProfile?.full_name ? `<strong>${escapeHtml(inviterProfile.full_name)}</strong>` : 'An administrator'} has invited you to join the team on the platform. Please review the details of the invitation below:
                </p>

                <!-- Info Grid -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(roleName || 'Team member')}</td>
                  </tr>
                  ${deadlineText ? `
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>

                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to accept the invitation and configure your workspace profile.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${inviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Accept Team Invite</a>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
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
        if (emailLogId) {
          await updateEmailLog(supabase, emailLogId, {
            status: 'failed',
            errorMessage: sendError.message || 'Resend rejected the email',
          });
        }
        res.status(500).json({ error: sendError.message || 'Resend rejected the email' });
        return;
      }

      if (emailLogId) {
        await updateEmailLog(supabase, emailLogId, {
          status: 'sent',
          resendMessageId: data?.id || null,
        });
      }

      res.json({ ok: true, id: data?.id, inviteType: 'team', recordId: inviteRow.id });
      return;
    }

    const { data: judgeRow, error: judgeError } = await supabase
      .from('judges')
      .select('id, organization_id, program_id, email, name, status, invite_token_used_at, invite_token, programs(title, deadline)')
      .eq('id', recordId)
      .single();

    if (judgeError || !judgeRow) {
      res.status(404).json({ error: 'Judge invite record not found' });
      return;
    }

    const canManageJudgeOrg = await canManageInvites(supabase, auth.user.id, judgeRow.organization_id);
    if (!canManageJudgeOrg) {
      const systemApiKey = process.env.RESEND_API_KEY;
      const systemFrom = process.env.RESEND_FROM;
      if (!systemApiKey || !systemFrom) {
        res.status(403).json({ error: 'You cannot resend invites outside your organization' });
        return;
      }
    }

    if (judgeRow.status !== 'invited' && judgeRow.status !== 'active') {
      res.status(400).json({ error: 'Only invited or active judges can receive a resend' });
      return;
    }

    const rotatedToken = randomUUID();
    const { error: rotateJudgeError } = await supabase
      .from('judges')
      .update({
        invite_token: rotatedToken,
        invite_token_used_at: null,
      })
      .eq('id', judgeRow.id)
      .in('status', ['invited', 'active']);

    if (rotateJudgeError) {
      res.status(500).json({ error: rotateJudgeError.message || 'Failed to rotate judge invite token' });
      return;
    }

    const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://awardstuff.vercel.app').replace(/\/$/, '');
    const inviteUrl = `${siteUrl}/judge/${rotatedToken}`;
    const programTitle = (judgeRow as any).programs?.title || programTitleFallback || 'your workspace';
    const judgeName = judgeRow.name || 'Judge';
    const subject = `You're invited to judge: ${programTitle}`;

    let deadlineText = '';
    const programDeadline = (judgeRow as any).programs?.deadline;
    if (programDeadline) {
      const d = new Date(programDeadline);
      deadlineText = d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const { id: emailLogId } = await createEmailLog(supabase, {
      organizationId: judgeRow.organization_id,
      programId: judgeRow.program_id,
      inviteId: null,
      recipientEmail: judgeRow.email,
      templateKey: 'judge_invite_resend',
      templateVersion: 'v1',
      context: {
        judgeName,
        programTitle,
        inviteUrl,
        deadlineText,
      },
    });

    const judgeMailer = await getOrgResendMailer(judgeRow.organization_id);
    if (!judgeMailer) {
      if (emailLogId) {
        await updateEmailLog(supabase, emailLogId, {
          status: 'failed',
          errorMessage: RESEND_NOT_CONFIGURED_MESSAGE,
        });
      }
      res.status(503).json({ error: RESEND_NOT_CONFIGURED_MESSAGE });
      return;
    }

    const previewText = `You have been invited to judge ${programTitle}. Click to access your judging portal.`;
    const { data, error: sendError } = await judgeMailer.resend.emails.send({
      from: judgeMailer.from,
      to: judgeRow.email,
      subject,
      text: `Hi ${judgeName},\n\nYou have been invited to judge for the upcoming event.\n\nEvent: ${programTitle}\nRole: Judge${deadlineText ? `\nDeadline: ${deadlineText}` : ''}\n\nClick the link below to access your judging portal and view the assigned submissions:\n${inviteUrl}\n\nYou can bookmark this link to return to your portal at any time during the judging period.\n\nBest,\nThe team`,
      html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">You're Invited to Judge</h2>
                
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi ${escapeHtml(judgeName)},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You have been selected as a judge. Please review the details of the invitation below:</p>

                <!-- Info Grid -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">Judge</td>
                  </tr>
                  ${deadlineText ? `
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>

                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to access your judging portal where you can view assigned submissions, scoresheets, and evaluation criteria.</p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${inviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Access Judging Portal</a>
                </div>

                <!-- Bookmark notice -->
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
                    <strong>🔖 Bookmark this link</strong> to return to your judging portal at any time during the judging period.
                  </p>
                </div>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
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
      if (emailLogId) {
        await updateEmailLog(supabase, emailLogId, {
          status: 'failed',
          errorMessage: sendError.message || 'Resend rejected the email',
        });
      }
      res.status(500).json({ error: sendError.message || 'Resend rejected the email' });
      return;
    }

    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'sent',
        resendMessageId: data?.id || null,
      });
    }

    res.json({ ok: true, id: data?.id, inviteType: 'judge', recordId: judgeRow.id });
  } catch (error: any) {
    console.error('Invite resend error:', error);
    res.status(500).json({ error: error?.message || 'Failed to resend invite' });
  }
}
