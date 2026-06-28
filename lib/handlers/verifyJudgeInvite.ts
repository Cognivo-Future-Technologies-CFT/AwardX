import { serviceJson, type ServiceResult } from '../serviceResult.js';

export type VerifyJudgeInviteInput = {
  method: 'GET' | 'POST';
  token: string;
  action?: string;
};

export async function verifyJudgeInvite(
  supabase: any,
  input: VerifyJudgeInviteInput,
): Promise<ServiceResult> {
  const { method, token } = input;

  const { data: judge, error: judgeError } = await supabase
    .from('judges')
    .select('id, name, email, avatar_url, bio, status, program_id, organization_id, invite_token_used_at')
    .eq('invite_token', token)
    .single();

  if (judgeError || !judge) {
    return serviceJson(404, {
      error: 'Invalid or expired invite link. This link may have already been used.',
    });
  }

  const [programResult, orgResult] = await Promise.all([
    judge.program_id
      ? supabase
          .from('programs')
          .select('id, title, slug, description, cover_image_url, status, deadline, timezone, industry_category')
          .eq('id', judge.program_id)
          .single()
      : Promise.resolve({ data: null }),
    judge.organization_id
      ? supabase.from('organizations').select('name').eq('id', judge.organization_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const program = programResult.data as Record<string, unknown> | null;
  const organizationName = String((orgResult.data as { name?: string } | null)?.name || '');

  if (method === 'GET' && !judge.invite_token_used_at) {
    return serviceJson(200, {
      ok: true,
      requiresAcceptance: true,
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        avatarUrl: judge.avatar_url,
        bio: judge.bio,
      },
      program: program
        ? {
            id: program.id,
            title: program.title,
            description: program.description,
            coverImageUrl: program.cover_image_url,
            status: program.status,
            deadline: program.deadline,
            timezone: program.timezone,
            industryCategory: program.industry_category,
          }
        : null,
      organization: organizationName,
    });
  }

  if (method === 'POST') {
    const action = String(input.action || 'accept').trim().toLowerCase();
    if (action !== 'accept' && action !== 'decline') {
      return serviceJson(400, { error: 'Invalid action parameter' });
    }

    if (action === 'decline') {
      const { error: updateError } = await supabase
        .from('judges')
        .update({
          status: 'declined',
          invite_token_used_at: new Date().toISOString(),
        })
        .eq('id', judge.id);

      if (updateError) {
        console.error('Failed to decline judge invite:', updateError);
        return serviceJson(500, { error: 'Failed to process invite' });
      }

      return serviceJson(200, { ok: true, declined: true });
    }

    if (!judge.invite_token_used_at) {
      const { error: updateError } = await supabase
        .from('judges')
        .update({
          invite_token_used_at: new Date().toISOString(),
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', judge.id);

      if (updateError) {
        console.error('Failed to mark judge token as used:', updateError);
        return serviceJson(500, { error: 'Failed to process invite' });
      }
    }
  }

  let assignments: Array<Record<string, unknown>> = [];
  let criteria: Array<Record<string, unknown>> = [];

  const [assignmentResult, criteriaResult] = await Promise.all([
    supabase
      .from('submission_judges')
      .select(`
        id,
        status,
        completed_at,
        assigned_at,
        submission_id,
        round_id,
        rounds (
          id,
          title,
          type,
          status
        ),
        submissions (
          id,
          title,
          description,
          cover_image_url,
          status,
          category_id,
          submitted_at,
          applicant_name,
          votes_count,
          submission_data
        )
      `)
      .eq('judge_id', judge.id)
      .order('assigned_at', { ascending: false }),
    judge.program_id
      ? supabase
          .from('judging_criteria')
          .select('id, name, description, weight, min_score, max_score, sort_order')
          .eq('program_id', judge.program_id)
          .order('sort_order')
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  assignments = (assignmentResult.data || []) as Array<Record<string, unknown>>;
  criteria = (criteriaResult.data || []) as Array<Record<string, unknown>>;

  const effectiveProgramId = judge.program_id || (program?.id as string | undefined);
  if (effectiveProgramId && assignments.length === 0) {
    const { data: programSubs } = await supabase
      .from('submissions')
      .select(
        'id, title, description, cover_image_url, status, category_id, submitted_at, applicant_name, votes_count, submission_data',
      )
      .eq('program_id', effectiveProgramId)
      .order('submitted_at', { ascending: false });

    if (programSubs && programSubs.length > 0) {
      const inserts = programSubs.map((sub: { id: string }) => ({
        submission_id: sub.id,
        judge_id: judge.id,
        status: 'pending',
      }));
      const { data: created } = await supabase
        .from('submission_judges')
        .upsert(inserts, { onConflict: 'submission_id,judge_id' })
        .select('id, status, completed_at, assigned_at, submission_id');

      if (created && created.length > 0) {
        const subMap = new Map(programSubs.map((s: { id: string }) => [s.id, s]));
        assignments = created.map((row: { submission_id: string; id: string; status: string; completed_at: string | null; assigned_at: string | null }) => ({
          ...row,
          submissions: subMap.get(row.submission_id) || null,
        }));
      }
    }
  }

  if (assignments.length > 0) {
    const categoryIds = Array.from(
      new Set(
        assignments
          .map((row) => (row.submissions as { category_id?: string } | null)?.category_id)
          .filter(Boolean),
      ),
    ) as string[];

    let categoryMap = new Map<string, string>();
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase.from('categories').select('id, title').in('id', categoryIds);
      categoryMap = new Map((categories || []).map((c: { id: string; title: string }) => [c.id, c.title]));
    }

    const submissionIds = assignments.map((row) => row.submission_id).filter(Boolean) as string[];
    const roundMap = new Map<string, { id: string; name: string; type: string; status: string }>();
    if (submissionIds.length > 0) {
      const { data: roundSubs } = await supabase
        .from('round_submissions')
        .select('submission_id, rounds!round_submissions_round_id_fkey(id, title, type, status)')
        .in('submission_id', submissionIds);
      if (roundSubs) {
        for (const rs of roundSubs as unknown as Array<{
          submission_id: string;
          rounds?: { id: string; title: string; type: string; status: string } | null;
        }>) {
          if (rs.rounds && !roundMap.has(rs.submission_id)) {
            roundMap.set(rs.submission_id, {
              id: rs.rounds.id,
              name: rs.rounds.title,
              type: rs.rounds.type,
              status: rs.rounds.status,
            });
          }
        }
      }
    }

    assignments = assignments.map((row) => ({
      ...row,
      category_name:
        categoryMap.get((row.submissions as { category_id?: string } | null)?.category_id || '') ||
        'Uncategorized',
      round_info: roundMap.get(String(row.submission_id)) || null,
    }));
  }

  return serviceJson(200, {
    ok: true,
    judge: {
      id: judge.id,
      name: judge.name,
      email: judge.email,
      avatarUrl: judge.avatar_url,
      bio: judge.bio,
    },
    program: program
      ? {
          id: program.id,
          title: program.title,
          description: program.description,
          coverImageUrl: program.cover_image_url,
          status: program.status,
          deadline: program.deadline,
          timezone: program.timezone,
          industryCategory: program.industry_category,
        }
      : null,
    organization: organizationName,
    assignments: assignments.map((row) => {
      const rounds = row.rounds as { id: string; title: string; type: string; status: string } | null | undefined;
      const submission = row.submissions as Record<string, unknown> | null | undefined;
      const roundInfo = row.round_info as { id: string; name: string; type: string; status: string } | null | undefined;
      return {
        submissionJudgeId: row.id,
        status: row.status,
        completedAt: row.completed_at,
        round: (rounds
          ? { id: rounds.id, name: rounds.title, type: rounds.type, status: rounds.status }
          : null) || roundInfo,
        submission: submission
          ? {
              id: submission.id,
              title: submission.title,
              description: submission.description,
              coverImageUrl: submission.cover_image_url,
              status: submission.status,
              category: row.category_name || 'Uncategorized',
              submittedAt: submission.submitted_at,
              applicantName: submission.applicant_name,
              voteCount: submission.votes_count,
              submissionData: submission.submission_data || {},
            }
          : null,
      };
    }),
    criteria: criteria.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      weight: c.weight,
      minScore: c.min_score,
      maxScore: c.max_score,
      sortOrder: c.sort_order,
    })),
  });
}
