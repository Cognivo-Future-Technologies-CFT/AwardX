/**
 * Mass Email Routes
 *
 * Segment participants in a completed/active round and send personalized
 * bulk emails via Resend. Each send is individually logged to email_logs.
 *
 * Segments:
 *   winners   — round_submissions.status = 'advanced'
 *   eliminated — round_submissions.status = 'eliminated'
 *   active    — round_submissions.status = 'active' (still in round)
 *   all       — every enrolled participant
 *
 * Template variables supported in subject + body:
 *   {{name}}, {{email}}, {{submission_title}}, {{round_title}},
 *   {{program_title}}, {{rank}}, {{total}}, {{segment}}
 */

import { Router } from 'express';
import { Resend } from 'resend';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

const ALLOWED_ROLE_NAMES = new Set(['admin', 'program manager']);
const ALLOWED_PERMISSION_KEYS = new Set(['manage_programs', 'manage_judging']);

async function canSendMassEmail(userId: string, programId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: program } = await supabase
    .from('programs')
    .select('organization_id')
    .eq('id', programId)
    .maybeSingle();

  if (!program?.organization_id) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  // Org owner always allowed
  if (profile?.organization_id === program.organization_id) return true;

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('status, roles ( name, permissions )')
    .eq('organization_id', program.organization_id)
    .eq('user_id', userId)
    .in('status', ['active', 'pending']);

  return (memberships || []).some((m: any) => {
    const roleName = String(m.roles?.name || '').toLowerCase().trim();
    const perms: string[] = Array.isArray(m.roles?.permissions)
      ? m.roles.permissions.map((v: any) => String(v).toLowerCase().trim())
      : [];
    return ALLOWED_ROLE_NAMES.has(roleName) || perms.some((p) => ALLOWED_PERMISSION_KEYS.has(p));
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replace {{variable}} placeholders with values from the vars map. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── GET /:programId/rounds/:roundId/segments ──────────────────────────────────

/**
 * Returns participant groups for a round so the admin can preview before sending.
 */
router.get('/:programId/rounds/:roundId/segments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId, roundId } = req.params;

  try {
    const permitted = await canSendMassEmail(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const supabase = getSupabaseAdmin();

    const [roundResult, submissionsResult] = await Promise.all([
      supabase
        .from('rounds')
        .select('id, title, type, status')
        .eq('id', roundId)
        .maybeSingle(),
      supabase
        .from('round_submissions')
        .select(`
          submission_id,
          status,
          override_action,
          submissions (
            id, title, applicant_name, applicant_email, applicant_id,
            profiles:applicant_id ( id, full_name, email )
          )
        `)
        .eq('round_id', roundId),
    ]);

    if (roundResult.error) throw new Error(roundResult.error.message);
    if (!roundResult.data) return res.status(404).json({ error: 'Round not found' });
    if (submissionsResult.error) throw new Error(submissionsResult.error.message);

    const round = roundResult.data;
    const all = submissionsResult.data || [];

    const toRecipient = (row: any) => {
      const sub = row.submissions || {};
      const profile = (sub.profiles as any) || {};
      return {
        submissionId: row.submission_id,
        submissionTitle: sub.title || 'Untitled',
        applicantName: sub.applicant_name || profile.full_name || 'Participant',
        applicantEmail: sub.applicant_email || profile.email || null,
        status: row.status,
        overrideAction: row.override_action || null,
      };
    };

    const segments = {
      winners: all.filter((r) => r.status === 'advanced').map(toRecipient),
      eliminated: all.filter((r) => r.status === 'eliminated').map(toRecipient),
      active: all.filter((r) => r.status === 'active').map(toRecipient),
    };

    return res.json({
      data: {
        round: { id: round.id, title: round.title, type: round.type, status: round.status },
        segments,
        counts: {
          winners: segments.winners.length,
          eliminated: segments.eliminated.length,
          active: segments.active.length,
          total: all.length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

// ── POST /:programId/rounds/:roundId/send ─────────────────────────────────────

/**
 * Send personalized emails to a segment.
 * Body: { segment, subject, template, fromName? }
 */
router.post('/:programId/rounds/:roundId/send', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId, roundId } = req.params;
  const { segment, subject, template, fromName } = req.body || {};

  if (!segment || !['winners', 'eliminated', 'active', 'all'].includes(segment)) {
    return res.status(400).json({ error: 'segment must be winners, eliminated, active, or all' });
  }
  if (!subject?.trim()) return res.status(400).json({ error: 'subject is required' });
  if (!template?.trim()) return res.status(400).json({ error: 'template is required' });

  try {
    const permitted = await canSendMassEmail(req.userId || '', programId);
    if (!permitted) return res.status(403).json({ error: 'Insufficient permissions' });

    const resendApiKey = process.env.RESEND_API_KEY || '';
    if (!resendApiKey) {
      return res.status(503).json({ error: 'Email service (Resend) is not configured on this server' });
    }

    const supabase = getSupabaseAdmin();
    const resend = new Resend(resendApiKey);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const defaultFrom = process.env.RESEND_FROM || `AwardX <${fromEmail}>`;
    const fromAddress = fromName ? `${fromName} <${fromEmail}>` : defaultFrom;

    const [programResult, roundResult, submissionsResult] = await Promise.all([
      supabase
        .from('programs')
        .select('id, title, organization_id')
        .eq('id', programId)
        .maybeSingle(),
      supabase
        .from('rounds')
        .select('id, title')
        .eq('id', roundId)
        .maybeSingle(),
      supabase
        .from('round_submissions')
        .select(`
          submission_id,
          status,
          submissions (
            id, title, applicant_name, applicant_email, applicant_id,
            profiles:applicant_id ( id, full_name, email )
          )
        `)
        .eq('round_id', roundId),
    ]);

    if (!programResult.data) return res.status(404).json({ error: 'Program not found' });
    if (!roundResult.data) return res.status(404).json({ error: 'Round not found' });

    const program = programResult.data;
    const round = roundResult.data;
    const all = submissionsResult.data || [];

    // Filter by segment
    let targetRows = all;
    if (segment !== 'all') {
      targetRows = all.filter((r) => r.status === segment);
    }

    if (targetRows.length === 0) {
      return res.status(400).json({ error: `No participants in the "${segment}" segment` });
    }

    const results: Array<{ email: string; ok: boolean; messageId?: string; error?: string }> = [];

    // Prepare all recipients with their personalized content
    const prepared: Array<{
      index: number;
      row: any;
      normalizedEmail: string;
      personalizedSubject: string;
      personalizedBody: string;
      htmlBody: string;
    }> = [];

    for (let i = 0; i < targetRows.length; i++) {
      const row = targetRows[i] as any;
      const sub = row.submissions || {};
      const profile = (sub.profiles as any) || {};

      const recipientEmail: string | null = sub.applicant_email || profile.email || null;
      const recipientName: string = sub.applicant_name || profile.full_name || 'Participant';

      if (!recipientEmail) {
        results.push({ email: '(no email)', ok: false, error: 'No email address for this participant' });
        continue;
      }

      const normalizedEmail = recipientEmail.toLowerCase().trim();

      const vars: Record<string, string> = {
        name: escapeHtml(recipientName),
        email: escapeHtml(normalizedEmail),
        submission_title: escapeHtml(sub.title || 'Untitled'),
        round_title: escapeHtml(round.title),
        program_title: escapeHtml(program.title),
        rank: String(i + 1),
        total: String(targetRows.length),
        segment: escapeHtml(segment),
      };

      const personalizedSubject = interpolate(subject, vars);
      const personalizedBody = interpolate(template, vars);

      // HTML wrapper for the body
      const htmlBody = `<!doctype html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="560" style="max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
<tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 40px;text-align:center;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">AwardX</h1>
<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8);">${escapeHtml(program.title)}</p>
</td></tr>
<tr><td style="padding:36px 40px;">
<div style="font-size:15px;line-height:1.75;color:#334155;">${personalizedBody.replace(/\n/g, '<br/>')}</div>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;font-size:11px;color:#94a3b8;">Sent by AwardX on behalf of ${escapeHtml(program.title)}</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

      prepared.push({ index: i, row, normalizedEmail, personalizedSubject, personalizedBody, htmlBody });
    }

    // Send in batches of 10 concurrently
    const BATCH_SIZE = 10;
    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const batch = prepared.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch.map(async (item) => {
        // Log to email_logs
        let emailLogId: string | null = null;
        try {
          const { data: logEntry } = await supabase
            .from('email_logs')
            .insert({
              organization_id: program.organization_id,
              program_id: programId,
              recipient_email: item.normalizedEmail,
              template_key: `mass_${segment}`,
              template_version: 'v1',
              context_json: {
                roundId,
                roundTitle: round.title,
                segment,
                submissionId: item.row.submission_id,
                rank: item.index + 1,
                total: targetRows.length,
              },
              status: 'pending',
            })
            .select('id')
            .single();
          emailLogId = logEntry?.id || null;
        } catch {
          // Non-fatal -- continue even if DB log fails
        }

        try {
          const { data: sendData, error: sendError } = await resend.emails.send({
            from: fromAddress,
            to: item.normalizedEmail,
            subject: item.personalizedSubject,
            html: item.htmlBody,
            text: item.personalizedBody,
          });

          const now = new Date().toISOString();
          if (sendError) {
            if (emailLogId) {
              await supabase
                .from('email_logs')
                .update({ status: 'failed', error_message: sendError.message, updated_at: now })
                .eq('id', emailLogId);
            }
            return { email: item.normalizedEmail, ok: false, error: sendError.message } as const;
          } else {
            if (emailLogId) {
              await supabase
                .from('email_logs')
                .update({ status: 'sent', resend_message_id: sendData?.id || null, sent_at: now, updated_at: now })
                .eq('id', emailLogId);
            }
            return { email: item.normalizedEmail, ok: true, messageId: sendData?.id } as const;
          }
        } catch (err: any) {
          const now = new Date().toISOString();
          if (emailLogId) {
            await supabase
              .from('email_logs')
              .update({ status: 'failed', error_message: err?.message || 'Unknown error', updated_at: now })
              .eq('id', emailLogId);
          }
          return { email: item.normalizedEmail, ok: false, error: err?.message || 'Send failed' } as const;
        }
      }));

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ email: '(unknown)', ok: false, error: result.reason?.message || 'Batch send failed' });
        }
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return res.json({ ok: true, sent, failed, total: results.length, results });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
