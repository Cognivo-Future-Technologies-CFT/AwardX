import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { getOrgResendMailer, RESEND_NOT_CONFIGURED_MESSAGE } from '../../_utils/orgResend.js';
import { teamInviteSchema } from '../../_utils/validation';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { createEmailLog, updateEmailLog } from '../../_utils/emailLogs';
import { canManageInvites } from '../../_utils/invitePermissions';
const INVITE_TTL_DAYS = 30;
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function resolveSafeInviteUrl(siteUrl, inviteUrl, token) {
    const fallbackUrl = `${siteUrl}/team-invite/${token}`;
    if (!inviteUrl)
        return fallbackUrl;
    try {
        const candidate = new URL(inviteUrl);
        const trustedSite = new URL(siteUrl);
        if (candidate.origin !== trustedSite.origin)
            return fallbackUrl;
        const normalizedPath = candidate.pathname.replace(/\/+$/, '');
        if (normalizedPath === '/team-invite') {
            return `${candidate.origin}${normalizedPath}/${token}`;
        }
        if (normalizedPath.startsWith('/team-invite/')) {
            const currentToken = normalizedPath.split('/').pop();
            if (currentToken === token)
                return candidate.toString();
            return fallbackUrl;
        }
        if (normalizedPath === '/signup') {
            const queryToken = candidate.searchParams.get('teamInviteToken');
            if (queryToken === token)
                return candidate.toString();
            candidate.searchParams.set('teamInviteToken', token);
            return candidate.toString();
        }
    }
    catch {
        // Use fallback when caller-provided URL is malformed.
    }
    return fallbackUrl;
}
export default async function handler(req, res) {
    try {
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
        const { email, roleId, roleName, programTitle, organizationId, programId, inviteUrl } = parsed.data;
        const auth = await getAuthenticatedUser(req);
        if (!auth.user) {
            res.status(401).json({ error: auth.error || 'Authentication required' });
            return;
        }
        let supabase;
        try {
            // Use service-role client for server-side invite creation and enforce authorization explicitly in code.
            supabase = createSupabaseAdmin();
        }
        catch (envError) {
            res.status(503).json({ error: envError?.message || 'Server environment is not configured for invites' });
            return;
        }
        const normalizedEmail = email.toLowerCase().trim();
        const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('id, organization_id, full_name')
            .eq('id', auth.user.id)
            .maybeSingle();
        const resolvedOrganizationId = organizationId || inviterProfile?.organization_id || null;
        if (!resolvedOrganizationId) {
            res.status(400).json({ error: 'organizationId is required for team invites' });
            return;
        }
        const permitted = await canManageInvites(supabase, auth.user.id, resolvedOrganizationId);
        if (!permitted) {
            res.status(403).json({ error: 'Insufficient permissions to send team invites' });
            return;
        }
        // Check if the user is already an active member of this organization.
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle();
        if (existingUser) {
            const { data: member } = await supabase
                .from('organization_members')
                .select('id')
                .eq('organization_id', resolvedOrganizationId)
                .eq('user_id', existingUser.id)
                .eq('status', 'active')
                .maybeSingle();
            if (member) {
                res.status(400).json({ error: 'This user is already an active member of the team.' });
                return;
            }
        }
        const actorRateLimit = enforceRateLimit(`team-invite:${resolvedOrganizationId}:${auth.user.id}`, 30, 15 * 60 * 1000);
        if (!actorRateLimit.ok) {
            res.setHeader('Retry-After', String(actorRateLimit.retryAfterSeconds));
            res.status(429).json({ error: 'Invite limit reached for this user and organization. Try again later.' });
            return;
        }
        // Expire prior pending invite for same target to avoid ambiguous acceptance links.
        let expireExistingInvite = supabase
            .from('organization_invites')
            .update({ status: 'expired', accepted_at: null })
            .eq('organization_id', resolvedOrganizationId)
            .eq('email', normalizedEmail)
            .eq('status', 'pending');
        if (programId) {
            expireExistingInvite = expireExistingInvite.eq('program_id', programId);
        }
        else {
            expireExistingInvite = expireExistingInvite.is('program_id', null);
        }
        await expireExistingInvite;
        const { data: inviteRow, error: inviteError } = await supabase
            .from('organization_invites')
            .insert({
            organization_id: resolvedOrganizationId,
            email: normalizedEmail,
            role_id: roleId || null,
            invited_by: auth.user.id,
            status: 'pending',
            program_id: programId || null,
            expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        })
            .select('id, token')
            .single();
        if (inviteError || !inviteRow?.token) {
            res.status(500).json({ error: inviteError?.message || 'Failed to create invite record' });
            return;
        }
        const subject = `Team invite: ${programTitle}`;
        const roleLine = roleName ? `Assigned role: ${roleName}` : 'Assigned role: Team member';
        const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://awardstuff.vercel.app').replace(/\/$/, '');
        const resolvedInviteUrl = resolveSafeInviteUrl(siteUrl, inviteUrl, inviteRow.token);
        let deadlineText = '';
        if (programId) {
            const { data: program } = await supabase
                .from('programs')
                .select('deadline')
                .eq('id', programId)
                .maybeSingle();
            if (program?.deadline) {
                const d = new Date(program.deadline);
                deadlineText = d.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                });
            }
        }
        const { id: emailLogId } = await createEmailLog(supabase, {
            organizationId: resolvedOrganizationId,
            programId: programId || null,
            inviteId: inviteRow.id,
            recipientEmail: normalizedEmail,
            templateKey: 'team_invite',
            templateVersion: 'v1',
            context: {
                roleName: roleName || null,
                inviterName: inviterProfile?.full_name || null,
                programTitle,
                inviteUrl: resolvedInviteUrl,
                deadlineText,
            },
        });
        const mailer = await getOrgResendMailer(resolvedOrganizationId);
        if (!mailer) {
            if (emailLogId) {
                await updateEmailLog(supabase, emailLogId, {
                    status: 'failed',
                    errorMessage: RESEND_NOT_CONFIGURED_MESSAGE,
                });
            }
            res.status(200).json({
                ok: true,
                inviteId: inviteRow.id,
                token: inviteRow.token,
                status: 'pending',
                emailSent: false,
                warning: RESEND_NOT_CONFIGURED_MESSAGE,
            });
            return;
        }
        const { data, error: sendError } = await mailer.resend.emails.send({
            from: mailer.from,
            to: normalizedEmail,
            subject,
            text: `The team for ${programTitle} wants you to join this event.\n${roleLine}\nAccept your invite: ${resolvedInviteUrl}`,
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
                  <a href="${resolvedInviteUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Accept Team Invite</a>
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
            console.error('Resend API error:', sendError);
            if (emailLogId) {
                await updateEmailLog(supabase, emailLogId, {
                    status: 'failed',
                    errorMessage: sendError.message || 'Resend rejected the email',
                });
            }
            // Invite remains in pending state; allow UI to continue with a warning.
            res.status(200).json({
                ok: true,
                inviteId: inviteRow.id,
                token: inviteRow.token,
                status: 'pending',
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
        res.json({ ok: true, id: data?.id, inviteId: inviteRow.id, token: inviteRow.token, status: 'pending', emailSent: true });
    }
    catch (error) {
        console.error('Team invite error:', error);
        res.status(500).json({ error: error?.message || 'Failed to create or send invite' });
    }
}
