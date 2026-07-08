import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../../_utils/authUser';
import { logError } from '../../_utils/logger';

const toTitleCase = (value: string) =>
  (value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      res.status(401).json({ error: authError || 'Unauthorized' });
      return;
    }

    const supabase = createSupabaseAdmin();

    const [submissionsResult, draftsResult] = await Promise.all([
      supabase
        .from('submissions')
        .select(
          `
          id,
          title,
          status,
          submitted_at,
          updated_at,
          payment_status,
          payment_amount,
          submission_data,
          programs(title),
          submission_judges(
            id,
            status,
            completed_at,
            judges(name),
            judge_comments(overall_comment,recommendation),
            scores(score,comment,criterion_id)
          )
        `,
        )
        .eq('applicant_id', user.id)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('submission_drafts')
        .select('id, form_id, current_page, updated_at, draft_data, program_forms(title, program_id, programs(title))')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
    ]);

    if (submissionsResult.error) {
      res.status(500).json({ error: submissionsResult.error.message || 'Failed to load submissions' });
      return;
    }

    if (draftsResult.error) {
      res.status(500).json({ error: draftsResult.error.message || 'Failed to load drafts' });
      return;
    }

    const submissions = (submissionsResult.data || []).map((row: any) => {
      const feedbackItems: Array<{ judgeName: string; recommendation: string | null; overallComment: string | null; scoredCriteriaCount: number; }> = [];

      for (const judgeAssignment of row.submission_judges || []) {
        const judgeName = judgeAssignment.judges?.name || 'Judge';
        const comments = Array.isArray(judgeAssignment.judge_comments)
          ? judgeAssignment.judge_comments[0]
          : judgeAssignment.judge_comments;
        const overallComment = comments?.overall_comment || null;
        const recommendation = comments?.recommendation || null;
        const scoredCriteriaCount = (judgeAssignment.scores || []).length;

        if (overallComment || scoredCriteriaCount > 0) {
          feedbackItems.push({
            judgeName,
            recommendation: recommendation ? toTitleCase(String(recommendation)) : null,
            overallComment,
            scoredCriteriaCount,
          });
        }
      }

      const formId = row.submission_data?.form_id || null;
      const canWithdraw = ['pending', 'under_review', 'shortlisted'].includes(String(row.status || '').toLowerCase());

      return {
        id: row.id,
        title: row.title || 'Untitled Submission',
        status: row.status || 'pending',
        submittedAt: row.submitted_at || row.updated_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.submitted_at || new Date().toISOString(),
        paymentStatus: row.payment_status || 'pending',
        paymentAmount: Number(row.payment_amount || 0),
        programTitle: row.programs?.title || 'Program',
        formId,
        feedbackItems,
        feedbackCount: feedbackItems.length,
        canWithdraw,
      };
    });

    const drafts = (draftsResult.data || []).map((row: any) => ({
      id: row.id,
      formId: row.form_id,
      formTitle: row.program_forms?.title || 'Untitled Form',
      programTitle: row.program_forms?.programs?.title || 'Program',
      currentPage: Number(row.current_page || 0),
      updatedAt: row.updated_at || new Date().toISOString(),
      fieldCount: Object.keys(row.draft_data || {}).length,
    }));

    res.json({ ok: true, submissions, drafts });
  } catch (error: any) {
    logError('submissions.my.exception', { message: error?.message });
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
