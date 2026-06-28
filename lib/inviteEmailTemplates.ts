import { escapeHtml } from './inviteEmailUtils.js';

const EMAIL_FOOTER = `
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  This email was sent on behalf of the program organizer.<br />
                  470 Noor Ave STE B #1148, South San Francisco, CA 94080
                </p>
              </td>
            </tr>`;

function emailShell(title: string, previewText: string, bodyHtml: string) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            ${bodyHtml}
            ${EMAIL_FOOTER}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildJudgeInviteEmail(input: {
  judgeName: string;
  programTitle: string;
  actionUrl: string;
  deadlineText?: string;
}) {
  const { judgeName, programTitle, actionUrl, deadlineText = '' } = input;
  const subject = `You're invited to judge: ${programTitle}`;
  const previewText = `You have been invited to judge ${programTitle}. Click to access your judging portal.`;
  const text = `Hi ${judgeName},\n\nYou have been invited to judge for the upcoming event.\n\nEvent: ${programTitle}\nRole: Judge${deadlineText ? `\nDeadline: ${deadlineText}` : ''}\n\nClick the link below to access your judging portal and view the assigned submissions:\n${actionUrl}\n\nYou can bookmark this link to return to your portal at any time during the judging period.\n\nBest,\nThe team`;

  const html = emailShell(
    subject,
    previewText,
    `<tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">You're Invited to Judge</h2>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi ${escapeHtml(judgeName)},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You have been selected as a judge. Please review the details of the invitation below:</p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">Judge</td>
                  </tr>
                  ${deadlineText ? `<tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>
                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to access your judging portal where you can view assigned submissions, scoresheets, and evaluation criteria.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${actionUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Access Judging Portal</a>
                </div>
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:24px 0;">
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;"><strong>🔖 Bookmark this link</strong> to return to your judging portal at any time during the judging period.</p>
                </div>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>`,
  );

  return { subject, previewText, text, html };
}

export function buildTeamInviteEmail(input: {
  inviterName?: string | null;
  programTitle: string;
  roleName?: string | null;
  inviteUrl: string;
  deadlineText?: string;
}) {
  const { inviterName, programTitle, roleName, inviteUrl, deadlineText = '' } = input;
  const subject = `Team invite: ${programTitle}`;
  const roleLine = roleName ? `Assigned role: ${roleName}` : 'Assigned role: Team member';
  const previewText = `You have been invited to join the team for ${programTitle}.`;
  const text = `The team for ${programTitle} wants you to join this event.\n${roleLine}\nAccept your invite: ${inviteUrl}`;

  const html = emailShell(
    subject,
    previewText,
    `<tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Join the Team</h2>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi,</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                  ${inviterName ? `<strong>${escapeHtml(inviterName)}</strong>` : 'An administrator'} has invited you to join the team on the platform. Please review the details of the invitation below:
                </p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;padding:20px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(programTitle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Role:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(roleName || 'Team member')}</td>
                  </tr>
                  ${deadlineText ? `<tr>
                    <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Deadline:</strong></td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${escapeHtml(deadlineText)}</td>
                  </tr>` : ''}
                </table>
                <p style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#334155;">Click the button below to accept the invitation and configure your workspace profile.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${inviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Accept Team Invite</a>
                </div>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>The Team</strong></p>
              </td>
            </tr>`,
  );

  return { subject, previewText, text, html };
}
