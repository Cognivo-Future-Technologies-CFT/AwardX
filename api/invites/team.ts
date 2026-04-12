import { Resend } from 'resend';
import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { teamInviteSchema } from '../_utils/validation';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../_utils/authUser';
import { createEmailLog, updateEmailLog } from '../_utils/emailLogs';
import { canManageInvites } from '../_utils/invitePermissions';

export default async function handler(req: any, res: any) {
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

    let supabase: any;
    try {
      // Use service-role client for server-side invite creation and enforce authorization explicitly in code.
      supabase = createSupabaseAdmin();
    } catch (envError: any) {
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

    // Expire prior pending invite for same target to avoid ambiguous acceptance links.
    let expireExistingInvite = supabase
      .from('organization_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('organization_id', resolvedOrganizationId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending');

    if (programId) {
      expireExistingInvite = expireExistingInvite.eq('program_id', programId);
    } else {
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
      })
      .select('id, token')
      .single();

    if (inviteError || !inviteRow?.token) {
      res.status(500).json({ error: inviteError?.message || 'Failed to create invite record' });
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY || '';
    const fromAddress = process.env.RESEND_FROM || 'AwardX <onboarding@resend.dev>';
    const subject = `AwardX invite: ${programTitle}`;
    const roleLine = roleName ? `Assigned role: ${roleName}` : 'Assigned role: Team member';
    const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://awardstuff.vercel.app').replace(/\/$/, '');
    const resolvedInviteUrl = (() => {
      if (!inviteUrl) return `${siteUrl}/team-invite/${inviteRow.token}`;
      if (inviteUrl.includes(inviteRow.token)) return inviteUrl;

      const normalizedBase = inviteUrl.replace(/\/$/, '');
      if (/\/team-invite$/i.test(normalizedBase)) {
        return `${normalizedBase}/${inviteRow.token}`;
      }

      return `${siteUrl}/team-invite/${inviteRow.token}`;
    })();
    const inviteLine = `Accept your invite: ${resolvedInviteUrl}`;

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
      },
    });

    if (!resendApiKey) {
      if (emailLogId) {
        await updateEmailLog(supabase, emailLogId, {
          status: 'failed',
          errorMessage: 'RESEND_API_KEY not configured',
        });
      }
      // Keep invite pending even if mail transport is unavailable.
      res.status(200).json({
        ok: true,
        inviteId: inviteRow.id,
        token: inviteRow.token,
        status: 'pending',
        emailSent: false,
        warning: 'Invite created but email service is not configured',
      });
      return;
    }

    const resend = new Resend(resendApiKey);
    const { data, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: normalizedEmail,
      subject,
      text: `The AwardX team for ${programTitle} wants you to join this event.\n${roleLine}\n${inviteLine}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>The AwardX team for ${programTitle} wants you to join</h2>
        <p>${roleLine}</p>
        <p><a href="${resolvedInviteUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600">Accept Team Invite</a></p>
        <p style="font-size:12px;color:#64748b">If the button does not work, copy this link into your browser:<br/>${resolvedInviteUrl}</p>
      </div>`,
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
  } catch (error: any) {
    console.error('Team invite error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create or send invite' });
  }
}
