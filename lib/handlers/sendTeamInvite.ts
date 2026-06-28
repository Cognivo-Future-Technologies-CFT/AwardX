import { canManageOrganizationInvites } from '../orgAccess.js';
import { createEmailLog, updateEmailLog } from '../emailLogs.js';
import { buildTeamInviteEmail } from '../inviteEmailTemplates.js';
import {
  INVITE_TTL_DAYS,
  RESEND_NOT_CONFIGURED_MESSAGE,
  formatDeadlineText,
  getSiteUrl,
  resolveSafeInviteUrl,
} from '../inviteEmailUtils.js';
import type { InviteMailer } from '../inviteMailer.js';
import { serviceJson, type ServiceResult } from '../serviceResult.js';

export type SendTeamInviteInput = {
  email: string;
  roleId?: string;
  roleName?: string;
  programTitle: string;
  organizationId?: string;
  programId?: string;
  inviteUrl?: string;
};

export async function sendTeamInvite(
  supabase: any,
  user: { id: string },
  input: SendTeamInviteInput,
  getMailer: (organizationId: string) => Promise<InviteMailer | null>,
): Promise<ServiceResult> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedOrganizationId = input.organizationId || inviterProfile?.organization_id || null;
  if (!resolvedOrganizationId) {
    return serviceJson(400, { error: 'organizationId is required for team invites' });
  }

  const permitted = await canManageOrganizationInvites(supabase, user.id, resolvedOrganizationId);
  if (!permitted) {
    return serviceJson(403, { error: 'Insufficient permissions to send team invites' });
  }

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
      return serviceJson(400, { error: 'This user is already an active member of the team.' });
    }
  }

  let expireExistingInvite = supabase
    .from('organization_invites')
    .update({ status: 'expired', accepted_at: null })
    .eq('organization_id', resolvedOrganizationId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending');

  if (input.programId) {
    expireExistingInvite = expireExistingInvite.eq('program_id', input.programId);
  } else {
    expireExistingInvite = expireExistingInvite.is('program_id', null);
  }
  await expireExistingInvite;

  const { data: inviteRow, error: inviteError } = await supabase
    .from('organization_invites')
    .insert({
      organization_id: resolvedOrganizationId,
      email: normalizedEmail,
      role_id: input.roleId || null,
      invited_by: user.id,
      status: 'pending',
      program_id: input.programId || null,
      expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, token')
    .single();

  if (inviteError || !inviteRow?.token) {
    return serviceJson(500, { error: inviteError?.message || 'Failed to create invite record' });
  }

  const siteUrl = getSiteUrl();
  const resolvedInviteUrl = resolveSafeInviteUrl(siteUrl, input.inviteUrl, inviteRow.token);

  let deadlineText = '';
  if (input.programId) {
    const { data: program } = await supabase
      .from('programs')
      .select('deadline')
      .eq('id', input.programId)
      .maybeSingle();
    deadlineText = formatDeadlineText(program?.deadline);
  }

  const { id: emailLogId } = await createEmailLog(supabase, {
    organizationId: resolvedOrganizationId,
    programId: input.programId || null,
    inviteId: inviteRow.id,
    recipientEmail: normalizedEmail,
    templateKey: 'team_invite',
    context: {
      roleName: input.roleName || null,
      inviterName: inviterProfile?.full_name || null,
      programTitle: input.programTitle,
      inviteUrl: resolvedInviteUrl,
      deadlineText,
    },
  });

  const mailer = await getMailer(resolvedOrganizationId);
  if (!mailer) {
    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'failed',
        errorMessage: RESEND_NOT_CONFIGURED_MESSAGE,
      });
    }
    return serviceJson(200, {
      ok: true,
      inviteId: inviteRow.id,
      token: inviteRow.token,
      status: 'pending',
      emailSent: false,
      warning: RESEND_NOT_CONFIGURED_MESSAGE,
      inviteUrl: resolvedInviteUrl,
    });
  }

  const emailContent = buildTeamInviteEmail({
    inviterName: inviterProfile?.full_name,
    programTitle: input.programTitle,
    roleName: input.roleName,
    inviteUrl: resolvedInviteUrl,
    deadlineText,
  });

  const { data, error: sendError } = await mailer.resend.emails.send({
    from: mailer.from,
    to: normalizedEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (sendError) {
    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'failed',
        errorMessage: sendError.message || 'Resend rejected the email',
      });
    }
    return serviceJson(200, {
      ok: true,
      inviteId: inviteRow.id,
      token: inviteRow.token,
      status: 'pending',
      emailSent: false,
      warning: sendError.message || 'Resend rejected the email',
      inviteUrl: resolvedInviteUrl,
    });
  }

  if (emailLogId) {
    await updateEmailLog(supabase, emailLogId, {
      status: 'sent',
      resendMessageId: data?.id || null,
    });
  }

  return serviceJson(200, {
    ok: true,
    id: data?.id,
    inviteId: inviteRow.id,
    token: inviteRow.token,
    status: 'pending',
    emailSent: true,
    inviteUrl: resolvedInviteUrl,
  });
}
