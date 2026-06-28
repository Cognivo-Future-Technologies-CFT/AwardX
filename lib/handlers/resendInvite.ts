import { randomUUID } from 'crypto';
import { canManageOrganizationInvites } from '../orgAccess.js';
import { createEmailLog, updateEmailLog } from '../emailLogs.js';
import { buildJudgeInviteEmail, buildTeamInviteEmail } from '../inviteEmailTemplates.js';
import {
  INVITE_TTL_DAYS,
  RESEND_NOT_CONFIGURED_MESSAGE,
  formatDeadlineText,
  getSiteUrl,
  judgePortalUrl,
  systemMailerConfigured,
} from '../inviteEmailUtils.js';
import type { InviteMailer } from '../inviteMailer.js';
import { serviceJson, type ServiceResult } from '../serviceResult.js';

export type ResendInviteInput = {
  inviteType: 'judge' | 'team';
  recordId: string;
  programTitleFallback?: string;
};

async function resolveInviterOrganization(supabase: any, userId: string) {
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', userId)
    .maybeSingle();

  let resolvedOrganizationId = inviterProfile?.organization_id || null;
  if (!resolvedOrganizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedOrganizationId = membership?.organization_id || null;
  }

  return { inviterProfile, resolvedOrganizationId };
}

async function assertResendPermission(
  supabase: any,
  userId: string,
  resolvedOrganizationId: string | null,
): Promise<ServiceResult | null> {
  if (resolvedOrganizationId) {
    const permitted = await canManageOrganizationInvites(supabase, userId, resolvedOrganizationId);
    if (!permitted && !systemMailerConfigured()) {
      return serviceJson(403, { error: 'Insufficient permissions to resend invites' });
    }
    return null;
  }

  if (!systemMailerConfigured()) {
    return serviceJson(400, {
      error: 'Could not resolve inviter organization (no system mailer configured)',
    });
  }
  return null;
}

async function assertTargetOrgPermission(
  supabase: any,
  userId: string,
  organizationId: string,
): Promise<ServiceResult | null> {
  const canManageTargetOrg = await canManageOrganizationInvites(supabase, userId, organizationId);
  if (!canManageTargetOrg && !systemMailerConfigured()) {
    return serviceJson(403, { error: 'You cannot resend invites outside your organization' });
  }
  return null;
}

