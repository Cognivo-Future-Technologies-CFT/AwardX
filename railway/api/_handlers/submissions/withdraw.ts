import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { withdrawSubmissionSchema } from '../../_utils/validation';
import { logError, logWarn } from '../../_utils/logger';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = withdrawSubmissionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      res.status(401).json({ error: authError || 'Unauthorized' });
      return;
    }

    const { submissionId, reason } = parsed.data;
    const supabase = createSupabaseAdmin();

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, applicant_id, status, submission_data')
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.applicant_id !== user.id) {
      res.status(403).json({ error: 'You can only withdraw your own submissions' });
      return;
    }

    const status = String(submission.status || '').toLowerCase();
    if (!['pending', 'under_review', 'shortlisted'].includes(status)) {
      logWarn('submissions.withdraw.disallowed_state', { submissionId, status, userId: user.id });
      res.status(409).json({ error: 'This submission can no longer be withdrawn' });
      return;
    }

    const mergedSubmissionData = {
      ...(submission.submission_data || {}),
      withdrawal: {
        withdrawnAt: new Date().toISOString(),
        withdrawnBy: user.id,
        reason: reason || null,
      },
    };

    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'withdrawn',
        submission_data: mergedSubmissionData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .eq('applicant_id', user.id);

    if (updateError) {
      res.status(500).json({ error: updateError.message || 'Failed to withdraw submission' });
      return;
    }

    res.json({ ok: true, submissionId, status: 'withdrawn' });
  } catch (error: any) {
    logError('submissions.withdraw.exception', { message: error?.message });
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
