import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { getAuthenticatedUser } from '../_utils/authUser';
import { canManageInvites } from '../_utils/invitePermissions';
import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { resendInviteSchema } from '../_utils/validation';
import { createEmailLog, updateEmailLog } from '../_utils/emailLogs';

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
  const resendApiKey = process.env.RESEND_API_KEY || '';

  if (!resendApiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    return;
  }

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!inviterProfile?.organization_id) {
    res.status(400).json({ error: 'Could not resolve inviter organization' });
    return;
  }

  const permitted = await canManageInvites(supabase, auth.user.id, inviterProfile.organization_id);
  if (!permitted) {
    res.status(403).json({ error: 'Insufficient permissions to resend invites' });
    return;
  }

  const resend = new Resend(resendApiKey);

  try {
    if (inviteType === 'team') {
      const { data: inviteRow, error: inviteError } = await supabase
        .from('organization_invites')
        .select('id, organization_id, program_id, email, status, token, role_id, programs(title), roles(name)')
        .eq('id', recordId)
        .single();

      if (inviteError || !inviteRow) {
        res.status(404).json({ error: 'Team invite record not found' });
        return;
      }

      if (inviteRow.organization_id !== inviterProfile.organization_id) {
        res.status(403).json({ error: 'You cannot resend invites outside your organization' });
        return;
      }

      if (inviteRow.status !== 'pending') {
        res.status(400).json({ error: 'Only pending invites can be resent' });
        return;
      }

      const rotatedToken = randomUUID();
      const { error: rotateError } = await supabase
        .from('organization_invites')
        .update({ token: rotatedToken })
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
      const subject = `AwardX invite: ${programTitle}`;

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
        },
      });

      const { data, error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.one>',
        to: inviteRow.email,
        subject,
        text: `The AwardX team for ${programTitle} wants you to join this event.\nAssigned role: ${roleName}\nAccept your invite: ${inviteUrl}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>The AwardX team for ${programTitle} wants you to join</h2><p>Assigned role: ${roleName}</p><p>Accept your invite: ${inviteUrl}</p></div>`,
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
      .select('id, organization_id, program_id, email, name, status, invite_token_used_at, invite_token, programs(title)')
      .eq('id', recordId)
      .single();

    if (judgeError || !judgeRow) {
      res.status(404).json({ error: 'Judge invite record not found' });
      return;
    }

    if (judgeRow.organization_id !== inviterProfile.organization_id) {
      res.status(403).json({ error: 'You cannot resend invites outside your organization' });
      return;
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
      },
    });

    const { data, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'AwardX <no-reply@awardx.one>',
      to: judgeRow.email,
      subject,
      text: `Hi ${judgeName},\n\nYou have been invited to judge "${programTitle}".\n\nClick the link below to access your judging portal and view the assigned submissions:\n${inviteUrl}\n\nYou can bookmark this link to return to your portal at any time during the judging period.\n\nBest,\nThe AwardX team`,
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6"><h2>You're Invited to Judge</h2><p>for <strong>${programTitle}</strong></p><p>Hi ${judgeName},</p><p>You have been selected as a judge. Access your portal using this secure link:</p><p><a href="${inviteUrl}">Access Judging Portal</a></p></body></html>`,
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
