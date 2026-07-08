import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

/**
 * GET /api/programs/:programId/submission-eligibility
 *
 * Checks whether the current user is allowed to submit to the given program.
 * Returns structured eligibility info so the frontend can show the right message
 * without exposing internal limits.
 */
router.get('/:programId/submission-eligibility', async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  // Try to get userId from query param (for anonymous check with session) or auth header
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const supabase = getSupabaseAdmin();
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    } catch {
      // Token invalid or expired — treat as anonymous
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Load program
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, title, status, deadline, allow_multiple_submissions, max_submissions, active_form_id, submission_mode, min_team_size, max_team_size')
      .eq('id', programId)
      .maybeSingle();

    if (programError) {
      return res.status(500).json({ error: programError.message });
    }
    if (!program) {
      return res.status(404).json({
        eligible: false,
        code: 'PROGRAM_NOT_FOUND',
        message: 'Program not found.',
      });
    }

    // 2. Check program is active
    if (program.status !== 'active') {
      return res.json({
        eligible: false,
        code: 'PROGRAM_NOT_OPEN',
        message: 'Submissions are not yet open for this program.',
      });
    }

    // 3. Check deadline
    if (program.deadline) {
      const deadline = new Date(program.deadline);
      if (deadline < new Date()) {
        return res.json({
          eligible: false,
          code: 'SUBMISSION_CLOSED',
          message: 'The submission deadline for this program has passed.',
        });
      }
    }

    // 4. Check active form exists
    if (!program.active_form_id) {
      return res.json({
        eligible: false,
        code: 'NO_FORM',
        message: 'This program does not have an active submission form.',
      });
    }

    // 5. Check user-specific limits (only if authenticated)
    if (userId) {
      const allowMultiple = !!program.allow_multiple_submissions;
      const submissionLimit = allowMultiple
        ? Math.max(1, Number(program.max_submissions ?? 2))
        : 1;

      // For group submissions, check that the user is a team lead with a ready/forming team
      if ((program as any).submission_mode === 'group') {
        const { data: teamMembership } = await supabase
          .from('submission_team_members')
          .select('id, role, team_id, submission_teams!inner(id, program_id, status, team_lead_id)')
          .eq('user_id', userId)
          .eq('submission_teams.program_id', programId)
          .neq('submission_teams.status', 'disbanded')
          .maybeSingle();

        // Include group info in eligibility response
        const teamInfo = teamMembership
          ? {
              hasTeam: true,
              isLead: (teamMembership as any).submission_teams?.team_lead_id === userId,
              teamStatus: (teamMembership as any).submission_teams?.status,
              teamId: teamMembership.team_id,
            }
          : { hasTeam: false, isLead: false, teamStatus: null, teamId: null };

        // If user has a team that already submitted, they're done
        if (teamInfo.hasTeam && teamInfo.teamStatus === 'submitted') {
          return res.json({
            eligible: false,
            code: 'TEAM_ALREADY_SUBMITTED',
            message: 'Your team has already submitted.',
            team: teamInfo,
          });
        }
      }

      // Count completed (non-pending-payment) submissions for this user
      const { count: submittedCount, error: countError } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('applicant_id', userId)
        .neq('payment_status', 'pending');

      if (countError) {
        return res.status(500).json({ error: countError.message });
      }

      const submittedTotal = submittedCount ?? 0;

      if (submittedTotal >= submissionLimit) {
        if (submissionLimit === 1) {
          return res.json({
            eligible: false,
            code: 'ALREADY_SUBMITTED',
            message: 'You have already submitted this program.',
          });
        }
        return res.json({
          eligible: false,
          code: 'SUBMISSION_LIMIT_REACHED',
          message: 'You have reached the submission limit for this program.',
        });
      }

      // Check for existing drafts
      const { data: drafts } = await supabase
        .from('submission_drafts')
        .select('id, form_id, current_page, field_count, updated_at')
        .eq('form_id', program.active_form_id)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      const existingDraft = drafts && drafts.length > 0 ? drafts[0] : null;

      return res.json({
        eligible: true,
        code: 'ELIGIBLE',
        hasExistingSubmissions: submittedTotal > 0,
        hasDraft: !!existingDraft,
        draft: existingDraft
          ? {
              id: existingDraft.id,
              formId: existingDraft.form_id,
              currentPage: existingDraft.current_page,
              fieldCount: existingDraft.field_count,
              updatedAt: existingDraft.updated_at,
            }
          : null,
      });
    }

    // Anonymous user — can submit if program is open
    return res.json({
      eligible: true,
      code: 'ELIGIBLE',
      hasExistingSubmissions: false,
      hasDraft: false,
      draft: null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
