import { canManageOrganizationInvites } from '../orgAccess.js';
import { createEmailLog, updateEmailLog } from '../emailLogs.js';
import { buildJudgeInviteEmail } from '../inviteEmailTemplates.js';
import {
  RESEND_NOT_CONFIGURED_MESSAGE,
  formatDeadlineText,
  getSiteUrl,
  judgePortalUrl,
  systemMailerConfigured,
} from '../inviteEmailUtils.js';
import type { InviteMailer } from '../inviteMailer.js';
import { serviceJson, type ServiceResult } from '../serviceResult.js';

export type SendJudgeInviteInput = {
  email: string;
  name?: string;
  programTitle: string;
  organizationId?: string;
  programId?: string;
  inviteId?: string;
  inviteUrl?: string;
};

export async function sendJudgeInvite(
  supabase: any,
  user: { id: string },
  input: SendJudgeInviteInput,
  getMailer: (organizationId: string | null) => Promise<InviteMailer | null>,
): Promise<ServiceResult> {
  const normalizedEmail = input.email.toLowerCase().trim();
  const judgeName = input.name || 'Judge';

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedOrganizationId = input.organizationId || inviterProfile?.organization_id || null;
  if (resolvedOrganizationId) {
    const permitted = await canManageOrganizationInvites(supabase, user.id, resolvedOrganizationId);
    if (!permitted) {
      return serviceJson(403, { error: 'Insufficient permissions to send judge invites' });
    }
  } else if (!systemMailerConfigured()) {
    return serviceJson(400, {
      error: 'organizationId is required for judge invites (no system mailer configured)',
    });
  }

  const mailer = await getMailer(resolvedOrganizationId);
  if (!mailer) {
    return serviceJson(200, {
      ok: true,
      emailSent: false,
      warning: RESEND_NOT_CONFIGURED_MESSAGE,
    });
  }

  let deadlineText = '';
  if (input.programId) {
    const { data: program } = await supabase
      .from('programs')
      .select('deadline')
      .eq('id', input.programId)
      .maybeSingle();
    deadlineText = formatDeadlineText(program?.deadline);
  }

  const siteUrl = getSiteUrl();
  const actionUrl = input.inviteId
    ? judgePortalUrl(siteUrl, input.inviteId, input.inviteUrl)
    : input.inviteUrl || siteUrl;
  const emailContent = buildJudgeInviteEmail({
    judgeName,
    programTitle: input.programTitle,
    actionUrl,
    deadlineText,
  });

  const { id: emailLogId } = await createEmailLog(supabase, {
    organizationId: resolvedOrganizationId,
    programId: input.programId || null,
    inviteId: input.inviteId || null,
    recipientEmail: normalizedEmail,
    templateKey: 'judge_invite',
    context: {
      programTitle: input.programTitle,
      inviteUrl: actionUrl,
      judgeName,
      deadlineText,
    },
  });

  try {
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
        emailSent: false,
        warning: sendError.message || 'Resend rejected the email',
      });
    }

    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'sent',
        resendMessageId: data?.id || null,
      });
    }

    return serviceJson(200, { ok: true, id: data?.id, emailSent: true });
  } catch (error: any) {
    if (emailLogId) {
      await updateEmailLog(supabase, emailLogId, {
        status: 'failed',
        errorMessage: error?.message || 'Failed to send invite',
      });
    }
    return serviceJson(500, { error: error?.message || 'Failed to create or send invite' });
  }
}