export async function resendInvite(
  supabase: any,
  user: { id: string },
  input: ResendInviteInput,
  getMailer: (organizationId: string) => Promise<InviteMailer | null>,
): Promise<ServiceResult> {
  const { inviterProfile, resolvedOrganizationId } = await resolveInviterOrganization(supabase, user.id);
  const permissionError = await assertResendPermission(supabase, user.id, resolvedOrganizationId);
  if (permissionError) return permissionError;

  if (input.inviteType === 'team') {
    const { data: inviteRow, error: inviteError } = await supabase
      .from('organization_invites')
      .select('id, organization_id, program_id, email, status, token, role_id, programs(title, deadline), roles(name)')
      .eq('id', input.recordId)
      .single();

    if (inviteError || !inviteRow) {
      return serviceJson(404, { error: 'Team invite record not found' });
    }

    const targetPermissionError = await assertTargetOrgPermission(
      supabase,
      user.id,
      inviteRow.organization_id,
    );
    if (targetPermissionError) return targetPermissionError;

    if (inviteRow.status !== 'pending') {
      return serviceJson(400, { error: 'Only pending invites can be resent' });
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
      return serviceJson(500, { error: rotateError.message || 'Failed to rotate invite token' });
    }

    const siteUrl = getSiteUrl();
    const inviteUrl = `${siteUrl}/team-invite/${rotatedToken}`;
    const programTitle = inviteRow.programs?.title || input.programTitleFallback || 'your workspace';
    const roleName = inviteRow.roles?.name || 'Team member';
    const deadlineText = formatDeadlineText(inviteRow.programs?.deadline);

    const { id: emailLogId } = await createEmailLog(supabase, {
      organizationId: inviteRow.organization_id,
      programId: inviteRow.program_id,
      inviteId: inviteRow.id,
      recipientEmail: inviteRow.email,
      templateKey: 'team_invite_resend',
      context: {
        roleName,
        inviterName: inviterProfile?.full_name || null,
        programTitle,
        inviteUrl,
        deadlineText,
      },
    });

    const mailer = await getMailer(inviteRow.organization_id);
    if (!mailer) {
      if (emailLogId) {
        await updateEmailLog(supabase, emailLogId, {
          status: 'failed',
          errorMessage: RESEND_NOT_CONFIGURED_MESSAGE,
        });
      }
      return serviceJson(503, { error: RESEND_NOT_CONFIGURED_MESSAGE });
    }

    const emailContent = buildTeamInviteEmail({
      inviterName: inviterProfile?.full_name,
      programTitle,
      roleName,
      inviteUrl,
      deadlineText,
    });

    const { data, error: sendError } = await mailer.resend.emails.send({
      from: mailer.from,
      to: inviteRow.email,
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
      return serviceJson(500, { error: sendError.message || 'Resend rejected the email' });
    }

    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'sent',
        resendMessageId: data?.id || null,
      });
    }

    return serviceJson(200, { ok: true, id: data?.id, inviteType: 'team', recordId: inviteRow.id });
  }

  const { data: judgeRow, error: judgeError } = await supabase
    .from('judges')
    .select('id, organization_id, program_id, email, name, status, invite_token_used_at, invite_token, programs(title, deadline)')
    .eq('id', input.recordId)
    .single();

  if (judgeError || !judgeRow) {
    return serviceJson(404, { error: 'Judge invite record not found' });
  }

  const targetPermissionError = await assertTargetOrgPermission(
    supabase,
    user.id,
    judgeRow.organization_id,
  );
  if (targetPermissionError) return targetPermissionError;

  if (judgeRow.status !== 'invited' && judgeRow.status !== 'active') {
    return serviceJson(400, { error: 'Only invited or active judges can receive a resend' });
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
    return serviceJson(500, { error: rotateJudgeError.message || 'Failed to rotate judge invite token' });
  }

  const siteUrl = getSiteUrl();
  const inviteUrl = judgePortalUrl(siteUrl, rotatedToken);
  const programTitle = judgeRow.programs?.title || input.programTitleFallback || 'your workspace';
  const judgeName = judgeRow.name || 'Judge';
  const deadlineText = formatDeadlineText(judgeRow.programs?.deadline);
  const emailContent = buildJudgeInviteEmail({
    judgeName,
    programTitle,
    actionUrl: inviteUrl,
    deadlineText,
  });

  const { id: emailLogId } = await createEmailLog(supabase, {
    organizationId: judgeRow.organization_id,
    programId: judgeRow.program_id,
    inviteId: null,
    recipientEmail: judgeRow.email,
    templateKey: 'judge_invite_resend',
    context: {
      judgeName,
      programTitle,
      inviteUrl,
      deadlineText,
    },
  });

  const mailer = await getMailer(judgeRow.organization_id);
  if (!mailer) {
    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'failed',
        errorMessage: RESEND_NOT_CONFIGURED_MESSAGE,
      });
    }
    return serviceJson(503, { error: RESEND_NOT_CONFIGURED_MESSAGE });
  }

  const { data, error: sendError } = await mailer.resend.emails.send({
    from: mailer.from,
    to: judgeRow.email,
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
    return serviceJson(500, { error: sendError.message || 'Resend rejected the email' });
  }

  if (emailLogId) {
    await updateEmailLog(supabase, emailLogId, {
      status: 'sent',
      resendMessageId: data?.id || null,
    });
  }

  return serviceJson(200, { ok: true, id: data?.id, inviteType: 'judge', recordId: judgeRow.id });
}
