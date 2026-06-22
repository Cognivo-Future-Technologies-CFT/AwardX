import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canManageProgram } from '../middleware/programManagement.js';
import { getRound } from '../services/roundEngine.js';
import { executeAdvancement, getAdvancementHistory, previewAdvancement } from '../services/advancementEngine.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';
import { getSupabaseAdmin } from '../supabase.js';
import { getOrgResendMailerForProgram, RESEND_NOT_CONFIGURED_MESSAGE } from '../services/orgResend.js';

const router = Router();

router.post('/rounds/:roundId/preview', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const data = await previewAdvancement(roundId, req.body?.criteriaOverride);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/execute', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await executeAdvancement(
      roundId,
      req.body?.overrides,
      req.userId,
      req.body?.criteriaOverride,
      req.body?.tieResolutions,
      req.body?.targetRoundId,
    );

    if (!result.ok) {
      return res.status(400).json({
        error: result.error || 'Failed to execute advancement',
        paused: result.paused || false,
        reason: result.reason || null,
        ties: result.ties || [],
      });
    }

    await Promise.all([
      deleteCache(cacheKeys.programRounds(round.program_id)),
      deleteCache(cacheKeys.pipelineStatus(round.program_id)),
      deleteCache(cacheKeys.advancementHistory(round.program_id)),
    ]);

    return res.json({ data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/rounds/:roundId/override', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;
  const { submissionId, action, reason } = req.body || {};

  if (!submissionId || !action || !reason) {
    return res.status(400).json({ error: 'submissionId, action, and reason are required' });
  }
  if (!['force_advance', 'force_eliminate'].includes(action)) {
    return res.status(400).json({ error: 'Invalid override action' });
  }

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const result = await executeAdvancement(
      roundId,
      [{ submissionId, action, reason }],
      req.userId,
      req.body?.criteriaOverride,
      req.body?.tieResolutions,
    );

    if (!result.ok) {
      return res.status(400).json({
        error: result.error || 'Failed to apply override',
        paused: result.paused || false,
        reason: result.reason || null,
        ties: result.ties || [],
      });
    }

    await Promise.all([
      deleteCache(cacheKeys.programRounds(round.program_id)),
      deleteCache(cacheKeys.pipelineStatus(round.program_id)),
      deleteCache(cacheKeys.advancementHistory(round.program_id)),
    ]);

    return res.json({ data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

function getEmailTemplate(
  status: 'advanced' | 'eliminated' | 'active',
  recipientName: string,
  submissionTitle: string,
  roundTitle: string,
  programTitle: string
) {
  let title = '';
  let badgeColor = '';
  let badgeText = '';
  let bodyContent = '';
  let headerGradient = '';

  if (status === 'advanced') {
    title = 'Congratulations!';
    headerGradient = 'linear-gradient(135deg, #6366f1, #4f46e5)'; // Indigo/Violet
    badgeColor = '#dcfce7'; // light green
    badgeText = '#166534'; // dark green text
    bodyContent = `Dear ${recipientName},<br/><br/>
      We are thrilled to inform you that your submission <strong>"${submissionTitle}"</strong> has advanced in the <strong>${roundTitle}</strong> of <strong>${programTitle}</strong>!<br/><br/>
      Our team and judges were highly impressed, and your application is now moving forward in the progression pipeline. We will share further details shortly about the next steps and upcoming rounds.<br/><br/>
      Congratulations again on this achievement!`;
  } else if (status === 'eliminated') {
    title = 'Thank You';
    headerGradient = 'linear-gradient(135deg, #64748b, #475569)'; // Slate
    badgeColor = '#f1f5f9'; // light slate
    badgeText = '#334155'; // slate text
    bodyContent = `Dear ${recipientName},<br/><br/>
      Thank you for submitting your application <strong>"${submissionTitle}"</strong> to <strong>${programTitle}</strong>.<br/><br/>
      After careful consideration by our review panel during the <strong>${roundTitle}</strong>, we regret to inform you that your submission was not selected to advance to the next round.<br/><br/>
      We received an exceptionally high volume of quality submissions this year, and selecting only a limited number to advance was a difficult decision. We want to thank you for your time, effort, and for sharing your work with us. We wish you the very best in your future endeavors.`;
  } else {
    title = 'Status Update';
    headerGradient = 'linear-gradient(135deg, #f59e0b, #d97706)'; // Amber/Orange
    badgeColor = '#fef3c7'; // light amber
    badgeText = '#92400e'; // dark amber text
    bodyContent = `Dear ${recipientName},<br/><br/>
      This is a quick update regarding your submission <strong>"${submissionTitle}"</strong> for <strong>${programTitle}</strong>.<br/><br/>
      Your application is currently active and under review in the <strong>${roundTitle}</strong>.<br/><br/>
      Our evaluation team is carefully assessing all entries, and we expect to share the final results soon. You don't need to take any action at this time. We will reach out as soon as the progression results are finalized.`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" style="background-color:#f8fafc; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" style="max-width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px -2px rgba(0,0,0,.08); border-collapse: collapse;">
          <tr>
            <td style="background:${headerGradient};padding:40px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${title}</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.85);font-weight:500;">${programTitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px;">
              <div style="margin-bottom:28px;">
                <span style="display:inline-block;background-color:${badgeColor};color:${badgeText};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:6px 14px;border-radius:9999px;">
                  ${status === 'active' ? 'In Progress' : status}
                </span>
              </div>
              <div style="font-size:16px;line-height:1.8;color:#334155;font-weight:400;">
                ${bodyContent}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:500;">Sent on behalf of ${programTitle}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

router.post('/rounds/:roundId/inform', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  try {
    const round = await getRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const permitted = await canManageProgram(req.userId || '', round.program_id);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const supabase = getSupabaseAdmin();

    // 1. Fetch program details
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, title, organization_id')
      .eq('id', round.program_id)
      .maybeSingle();

    if (programError || !program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // 2. Resolve Resend Mailer
    const mailer = await getOrgResendMailerForProgram(supabase, round.program_id);
    if (!mailer) {
      return res.status(503).json({ error: RESEND_NOT_CONFIGURED_MESSAGE });
    }

    const { resend, from } = mailer;

    // 3. Fetch participants and status
    const { data: roundSubmissions, error: submissionsError } = await supabase
      .from('round_submissions')
      .select(`
        submission_id,
        status,
        submissions (
          id,
          title,
          applicant_name,
          applicant_email,
          applicant_id,
          profiles:applicant_id ( id, full_name, email )
        )
      `)
      .eq('round_id', roundId);

    if (submissionsError) {
      return res.status(500).json({ error: submissionsError.message });
    }

    if (!roundSubmissions || roundSubmissions.length === 0) {
      return res.json({ ok: true, sent: 0, failed: 0, total: 0 });
    }

    const prepared: Array<{
      normalizedEmail: string;
      subject: string;
      html: string;
      text: string;
      status: 'advanced' | 'eliminated' | 'active';
      submissionId: string;
    }> = [];

    for (const rs of roundSubmissions) {
      const sub = (rs as any).submissions || {};
      const profile = sub.profiles || {};

      const recipientEmail = sub.applicant_email || profile.email;
      const recipientName = sub.applicant_name || profile.full_name || 'Participant';
      const submissionTitle = sub.title || 'Untitled';
      const status = (rs.status === 'advanced' || rs.status === 'eliminated' || rs.status === 'active')
        ? rs.status
        : 'active';

      if (!recipientEmail) continue;

      const normalizedEmail = recipientEmail.toLowerCase().trim();
      const subject = status === 'advanced'
        ? `Congratulations! You've advanced in ${program.title}`
        : status === 'eliminated'
          ? `Update on your application: ${program.title}`
          : `Application status update: ${program.title}`;

      const html = getEmailTemplate(status, recipientName, submissionTitle, round.title, program.title);
      // Clean text version
      const text = status === 'advanced'
        ? `Dear ${recipientName},\n\nWe are thrilled to inform you that your submission "${submissionTitle}" has advanced in the "${round.title}" of "${program.title}"!\n\nCongratulations again on this achievement!`
        : status === 'eliminated'
          ? `Dear ${recipientName},\n\nThank you for submitting your application "${submissionTitle}" to "${program.title}".\n\nAfter careful consideration by our review panel during the "${round.title}", we regret to inform you that your submission was not selected to advance to the next round.\n\nWe wish you the very best in your future endeavors.`
          : `Dear ${recipientName},\n\nThis is a quick update regarding your submission "${submissionTitle}" for "${program.title}".\n\nYour application is currently active and under review in the "${round.title}".`;

      prepared.push({
        normalizedEmail,
        subject,
        html,
        text,
        status,
        submissionId: rs.submission_id
      });
    }

    if (prepared.length === 0) {
      return res.json({ ok: true, sent: 0, failed: 0, total: 0 });
    }

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const batch = prepared.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          let emailLogId: string | null = null;
          try {
            const { data: logEntry } = await supabase
              .from('email_logs')
              .insert({
                organization_id: program.organization_id,
                program_id: program.id,
                recipient_email: item.normalizedEmail,
                template_key: 'round_progression_broadcast',
                template_version: 'v1',
                context_json: {
                  roundId,
                  roundTitle: round.title,
                  status: item.status,
                  submissionId: item.submissionId,
                },
                status: 'pending',
              })
              .select('id')
              .single();
            emailLogId = logEntry?.id || null;
          } catch (e) {
            // Ignore non-fatal log insert errors
          }

          try {
            const { data: sendData, error: sendError } = await resend.emails.send({
              from,
              to: item.normalizedEmail,
              subject: item.subject,
              html: item.html,
              text: item.text,
            });

            const now = new Date().toISOString();
            if (sendError) {
              if (emailLogId) {
                await supabase
                  .from('email_logs')
                  .update({ status: 'failed', error_message: sendError.message, updated_at: now })
                  .eq('id', emailLogId);
              }
              return { email: item.normalizedEmail, ok: false, error: sendError.message };
            } else {
              if (emailLogId) {
                await supabase
                  .from('email_logs')
                  .update({ status: 'sent', resend_message_id: sendData?.id || null, sent_at: now, updated_at: now })
                  .eq('id', emailLogId);
              }
              return { email: item.normalizedEmail, ok: true };
            }
          } catch (err: any) {
            const now = new Date().toISOString();
            if (emailLogId) {
              await supabase
                .from('email_logs')
                .update({ status: 'failed', error_message: err?.message || 'Unknown error', updated_at: now })
                .eq('id', emailLogId);
            }
            return { email: item.normalizedEmail, ok: false, error: err?.message || 'Send failed' };
          }
        })
      );

      for (const res of batchResults) {
        if (res.status === 'fulfilled') {
          results.push(res.value);
        } else {
          results.push({ email: '(unknown)', ok: false, error: res.reason?.message || 'Batch send failed' });
        }
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return res.json({ ok: true, sent, failed, total: results.length });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/programs/:programId/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;

  try {
    const permitted = await canManageProgram(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const data = await wrapWithCache(cacheKeys.advancementHistory(programId), cacheTtls.short, async () => {
      return getAdvancementHistory(programId);
    });

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
